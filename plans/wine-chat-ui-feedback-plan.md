# `/wine/chat` 와인 추천 UI 피드백 반영 계획

## 응답 타입 및 브라우저 예외 방어 (2026-10-09)

- SSE JSON 필수 정보는 검증하고 nullable 상세 정보는 문자열/유한 숫자/배열 타입을 확인해 정규화한다. 잘못된 타입은 null/빈 배열로 표시하고 임의 데이터로 보정하지 않는다.
- 공통 포맷·이미지 helper와 aromas 필터에서 문자열이 아닌 값에 trim을 호출하지 않는다. B도 같은 helper를 재사용한다.
- 잘못된 SSE envelope/null/배열은 상태에 전달하지 않는다. 추천 reducer의 findLastIndex는 역순 루프로 대체한다.
- API 계약, A flip 및 B CSS disclosure, SSE 표시 주기, 인증은 유지한다. 단위 및 실제 브라우저 목업으로 A/B와 후속 대화를 검증한다.

## 1. 범위와 기준

- 대상 라우트: `web/src/app/wine/chat/page.tsx`
- 주요 구현:
  - `web/src/app/feature/wine-pairing-chat/ui/WinePairingChatView.tsx`
  - `web/src/app/feature/wine-pairing-chat/ui/WineRecommendationSlide.tsx`
- 기존 설계: `plans/wine-chat-enhanced-design-plan.md`
- API 명세: `api/mysom-wine-pairing.md`의 `/pairing`, `/chat`
- 피드백 원본: `temp/main-page-feedback-plan.md`의 ⑦~⑧
- 화면 기준: `designs/enhanced_design_3_1.png`, `designs/enhanced_design_3_2.png`
- 적용 가이드: `web/GUIDE.md`, `style-implementation`, `storybook-authoring`, `css-only-state`

이번 작업은 추천 화면의 안내 카피와 카드 앞면 이미지 비중을 조정하는 UI 변경이다. SSE parsing, reducer, pairing/chat 상태, flip 상태와 API 계약은 변경하지 않는다.

## 2. 현재 페이지 구조와 경계

```text
WineChatPage [Server]
├─ PageHeader [Shared UI]
└─ WinePairingChatView [Client]
   ├─ IntroSection
   ├─ PairingTurnSection[]
   │  └─ WineRecommendationCarousel
   │     └─ WineRecommendationSlide[] [Client]
   │        ├─ RecommendationFront
   │        └─ WineDetailBack
   ├─ ChatAnswerBubble[]
   └─ ChatComposer
```

- `WinePairingChatView`의 SSE, scroll, composer 상태는 현재 Client 경계에 유지한다.
- `WineRecommendationSlide`의 flip과 설명 확장 상태도 로컬 `useState`를 유지한다.
- 이미지 확대나 카피 줄바꿈을 위해 새로운 전역 상태나 effect를 추가하지 않는다.
- 현재 flip UI는 키보드/버튼 동작이 포함되어 있으므로 CSS-only 상태로 전환하지 않는다.

## 3. 인트로 서브카피 수정

현재 한 줄에 가운뎃점으로 연결된 두 메시지를 명시적인 두 줄로 분리한다.

```text
선택한 메뉴와 잘 어울리는 순서예요.
카드를 뒤집어 상세 정보를 확인해 보세요.
```

- 하나의 `<p>` 안에서 두 문장을 block span으로 구성해 문단 의미를 유지한다.
- 화면 폭에 우연히 의존하는 자동 줄바꿈 대신 의도된 줄바꿈을 사용한다.
- `text-ink-secondary`, font size, line-height는 기존 위계를 유지한다.
- 360px와 390px 모두에서 제목과 캐러셀 사이 간격이 과도하게 늘어나지 않게 한다.

## 4. 추천 카드 이미지 확대

현재 앞면 이미지는 `w-[54px]`, `aspect-[3/7]`로 좁게 표시된다. 목표 범위는 약 68~72px이다.

### 레이아웃 원칙

- 기본 모바일 폭에서는 약 68px, 공간이 충분하면 72px까지 확장한다.
- 이미지 wrapper는 `shrink-0`을 유지한다.
- 병 이미지 비율을 보존할 수 있도록 기존 aspect ratio를 재검토하고 세로형 이미지가 잘리지 않는 구성을 우선한다.
- catalog 병 이미지는 `object-contain`을 우선하고, placeholder/대체 이미지의 표현은 별도로 확인한다.
- `next/image`의 `sizes`를 실제 렌더 폭과 일치시킨다.
- 확대된 이미지가 rank/name 영역과 `와인 상세` 버튼의 공간을 침범하지 않아야 한다.

