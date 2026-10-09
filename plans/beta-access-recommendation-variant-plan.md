# /beta — 베타 코드 기반 추천 UI A/B 분기 계획

## 1. 목적과 상태

- 상태: 구현 및 검증 완료.
- 기존 베타 코드는 A, 기존 코드에 `-B`를 붙인 코드는 B로 인증한다.
- 검증된 인증 그룹에 따라 Middleware가 추천 결과 경로를 정리한다.
- A는 `/wine/chat`, B는 `/wine/recommend`를 사용한다.
- 사용자 구현 요청에 따라 인증 및 라우팅을 구현한다. 커밋 및 배포는 별도 요청 전까지 하지 않는다.

이 문서는 `/beta` 인증에서 결정하는 추천 그룹과 그 인증 정책을 설명한다. 추천 화면 자체의 구성은 기존 페이지 계획서와 문서를 참조하고 여기서 재설계하지 않는다.

## 2. 확인한 현재 구조

- `/beta`의 `BetaAccessForm`이 `POST /api/beta-auth`로 `{ code }`를 전송한다.
- 인증 API는 입력 코드와 서버 환경변수 `BETA_ACCESS_CODE`를 정확히 비교한다.
- 성공 시 `beta_access`와 `beta_refresh` HttpOnly Cookie를 발급한다.
- Access Token은 15분, Refresh Token은 7일이며 현재 payload에는 토큰 종류만 들어 있다.
- 토큰 검증 함수는 현재 유효 여부만 반환한다.
- Middleware는 Access Token을 검증하고, 필요하면 Refresh Token으로 Access Token을 갱신한다.
- 현재 요청의 보호 BFF에서도 갱신된 토큰을 읽도록 downstream Cookie header를 교체한다.
- 인증 폼은 성공 후 `router.replace("/")`, `router.refresh()`를 수행한다.
- 추천 결과 화면은 이미 A/B로 분리되어 있지만 인증 그룹에 따른 라우팅 정책은 없다.
- 설계 당시 키워드 화면의 추천 버튼은 `/wine/recommend`로 이동했다. 이번 구현에서 공통 진입 경로 `/wine/chat`으로 변경한다.

## 3. 인증 계약

### 코드 판별

`BETA_ACCESS_CODE`는 접미사가 없는 기준 코드로 운영한다. 별도의 B 코드 환경변수는 추가하지 않는다.

| 입력 | 처리 | 그룹 |
| --- | --- | --- |
| `BETA_ACCESS_CODE`와 정확히 일치 | 인증 성공 | A |
| `BETA_ACCESS_CODE + "-B"`와 정확히 일치 | 인증 성공 | B |
| 그 외 | 기존 401 오류 응답 | 없음 |

- 단순히 `endsWith("-B")`만 확인하지 않는다. 기준 코드까지 정확히 일치해야 한다.
- 대소문자, 공백 등의 입력 처리 정책은 기존 흐름을 유지한다. API에서 임의로 소문자 변환하거나 문자열 일부를 제거하지 않는다.
- 서버 환경변수 누락 및 JWT secret 설정 오류의 기존 안전한 오류 응답을 유지한다.
- 요청 `{ code }`, 성공 응답 `{ ok: true }`, 실패 응답 `{ message }`는 변경하지 않는다.
- 그룹을 브라우저 응답 body로 전달하거나 별도 인증 조회 API를 추가할 필요는 없다.

### JWT claim

```ts
type RecommendationVariant = "A" | "B";

// Access Token
{ type: "beta-access", recommendationVariant: "A" | "B" }

// Refresh Token
{ type: "beta-refresh", recommendationVariant: "A" | "B" }
```

- 최초 인증에서 두 토큰에 같은 그룹을 서명한다.
- 기존 HS256, issuer, audience, iat/exp, 만료 시간 및 Cookie 보안 속성을 유지한다.
- 서명과 기존 claim 검증을 통과한 뒤에만 그룹을 읽는다. 검증 없는 JWT decode는 사용하지 않는다.
- 그룹 claim이 아예 없는 기존 정상 토큰은 A로 해석한다.
- claim이 있지만 `A`/`B`가 아닌 값 또는 타입이면 해당 토큰은 유효하지 않은 것으로 처리한다.
- Access Token이 유효하면 해당 토큰의 그룹을 사용한다. Access Token이 유효하지 않을 때만 Refresh Token을 검증한다.
- Refresh Token으로 갱신할 때 반드시 그 토큰의 그룹을 새 Access Token에 전달한다. 기본값 A로 재발급해 B가 바뀌지 않도록 한다.

