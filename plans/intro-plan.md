# 전역 첫 방문 소개 다이얼로그 설계 — RootLayout

- 작성일: 2026-10-10
- 상태: RootLayout 전역 적용 구현 및 검증
- 대상: RootLayout을 사용하는 모든 페이지(베타 인증 화면 포함)
- 목적: 어느 페이지로 처음 접속하든 소개 다이얼로그를 약 1초 표시한다.
- 범위: 서버 쿠키 확인, 전체 화면 Dialog, 자동 닫기, 방문 쿠키 저장, 소개 API 공개 허용.
- 제외: 별도 소개 라우트, 소개 리다이렉트, 기존 인증·A/B 정책 변경, 분석 SDK 도입.

## 1. 사용자 흐름

1. 기존 라우팅/인증 정책에 따라 실제 페이지에 도착한다. 미인증 보호 경로는 기존처럼 /beta로 이동한다.
2. RootLayout이 방문 쿠키 초기값을 확인한다.
3. 최초 클라이언트 레이아웃 마운트에서 최신 방문 상태를 조회한다. 조회 실패 시 서버 초기값을 사용한다.
4. 쿠키 없음/true이면 전체 화면 IntroDialog를 표시한다.
5. 실제 표시 후 약 1초가 지나면 닫고 isFirstVisit=false 저장 요청을 보낸다.
6. 쿠키가 유효하면 이후 접속에는 생략한다.

페이지 이동을 위해 push/replace를 호출하지 않으며 URL과 뒤로가기 기록을 변경하지 않는다. RootLayout은 클라이언트 이동 중 유지되므로 페이지마다 다시 열지 않는다. 첫 판단은 레이아웃 마운트마다 한 번이며, 24시간 후 새로고침/새 문서 접속 시 다시 판단한다. 열린 앱을 24시간째에 자동으로 가리지 않는다.

## 2. 쿠키 정책

| 항목 | 정책 |
| --- | --- |
| 이름 | isFirstVisit |
| 저장 값 | 문자열 false |
| 표시 조건 | 쿠키 없음 또는 값이 정확한 false가 아님 |
| 저장 시점 | 자동 또는 사용자 조작으로 Dialog를 닫을 때 |
| 유효 기간 | 24시간, Max-Age=86400초 |
| 기타 | HttpOnly, SameSite=Lax, Path=/, 운영 Secure, host-only |

처음부터 true를 저장할 필요는 없다. false 문자열을 truthy/falsy로 판단하지 않는다. 만료는 저장 시점 기준이며 자정 초기화가 아니다. 일반 페이지 방문은 만료 시간을 연장하지 않는다. 쿠키 삭제·다른 브라우저·시크릿 모드에서는 다시 표시될 수 있다. 인증·권한·A/B 배정 또는 고유 사용자 식별에 사용하지 않는다.

## 3. 구성과 RSC/RCC 경계

| 경로(web/src 기준) | 책임 |
| --- | --- |
| app/layout.tsx | async Server Component, cookies 초기값, Providers 내부 전역 조립 |
| app/page.tsx | 기존 HomeView만 조립 |
| app/feature/intro/ui/IntroDialog.tsx | Client Component, controlled open, 타이머, 닫기, 포커스 복귀 |
| app/feature/intro/api/use-intro.ts | 최신 상태 Query, 방문 완료 Mutation |
| app/shared/ui/molecule/dialog.tsx | 공통 fullscreen 옵션 |
| app/api/intro/status/route.ts | 방문 쿠키 상태 조회 |
| app/api/intro/complete/route.ts | 고정 false 방문 쿠키 저장 |
| lib/intro/intro-policy.ts | 쿠키명, TTL, 표시 시간, 탭 보조 상태 |
| middleware.ts | 소개 API 두 경로만 공개 허용 |

RootLayout을 Client Component로 전환하지 않고 직렬화 가능한 boolean 초기값만 전달한다. 표시 상태는 로컬 useState, 서버 조회/완료는 TanStack Query로 관리한다. 전역 Zustand를 추가하지 않는다.

쿠키 조회로 RootLayout 하위 페이지의 동적 렌더링 범위가 확대됨을 고려한다. 사용자별 초기값을 공유 정적 캐시에 혼합하지 않는다. 최초 마운트의 GET 조회는 오래된 서버 초기값을 보정하며, 하위 페이지 이동만으로 반복하지 않는다.

## 4. UI와 접근성