### 카드 내부 균형

- 상단 미디어 영역의 최소 높이와 `gap`을 이미지 크기에 맞춰 조정한다.
- 긴 와인명은 현재 line clamp 정책을 기준으로 하되 상세 버튼 아래로 들어가지 않게 한다.
- 고정 카드 높이 `392px`는 우선 유지한다.
- 이미지 확대 때문에 한줄평과 추천 이유가 지나치게 잘리면 상단 spacing과 line clamp를 먼저 조정하고 카드 높이를 즉시 늘리지 않는다.
- front와 back의 동일 높이, 3D transform, `backface-visibility`를 유지한다.
- `motion-reduce` 동작과 텍스트 선명도를 재확인한다.

## 5. 파일별 구현 범위

```text
web/src/app/feature/wine-pairing-chat/ui/WinePairingChatView.tsx
web/src/app/feature/wine-pairing-chat/ui/WineRecommendationSlide.tsx
web/src/app/feature/wine-pairing-chat/ui/WinePairingChatView.stories.tsx
web/src/app/feature/wine-pairing-chat/ui/WineRecommendationSlide.stories.tsx
docs/wine-chat.md (구현 후 갱신)
```

아래 영역은 이번 피드백 범위에서 변경하지 않는다.

```text
web/src/app/feature/wine-pairing-chat/api/**
web/src/app/feature/wine-pairing-chat/model/**
web/src/app/entity/wine-pairing/**
web/src/app/api/wine-pairings/**
```

## 6. Storybook 및 검증

기존 도메인 story를 실제 카드 폭과 데이터 상태 중심으로 보강한다.

### `WineRecommendationSlide`

- `Default`: 확대된 이미지와 일반 길이 제목
- `WithWineDetail`: catalog 병 이미지, 상세 flip 전/후
- `LongText`: 긴 와인명과 긴 추천 이유가 버튼/이미지와 겹치지 않음
- `NoImage`: 이미지가 없을 때 Wine icon fallback 정렬
- `StreamingPainting`: 부분 데이터 상태에서도 레이아웃이 무너지지 않음
- `WithNullTaste`: 앞면 변경이 뒷면 null 처리에 영향을 주지 않음

### `WinePairingChatView`

- `PairingDone`: 두 줄 인트로와 완료 캐러셀
- `PairingStreaming`: 점진 렌더링 중 카드 폭 변화 없음
- `PairingError`, `NoRequest`: 인트로/상태 panel 조건이 기존과 동일

필수 상호작용 확인:

- `와인 상세` 버튼으로 flip
- 돌아가기 버튼으로 front 복귀
- 추천 이유 확장 overlay 열기/닫기
- keyboard focus가 숨겨진 카드 면으로 이동하지 않음

검증 명령:

```text
npx tsc --noEmit
npm run test:unit
npm run build-storybook
npm run build
```

시각 검증은 360px, 390px, 520px viewport에서 수행하며 캐러셀 첫/중간/마지막 카드와 가로 스크롤 snap을 확인한다.

## 7. 구현 순서

1. 기존 slide/view story를 기준 화면으로 확인한다.
2. 인트로 문장을 의도된 두 줄 구조로 변경한다.
3. 이미지 wrapper 폭, 비율, `sizes`, object-fit을 함께 조정한다.
4. 상단 media 영역과 텍스트 영역의 gap/min-height를 조정한다.
5. 긴 제목, 이미지 없음, streaming, flip 상태를 Storybook에서 확인한다.
6. carousel snap과 카드 고정 높이 회귀를 실제 라우트에서 확인한다.
7. 최종 결정을 `docs/wine-chat.md`에 반영한다.

## 8. 완료 기준

- 인트로의 두 안내 문장이 의도적으로 두 줄에 표시된다.
- 추천 카드 이미지가 기존 54px보다 명확히 크게 보인다.
- 이미지 원본 비율이 유지되고 과도한 crop이나 흐림이 없다.
- 긴 와인명과 `와인 상세` 버튼이 겹치지 않는다.
- 한줄평과 추천 이유가 기존보다 의미 있게 더 잘리지 않는다.
- front/back 높이와 flip 동작, 캐러셀 snap, reduced-motion 동작에 회귀가 없다.
- SSE 요청, reducer, snapshot, API/BFF 코드는 변경되지 않는다.
