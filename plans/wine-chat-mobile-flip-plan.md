# `/wine/chat` 모바일 카드 플립 겹침 수정

- 기준: 사용자 iPhone Safari 스크린샷, 기존 `designs/enhanced_design_3_1.png`
- 개발 가이드: MCP `style-implementation`, `css-only-state`, `rcc-rendering`, `storybook-authoring`
- API: `api/mysom-wine-pairing.md` (요청·응답 변경 없음)

## 원인과 구현

현재 앞뒷면은 반투명 배경과 backdrop blur를 가진 DOM으로 동시에 존재하고, 3D backface culling에만 시각적 숨김을 의존한다. 제공된 Safari 화면에서 뒷면 위에 앞면 이름·병 이미지·설명이 겹치는 현상이 관찰된다.

`WineRecommendationSlide`의 기존 Client state와 shared `Card`를 유지하며 비활성 면에 visibility hidden, pointer-events none, inert를 적용한다. 앞뒷면 wrapper에 표준 및 WebKit backfaceVisibility를 명시한다. 3D 회전과 카드 높이를 유지하고, 준비 중 안내 조건은 변경하지 않는다.

## 포커스 접근성 보완

비활성 면의 중복 `aria-hidden`은 제거하고 `inert`와 visibility로 접근을 차단한다. 클릭·키보드 활성화 시 이전 버튼을 blur한 후 상태를 변경하고, DOM 갱신 직후 활성 면의 전환 버튼으로 포커스를 이동한다. 최초 렌더링이나 스트리밍 갱신에서는 포커스를 이동하지 않는다. 기존 Client Component와 Card를 재사용하며 API·데이터 흐름은 변경하지 않는다. 왕복 전환, 준비 중 상태, 키보드 Enter 전환의 포커스를 Storybook으로 검증한다.

## 검증

Storybook의 플립·복귀 회귀 테스트에 비활성 면의 실제 visibility를 검사한다. 좁은 모바일 폭과 상세 정보 누락으로 안내가 표시되는 상태를 추가한다. Chrome 브라우저 테스트와 변경 파일 Lint·타입 검사를 수행한다. 실제 iPhone Safari의 렌더링 검증 여부는 결과에 명시한다.
