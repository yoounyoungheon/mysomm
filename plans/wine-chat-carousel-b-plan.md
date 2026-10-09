# `/wine/recommend` WineRecommendationCarouselB 설계

## 1. 목적과 범위

- 기존 `WineRecommendationCarousel`의 파일·컴포넌트·스토리 이름을 `WineRecommendationCarouselA`로 변경하고 동작은 보존한다. 비교용 `WineRecommendationCarouselB`를 추가한다.
- 디자인: `designs/enhanced_design_v2.png`, 사용자 제공 추천 이유 펼침 스크린샷.
- 입력 데이터: 기존 `WineRecommendationCarouselProps`의 `slides: PairingSlideView[]`, `className?`를 그대로 사용한다.
- 설계 승인 후 UI와 라우팅을 구현했다. API·서버 상태·비즈니스 로직·의존성은 변경하지 않는다.
- 새 화면은 `/wine/recommend`에 B를 연결한다. `/wine/keywords`는 snapshot 저장 후 공통 경로 `router.replace("/wine/chat")`로 이동한다. 베타 코드 기반 인증 Middleware가 A는 통과시키고 B는 `/wine/recommend`로 redirect한다. Storybook에서는 동일한 slides를 A/B에 전달해 비교한다.
- 가이드: `web/GUIDE.md`, MCP의 style-implementation, css-only-state, data-flow-layering, storybook-authoring, shadcn-ui-mcp.

## 2. 화면 구조

```text
WineRecommendPage /wine/recommend (Server shell)
└─ WinePairingChatView (공유 대화/스트림 소유자, renderer B 주입)
└─ PairingTurnSection (추천 턴마다 캐러셀 1개)
   └─ WineRecommendationCarouselB (동일 slides 입력)
      ├─ 가로 scroll-snap viewport
      │  └─ WineRecommendationSlideB[]
      │     ├─ MYSOMM PICK / 추천 요약(comment)
      │     ├─ 순위 + 와인명 + 국가/지역 + 빈티지/도수 + 이미지
      │     ├─ “이 와인은 이런 스타일이에요” 카드
      │     │  └─ 바디 / 당도 / 타닌 / 산도 (2×2)
      │     ├─ 추천 이유 펼침 카드
      │     └─ “이 와인 자세히 보기” Wine21 링크
      └─ 현재 슬라이드 표시/이동 버튼
```

디자인 전체의 헤더(홈/알림/사용자)와 배경은 페이지 shell의 책임이다. 슬라이드마다 페이지 헤더를 반복하지 않는다. B는 A의 뒤집기 UI 대신 정보와 추천 이유를 한 면에서 제공한다. 비교 컴포넌트라는 의미이며 와인 간 비교 분석을 새로 생성하는 기능은 아니다.

공유 View에 선택적 `recommendationVariant: "A" | "B"` prop을 추가하고 기본은 A로 둔다. `/wine/chat`은 현재 기본 호출을 유지하며 새 `/wine/recommend`만 B를 지정한다. PairingTurnSection에서 렌더러만 선택한다. useWinePairingConversation, snapshot 소비, presentation buffer, 일반 대화/재추천 분기, 오류/재시작, composer 활성화와 입력 동작은 동일하다. B 화면의 모든 재추천 턴도 B 캐러셀로 표시한다. A/B 비교 또는 경로 간 이동 때문에 같은 snapshot을 재사용·자동 재호출하도록 소비 정책을 완화하지 않는다.

## 3. 데이터 매핑과 빈 값

