# `/wine/chat` 페어링·후속 대화 개발 문서

- 라우트: `web/src/app/wine/chat/page.tsx`
- 시안: `designs/enhanced_design_3_1.png`, `designs/enhanced_design_3_2.png`
- API: `api/mysom-wine-pairing.md` (`/pairing`, `/chat`, SSE)
- 기준 백엔드: `mysom-api-demo` `68a0cb7`

같은 세션에서 최초 페어링을 스트리밍하고, 완료 후 일반 질문 또는 AI가 분류한 재페어링을
이어서 보여준다.

## 페이지 구조와 RSC/RCC 경계

```text
WineChatPage [Server]  (page.tsx)
├─ PageHeader [Server]
└─ WinePairingChatView [Client]
   ├─ ConversationScroll
   │  ├─ PairingTurnSection → WineRecommendationCarousel → WineRecommendationSlide[]
   │  │     Front: rank/name/image/comment/reason (flip)
   │  │     Back:  vintage/도수/가격 + 테이스트(바디·당도·타닌·산도 0..5)
   │  └─ ChatAnswerBubble[]
   └─ ChatComposer (sticky)
```

- `page.tsx`는 Server Component, SSE/reducer/scroll/carousel/flip/composer만 Client다.
- 인트로는 추천 순서와 카드 상세 확인 방법을 의도된 두 줄 문장으로 안내한다.

## 진입 snapshot과 세션 수명

`WinePairingSnapshot`(`version: 2, sessionId, wineIds, menuNames`)을 hydration 이후 읽는다.
- `sessionId`는 추출 단계부터 이어진 동일 UUID다(화면 진입 시 새 ID를 만들지 않는다).
- hydration 전에는 오류를 표시하지 않는다.
- snapshot 누락/invalid/legacy면 네트워크 요청 없이 "처음부터 다시 시작"(/wine/list)을 제공한다.
- 리로드 시 같은 세션으로 pairing POST를 자동 반복하면 중복 페어링이 생기므로,
  pairing 시작 시 `markWinePairingConsumed(sessionId)`로 소비 표시하고, 이미 소비된
  세션이면 자동 재호출 대신 "이미 진행한 추천" 안내를 보여준다.
- 서버에 pairing 조회/resume API가 없어 기존 stream 복원은 지원하지 않는다.

## 상태 소유권

| 상태 | 관리 |
| --- | --- |
| 진입 snapshot / 소비 표시 | sessionStorage (`workflow-snapshot-storage`) |
| turns · stream 진행 · committedPairingCount | view-local `useReducer` (`conversation.reducer`) |
| 입력 중 message | composer `useState` |
| slide index / flip | 각 UI 로컬 state |
| AbortController | controller hook `ref` |
| 미표시 텍스트·확정·완료 액션 | 요청별 `conversation-presentation` 큐 (React state 외부) |

SSE 원본은 Zustand/TanStack Query에 누적하지 않는다. reducer는 순수 상태 전이만 맡고,
fetch/stream iteration은 `use-wine-pairing-conversation` controller hook에 격리한다.

```ts
type ConversationState = {
  turns: (PairingTurn | ChatTurn)[];
  pairing: "idle" | "streaming" | "done" | "error";
  chat: "idle" | "streaming" | "error";
  committedPairingCount: number;
};
```

composer는 최초 pairing이 정상 종료되고 `committedPairingCount > 0`일 때만 활성화된다.

## Pairing BFF 흐름

```text
snapshot 복원 → markConsumed
→ POST /api/wine-pairings/pairing  (X-Session-Id, { wineIds, menuNames })
→ BFF: UUID/배열/길이/중복 검증, menuNames는 철자 그대로 전달(category 변환 금지)
→ POST /v1/wine-pairings/pairing (Accept: text/event-stream)
→ backend ReadableStream을 버퍼링 없이 pipe
   (Content-Type: text/event-stream, Cache-Control: no-store, X-Accel-Buffering: no)
→ client SSE parser → 표시 큐 → 40ms 주기 batch → reducer
```

