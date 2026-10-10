# 홈 첫 방문 소개 다이얼로그 설계 — /

- 작성일: 2026-10-10
- 상태: 구현 완료 — 타입·린트·단위 테스트 및 Chrome 검증
- 대상 페이지: 홈(/)
- 목적: 홈에 처음 도착한 브라우저에 전체 화면 소개 다이얼로그를 약 1초 표시한다.
- 범위: 홈의 쿠키 확인, 공통 Dialog 활용, 자동 닫기 및 닫힐 때 방문 여부 저장.
- 제외: 별도 소개 페이지, 소개 리다이렉트, 미들웨어 변경, 기존 인증·A/B 배정 변경, 분석 SDK 도입.

## 1. 핵심 흐름

1. 기존 베타 인증을 거쳐 홈에 진입한다.
2. 홈 Server Component에서 isFirstVisit 쿠키를 확인한다.
3. 쿠키가 없거나 true이면 홈 위에 전체 화면 IntroDialog를 표시한다.
4. 실제 표시 후 약 1초가 지나면 다이얼로그를 닫는다.
5. 닫힐 때 isFirstVisit=false 저장 요청을 보낸다. 응답과 관계없이 홈을 사용할 수 있다.
6. 이후 쿠키 값이 false이면 소개 화면을 생략한다.

소개 화면은 라우트가 아니라 홈의 컴포넌트다. URL 변경, push/replace, 목적지 query, 임시 통과권을 사용하지 않는다. 열림·서버 렌더링·프리페치 시점에는 방문 완료를 저장하지 않는다.

미인증 사용자는 기존대로 /beta로 이동하며, 인증 후 홈에 도착했을 때 소개 표시 여부를 판단한다. 추천 페이지 등 홈 이외의 직접 진입에는 표시하지 않는다. 다른 페이지에서 홈으로 처음 이동하는 경우에는 표시 대상이다. 기존 access/refresh token과 A/B 라우팅 정책은 유지한다.

## 2. 쿠키 정책

| 항목 | 정책 |
| --- | --- |
| 이름 | isFirstVisit |
| 저장 값 | 문자열 false — 소개 다이얼로그를 닫았음 |
| 표시 조건 | 쿠키 없음 또는 값이 false가 아님 |
| 미설정 상태 | 첫 방문으로 간주. 미리 true를 저장할 필요 없음 |
| 유효 기간 | 1일(24시간), Max-Age=86400초 |
| Path | / |
| HttpOnly | true — 서버 확인, 완료 핸들러에서 저장 |
| SameSite | Lax |
| Secure | 운영 환경에서 true |
| Domain | 지정하지 않는 host-only 쿠키 |
| 저장 시점 | 자동 또는 사용자 조작으로 다이얼로그가 닫힐 때 |

문자열 false를 truthy/falsy로 판단하지 않고 정확히 비교한다. 다이얼로그를 닫아 쿠키가 저장된 시점부터 24시간 후 만료되며, 이후 홈에 진입하면 다시 표시한다. 자정 기준 초기화가 아니며 일반 홈 방문만으로 유효 기간을 연장하지 않는다. 쿠키 삭제·다른 브라우저·시크릿 모드에서도 다시 표시될 수 있다. 방문 쿠키는 인증·권한·A/B 배정 또는 고유 사용자 식별에 사용하지 않는다.

## 3. 컴포넌트 구성과 경계

| 경로(web/src/app 기준) | 책임 |
| --- | --- |
| page.tsx | Server Component 유지, await cookies()로 표시 여부 확인, 홈과 Dialog 조립 |
| feature/home/ui/HomeView.tsx | 기존 홈 UI 유지 |
| feature/home/ui/IntroDialog.tsx | Client Component, 공통 Dialog·타이머·닫기 관리 |
| feature/home/api/use-intro.ts | 최신 상태 Query 및 닫힐 때 완료 Mutation |
| shared/ui/molecule/dialog.tsx | 기존 Dialog 재사용, 필요하면 fullscreen variant 확장 |
| shared/ui/molecule/dialog.stories.tsx | 전체 화면 variant와 접근성 검증 |
| api/intro/complete/route.ts | 방문 쿠키를 false로 저장하는 서버 경계 |
| api/intro/status/route.ts | 캐시된 홈에서도 현재 쿠키를 확인하는 읽기 전용 서버 경계 |