| 화면 | 기존 데이터 | 표시 정책 |
| --- | --- | --- |
| 큰 추천 요약 | `slide.comment` | 원문 사용. 임의 비교 문장·새 AI 호출 없음 |
| 순위 | `slide.rank` | 전달된 순위만 표시, 미수신 중 placeholder |
| 와인명 | `slide.name`, 확정 후 `slide.wine.wineName` | STREAM→JSON 기존 모델 유지 |
| 이미지 | `wine.wineBottleImageUrl` 또는 `slide.imageUrl` | 실제 사진 우선, 진행 중 누락은 WineImageSkeleton, 확정 후 누락은 wine-bottle.png + 기존 어두운 오버레이 + 두 줄 “이미지 / 준비중” |
| 국가·지역 | `wine.country`, `wine.region` | 기존 format helper 재사용, 빈 값은 생략 |
| 빈티지·도수 | `wine.vintage`, `wine.alcohol` | 뱃지는 항상 유지. 값이 있으면 실제 값, 없으면 라벨 옆 값을 `-`로 표시 (`빈티지 -`, `도수 -`) |
| 4개 맛 지표 | `wine.body`, `sweetness`, `tannin`, `acid` | 점 5개는 항상 표시. 값이 없으면 라벨 옆 “준비중입니다.” 및 모든 점 비활성색. 실제 값만큼만 보라색 활성화. 0과 null 구분, mock 점수 금지 |
| 추천 이유 본문 | `slide.reason` | 서버 원문 그대로, 줄바꿈 보존 및 긴 문장 wrap |
| 외부 상세 링크 | 고정 URL | `https://www.wine21.com/` |

디자인의 품종·와인 타입·비교 설명 등은 필수 API 필드가 아니다. 품종은 optional `variety`가 실제로 전달될 때만 표시하고 추정하지 않는다. “목직한 편/드라이해요/산뜻해요” 등의 정성 라벨은 이번 기본 범위에서 만들지 않고 실제 점수 또는 “준비중입니다.”로 표현한다. 정성 구간을 추가하려면 별도 규칙을 먼저 합의한다. 디자인의 “or browse files”는 시안 placeholder일 뿐 추천 카드에 업로드 기능을 추가하지 않는다.

빈티지·도수는 값이 없어도 뱃지를 유지하고 각각 `빈티지 -`, `도수 -`로 표시한다. 바디·당도·타닌·산도는 라벨과 “준비중입니다.”를 유지하며 아래 점 5개는 모두 비활성색으로 표시한다. null/undefined 및 빈 문자열·공백 문자열을 미제공으로 판단한다. 아직 wine JSON이 오지 않은 스트리밍 상태에도 같은 정책을 적용한다. 숫자 0은 정상 값이며 점이 활성화되지 않지만 준비중 문구로 표시하지 않는다.

현재 문서에는 pairing JSON의 `body`가 null일 수 있다고 명시되어 있다. 정상적인 정보 누락으로 처리하며 OCR 값을 임의로 섞거나 서버 계약에 없는 필드를 추가하지 않는다.

## 4. 추천 이유 펼침 동작

- 기본은 접힘. 문서 아이콘, “왜 이 와인을 추천했나요?”, 보조 문구 “음식과 와인의 궁합 이유를 알려드릴게요”, 아래쪽 chevron을 표시한다.
- 클릭하면 동일한 흰색 rounded 카드 안에 연한 보라색 본문 박스를 normal flow로 펼친다. 첨부 스크린샷처럼 chevron을 위쪽으로 바꾸고 본문에 `slide.reason`을 표시한다.
- 다시 클릭하면 접힌다. 카드 뒤집기·모달·추가 API 호출은 없다.
- 설명이 아직 없는 진행 상태에서는 trigger를 비활성화하고 준비 상태를 알린다. 설명 청크가 도착하면 활성화하고, 펼친 상태에서는 이후 청크를 같은 본문에 이어서 표시한다. 완료 후에도 비어 있으면 “추천 이유 정보가 없어요.”로 안내한다.
- shared/ui의 기존 Card와 native details/summary를 합성한 공통 `DisclosureCard` molecule을 사용한다. title/description/icon/children/disabled API를 최소화하고 Default/Expanded/Disabled/LongContent 스토리를 제공한다. feature에서 shadcn 직접 import하지 않는다.
- 사용자 지시에 따라 disclosure는 native `<details>/<summary>`와 CSS `group-open`으로 관리한다. React 열림 state/effect는 추가하지 않고 브라우저가 키보드·접근성의 expanded 상태 및 닫힌 본문 제외를 처리한다. 준비 중 비활성 상태는 펼침 trigger 대신 정적 헤더를 제공한다. 새 accordion 의존성은 필요 없다.
- Enter/Space 열기·닫기, trigger 포커스 유지, 닫힌 본문 접근성 트리 제외를 검증한다. 청크 갱신 시 details 노드를 유지해 열린 상태를 보존한다.
- 고정 카드 높이를 강제하지 않는다. 설명이 펼쳐져도 하단 CTA와 겹치지 않도록 세로 스크롤과 기존 composer 회피 여백을 유지한다.