후속 chat도 동일 `X-Session-Id`로 `POST /api/wine-pairings/chat { message }`를 호출한다.

## 서버 수신과 UI 표시 속도 분리

`conversation-presentation.ts`는 최초 페어링, 재페어링, 일반 채팅마다 별도 큐를 만든다. SSE 수신은 큐에 즉시 적재하고, UI는 40ms마다 최대 3개 Unicode code point를 소비한다 (버퍼가 충분하면 약 75자/초). 같은 필드의 여러 작은 frame은 합쳐서 처리하고, 긴 frame은 여러 tick으로 나누므로 서버 chunk 크기에 표시량이 종속되지 않는다. 한 tick의 액션은 `PRESENTATION_BATCH`로 reducer에 전달한다.

최종 JSON은 앞선 텍스트 뒤에 적용한다. JSON-only 응답이나 STREAM에 없던 최종 suffix는 점진 표시하고, 앞선 텍스트와 다른 최종 값은 JSON을 권위값으로 교체한다. 네트워크가 종료돼도 표시 큐가 남아 있으면 streaming 상태와 입력 잠금을 유지하며, 큐를 소진한 뒤에 DONE을 처리한다.

버퍼가 비면 타이머를 멈추고 다음 수신 때 다시 시작한다. 데이터가 도착하지 않는 동안 표시 속도를 보장하거나 내용을 생성하지 않는다. 백그라운드 탭과 브라우저 부하로 타이머가 지연될 수도 있다. 오류는 미표시 버퍼를 폐기하고 즉시 오류를 표시하며, abort/unmount는 타이머와 완료 대기를 정리해 늦은 확정을 막는다. 동기 ref 가드로 동일 render에서 채팅을 연속 전송하는 것도 차단한다.

검증은 `conversation-presentation.test.ts`의 fake timer 테스트로 일괄/분할 수신, 버퍼 고갈 후 재개, 이모지, JSON-only 여러 카드, suffix 보충·권위값 정정, 완료 순서, abort·오류를 확인한다. Storybook `BurstResponse`는 JSON 일괄 응답에서도 입력 잠금이 표시 완료까지 유지되는지 확인한다.

검증 결과: 표시 큐·기존 reducer 단위 테스트 16개와 Chrome의 `Burst Response` 화면 테스트 1개 통과. 변경 파일의 타입 검사와 ESLint 통과. 전체 프로젝트 타입 검사는 기존 `.next/types`의 제거된 라우트 참조 및 `jose/jwt/sign`, `jose/jwt/verify` 모듈 해석 오류로 실패했다.

## SSE 해석 규칙 (reducer)

1. field `STREAM`(rank/name/comment/reason)은 마지막 미확정 slide를 만들거나 갱신한다.
2. 같은 `fieldName`의 `body`는 도착 순서로 append한다.
3. `hasNext: false`는 필드 완료 신호일 뿐 slide/stream 완료가 아니다.
4. `JSON`은 권위값이므로 미확정 slide를 통째로 교체하고 `committedPairingCount`를 늘린다.
5. 미확정 slide가 없어도 `JSON`만으로 committed slide를 만든다.
6. stream `done` 시 committed slide가 하나 이상이면 turn 완료, 하나도 없으면 오류다.

후속 chat 분기(controller):
- 첫 frame이 field name 없는 `STREAM`이면 일반 chat turn(답변 append).
- 첫 frame이 `JSON`이거나 `fieldName`이 있으면 낙관적 빈 chat turn을 pairing turn으로 대체.
- 알 수 없거나 잘못된 frame(모르는 fieldName, wine 없는 JSON)은 UI에 반영하지 않는다.

React key는 `pairingId + wine.id + rank`를 결합한다(pairingId는 slide마다 유일하지 않음).

## 와인 화면 모델