### 유틸리티 경계

- `beta-token.ts`에서 그룹 타입, 토큰 발급, 검증된 claim 반환을 관리한다.
- 기존 boolean 검증 함수는 검증된 claim 반환 함수의 wrapper로 유지해 보호 BFF 호출부의 호환성을 지킨다.
- `beta-request.ts`에서 요청 Cookie를 검증하여 인증 그룹을 읽는 helper를 제공한다.
- 토큰 검증 로직을 Middleware, 인증 API 및 BFF마다 중복 구현하지 않는다.
- JWT helper는 Middleware에서도 사용할 수 있게 유지한다. Node 전용 API나 Client Component 의존성을 추가하지 않는다.

## 4. Middleware 정책

### 처리 순서

1. 기존 공개 API와 정적 파일은 그대로 통과시킨다.
2. Access Token을 검증하여 그룹을 확인한다.
3. Access Token이 유효하지 않으면 Refresh Token을 검증하고 같은 그룹의 Access Token을 재발급한다.
4. 인증 실패 시 기존 정책대로 보호 페이지는 `/beta`, 보호 API는 401로 처리하고 인증 Cookie를 정리한다.
5. 인증 성공 시 기존 `/beta` → `/` 동작을 유지한다.
6. 추천 결과 경로라면 그룹에 맞는 canonical path로 정리한다.
7. 다른 경로는 기존 요청을 통과시킨다.

### 추천 경로 매핑

| 인증 그룹 | 요청 경로 | 응답 |
| --- | --- | --- |
| A | `/wine/chat` | 통과 |
| A | `/wine/recommend` | `/wine/chat`으로 redirect |
| B | `/wine/chat` | `/wine/recommend`로 redirect |
| B | `/wine/recommend` | 통과 |

- 두 추천 결과 페이지 경로만 정확히 매칭한다. `startsWith`로 다른 페이지나 API까지 분기하지 않는다.
- rewrite 대신 redirect를 사용해 주소창에도 실제 결과 경로를 표시한다.
- 그룹이 인증에 따라 달라질 수 있으므로 영구 redirect가 아닌 임시 redirect를 사용한다.
- `request.nextUrl`을 복제하고 pathname만 변경해 same-origin과 query string을 유지한다.
- 이미 올바른 경로면 redirect하지 않아 반복을 방지한다.
- 사용자별 redirect가 공유 캐시에 남지 않도록 `Cache-Control: private, no-store` 정책을 적용한다.
- Access Token 갱신 직후 redirect하는 경우에도 그 응답에 새 Access Cookie를 설정한다.
- 갱신 직후 통과하는 페이지/API 요청에는 기존처럼 downstream Cookie header와 응답 Cookie를 함께 갱신한다.
- 경로 분기는 UI 실험 정책이다. 보호 API의 기존 인증을 대체하지 않는다.

## 5. 화면 및 데이터 흐름

```text
/beta → POST /api/beta-auth → 코드 검증 및 그룹 결정
                              ↓
                 그룹이 서명된 Access / Refresh Cookie
                              ↓
                       기존처럼 홈으로 이동
                              ↓
       기존 추천 단계 → /wine/keywords → 선택 스냅샷 저장
                              ↓
                   router.replace("/wine/chat")
                              ↓
                  Middleware에서 인증 그룹 확인
                    ├─ A: /wine/chat 통과
                    └─ B: /wine/recommend redirect
```

