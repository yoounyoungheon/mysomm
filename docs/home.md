# `/` 홈 아이콘 표시

취향 프로필 및 내 취향 빠르게 채우기에서 사용하는 EmojiBadge 배경은 기존 44×44px로 유지한다. 내부 이미지는 26×26px에서 32×32px로 확대하여 한쪽 여백을 9px에서 6px로 축소했다. 기존 이미지 파일, 둥근 보라색 배경, 카드 간격, 라우팅 및 토스트 동작은 변경하지 않는다.

## 첫 방문 소개 다이얼로그

홈 Server Component가 isFirstVisit 쿠키를 확인하고 기존 HomeView와 IntroDialog를 함께 조립한다. 별도 소개 페이지나 미들웨어 분기는 없다. 미인증 사용자는 기존 베타 인증 후 홈에 도착했을 때 소개를 볼 수 있으며, 다른 페이지 직접 진입에는 표시하지 않는다.

- 쿠키 없음/true: 전체 화면 소개 표시. 정확한 문자열 false: 생략.
- 실제 표시 후 약 1초가 지나면 닫는다. 백그라운드 탭에서는 표시 시간을 중단한다.
- 자동 닫기, ESC, 기본 닫기 버튼은 같은 close 함수를 사용한다. 건너뛰기 버튼은 제공하지 않는다.
- 닫힐 때 POST /api/intro/complete로 isFirstVisit=false를 저장한다. HttpOnly, SameSite=Lax, Path=/, 운영 Secure, Max-Age=86400초.
- 저장 응답을 기다리지 않고 닫는다. 실패/차단 시 홈은 정상 사용하며 이후 다시 표시될 수 있다.
- 홈 마운트 시 GET /api/intro/status로 현재 쿠키를 확인해 오래된 서버/프리페치 초기값을 보정한다. 조회 실패 시 서버 초기값을 사용한다.
- sessionStorage의 mysomm:intro-closed-at는 같은 탭의 재표시 방지용 시각이며 24시간 후 만료한다. 장기 방문 상태는 쿠키가 기준이다.
- 조회·저장은 same-origin BFF를 사용하고 베타 인증을 확인한다. 저장에는 Origin/Host 검증을 추가한다. 둘 다 no-store, 3초 timeout, 자동 재시도 없음이다.
- 분석·추천 API, GA4 또는 Supabase 기록을 추가하지 않는다.

### UI와 접근성

기존 공통 DialogContent에 fullscreen 옵션을 추가했다. viewport 전체를 primary(#6E3AF5) 배경으로 덮고 중앙에 흰색 MYSOMM 워드마크, 그 아래 작은 “내 손 안의 소믈리에” 문구를 표시한다. feature에서는 공통 molecule Dialog를 사용한다.

Dialog primitive가 배경 포커스·상호작용·스크롤을 차단한다. 접근 가능한 제목과 설명을 제공하고 닫힐 때 home-heading으로 포커스를 이동한다. 중복된 공통 DialogClose를 제거하여 기본 primitive의 닫기 버튼만 남겼다. 장식은 CSS 기반이며 reduced-motion을 지원한다.

Dialog는 클라이언트에서 활성화하므로 JavaScript 미사용 시 홈 HTML을 가리지 않는다. hydration 전 홈이 잠깐 보일 수 있다. URL이나 뒤로가기 기록을 변경하지 않는다. 쿠키 만료 시 열린 홈에서 자동으로 띄우지 않고 다음 홈 진입 때 판단한다.

### 파일 구성

- src/app/page.tsx: 서버 쿠키 확인 및 조립.
- feature/home/ui/IntroDialog.tsx: 로컬 open, 표시 타이머, 닫기, 포커스 복귀.
- feature/home/api/use-intro.ts: TanStack Query 상태 조회 및 완료 Mutation.
- src/lib/intro/intro-policy.ts: 쿠키명, 24시간 TTL, 1초 표시 시간, 탭 보조 상태 검증.
- src/app/api/intro/status/route.ts 및 complete/route.ts: 상태 조회와 방문 완료 저장.
- shared/ui/molecule/dialog.tsx: 전체 화면 옵션. 기존 기본 카드 옵션은 유지.

### 검증

쿠키 값·24시간 경계·인증·same-origin·Secure 단위 테스트, 전체 화면 및 자동 닫기/재방문/저장 실패/ESC 닫기/같은 탭 재진입 Storybook 테스트를 추가했다. primary 배경, 흰색 워드마크 및 건너뛰기 버튼 부재도 검증한다. 기존 인증·A/B 회귀 테스트를 포함한 전체 단위 테스트와 변경 파일의 타입·린트 검사를 수행했다. 실제 Chrome 모바일 viewport에서도 표시, 포커스 복귀, 쿠키 저장, 재방문 생략 및 만료된 쿠키의 재표시를 확인했다. Next.js production build는 수행하지 않았다.