## 5. Wine21 이동

- 기존 shared Button의 `asChild`로 anchor를 감싸 디자인의 보라색 full-width CTA를 구성한다.
- `href="https://www.wine21.com/"`, `target="_blank"`, `rel="noopener noreferrer"`로 새 탭에 연다. 새 탭 안내를 접근성 텍스트로 제공한다.
- 현재 API에는 Wine21 개별 상세 URL이 없으므로 특정 와인 검색/상세 주소를 조립하지 않는다. 링크는 사용자 지정 홈 주소다.
- 실제 데이터가 확정되기 전에는 CTA를 비활성 형태로 표시하고 최종 확정 후 링크로 활성화한다.

## 6. 스트리밍·상태·API 계약

참조: `api/mysom-wine-pairing.md`, `PairingSlideView`, `useWinePairingConversation`, `conversation-presentation`.

1. 기존 브라우저→BFF→`/v1/wine-pairings/pairing` 또는 `/chat` 요청 및 X-Session-Id 계약을 유지한다.
2. STREAM의 rank/name/comment/reason 청크는 기존 reducer와 presentation buffer가 조립한다. B는 조립된 slides만 렌더링한다.
3. `hasNext:false`는 필드 종료일 뿐 전체 추천 완료로 해석하지 않는다. JSON 프레임이 권위 데이터이며 기존 로직이 최종 슬라이드로 교체한다.
4. 전체 완료는 기존 ReadableStream 종료 정책을 유지한다. 오류·초기 skeleton·재시작·composer 활성화 정책은 View에 남긴다.
5. A/B 비교 때문에 hook을 두 번 실행하지 않는다. 동일한 부모가 가진 slides를 재사용하며 데이터 복사 store·별도 fetch·타이머·자동 재요청은 추가하지 않는다.
6. 캐러셀 이동 인덱스와 설명 열림만 로컬 UI 상태다. page/layout은 Server Component를 유지하고 B와 상호작용 하위만 기존 Client 경계에 둔다.

## 7. 캐러셀·반응형

- 추가 피드백: 스크롤 viewport에는 가로 padding/gap을 두지 않고 각 슬라이드를 viewport 100% 폭으로 배치한다. 페이지 좌우 여백 20px는 슬라이드 안쪽으로 이동해 다음 카드가 정지 상태에서 보이지 않게 한다. dot은 A와 동일한 6px 원·6px 간격·활성 보라색/비활성 ink-muted 25%·상단 16px 간격을 사용한다. 기존 dot 클릭/스와이프 이동은 유지한다.

- A처럼 CSS scroll-snap 기반 가로 스와이프를 유지하고 데이터 순서를 보존한다. 빈 slides면 null을 렌더링한다.
- 이미지와 요약 영역은 mobile-first flex, 맛 지표는 2×2 grid. 흰색 카드/연보라 면/보라 강조를 디자인에 맞춘다.
- 긴 제목·지역·설명은 wrap하고 320/390/430px에서 가로 넘침을 방지한다. 외부 이미지에는 sizes와 object-contain을 적용한다.
- 첫 표시가 스켈레톤이어도 확정 데이터로 바뀔 때 슬라이드와 disclosure를 불필요하게 remount하지 않는다. 턴 내 index identity를 유지한다.
- dot은 실제 button으로 이전/다음 슬라이드 이동을 지원하고 현재 항목은 aria-current로 표시한다. 새 청크/새 슬라이드 때문에 사용자가 읽는 항목을 강제로 이동하지 않는다.
- 기존 A의 주석에는 새 슬라이드 자동 이동 설명이 있지만 현재 구현에는 해당 effect가 없다. B 설계에 존재하지 않는 동작을 승계했다고 기록하지 않는다.
- 펼침 상태의 서로 다른 높이를 허용하고 읽기 순서/하단 입력창 겹침을 확인한다. reduced-motion 시 스크롤/효과 애니메이션을 줄인다.

