# `/wine/recommend` 추천 B 화면

디자인 기준은 `designs/enhanced_design_v2.png`와 추천 이유 펼침 스크린샷이다. `/wine/keywords`가 기존 snapshot을 저장하고 공통 경로 `/wine/chat`으로 replace 이동하면 Middleware가 B 인증 그룹을 이 경로로 redirect한다. A 그룹의 이 경로 직접 접근은 `/wine/chat`으로 redirect한다. page는 Server Component이며 기존 WinePairingChatView에 recommendationVariant="B"를 전달한다. 기존 `/wine/chat`은 기본 A UI를 유지한다.

## 구조 및 상태

- WineRecommendationCarouselB → WineRecommendationSlideB: MYSOMM PICK/요약, 순위·이름·국가·지역·빈티지·도수·병 이미지, 2×2 맛 지표, 추천 이유, Wine21 링크.
- B에서는 기존 공통 도입 문구를 sr-only로 유지해 시안처럼 MYSOMM PICK과 추천 요약이 먼저 보이게 한다. A의 보이는 도입 문구는 그대로다.
- CSS scroll-snap 기반 가로 스와이프 및 버튼형 dot 이동. 현재 인덱스만 로컬 UI 상태이며 새 결과가 사용자의 읽는 위치를 강제로 이동하지 않는다.
- 각 슬라이드는 viewport 전체 너비이고 20px 여백은 슬라이드 내부에 둔다. 정지 상태에서 다음 카드는 보이지 않는다. dot은 A와 동일한 6px 원·6px 간격 및 활성/비활성 색을 사용한다.
- shared/ui DisclosureCard는 Card와 native details/summary 합성. 열림은 브라우저 open 속성, 화살표는 group-open CSS로 표현한다. React state·onToggle·타이머 없이 Enter/Space 및 클릭으로 열고 닫는다. 닫힌 본문은 브라우저가 접근성 트리에서 제외하며 청크 갱신 시 열린 노드를 유지한다.
- 초기 설명 미수신은 정적 비활성 헤더, 확정 후 설명 없음은 “추천 이유 정보가 없어요.” 안내.

## API 및 표시 정책

`api/mysom-wine-pairing.md`의 현재 계약을 그대로 사용한다. useWinePairingConversation, reducer, presentation buffer, BFF/API helper는 변경하지 않았다. STREAM 필드 조립과 최종 JSON 교체·세션 소비·오류 처리·일반 채팅/재추천·composer 활성화는 A/B가 공유한다. API 복제나 B 전용 요청은 없다.

- 큰 요약은 comment, 펼침 본문은 reason 원문. API에 없는 비교 설명을 생성하지 않는다.
- 빈티지/도수 뱃지는 항상 유지하며 값이 없으면 `-` 표시.
- 바디/당도/타닌/산도의 5개 점은 항상 표시한다. null이면 라벨 옆 “준비중입니다.”와 모든 점 비활성색, 실제 값이 있을 때만 해당 개수만큼 보라색 활성화. 0은 정상 값이며 mock 점수 없음.
- 실제 사진 우선. 진행 중 누락은 WineImageSkeleton, 확정 후 누락은 wine-bottle.png + 기존 어두운 오버레이 + “이미지 / 준비중”.
- 확정 후 Wine21 링크를 새 탭으로 연다(noopener noreferrer). 개별 상세 URL은 추정하지 않는다.
- 후속 재추천 턴도 B UI. 입력창·오류·재시작 흐름은 기존과 동일.

## 검증

공통 펼침 클릭/키보드, 단일/다중/빈 결과·이미지 유무·null/0점·긴 설명·스트림 확정 중 열린 상태, A/B View의 SSE 완료, keywords 목적지와 unit 회귀 테스트를 검증한다. 모바일은 로컬 BFF 목업으로 검사하며 실제 AI 요청을 호출하지 않는다.

검증 결과: 관련 Storybook 36개, 기존 단위 테스트 104개, 변경 범위 TypeScript·ESLint·diff 검사 통과. 실제 Next.js 목업 페이지에서 320/390/430px 가로 넘침 없음, native Enter/Space 설명 토글, 일반 후속 채팅을 확인했다. B 후속 재추천은 브라우저 Storybook에서 새 B 캐러셀 추가와 확정 링크 표시를 검증했다. API·hook·reducer·presentation 파일은 변경되지 않았다.