- 모바일 Safari에서 플립 카드의 반투명·블러 레이어가 겹치지 않도록 비활성 면을 `visibility: hidden`, `pointer-events: none`, `inert`로 숨긴다. 표준·WebKit `backfaceVisibility`도 두 면에 명시하며, 회전 애니메이션과 카드 높이는 유지한다. 버튼 `tabIndex`와 함께 화면·클릭·키보드 접근을 차단하며, 중복 `aria-hidden`은 사용하지 않는다.
- 앞뒤 전환 시 이전 버튼을 먼저 blur하고, DOM 갱신 직후 `useLayoutEffect`에서 새 면의 전환 버튼에 `focus({ preventScroll: true })`를 적용한다. 숨겨지는 면에 포커스가 남지 않으며, 최초 렌더링·스트리밍 갱신에서는 포커스를 이동하지 않는다.
- "준비 중인 기능이에요" 안내는 카탈로그 제외 모드이거나 품종·빈티지·도수 정보가 없을 때의 기존 정책이다. 카드 겹침 수정과 별개로 이 조건은 유지한다.
- 모바일 겹침·포커스 수정 검증: Chrome 390×844 브라우저에서 카드 Storybook 9개(왕복·준비 중·Enter/Tab 포커스 포함), 변경 컴포넌트·스토리 타입 검사, ESLint 통과. 실제 iPhone Safari 및 운영 사이트 배포 후 확인은 남아 있다.

- 앞면 이미지는 기본 모바일에서 `68px`, 480px 이상에서 `72px` 폭으로 표시한다.
  높이는 각각 `136px`, `144px`이며 `object-contain`으로 원본 비율을 유지한다.
- `wineBottleImageUrl`이 없으면 catalog fallback 이미지를 준비 중 overlay와 함께 표시하고,
  스트리밍 중 이미지 자체가 없으면 `Wine` 아이콘을 표시한다.
- `next/image`의 `sizes`도 실제 표시 폭인 `68px`/`72px`에 맞춘다.
- 뒷면 테이스트는 `body`/`sweetness`/`tannin`/`acid` 실제 값만 0..5로 그린다.
  null이면 "정보 없음"으로 두고 0으로 그리지 않는다.
- 현재 backend pairing mapper는 `body`를 누락하므로 body는 항상 null일 수 있다(정상 nullable).
- `acid`는 표시명 "산도"로 매핑하되 DTO field명은 바꾸지 않는다.
- 가격은 통화 단위/기호로 표시하고, 이름은 `wineName`을 그대로 쓴다(변종/풍미 추측 없음).

## 오류·재시도·동시성

- stream 시작 전 400/404/409는 safe message로 매핑한다.
- stream 도중 종료는 현재 turn을 error로 표시하고 부분 slide를 결과로 확정하지 않는다.
- 초기 pairing 실패에 같은 session/body를 자동 retry하지 않는다. 복구 CTA는 "처음부터
  다시 시작"(/wine/list)으로 새 세션을 만들게 한다.
- 일반 chat은 streaming 중 composer를 잠근다. chat 실패는 기존 pairing을 유지하고
  같은 메시지를 자동 재전송하지 않는다.
- unmount 시 AbortController로 모든 stream을 취소하고 이후 dispatch를 막는다.

## Storybook

- `Feature/wine-pairing-chat/WineRecommendationSlide`
  (default/wine detail/long text/no image/streaming/null taste/flip round trip)
- `WineRecommendationCarousel`, `ChatAnswerBubble`, `ChatComposer`
- `WinePairingChatView` (Default/PairingDone/Streaming/Error/NoRequest) — fetch/sessionStorage 스텁

slide story의 interaction은 상세 면 전환과 복귀, 숨겨진 면의 `tabIndex`, 긴 추천 이유
overlay의 열기/닫기를 확인한다.

## 남은 제약

- backend가 pairing 응답의 `body`를 채우면 뒷면 바디 바가 자동으로 값을 표시한다(코드 변경 불필요).
- 새로고침 후 진행 중이던 stream 복원은 서버 계약이 없어 지원하지 않는다.