- 인증 폼은 기존 공통 UI, 입력/에러 상태, 홈 이동 로직을 유지한다.
- 클라이언트에서 코드 접미사를 판별하거나 JWT Cookie를 읽지 않는다.
- 추천 그룹을 Zustand, React state, localStorage, sessionStorage에 복제하지 않는다.
- sessionStorage에는 기존 추천 입력 스냅샷만 저장한다. 같은 origin의 결과 경로 전환에서 기존 입력을 그대로 읽는다.
- 결과 경로는 RSC page shell을 유지하고 `WinePairingChatView`에 A/B variant를 전달한다.
- 두 화면의 API, SSE 수신, 버퍼링, 서버 상태 관리, 재추천, 후속 채팅 로직은 변경하지 않는다.
- 잘못된 결과 페이지가 렌더링되기 전에 분기해야 하며 redirect 과정에서 추천 API가 중복 호출되지 않는지 확인한다.
- 홈, 메뉴 선택 등 추천 전 단계는 그룹에 관계없이 동일하게 유지한다.
- 다른 그룹의 화면을 직접 비교하려면 별도 브라우저 프로필/시크릿 창에서 해당 코드를 인증한다. 우회용 query parameter는 추가하지 않는다.

## 6. 구현 대상과 책임

| 경로 | 변경 책임 |
| --- | --- |
| `web/src/lib/auth/beta-token.ts` | 그룹 타입, claim 발급/검증, 구형 토큰 호환 |
| `web/src/lib/auth/beta-request.ts` | 요청에서 검증된 인증 그룹 조회, 기존 boolean 인증 호환 |
| `web/src/app/api/beta-auth/route.ts` | 기준 코드와 기준 코드 + `-B` 판별, 두 토큰에 동일 그룹 발급 |
| `web/src/middleware.ts` | 그룹별 결과 경로 redirect, 갱신 시 그룹과 Cookie 유지 |
| `web/src/app/feature/menu-category-recommendation-result/ui/MenuCategoryRecommendationPage.tsx` | 추천 버튼의 공통 진입 경로를 `/wine/chat`으로 변경 |
| 위 인증/미들웨어의 기존 테스트 | 코드·claim·갱신·redirect·호환성 회귀 검증 |
| 키워드 화면의 기존 Storybook | 추천 버튼의 목적 경로 기대값 변경 |

`WineRecommendationCarouselA/B`, 추천 데이터 모델, API helper, 상태 관리 hook 및 reducer는 이번 인증 작업의 변경 대상이 아니다.

## 7. 적용 가이드와 문서

- `web/AGENTS.md`, `web/GUIDE.md`를 확인했다.
- 개발 가이드 MCP의 `resolve_guides`와 `read_guide`로 `bff-api-gateway`, `data-flow-layering`, `css-only-state`, `style-implementation`을 확인했다.
- 인증과 그룹 판별은 서버 경계에서 수행하고 브라우저에는 secret/토큰을 노출하지 않는다.
- 보호 BFF는 기존의 매 요청 인증을 계속 수행한다. 백엔드 API 계약은 변경하지 않는다.
- CSS-only 설명 여닫기 및 현재 공통 UI/스타일은 이번 작업에서 변경하지 않는다.
- 신규 UI가 없어 새로운 공통 컴포넌트나 Storybook은 필요하지 않다. 기존 키워드 Storybook의 경로 검증만 갱신한다.
- 인증 기준 문서: `docs/beta-access.md`, `plans/beta-access-refresh-token-plan.md`.
- 결과 화면 참조: `docs/wine-chat.md`, `docs/wine-recommend.md`, `plans/wine-chat-carousel-b-plan.md`.
- 구현 시 키워드 페이지 계획/문서의 공통 진입 경로와 각 결과 페이지 문서의 그룹별 접근 정책을 해당 페이지 문서에서 각각 정합화한다.
- 구현 완료 후 `docs/beta-access.md`에 실제 코드/토큰/미들웨어 정책을 반영한다.

## 8. 구현 순서

1. 그룹 타입과 검증된 claim 반환 기능을 추가하고 기존 boolean wrapper를 유지한다.
2. 인증 API에 정확한 A/B 코드 비교와 동일 그룹 토큰 발급을 적용한다.
3. Middleware의 인증/갱신 흐름에 그룹 정보를 연결한다.
4. 그룹별 canonical path redirect와 갱신 Cookie 처리를 추가한다.
5. 키워드 추천 버튼을 공통 경로로 변경하고 기존 Storybook을 갱신한다.
6. 단위 테스트와 브라우저 추천 플로우를 검증한다.
7. 인증 및 페이지별 문서를 실제 구현에 맞춘다.