## 8. 예상 파일과 구현 순서

1. `shared/ui/molecule/disclosure-card.tsx`와 스토리: 공통 Card/Button 합성, 접근성.
2. `feature/wine-pairing-chat/ui/WineRecommendationSlideB.tsx`와 스토리: 위 디자인 및 데이터 매핑. 순수 포맷 로직은 필요한 경우 feature/lib에 분리한다.
3. 같은 ui 경로의 `WineRecommendationCarouselB.tsx`와 스토리: 기존 props를 재사용하고 슬라이드·dot 이동을 조합한다.
4. A/B 비교 스토리에 같은 fixture와 동일 스트리밍 변경 시퀀스를 전달한다. 삭제된 wine-red/white/sparkling 파일을 새 fixture에서 참조하지 않는다.
5. `WinePairingChatView` 및 props에 renderer 선택만 추가한다. 기본 A를 유지하고 새 `web/src/app/wine/recommend/page.tsx`(Server)에 B를 연결한다. 기존 chat page는 보존한다.
6. `/wine/keywords`의 snapshot 저장 성공 후 공통 목적지를 `/wine/chat`으로 유지하고 베타 인증 Middleware에서 그룹별로 분기한다. 저장 실패 시 이동하지 않으며 replace 정책을 유지한다. 해당 페이지 plans/docs 및 라우팅 테스트도 함께 갱신한다.
7. 단위·브라우저·타입·lint 검증 후 새 페이지 전용 `docs/wine-recommend.md`를 작성한다. 기존 chat 문서는 기존 A 화면을 유지한다고 기록한다. 커밋·푸시는 별도 요청에 따른다.

## 9. 검증과 완료 기준

- 동일 slides로 A와 B의 순위·이름·요약·추천 이유가 일치한다.
- Default/Single/Multiple/Empty/Streaming/Committed/ReasonExpanded/LongReason/NullTaste/NoImage 스토리를 제공한다.
- 추천 이유 summary의 열기/닫기·키보드·native expanded 상태·닫힌 본문과 슬라이드별 독립 상태를 검증한다.
- STREAM에서 설명이 늘어나고 JSON 확정으로 교체되는 경우 펼침/캐러셀 위치가 유지된다.
- 진행 중 사진 없음은 점 스켈레톤, 확정 후 사진 없음은 병 이미지/오버레이, 사진 수신 후 실제 사진을 표시한다.
- null 바디를 포함해 없는 메타데이터를 mock으로 채우지 않는다. 빈티지·도수 누락 시 뱃지와 `-`를 확인한다. 각 맛 지표 누락 시 “준비중입니다.” 및 5개 점이 모두 비활성색인지 확인한다. 맛 점수 0도 정상 표시한다.
- Wine21 CTA의 href/target/rel 및 확정 전 활성화 정책을 검증하며 테스트 중 외부 사이트로 실제 이동하지 않는다.
- 320/390/430px 및 넓은 화면에서 긴 제목/설명, 펼침 높이, horizontal overflow, composer 회피를 확인한다.
- 비교 화면이 추가 API 요청을 만들지 않고 기존 A와 대화 reducer/presentation 테스트가 통과한다.
- keywords 추천 성공 후 공통 경로 `/wine/chat`으로 replace 이동하고 snapshot shape는 기존과 같음을 검증한다. Middleware가 B 인증 그룹만 `/wine/recommend`로 redirect한다. 일반 후속 대화/재추천/소비된 snapshot 처리는 두 UI에서 동일하다.

상태: 새 `/wine/recommend` 및 keywords 이동, A 유지와 B UI 구현 완료. 단위·Storybook·타입·lint 및 실제 로컬 목업 모바일/키보드/후속 대화 검증을 수행한다. 커밋·푸시는 별도 요청에 따른다.