- 기존 공통 molecule DialogContent의 fullscreen 옵션을 사용한다. feature에서 shadcn을 직접 import하지 않는다.
- primary(#6E3AF5) 배경, 중앙 흰색 MYSOMM, 아래 작은 “내 손 안의 소믈리에”를 유지한다.
- 건너뛰기 버튼은 없다. ESC 및 기본 닫기 버튼은 허용한다.
- viewport 전체를 덮고 모바일 주소창·safe area·가로 overflow를 확인한다.
- 접근 가능한 title/description을 제공하며 Dialog primitive의 배경 포커스·상호작용·스크롤 차단을 사용한다.
- 닫힐 때 기존 포커스가 연결되어 있고 숨겨지지 않았다면 복원한다. 그렇지 않으면 전역 app-content로 이동한다. 홈 전용 제목에 의존하지 않는다.
- CSS opacity/transform 장식과 reduced-motion 정책을 유지한다. Dialog의 포커스·비동기 타이머를 CSS-only 토글로 대체하지 않는다.

## 5. 표시 시간 및 완료

portal/content가 마운트되고 visible 상태에서 페인트된 뒤 약 1초를 센다. 숨겨진 탭에서는 시작하지 않고 진행 중 숨겨지면 중단했다가 복귀 후 남은 시간만 진행한다.

닫기 함수는 open=false를 먼저 적용하고 쿠키 Mutation을 요청한다. 응답 성공을 기다리지 않으며 실패해도 페이지를 사용할 수 있다. 자동·ESC·기본 닫기 모두 같은 함수로 처리한다. 단순 unmount만으로 완료를 기록하지 않는다.

타이머와 visibility listener는 정리하고 중복 클릭/Strict Mode 중복 완료를 방지한다. hydration·렌더링 지연 때문에 정확한 1초는 보장하지 않는다. 미들웨어에서 sleep하지 않는다.

기존 하위 페이지의 데이터 조회·추천 비즈니스 로직은 유지한다. 소개 모달은 페이지 요청 자체를 중단하는 게이트가 아니다. 향후 분석 이벤트의 실제 화면 노출은 모달에 가려진 상태와 구분해야 하지만 이번 변경에서 분석 수집은 추가하지 않는다.

## 6. 프론트엔드 API 계약

백엔드 API 계약은 변경하지 않는다.

| endpoint | 계약 |
| --- | --- |
| GET /api/intro/status | { isFirstVisit: boolean }, 읽기 전용, private/no-store |
| POST /api/intro/complete | 고정 false 쿠키, 204 No Content, no-store |

베타 인증 전에도 전역 소개를 표시·완료할 수 있도록 두 경로만 공개 API로 허용한다. 방문 쿠키는 권한과 무관하며 임의 쿠키명/값·목적지·본문을 받지 않는다. POST의 Origin/Host 비교와 cross-site 거부는 유지한다. 공개 허용을 /api/intro 전체 prefix로 확대하지 않는다. 다른 보호 API, 토큰 갱신, A/B 라우팅은 유지한다.

브라우저는 same-origin BFF만 호출한다. 조회·저장 모두 3초 timeout, 자동 재시도 없음이다. DB·백엔드 호출과 민감 값 로그를 추가하지 않는다.

## 7. 예외 처리

- 저장 실패/차단: 정상 닫힘. 이후 새 방문에는 다시 표시될 수 있다.
- 재마운트: sessionStorage의 mysomm:intro-closed-at 시각으로 동일 탭 재표시를 보완한다. 24시간 후 만료하며 저장 예외를 무시한다. 장기 기준은 쿠키다.
- JavaScript 미사용: Dialog를 클라이언트에서 활성화하므로 페이지 HTML을 가리지 않는다. hydration 이전 페이지가 잠깐 보일 수 있다.
- 여러 탭의 동시 첫 진입: 각 탭에 표시될 수 있다. 브라우저 전체 정확히 한 번을 보장하지 않는다.
- RootLayout이 유지되는 클라이언트 이동: 상태와 남은 타이머를 유지한다. 쿠키를 중복 저장하거나 다시 열지 않는다.

## 8. 검증 범위

- 쿠키 문자열·24시간 경계·운영 Secure·Origin 거부.
- 미인증 GET/POST 가능 및 두 경로만 미들웨어 공개 허용.
- 다른 보호 API·access/refresh·A/B 보정 회귀 테스트.
- Storybook: primary 배경·흰색 워드마크·작은 문구·자동 닫기·ESC·저장 실패·재방문·탭 보조 상태·전체 화면 크기·전역 포커스 복귀.
- 실제 Chrome: 미인증 /beta 및 인증 /wine/list 직접 진입의 표시·저장·재방문 생략, 홈에서 리스트로 클라이언트 이동 시 재표시 방지.
- 타입·린트·단위 테스트. production build는 실행 중인 개발 서버의 빌드 디렉터리를 덮어쓰지 않도록 별도 검증 대상이다.

## 9. 문서 및 참고 기준

- 실제 구현: docs/intro.md. docs/home.md는 전역 소개 문서를 참조한다.
- web/AGENTS.md, web/GUIDE.md 및 MCP의 data-flow-layering, bff-api-gateway, rsc-rendering, css-only-state, style-implementation 정책.
- 기존 공통 Dialog와 Storybook, RootLayout/Providers 및 인증 미들웨어.
