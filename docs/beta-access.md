# 베타 사용자 접근 인증

## 추천 UI A/B 그룹

기준 `BETA_ACCESS_CODE`를 정확히 입력하면 A, 기준 코드에 `-B`를 붙여 정확히 입력하면 B로 인증한다. 접미사만 일치하는 다른 코드는 허용하지 않는다. 요청 `{ code }`와 성공 응답 `{ ok: true }`는 기존과 동일하다.

Access/Refresh JWT 모두 `recommendationVariant: "A" | "B"`를 서명한다. Middleware는 검증된 Access claim을 우선 사용하고, 갱신할 때는 검증된 Refresh claim의 그룹을 그대로 새 Access Token에 넣는다. 그룹이 없는 기존 정상 토큰은 A이며, 잘못된 그룹 값이 있는 토큰은 거부한다. 기존 BFF의 boolean 인증 검증도 유지된다.

| 그룹 | 추천 결과 경로 | 반대 경로 접근 |
| --- | --- | --- |
| A | `/wine/chat` | `/wine/recommend` → `/wine/chat` |
| B | `/wine/recommend` | `/wine/chat` → `/wine/recommend` |

키워드 선택 스냅샷 저장 후에는 공통으로 `/wine/chat`에 replace 이동한다. Middleware가 B를 `/wine/recommend`로 임시 redirect한다. query string을 유지하고 redirect 응답에 `Cache-Control: private, no-store`를 설정한다. 갱신과 redirect가 동시에 발생하면 새 Access Cookie도 함께 설정한다. 다른 페이지와 API는 그룹별로 분기하지 않는다.

두 결과 화면은 기존 API·SSE·버퍼링·재추천·후속 채팅 로직을 공유한다. 그룹을 클라이언트 상태나 저장소에 복제하지 않으며 코드/토큰 원문도 로그에 기록하지 않는다. 인증 성공 로그에는 기존 boolean 전용 로거 정책에 맞춰 `isVariantB` 플래그만 추가한다.

이미 인증된 `/beta` 방문은 홈으로 이동하므로 B 코드 검증은 별도 브라우저 프로필 또는 시크릿 창에서 진행한다. 그룹 변경용 UI나 우회 query parameter는 제공하지 않는다.

## 서버 인증 로그

beta-auth POST는 공통 server-only 로거로 요청·입력 검증·코드 승인/거부·토큰 발급 시작/완료·설정 오류 및 HTTP 상태를 JSON으로 출력한다. 코드·JWT·쿠키는 출력하지 않으며 요청별 requestId와 경과 시간을 제공한다. 인증 성공의 기존 홈 replace 이동은 유지한다. middleware에서 먼저 차단되는 요청은 beta-auth/BFF route까지 도달하지 않으므로 해당 route 로그에 포함되지 않는다.

## 목적

베타 테스트 기간에 공유 접근 코드를 받은 사용자만 마이쏨 웹과 와인 추천 BFF를 사용할 수 있게 한다. 회원 계정이나 사용자별 권한을 제공하는 로그인 시스템은 아니다.

짧은 Access Token과 7일 Refresh Token을 사용한다.

    Access Token  : 15분
    Refresh Token : 7일

Access Token이 만료되면 Next.js Middleware가 Refresh Token을 검증해 자동으로 재발급한다. 사용자는 Refresh Token이 유효한 동안 코드를 다시 입력하지 않아도 된다.

## 환경 변수

로컬에서는 **web/.env.local**, 배포 환경에서는 secret 설정에 다음 값을 추가한다.

    BETA_ACCESS_CODE=참여자에게_전달할_접근_코드
    BETA_JWT_SECRET=32바이트_이상의_무작위_문자열

- 두 값에 **NEXT_PUBLIC_** 접두사를 붙이지 않는다.
- 실제 값은 Git에 커밋하지 않는다.
- **BETA_JWT_SECRET**은 최소 32바이트여야 한다.
- JWT secret을 변경하면 기존 Access/Refresh Token이 모두 무효화된다. 코드만 변경하면 이미 발급된 토큰은 만료 전까지 유효하다.

## 최초 인증 흐름

    GET /beta
    → 접근 코드 입력
    → POST /api/beta-auth
    → BETA_ACCESS_CODE 비교
    → Access JWT(type=beta-access, 15분) 발급
    → Refresh JWT(type=beta-refresh, 7일) 발급
    → beta_access, beta_refresh HttpOnly Cookie 설정
    → /