- 현재 홈 page.tsx는 Server Component, HomeView는 Client Component다. 페이지 전체에 새 use client 경계를 추가하지 않는다.
- Dialog의 controlled open·타이머는 컴포넌트 내부에 둔다. 전역 Zustand store를 추가하지 않는다.
- 완료 요청은 TanStack Query Mutation 패턴을 사용한다. 응답을 로컬 상태나 store에 복제하지 않는다.
- 쿠키별 표시 상태가 공유 정적 캐시에 섞이지 않게 홈의 동적 렌더링·캐시 동작을 확인한다.
- 서버 prop은 초기값이다. 홈 마운트마다 GET /api/intro/status로 현재 쿠키를 조회한 뒤 표시 여부를 결정한다. 조회 실패 시 서버 초기값을 사용한다. 재마운트 또는 오래된 프리페치 결과로 다시 열리지 않도록 닫힌 시각을 sessionStorage에 기록하고 24시간 후 만료시킨다.
- 보조 상태는 닫힐 때만 시각과 함께 갱신하고 저장 예외를 처리한다. 보조 상태도 24시간 후 만료시켜 같은 탭을 오래 유지해도 영구적으로 표시를 생략하지 않는다. 새 문서 진입의 장기 방문 여부는 쿠키가 기준이다. 오래된 초기 prop만으로 만료를 판단하지 않도록 홈 재진입 시 최신 서버 판단 또는 기록된 만료 시각을 확인한다.

## 4. 공통 Dialog·디자인·접근성

기존 shared/ui/molecule/dialog.tsx 및 Storybook을 우선 활용한다. feature에서 shared/ui/shadcn을 직접 import하지 않는다.

