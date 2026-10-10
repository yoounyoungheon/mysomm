# 전역 첫 방문 소개 다이얼로그 — RootLayout

RootLayout에서 방문 쿠키를 확인하고 Providers 내부에 IntroDialog를 한 번 조립한다. 홈뿐 아니라 베타 인증 화면과 추천 페이지 등 실제 렌더링되는 모든 페이지의 최초 접속에 적용된다. 인증에 의해 리다이렉트되는 경우 최종 페이지에서 표시한다.

## 표시 및 저장

- isFirstVisit 쿠키가 없거나 값이 false가 아니면 표시한다.
- portal/content가 표시된 뒤 약 1초 후 자동으로 닫는다. 백그라운드에서는 표시 시간을 중단한다.
- 닫힐 때 POST /api/intro/complete로 HttpOnly 방문 쿠키를 false로 저장한다. SameSite=Lax, Path=/, 운영 Secure, Max-Age=86400초.
- 저장 성공 여부와 관계없이 다이얼로그를 닫는다. 쿠키 저장이 실패해도 페이지를 사용할 수 있다.
- RootLayout 최초 마운트에서 GET /api/intro/status로 현재 쿠키를 확인하고 조회 실패 시 서버 초기값을 사용한다.
- sessionStorage의 mysomm:intro-closed-at는 동일 탭 재마운트 시의 재표시 방지용 시각이며 24시간 후 만료한다.
- 공유 RootLayout은 클라이언트 페이지 이동 중 유지되므로 이동마다 재표시하지 않는다. 만료 후 새로고침/새 문서 접속 시 다시 판단한다. 열린 앱을 24시간째에 자동으로 가리지 않는다.

## UI 및 접근성

공통 molecule DialogContent의 fullscreen 옵션으로 전체 viewport를 primary(#6E3AF5) 배경으로 덮는다. 중앙의 흰색 MYSOMM 아래에 작은 “내 손 안의 소믈리에” 문구를 표시한다. 건너뛰기는 없으며 ESC·기본 닫기와 자동 닫기는 동일한 완료 처리를 사용한다.

제목·설명, 배경 포커스·상호작용·스크롤 차단은 Dialog primitive를 사용한다. 닫힐 때 이전 포커스가 현재 문서에 남아 있고 숨겨지지 않았다면 복원하고, 그렇지 않으면 전역 app-content로 복귀한다. 홈 전용 요소에 의존하지 않는다.

Dialog는 클라이언트에서 활성화하므로 JavaScript 미사용 시 페이지 HTML을 가리지 않는다. hydration 전 페이지가 잠깐 보일 수 있다. 하위 페이지의 기존 데이터 조회·추천 비즈니스 로직은 그대로이며, 소개는 페이지 요청을 중단하는 기능이 아니다.

## API 및 보안

- GET /api/intro/status: { isFirstVisit: boolean } 반환, 읽기 전용, private/no-store.
- POST /api/intro/complete: 고정 false 쿠키를 저장하고 204 반환, no-store.
- 인증 전에도 표시·저장할 수 있도록 두 경로만 미들웨어의 공개 API 목록에 추가한다. 방문 쿠키는 인증이나 권한이 아니다.
- POST는 Origin을 요청 Host와 비교하고 cross-site 요청을 거부한다. 임의 목적지, 쿠키명 또는 쿠키 값을 받지 않는다.
- 다른 API의 베타 인증 및 추천 A/B 경로 보정은 유지한다.
- 조회·저장은 same-origin BFF만 사용하고 3초 timeout, 자동 재시도 없음이다. DB·백엔드·GA4·Supabase 호출을 추가하지 않는다.

## 파일 구성

- web/src/app/layout.tsx: 서버 쿠키 확인 및 전역 조립.
- web/src/app/feature/intro/ui/IntroDialog.tsx: 표시 시간·닫기·포커스 복귀.
- web/src/app/feature/intro/api/use-intro.ts: TanStack Query 조회·완료 Mutation.
- web/src/lib/intro/intro-policy.ts: 쿠키명·TTL·타이머·탭 보조 상태 정책.
- web/src/app/api/intro/status/route.ts 및 complete/route.ts: 공개 방문 상태/완료 계약.
- web/src/middleware.ts: 두 소개 API만 공개 허용.

홈에서 소개 컴포넌트를 제거했고 전용 feature/intro로 이동했다. 계획은 plans/intro-plan.md에 정리한다.