두 JWT는 응답 body, URL, localStorage 또는 sessionStorage에 포함되지 않는다. 동일한 secret으로 서명하지만 서로 다른 **type**과 **audience**를 검증하므로 상호 대체할 수 없다.

Cookie 정책:

| 이름 | 용도 | 만료 |
| --- | --- | --- |
| **beta_access** | 페이지와 BFF 접근 인증 | 15분 |
| **beta_refresh** | Access Token 자동 재발급 | 7일 |

두 Cookie의 공통 설정:

    httpOnly: true
    secure: production에서 true
    sameSite: lax
    path: /

## 자동 갱신 흐름

    보호 페이지/API 요청
    → beta_access 검증
       ├─ 정상: 요청 통과
       └─ 없음·만료·변조
           → beta_refresh 검증
              ├─ 정상: beta_access 재발급 후 현재 요청 통과
              └─ 실패: 페이지는 /beta, API는 401

Middleware는 새 Access Token을 브라우저 응답 Cookie에 설정하는 동시에 현재 downstream request의 Cookie에도 주입한다. 따라서 Access Token이 만료된 첫 API 요청도 중단되지 않고, 같은 요청의 와인 BFF Route Handler 재검증을 통과한다.

Refresh Token은 갱신할 때 회전하지 않는다. 최초 인증 시 발급된 token을 7일 동안 사용하며, 만료되면 **/beta**에서 접근 코드를 다시 입력한다.

## 경로 보호

### 공개 경로

- **/beta**
- **/api/beta-auth**
- **/api/health**
- **/_next/static/**
- **/_next/image/**
- favicon, robots, sitemap 및 **public/** 정적 파일

유효한 Access 또는 Refresh Token을 가진 사용자가 **/beta**에 접근하면 **/**로 이동한다. Refresh Token만 유효한 경우 새 Access Token도 함께 발급한다.

### 보호 경로

- **/**, **/wine/list**, **/wine/keywords**, **/wine/chat**을 포함한 나머지 페이지
- 아래 와인 BFF:
  - **/api/wine-pairings/extract-wine-menu**
  - **/api/wine-pairings/recommend-menu**
  - **/api/wine-pairings/pairing**
  - **/api/wine-pairings/chat**

보호 페이지의 최종 인증 실패는 **/beta** redirect로 처리한다. 보호 API의 실패는 HTML redirect 대신 **401** JSON을 반환한다. 실패 요청에 남아 있는 잘못된 Access/Refresh Cookie는 제거한다.

와인 BFF는 Middleware뿐 아니라 각 Route Handler에서도 **beta_access**를 다시 검증한다. Route Handler는 **beta_refresh**를 직접 인증 수단으로 허용하지 않는다.

## 오류 처리

- 잘못된 접근 코드: **401**, “유효하지 않은 접근 코드입니다.”
- 잘못된 request 형식: **400**
- 환경 변수 누락 또는 짧은 JWT secret: **500**과 일반 오류 메시지
- Access Token 만료·변조: Refresh Token이 유효하면 자동 갱신
- Refresh Token도 만료·변조: 페이지 redirect 또는 API **401**

환경 변수 오류는 서버 로그에 key 이름만 기록한다. 접근 코드, secret 및 JWT 값은 기록하지 않는다.

## 배포 및 마이그레이션

기존 구현에서 발급한 **type=beta** 단일 Cookie는 새 **type=beta-access** 검증을 통과하지 않으며 **beta_refresh**도 없다. 배포 후 기존 사용자는 한 번 **/beta**에서 다시 인증해야 한다.

**.env.local** 또는 배포 secret의 기존 **BETA_ACCESS_CODE**, **BETA_JWT_SECRET** 값은 그대로 사용할 수 있다. 새 환경 변수는 필요하지 않다.

## 운영 참고

- 이 기능은 하나의 공유 코드에 기반한 stateless 베타 게이트다.
- 사용자별 폐기, 감사 로그, 기기별 세션, Refresh Token reuse detection은 지원하지 않는다.
- Refresh Token이 탈취되면 만료 전까지 새 Access Token을 만들 수 있다.
- 코드가 노출되면 **BETA_ACCESS_CODE**를 교체한다.
- 모든 기존 Cookie를 즉시 무효화해야 하면 **BETA_JWT_SECRET**도 교체한다.
- 향후 로그아웃을 구현할 때는 **beta_access**와 **beta_refresh**를 반드시 함께 삭제한다.
- 인터넷에 공개된 대규모 베타에서는 **/api/beta-auth**에 배포 플랫폼 또는 외부 저장소 기반 rate limit을 추가한다.