- 현재 중앙 카드 크기·최대 폭·transform·둥근 모서리 스타일과 충돌하지 않도록 fullscreen variant 또는 공개 API 확장을 검토한다.
- DialogContent는 viewport 전체를 덮고 내부 콘텐츠만 모바일 중심 폭에 맞춘다. 모바일 주소창·safe area·가로 overflow를 확인한다.
- 흰색 MYSOMM 워드마크와 그 아래 작은 “내 손 안의 소믈리에” 문구를 중앙에 배치한다. primary(#6E3AF5) 배경으로 홈을 덮는다. 건너뛰기 버튼은 제공하지 않는다.
- CSS opacity/transform 기반 장식 애니메이션과 prefers-reduced-motion을 지원한다.
- 의미 있는 Dialog title/description을 제공한다. 모달 동안 배경 포커스·상호작용·스크롤을 차단한다. 홈 내부 스크롤 컨테이너도 확인한다.
- ESC·기본 닫기를 허용하고 자동 닫기와 동일한 완료 처리를 사용한다.
- 자동으로 열려 trigger가 없을 수 있다. 닫힐 때 홈 제목 등 명시적인 요소로 포커스를 이동한다.
- 포커스가 남은 조상을 임의로 aria-hidden 처리하지 않는다. 기존 Dialog primitive의 접근성 기능을 활용한다.

## 5. 표시 시간과 닫기

Dialog portal/content가 마운트되고 문서가 visible이며 화면이 페인트된 후 약 1초를 센다. 백그라운드에서는 시작하지 않고, 진행 중 숨겨지면 중단했다가 복귀 후 남은 시간만 진행한다.

자동 닫기 시 open=false를 먼저 적용한 뒤 완료 Mutation을 요청한다. ESC·기본 닫기도 공통 close 함수로 연결한다. 단순 unmount나 다른 경로 이탈만으로 방문 완료를 기록하지 않는다.

쿠키 저장 성공 여부와 관계없이 홈을 사용할 수 있다. hydration·애니메이션 때문에 실제 표시 시간은 정확히 1초와 다를 수 있다. 미들웨어에서 대기하지 않으며, Dialog 표시 중 와인 분석·추천 API를 시작하지 않는다. 타이머와 포커스 관리는 Client Component가 담당하고 CSS-only 토글로 대체하지 않는다.

## 6. 방문 완료 처리 계약

프론트엔드 전용 Route Handler이며 기존 백엔드 API 계약은 변경하지 않는다.

- endpoint: POST /api/intro/complete
- 요청: 서버가 고정 값 false를 저장하므로 목적지나 임의 쿠키 값은 받지 않는다.
- 성공: 204 No Content 및 Set-Cookie: isFirstVisit=false.
- 기존 인증 정책에 맞게 핸들러에서 베타 인증을 확인한다. 공개 API 목록과 미들웨어는 변경하지 않는다.
- same-origin·method를 검증하고 응답에는 Cache-Control: no-store를 적용한다.
- 반복 요청은 같은 방문 상태를 저장하는 멱등 동작이다. DB나 백엔드를 호출하지 않는다.
- timeout·재시도를 유한하게 제한한다. 응답 대기나 실패는 닫힘 상태에 영향을 주지 않는다.
- 실제 구현은 조회와 저장 모두 3초 timeout, 자동 재시도 없음이다. GET /api/intro/status는 인증 후 { isFirstVisit: boolean }을 no-store로 반환하며 쿠키를 쓰지 않는다.
- 쿠키·인증 값·내부 오류를 로그에 노출하지 않는다.

## 7. 예외 처리

- 쿠키 저장 실패/차단: 정상적으로 닫고 홈을 사용한다. 새 방문에는 다시 표시될 수 있다.
- 같은 탭 홈 재진입: 닫힘 보조 상태로 오래된 서버 prop에 의한 재표시를 방지한다. 브라우저 전체 정확히 한 번 표시는 보장하지 않는다.
- JavaScript 미사용: 홈을 가리지 않게 점진적으로 적용한다. Dialog는 클라이언트에서 활성화하고 서버 HTML의 홈은 접근 가능하게 유지한다.
- hydration 이전 홈이 잠깐 보일 수 있다. 이를 숨기려고 영구 차단될 수 있는 서버 overlay를 추가하지 않는다.
- unmount 시 타이머·visibility listener를 정리한다. 중복 클릭·Strict Mode에서도 close/Mutation이 중복되지 않게 한다.
- 닫기 후 인증 만료로 저장 요청이 실패해도 다시 열거나 별도 로그인 이동을 강제하지 않는다.
- 여러 탭이 동시에 처음 홈을 열면 각 탭에서 소개가 보일 수 있다.

## 8. 측정 정책

- 별도 소개 라우트나 GA4 page_view를 추가하지 않는다. 페이지는 계속 홈이다.
- 향후 실제 열림·닫힘은 GA4 홈 UI 이벤트로 측정할 수 있다. 프리페치는 표시 이벤트가 아니다.
- 쿠키 값을 분석 도구에 보내지 않는다. Supabase A/B 추천 노출·선택 지표에도 포함하지 않는다.
- 이번 변경은 계획만 다룬다. 분석 SDK나 이벤트 구현은 추가하지 않는다.

## 9. 구현·검증 순서

1. 최종 시안·문구·자산을 확인하고 쿠키 유효 기간 24시간을 적용한다.
2. 공통 Dialog fullscreen variant와 Storybook을 구현/검증한다.
3. 방문 완료 핸들러와 Mutation을 구현한다.
4. 홈의 쿠키 확인 및 IntroDialog를 연결한다.
5. 표시 시간·공통 close·포커스 복귀·탭 보조 상태를 구현한다.
6. 타입 검사·린트·관련 테스트 및 실제 브라우저 production build 검증을 수행한다.

| 시나리오 | 기대 결과 |
| --- | --- |
| 홈 첫 방문, 쿠키 없음/true | 표시 → 약 1초 후 닫기 → false 저장 요청 |
| 홈 재방문, false | 홈만 표시 |
| 쿠키 저장 후 24시간 경과 | 다음 홈 진입 시 다시 표시 |
| 미인증 홈 접속 | 기존 베타 인증 후 홈에서 소개 판단 |
| 추천 페이지 직접 진입 | 소개 없음, 기존 A/B 라우팅 유지 |
| ESC·기본 닫기 | 닫기 및 false 저장, URL 변경 없음 |
| 쿠키 저장 지연·실패·차단 | 정상 닫힘, 홈 사용 가능 |
| 프리페치·API·정적 파일 | 방문 완료 저장 없음 |
| 오래된 프리페치 후 홈 재진입 | 같은 탭에서 불필요한 재표시 방지 |
| 모바일·키보드·스크린리더 | 전체 화면, 배경 차단, 제목 제공, 포커스 복귀 |
| JavaScript 미사용 | 홈 콘텐츠 접근 가능 |
| 백그라운드·reduced-motion | 표시 시간 및 모션 정책 유지 |
| unmount·중복 클릭·Strict Mode | 타이머 정리, 중복 완료 처리 방지 |

홈 개발 문서 docs/home.md에 실제 구성과 결정 사항을 반영했다. Next.js production build 검증은 별도이며, 실행 중인 개발 서버의 빌드 디렉터리를 덮어쓰지 않기 위해 이번 검증에서 수행하지 않았다.

## 10. 참고 기준

- web/AGENTS.md, web/GUIDE.md
- MCP: data-flow-layering, bff-api-gateway, css-only-state, rsc-rendering, style-implementation, shadcn-ui-mcp
- 현재 홈 page.tsx, feature/home/ui/HomeView.tsx
- 공통 shared/ui/molecule/dialog.tsx 및 dialog.stories.tsx
- 기존 middleware.ts의 인증·A/B 로직은 수정 대상에서 제외한다.
