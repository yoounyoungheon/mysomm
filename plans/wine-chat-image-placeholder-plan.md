# `/wine/chat` 추천 이미지 스켈레톤

추천 카드 이미지 슬롯도 가로:세로 3:4 비율로 맞춘다. 기존 폭 68px(480px 이상 72px)은 유지하고 높이는 aspect-ratio로 결정한다. fallback·실제 사진·추천 중 스켈레톤에 동일한 슬롯을 적용하며 카드 전체 높이와 텍스트 배치는 유지한다.

2026-10-08 변경: 추천 카드의 완료 후 이미지 누락 fallback만 `/images/wines/wine-bottle.png`로 교체한다. 기존 shared Card·Image 슬롯과 `bg-black/45` 오버레이를 유지하고 문구는 `이미지\n준비중` 두 줄로 중앙 정렬한다. 진행 중 점 스켈레톤·실제 사진·상세 뒤집기·API 계약은 유지한다. 공용 resolveWineBottleImage와 wine/list에는 영향을 주지 않는다. NoImage/CompletedWithoutImage 및 사진 수신 전환 스토리로 검증한다.

최종 실루엣 기준: 사용자가 추가로 제공한 병 사진처럼 짧은 캡·가는 목·둥글게 벌어지는 어깨·수직 몸통·거의 평평한 바닥으로 구성한다. 바닥은 끝을 좁히지 않고 모서리만 작게 다듬는다. 표시 조건과 색·애니메이션은 유지한다.

- 기준: 사용자 제공 wine/list 로딩 스크린샷 및 `designs/enhanced_design_3_1.png`의 카드 이미지 영역.
- MCP 가이드: style-implementation, css-only-state, storybook-authoring.
- API: `api/mysom-wine-pairing.md`. API 계약과 BFF·스트리밍 데이터 흐름은 변경하지 않는다.

기존 WineRecommendationSlide Client 경계를 유지하며, 실제 와인 사진이 없는 경우 기존 병 그림·준비중 오버레이 대신 연한 보라색 pulse 스켈레톤을 표시한다. 이미지가 아직 없는 스트리밍 상태도 동일하게 표시하며 사진이 도착하면 실제 이미지로 교체한다. 카드 크기와 텍스트·뒤집기 상태는 유지한다.

shared/ui의 기존 로딩 UI(PhotoPicker) 색감과 CSS pulse 방식을 따르는 공통 Skeleton atom과 사용 예시 스토리를 추가한다. 이미지 슬롯에 이를 재사용하고, reduced-motion에서는 애니메이션을 중단한다. 사진이 없는 완성 카드·스트리밍 카드·실제 사진 및 데이터 갱신 시 전환을 Storybook으로 검증한다.

사용자의 점 행렬 레퍼런스를 반영해 이미지 슬롯은 SVG 점들이 와인병 실루엣을 이루고 세로 순서로 부드럽게 밝아지는 WineImageSkeleton atom으로 변경한다. SVG·CSS 기반으로 외부 이미지·타이머·추가 의존성이 필요 없으며 reduced-motion에서는 정지한다. 실제 진행률은 없어 퍼센트는 표시하지 않는다.

표시 정책 보완: 이미지가 없고 카드가 미확정(`isCommitted=false`)인 추천 진행 중에만 점 스켈레톤을 표시한다. 최종 JSON으로 확정된 카드는 사진이 없으면 기존 resolveWineBottleImage의 샘플 사진에 어두운 오버레이와 `준비중...` 안내를 표시한다. 실제 사진은 유지한다. 점 간격을 줄이고 어깨를 cosine 곡선, 바닥을 원호로 구성해 더 가늘고 둥근 와인병을 만든다. 이미지 없이 추천이 확정되는 상태 전환도 검증한다.

초기 hydration 및 SSE 첫 결과 대기는 SkeletonList의 wine variant로 분리한다. 와인병 점 행렬과 추천 텍스트 윤곽을 나란히 표시하고 상태 안내·role=status·aria-busy를 유지한다. 메뉴 variant와 색·톤만 공유하며 오류·빈 결과와 실제 캐러셀은 변경하지 않는다.