## 9. 검증 항목과 완료 조건

### 인증 및 토큰 단위 테스트

- 기준 코드 → A, 기준 코드 + `-B` → B. 두 토큰의 그룹이 일치한다.
- 잘못된 기준 코드 + `-B`, `-b`, 반복 접미사, 빈 입력은 인증되지 않는다.
- 토큰 서명 변조, 만료, 잘못된 type/audience 및 잘못된 그룹 값은 거부한다.
- 그룹 없는 정상 구형 토큰은 A로 해석한다.
- 정상 B Refresh Token은 B Access Token을 발급한다.
- 유효한 Access Token과 Refresh Token의 그룹이 다르면 Access Token이 우선한다.
- 환경변수 오류, Cookie 속성, 보호 API boolean 검증은 기존 동작을 유지한다.

### Middleware 단위 테스트

- A/B × 두 결과 경로의 네 조합이 표대로 처리된다.
- 토큰 갱신과 redirect가 동시에 발생해도 새 Access Cookie가 설정된다.
- 토큰 갱신 후 통과하는 보호 API에 새 Cookie request header가 전달된다.
- 양쪽 토큰이 유효하지 않으면 기존 페이지 redirect/API 401을 유지한다.
- 구형 토큰, query string 유지, 올바른 경로 통과, 공개 파일/API, `/beta`, 일반 페이지 회귀를 검증한다.
- 그룹별 redirect가 공유 캐시에 저장되지 않는다.

### Storybook 및 브라우저 통합 검증

- 키워드 추천 버튼의 저장 스냅샷과 `replace("/wine/chat")`를 검증한다.
- A 인증 후 추천 완료 시 `/wine/chat`에서 A UI가 표시된다.
- B 인증 후 같은 추천 과정에서 `/wine/recommend`로 이동하여 B UI가 표시된다.
- 반대 경로 직접 접근, 새로고침, 뒤로가기, Access 만료 후 재진입에서도 그룹이 유지된다.
- redirect 과정에서 잘못된 UI 깜빡임, 입력 스냅샷 유실 및 중복 추천 요청이 없다.
- 두 그룹 모두 기존 재추천/후속 채팅이 동작한다.
- TypeScript, 변경 파일 ESLint, 인증 및 추천 관련 회귀 테스트, `git diff --check`를 통과한다.

## 10. 범위 제외 및 운영 주의

검증 결과: 전체 단위 테스트 133개, 키워드 Storybook 브라우저 테스트 10개, 전체 TypeScript, 변경 코드 ESLint, `git diff --check` 통과. 실제 로컬 브라우저의 A/B 로그인 → 반대 결과 경로 접근 → 올바른 화면 렌더링과 query 유지, 추천 요청 1회, Access Cookie 제거 후 Refresh 기반 동일 그룹 재발급도 확인했다. 추천 응답은 목업으로 처리해 실제 AI 요청을 발생시키지 않았다.

- 사용자 DB, 그룹별 데이터 저장, 분석 이벤트, 무작위 배정, 별도 프론트엔드 서버는 추가하지 않는다.
- 베타 코드/토큰 원문은 로그에 기록하지 않는다. 필요하면 성공 이벤트에 비민감 그룹 값만 기록한다.
- 이 기능은 동일한 공유 코드에서 파생한 UI 비교 그룹이다. 개인별 권한이나 사용자 식별 기능으로 취급하지 않는다.
- 기존 인증 사용자는 A로 유지된다. B에 참여하려면 B 코드로 새로 인증해야 한다.
- 현재 `/beta`는 인증된 사용자를 홈으로 보내므로, 그룹 전환용 UI는 추가하지 않는다. 별도 브라우저 세션에서 B 코드를 입력하는 방식으로 안내한다.
- 베타 코드를 변경해도 이미 발급된 JWT는 기존 만료 정책까지 유효하다. 개별 토큰 폐기나 강제 로그아웃은 이번 범위에 포함하지 않는다.
- 계획서 작성 단계 이후 구현 요청으로 코드 구현을 진행했다. 커밋 및 푸시는 별도 요청 전까지 수행하지 않는다.
