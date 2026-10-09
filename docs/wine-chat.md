# `/wine/chat` 페어링·후속 대화 개발 문서

이 경로는 WineRecommendationCarouselA를 사용한다. keywords에서 스냅샷 저장 후 공통으로 이 경로에 진입하며, Middleware가 인증 그룹 A는 통과시키고 B는 `/wine/recommend`로 redirect한다. B 화면과 서버 상태·스트리밍·후속 대화 로직은 공유한다.

## 홈 이동과 서버 로그

상단 PageHeader는 뒤로가기 대신 홈 아이콘을 제공하며 `/`로 replace 이동한다. 이전 단계에서 진입할 때도 replace를 사용해 완료한 입력 화면을 히스토리에 추가하지 않는다.

pairing/chat BFF는 server-only `server-log.ts`로 요청 시작, 인증 통과, 검증, 백엔드 호출 및 응답 준비를 JSON 로그로 남긴다. 요청별 requestId·timestamp·elapsedMs·상태·항목 개수를 공유한다. SSE 본문을 변경/파싱/전체 버퍼링하지 않고 종료·취소·연결 중단·오류 및 chunk/byte 합계를 관찰한다. 스트림 시작은 완료로 기록하지 않는다.

토큰·쿠키·세션 ID·메시지·메뉴명·원문 오류·내부 URL은 기록하지 않는다. 로그는 Next.js stdout/stderr에 출력되며 로컬 실행에서는 `/private/tmp/mysomm-web-dev.log`에 쌓인다. middleware 인증에서 먼저 거절된 요청은 BFF에 도달하지 않아 해당 route 로그가 없다.

검증: 전체 단위 테스트 98개(서버 로거 9개 포함), 홈/단계 라우팅 Storybook 12개, 변경 파일 타입·ESLint 통과. 로컬 BFF 입력 검증 실패 로그와 세 페이지의 홈 링크 렌더링을 확인했다.

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
   │  ├─ PairingTurnSection → WineRecommendationCarouselA → WineRecommendationSlide[]
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

- 초기 hydration 및 SSE 첫 결과를 기다리는 동안(`어울리는 와인을 찾고 있어요.`) 공통 `SkeletonList`의 wine variant를 표시한다. 점들이 와인병 윤곽을 만드는 이미지와 텍스트 윤곽을 나란히 배치한다. `/wine/keywords`와 색감·톤·reduced-motion 및 상태 안내만 공유하고 화면별 형태는 분리한다. 실제 진행률이 없으므로 퍼센트를 표시하지 않는다.
- 대기 패널 포함 검증: 채팅·추천 카드·메뉴 추천·공통 와인병/패널 Storybook 26개, 변경 파일 타입 검사 및 ESLint 통과. Chrome 모바일 캡처로 형태를 확인했으며 reduced-motion에서 와인병 점의 animationName이 none인 것도 확인했다.

- 모바일 Safari에서 플립 카드의 반투명·블러 레이어가 겹치지 않도록 비활성 면을 `visibility: hidden`, `pointer-events: none`, `inert`로 숨긴다. 표준·WebKit `backfaceVisibility`도 두 면에 명시하며, 회전 애니메이션과 카드 높이는 유지한다. 버튼 `tabIndex`와 함께 화면·클릭·키보드 접근을 차단하며, 중복 `aria-hidden`은 사용하지 않는다.
- 앞뒤 전환 시 이전 버튼을 먼저 blur하고, DOM 갱신 직후 `useLayoutEffect`에서 새 면의 전환 버튼에 `focus({ preventScroll: true })`를 적용한다. 숨겨지는 면에 포커스가 남지 않으며, 최초 렌더링·스트리밍 갱신에서는 포커스를 이동하지 않는다.
- "준비 중인 기능이에요" 안내는 카탈로그 제외 모드이거나 품종·빈티지·도수 정보가 없을 때의 기존 정책이다. 카드 겹침 수정과 별개로 이 조건은 유지한다.
- 모바일 겹침·포커스 수정 검증: Chrome 390×844 브라우저에서 카드 Storybook 9개(왕복·준비 중·Enter/Tab 포커스 포함), 변경 컴포넌트·스토리 타입 검사, ESLint 통과. 실제 iPhone Safari 및 운영 사이트 배포 후 확인은 남아 있다.

- 앞면 이미지 슬롯은 기존 가로:세로 1:2 비율로 복원했다. 기본 모바일에서 68×136px, 480px 이상에서 72×144px로 표시한다. 실제 사진·fallback·추천 중 스켈레톤 모두 같은 비율을 사용한다. `/wine/list`의 3:4 비율은 유지한다.
  높이는 각각 `136px`, `144px`이며 `object-contain`으로 원본 비율을 유지한다.
- 이미지가 없고 카드가 아직 미확정(`isCommitted=false`)인 추천 진행 중에만 `WineImageSkeleton`을 표시한다. 최종 JSON으로 확정된 후 사진이 없으면 로컬 `/images/wines/wine-bottle.png`에 기존 어두운 오버레이(`bg-black/45`)와 `이미지\n준비중` 두 줄 안내를 표시하며 애니메이션을 유지하지 않는다. 실제 이미지가 있는 카드는 사진을 표시한다. 이 fallback 교체는 추천 카드에만 적용하며 wine/list의 공용 이미지 정책은 변경하지 않는다.
- 와인병 점 행렬은 사용자 제공 병 사진에 맞춰 짧은 캡·가는 목·둥근 어깨·수직 몸통·거의 평평한 바닥으로 구성한다. 바닥 모서리만 작게 다듬는다. 촘촘한 SVG 점 격자의 밝기가 순차적으로 변하며 CSS로만 동작한다. `prefers-reduced-motion`에서는 점의 애니메이션을 중단한다.
- 표시 정책 보완 검증: 추천 진행·사진 수신·이미지 없이 추천 완료 시 샘플/오버레이 복귀를 포함한 추천 카드 11개와 와인병 스토리 2개 통과. 채팅 화면까지 합한 20개 브라우저 테스트 및 변경 파일 타입 검사·ESLint도 통과했다. 모바일 캡처로 가늘고 둥근 어깨·바닥 윤곽을 확인했다.
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
- `WineRecommendationCarouselA`, `ChatAnswerBubble`, `ChatComposer` (기존 캐러셀은 A로 이름만 변경했으며 동작과 공용 WineRecommendationCarouselProps는 유지)
- `WinePairingChatView` (Default/PairingDone/Streaming/Error/NoRequest) — fetch/sessionStorage 스텁

slide story의 interaction은 상세 면 전환과 복귀, 숨겨진 면의 `tabIndex`, 긴 추천 이유
overlay의 열기/닫기를 확인한다.

## 남은 제약

- backend가 pairing 응답의 `body`를 채우면 뒷면 바디 바가 자동으로 값을 표시한다(코드 변경 불필요).
- 새로고침 후 진행 중이던 stream 복원은 서버 계약이 없어 지원하지 않는다.
