# `/wine/keywords` AI 추천 로딩 스켈레톤

- 기준: 사용자 제공 wine/list 로딩 스크린샷, `designs/enhanced_design_2.png`.
- MCP: style-implementation, css-only-state, storybook-authoring.
- API: `api/mysom-wine-pairing.md`의 recommend-menu. API·BFF 계약은 변경하지 않는다.

MenuCategoryRecommendationPage의 hydration 및 추천 조회 pending 패널은 SkeletonList의 menu variant를 사용한다. 카테고리 제목과 메뉴 배지 윤곽을 가진 세 개의 카드를 표시해 실제 결과의 정보 구조를 예고한다. 와인 생성 variant와 밝은 배경·보라색 블록·pulse 표현만 공유한다. role=status, aria-busy 및 상태 안내를 유지한다. Client 경계·Query·선택·CTA·성공 결과·오류 재시도 스피너는 그대로 유지한다.

Storybook에서 pending 스켈레톤 표시, 결과 도착 후 스켈레톤 제거 및 메뉴 선택을 검증한다. 공통 Skeleton은 reduced-motion 애니메이션 중단을 지원한다.
