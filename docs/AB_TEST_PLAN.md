# 와인 추천 화면 A/B 테스트 계획

작성일: 2026-10-09 · 상태: 초안 · 이벤트 수집 기능은 아직 구현하지 않음

## 1. 목적

추천 UI가 사용자의 추천 이해와 와인 선택에 미치는 영향을 비교한다. 클릭 수 자체보다 선택 성공률과 만족도를 우선한다. 실제 구매를 추적하지 않으므로 외부 사이트 클릭을 구매 전환으로 해석하지 않는다.

- A: `/wine/chat`, `WineRecommendationCarouselA`
- B: `/wine/recommend`, `WineRecommendationCarouselB`
- 공통: 추천 API 계약, SSE 수신, 버퍼링, 재추천 및 후속 채팅 로직

화면 구현과 인증 정책은 [A 화면](../wine-chat.md), [B 화면](../wine-recommend.md), [베타 인증](../beta-access.md)을 참조한다. 이 문서는 실험 및 측정 정책만 정의한다.

## 2. 가설과 그룹 배정

가설: B의 정보 배치와 추천 이유 펼침 방식이 A보다 추천 이해를 돕고 와인 선택 성공률을 높일 것이다. 이는 검증할 가설이며 확정된 효과가 아니다.

| 입력 코드 | 토큰 그룹 | 결과 경로 |
| --- | --- | --- |
| 기존 베타 코드 | A | `/wine/chat` |
| 기존 베타 코드 + `-B` | B | `/wine/recommend` |

서명 검증을 통과한 Access Token의 `recommendationVariant`를 그룹의 원본으로 사용한다. Refresh Token 갱신 시에도 그룹을 유지한다. 기존 정상 토큰에 그룹이 없으면 A로 처리한다.

현재 방식은 코드에 따른 배정이지 무작위 배정이 아니다. 사용자가 그룹을 선택하거나 참여자 구성이 달라질 수 있어, 결과를 UI의 인과 효과로 단정하지 않는다. 가능하면 운영자가 동일 조건의 참여자에게 두 코드를 균형 있게 배포하고 동일 기간에 비교한다.

## 3. 핵심 지표

첫 추천 노출을 세션별 비교 기준으로 사용하고 재추천 턴은 별도 분석한다. 한 세션의 반복 클릭으로 비율이 커지지 않도록 세션 단위 지표는 한 번만 집계한다.

| 구분 | 지표 | 정의 |
| --- | --- | --- |
| 주 지표 | 선택 성공률 | 첫 추천 노출 후 30분 이내 선택 완료한 세션 / 첫 추천 노출 세션 |
| 보조 | 추천 이유 확인율 | 같은 관찰 구간에 설명을 한 번 이상 연 세션 / 첫 추천 노출 세션 |
| 보조 | 선택까지 걸린 시간 | 첫 추천 노출부터 선택 완료까지의 시간, 중앙값 및 p75 |
| 보조 | 추천 만족도 | 최초 추천에 대한 동일한 1~5점 질문의 응답 분포·평균·응답률 |
| 탐색 | 카드 탐색 깊이 | 첫 추천에서 확인한 고유 카드 수 및 최대 순위 |
| 탐색 | 후속 질문·재추천 이용률 | 해당 행동을 한 세션 / 첫 추천 노출 세션 |
| 보호 지표 | 오류율 | 실패한 추천 요청 / 전체 추천 요청 |
| 보호 지표 | 첫 카드 표시 시간 | 추천 요청 시작부터 첫 유효 추천 카드가 보일 때까지, 중앙값 및 p95 |

30분은 초안의 관찰 구간이다. 실험 시작 전에 확정하고 두 그룹에 동일하게 적용한다. 선택 시간은 선택한 세션에만 존재하므로 반드시 선택 성공률과 함께 해석한다. 미선택 세션을 임의로 30분 선택으로 기록하지 않는다.

선택 성공률과 만족도 측정에는 두 화면에 같은 의미·배치 정책의 피드백 UI가 필요하다. 예: “이 와인으로 골랐어요”와 “추천이 도움이 되었나요? (1~5점)”. 아직 이 UI는 없으므로 추가 전에는 주 지표를 측정할 수 없다. 선택 행동과 만족도 응답은 별도 이벤트로 기록한다.

## 4. 이벤트 목록

| 이벤트 | 발생 조건 | 주요 추가 속성 |
| --- | --- | --- |
| `recommendation_requested` | 추천 요청을 실제 시작할 때 | `turn_index`, `request_kind` |
| `recommendation_viewed` | 첫 유효 추천 카드가 보이고 1초 노출될 때, 턴별 1회 | `time_to_first_card_ms` |
| `wine_card_viewed` | 카드가 50% 이상 보이고 1초 노출될 때 | `wine_id`, `rank` |
| `wine_reason_opened` | A의 설명 면 또는 B의 설명 영역을 열 때 | `wine_id`, `rank`, `interaction_type` |
| `wine_detail_clicked` | 와인 자세히 보기 링크를 클릭할 때 | `wine_id`, `rank`, `destination_type` |
| `followup_chat_submitted` | 유효한 추가 질문을 실제 전송할 때 | `turn_index` |
| `repairing_requested` | 후속 입력이 실제 재추천 요청으로 처리됐을 때 | `turn_index` |
| `wine_selected` | 사용자가 공통 선택 완료 UI로 와인을 골랐다고 확인할 때 | `wine_id`, `rank` |
| `recommendation_feedback_submitted` | 만족도 응답을 제출할 때 | `score` (1~5) |
| `recommendation_failed` | 추천 요청이 실패로 종료될 때 | `failure_kind`, `duration_ms` |
| `recommendation_completed` | 추천 스트림과 결과 처리가 정상 완료됐을 때 | `duration_ms`, `result_count` |
| `recommendation_cancelled` | 사용자 취소·화면 이동 등으로 요청이 중단됐을 때 | `cancel_reason`, `duration_ms` |

- 스켈레톤이나 비어 있는 카드는 추천 노출로 취급하지 않는다. 이미지가 없는 유효 추천 카드는 포함한다.
- `wine_card_viewed`는 턴·카드별 최초 노출만 집계한다. STREAM → JSON 갱신이나 뒤로 스와이프 때문에 다시 집계하지 않는다.
- A의 카드 뒤집기와 B의 펼침은 공통 `wine_reason_opened`로 수집하되 동작 종류를 함께 남긴다.
- B의 native `details/summary` 열림은 `toggle` 이벤트를 관찰하되 React state로 열림 상태를 복제하지 않는다. 초기 닫힘 및 닫기 동작은 열기 이벤트가 아니다.
- 페이지가 숨겨지면 노출 시간 측정을 멈춘다. 노출 이벤트는 화면 이동 시점이나 SSR 렌더링만으로 발생시키지 않는다.
- `wine_detail_clicked`가 A에 없다면 B 내부 지표로만 사용한다. A의 값이 0이라는 이유로 B의 우수성을 주장하지 않는다.
- 사용자 취소나 화면 이탈에 따른 스트림 abort는 서버 오류와 분리한다.
- 후속 질문은 탐색, 재추천은 조건 변경일 수 있다. 만족·불만 지표로 단독 해석하지 않는다.

## 5. 이벤트 공통 계약

| 속성 | 책임 및 의미 |
| --- | --- |
| `event_id` | 이벤트별 UUID. 전송 재시도 시 유지하여 중복 제거 |
| `event_name`, `schema_version` | 허용된 이벤트 이름과 계약 버전 |
| `experiment_id` | 예: `wine-recommendation-ui-v1`. 실험 버전 구분 |
| `variant` | 수집 서버가 검증된 토큰으로 결정한 A/B |
| `anonymous_session_id` | 추천 API의 업무 sessionId와 분리한 익명 분석 세션 |
| `recommendation_id` | 하나의 추천 요청/결과 턴을 묶는 식별자 |
| `turn_index` | 최초 추천 0, 재추천마다 증가 |
| `occurred_at`, `received_at` | 발생 시각 및 서버 수신 시각 |
| `page_path` | 허용된 pathname만 수집. query string 제외 |
| `device_type` | mobile / tablet / desktop / unknown. 판별 규칙 고정 |
| `elapsed_ms` | 해당 추천 시작 또는 노출 시점 기준 경과 시간 |

`recommendation_id`는 요청 전에 만들고 최초 노출·카드·설명·선택·실패 이벤트가 같은 값을 사용하도록 한다. 실패한 요청도 식별 가능해야 한다. 서버가 내려주는 카드별 `pairingId`와 혼동하지 않으며, 백엔드 API에 새 필드를 요구하지 않는다.

현재 인증은 개인 식별자가 없는 공유 코드 기반이다. `anonymous_session_id`는 사용자 계정이나 고유 사용자 수를 의미하지 않는다. 세션 정의는 30분 비활동 시 새 세션으로 갱신하는 정책을 기본안으로 하고, 같은 탭의 새로고침은 세션을 유지한다. 새 탭·시크릿 창은 다른 세션일 수 있다는 한계를 명시한다. 안정적인 개인 추적 식별자는 이번 초안에 포함하지 않는다.

## 6. 수집 구조 및 안전성

```text
기존 Client UI의 행동/노출 관찰
→ same-origin 이벤트 수집 BFF (신규 계약, 구현 전 확정)
→ 인증·이벤트 schema 검증 / 토큰에서 그룹 결정
→ 분석 전용 저장소
→ 세션·추천별 집계 → A/B 비교
```

- 분석 도구와 저장소는 미정이다. 외부 분석 SDK를 즉시 추가하지 않는다.
- 신규 수집 API는 별도 계약이 필요하다. 이벤트별 허용 속성, 크기/개수 제한, 인증, rate limit, 응답 및 재시도 정책을 구현 전에 확정한다.
- 클라이언트의 `variant`나 query parameter를 신뢰하지 않는다. 토큰 그룹과 화면 경로 불일치는 분석 제외 또는 별도 진단 대상으로 처리한다.
- 배치와 제한된 재시도를 사용하고 `event_id`로 중복을 제거한다. 마지막 전송은 best-effort이며 브라우저 종료 이벤트 수집을 보장하지 않는다.
- 이벤트 전송 실패가 추천 UI, SSE 또는 외부 링크 이동을 막지 않도록 한다.
- 현재 서버 디버그 로거는 숫자/boolean만 허용한다. 분석 이벤트는 별도 schema/수집 경로를 두고 기존 보안 로거 제한을 완화하지 않는다.
- RSC 페이지 전체를 Client Component로 변경하지 않는다. 브라우저 관찰과 이벤트 전송만 기존 Client 경계에서 수행한다.
- 클라이언트 시간은 조작되거나 시계 차이가 있을 수 있다. 경과 시간은 monotonic clock을 사용하고 비정상 값을 검증한다.

## 7. 개인정보 및 분석 제외 기준

수집하지 않는 값:

- 베타 코드 원문, JWT, Cookie, Authorization 값
- 채팅 원문, 직접 입력한 음식명, 메뉴판 원본 이미지
- 이메일, 이름, 전화번호 등 개인 정보
- 전체 URL/query string, 상세 User-Agent 및 불필요한 IP 저장

초기 원시 이벤트 보관 기간은 30일을 제안한다. 운영 전에 접근 권한, 삭제 방식, 사용자 안내와 필요한 동의 절차를 확정한다. 영구 보관을 기본값으로 두지 않는다.

개발/Storybook/자동화/운영자 테스트는 실제 실험과 분리한다. 재시도 중복, 비정상 타임스탬프, 인증 그룹 불일치, 알 수 없는 schema는 분석에서 제외하고 제외 수를 집계한다. 기준에 맞지 않는 결과를 임의로 제거하지 않는다.

## 8. 실험 운영 및 결과 해석

1. 공통 선택·만족도 UI와 수집 계약을 확정한다.
2. 목업과 내부 참여자로 노출·행동·중복 제거·그룹 갱신·오류 흐름을 확인한다.
3. 시작 전 실험 기간, 기준 선택 성공률, 의미 있는 최소 개선폭, 필요한 표본 수와 종료 조건을 정한다. 현재 정보만으로 표본 수를 임의 지정하지 않는다.
4. 같은 기간에 A/B를 운영하고 그룹별 기기 분포, 노출 세션 수, 수집 누락률과 시스템 성능을 확인한다.
5. 세션 수·분자/분모·불확실성을 함께 보고한다. 그룹별 세션이 적으면 방향성 탐색 결과로만 남긴다.
6. 선택 성공률을 주 판단 기준으로 하고 만족도 및 오류/성능 악화 여부를 함께 검토한다. 중간 결과가 좋아 보인다는 이유만으로 조기 종료하지 않는다.

최초 추천과 재추천, 모바일과 데스크톱, 서버 오류 세션은 구분해 보고한다. 채팅·재추천까지 이어지는 사용 흐름을 별도로 확인하되, 여러 추천 턴을 독립된 사람의 표본처럼 세지 않는다. 추천된 와인/순위 분포도 두 그룹에서 크게 다른지 확인한다.

초기 선택 성공률 보고는 최초 추천의 선택을 기준으로 한다. 재추천을 거쳐 선택한 비율은 별도 전체 여정 지표로 보고한다. 오류 세션은 선택 성공률 분모에 포함되지 않을 수 있으므로, 요청 대비 노출율·오류율을 반드시 함께 공개한다.

## 9. DB 스키마 초안

DB 제품과 저장 위치는 아직 확정하지 않았다. 아래는 관계형 DB 기준의 논리 스키마이며, 현재 프로젝트에 특정 DB/ORM이 도입됐다는 의미가 아니다. 실제 DDL과 migration은 DB 선정 후 작성한다. 추천 업무 DB와 분리된 분석 영역에 저장하는 것을 기본안으로 한다.

```text
analytics_experiments
└─ analytics_sessions (익명 세션·그룹)
   └─ analytics_recommendations (추천 요청/턴)
      ├─ parent_recommendation_id → 이전 추천 요청
      └─ analytics_events (노출·행동·종료 이벤트)
```

### 9.1. `analytics_experiments` — 실험 정의

| 컬럼 | 타입 | 제약/설명 |
| --- | --- | --- |
| `experiment_id` | varchar(64) | PK, 예: `wine-recommendation-ui-v1` |
| `name` | varchar(128) | NOT NULL, 운영자가 정한 실험 이름 |
| `status` | enum/text | NOT NULL, `draft` / `running` / `ended` |
| `started_at`, `ended_at` | timestamp with timezone | NULL 허용, 운영 기간 |
| `observation_window_seconds` | integer | NOT NULL, 초안 1800, 양수 |
| `schema_version` | smallint | NOT NULL, 이벤트 계약 버전 |
| `created_at` | timestamp with timezone | NOT NULL, 서버 생성 시각 |

실험 설정은 서버/운영자가 등록한다. 브라우저가 임의의 실험을 생성하지 못하게 한다. 테스트와 운영은 같은 실험 ID를 사용하더라도 별도 `environment`로 구분한다.

### 9.2. `analytics_sessions` — 익명 분석 세션

| 컬럼 | 타입 | 제약/설명 |
| --- | --- | --- |
| `session_id` | UUID | PK, 계약의 `anonymous_session_id` |
| `experiment_id` | varchar(64) | NOT NULL, experiments FK |
| `variant` | char(1) | NOT NULL, CHECK A/B, 서버의 검증된 JWT에서 결정 |
| `environment` | enum/text | NOT NULL, `local` / `test` / `production`, 서버 결정 |
| `is_internal` | boolean | NOT NULL, 기본 false, 서버가 분리한 내부 테스트 여부 |
| `device_type` | enum/text | NOT NULL, mobile/tablet/desktop/unknown |
| `started_at` | timestamp with timezone | NOT NULL, 최초 수집 시각 |
| `last_activity_at` | timestamp with timezone | NOT NULL, 세션 비활동 판단 기준 |
| `created_at` | timestamp with timezone | NOT NULL, 서버 저장 시각 |

- `session_id`는 분석 연결 키이지 인증 자격이나 개인 ID가 아니다.
- 한 세션의 실험·그룹·환경은 불변이다. 동일 ID로 그룹이 바뀌면 기존 행을 덮어쓰지 않고 새 세션으로 시작한다.
- 이 실험에서는 JWT가 사용자 식별을 제공하지 않는다. 인증된 요청이어도 특정 개인의 이벤트임을 증명할 수는 없다.
- 자동 스트림 업데이트나 분석 재시도가 세션을 무한히 연장하지 않도록 활동 기준을 별도로 정한다.
- 중복 `variant`를 모든 이벤트에 복제하지 않는다. 이벤트 → 추천 요청 → 세션으로 그룹을 조회한다.

### 9.3. `analytics_recommendations` — 추천 요청/턴

| 컬럼 | 타입 | 제약/설명 |
| --- | --- | --- |
| `recommendation_id` | UUID | PK, 요청 전에 생성한 분석용 ID |
| `session_id` | UUID | NOT NULL, sessions FK |
| `parent_recommendation_id` | UUID | NULL 허용, 이전 추천 요청 self FK |
| `turn_index` | integer | NOT NULL, 최초 0, 같은 추천 여정 내 재추천 시 증가 |
| `request_kind` | enum/text | NOT NULL, `initial` / `repairing` |
| `requested_at` | timestamp with timezone | NOT NULL, 요청 발생 시각 |
| `first_viewed_at` | timestamp with timezone | NULL 허용, 검증된 최초 노출 이벤트 발생 시각 |
| `finished_at` | timestamp with timezone | NULL 허용, 완료/실패/취소 발생 시각 |
| `outcome` | enum/text | NOT NULL, `pending` / `completed` / `failed` / `cancelled` |
| `time_to_first_card_ms` | integer | NULL 허용, 0 이상 |
| `duration_ms` | integer | NULL 허용, 0 이상, 리포트는 종료 상태별 구분 |
| `result_count` | integer | NULL 허용, 정상 완료된 결과 개수 |
| `failure_kind` | enum/text | NULL 허용, 허용된 비민감 오류 분류 |
| `created_at`, `updated_at` | timestamp with timezone | NOT NULL, 서버 관리 |

- 최초 추천은 parent가 없고 turn 0이다. 재추천은 같은 세션의 이전 추천을 참조하고 turn이 증가해야 한다.
- 같은 세션에서 새 추천 여정을 다시 시작할 수 있으므로 `(session_id, turn_index)`를 UNIQUE로 지정하지 않는다.
- 자기 자신/다른 세션을 parent로 참조하거나 순환 구조를 만드는 요청은 거부한다. 단순 self FK만으로 모두 보장되는 것은 아니므로 수집 계층에서도 검사한다.
- 위 결과 컬럼은 원시 이벤트에서 갱신하는 조회용 요약이다. 원시 이벤트를 원본으로 두고 재집계할 수 있게 한다. 금액·메뉴 원문·추천 이유 전문은 저장하지 않는다.
- 정상 종료 이벤트가 없으면 `pending`으로 남는다. TTL을 넘긴 미완료 요청은 리포트에서 `unknown/incomplete`로 별도 분류하며 서버 실패로 임의 전환하지 않는다.
- 갱신은 늦게 도착한 requested/viewed 이벤트가 완료 상태를 다시 pending으로 되돌리지 않도록 단방향으로 처리한다.

### 9.4. `analytics_events` — 원시 이벤트

| 컬럼 | 타입 | 제약/설명 |
| --- | --- | --- |
| `event_id` | UUID | PK, 재시도 중복 제거 |
| `recommendation_id` | UUID | NOT NULL, recommendations FK |
| `event_name` | enum/text | NOT NULL, 4절의 허용 목록 |
| `schema_version` | smallint | NOT NULL, 허용 계약 버전 |
| `occurred_at` | timestamp with timezone | NOT NULL, 발생 시각 |
| `received_at` | timestamp with timezone | NOT NULL, DB/서버가 생성한 수신 시각 |
| `page_path` | varchar(64) | NOT NULL, 해당 그룹의 허용 결과 pathname |
| `elapsed_ms` | integer | NULL 허용, 요청 시작 기준 0 이상 |
| `card_index` | integer | NULL 허용, 0부터 시작하는 안정적인 슬라이드 식별자 |
| `wine_id` | UUID | NULL 허용, 백엔드 wine ID가 확인된 경우만 저장 |
| `rank` | integer | NULL 허용, 표시된 추천 순위, 양수 |
| `score` | smallint | NULL 허용, 만족도 응답만 1~5 |
| `properties` | JSON object | NOT NULL, 기본 `{}`, 이벤트별 whitelist 속성만 허용 |

- 카드 데이터가 STREAM 단계라 wine ID가 아직 없을 수 있다. `card_index`는 요청 내에서 고정해 해당 노출을 기록하고 JSON 도착 후 임의로 새 이벤트를 만들지 않는다. 선택 완료 이벤트는 실제 wine ID가 확인된 카드만 허용한다.
- 와인/카드 정보는 해당 이벤트 발생 시점의 값이다. 후속 데이터로 원시 이벤트를 수정하지 않는다.
- `score`는 feedback 이벤트에만 허용한다. feedback은 1~5를 필수로 받는다. 그 밖의 이벤트에는 NULL이어야 한다.
- `properties`는 자유로운 로그 payload가 아니다. 예: interaction_type, destination_type, failure_kind, cancel_reason, duration_ms, result_count 등의 타입/길이/범위를 이벤트별로 제한한다.
- 실패 분류는 `network` / `timeout` / `backend_4xx` / `backend_5xx` / `invalid_response` / `stream_error` / `unknown` 등 안전한 enum으로 제한한다. 에러 메시지나 stack trace는 저장하지 않는다.

### 9.5. 제약조건·인덱스·저장 정책

- FK: events → recommendations → sessions → experiments. 추천 parent는 같은 세션만 허용한다.
- `event_id` 충돌 시 동일 내용의 재시도는 무시한다. 다른 내용이면 기존 행을 덮어쓰지 않고 거부한다.
- 단일 발생 이벤트(requested/viewed/completed/failed/cancelled/selected/feedback)는 `(recommendation_id, event_name)`에 조건부 UNIQUE를 적용한다. 종료 이벤트는 종류가 달라도 요청당 하나만 허용하도록 별도 제약 또는 트랜잭션 검증이 필요하다.
- 카드 노출은 `(recommendation_id, card_index)`에 `wine_card_viewed` 조건부 UNIQUE를 적용한다. 반복 설명 열기/상세 링크 클릭/채팅 제출은 개별 원시 이벤트를 저장하되 세션 지표는 최초 행동만 사용한다.
- 인덱스: sessions `(experiment_id, environment, variant, started_at)`; recommendations `(session_id, requested_at)`; events `(recommendation_id, event_name, occurred_at)` 및 `(received_at)`.
- 그룹·기기·시간은 위 관계로 조회한다. 초기에는 일별 지표 전용 테이블을 만들지 않고 SQL/view로 집계한다. 규모가 커지면 정의를 고정한 집계 테이블을 별도로 검토한다.
- 이벤트가 순서와 다르게 도착할 수 있으므로 배치에 요청 context를 포함하고 부모 session/run을 먼저 upsert한 뒤 원시 이벤트와 요약을 같은 트랜잭션으로 기록한다. ID에 귀속된 그룹/환경 불변 조건을 검사한다.
- 30일 보관 정책이 확정되면 이벤트와 추천/세션 연결 데이터도 함께 만료시킨다. experiment 정의는 유지할 수 있다. parent FK가 삭제를 막지 않도록 session 단위 삭제/만료 정책을 migration에서 명시한다.
- 위의 조건부 UNIQUE는 DB별 구현 방식이 다를 수 있다. 선정된 DB가 지원하지 않으면 동등한 전용 키/테이블 또는 트랜잭션 정책으로 보장한다.

## 10. DB에 저장할 사용자 액션과 관찰 데이터

### 필수 저장 데이터

| 유형 | 이벤트 | 필수 추가 값 | 사용 목적 |
| --- | --- | --- | --- |
| 시스템 | `recommendation_requested` | request_kind, turn_index 및 요청 context | 추천 요청 수, 오류율 분모 |
| 노출 | `recommendation_viewed` | time_to_first_card_ms | 실제 노출 세션 수, 첫 카드 성능 |
| 노출 | `wine_card_viewed` | card_index, 확인된 wine_id/rank | 고유 카드 확인 수, 탐색 깊이 |
| 사용자 액션 | `wine_reason_opened` | card_index, interaction_type (`flip` / `disclosure`) | 설명 확인율, 카드별 관심 |
| 사용자 액션 | `wine_detail_clicked` | wine_id, card_index, destination_type (`wine21_home`) | 상세 관심도, B 내부 분석 |
| 사용자 액션 | `followup_chat_submitted` | 연결된 recommendation_id | 후속 질문 이용률, 원문은 제외 |
| 사용자 액션 | `repairing_requested` | 새 recommendation_id, parent ID, turn_index | 재추천 이용률·여정 연결 |
| 사용자 액션 | `wine_selected` | wine_id, card_index, rank | 선택 성공률·선택 순위·선택 시간 |
| 사용자 액션 | `recommendation_feedback_submitted` | score | 만족도 분포·응답률 |
| 시스템 | `recommendation_completed` | duration_ms, result_count | 완료율, 결과 개수 |
| 시스템 | `recommendation_failed` | failure_kind, duration_ms | 오류율·실패 원인 |
| 시스템 | `recommendation_cancelled` | cancel_reason, duration_ms | 이탈/취소와 시스템 오류 구분 |

재추천 시 `repairing_requested`는 새 추천 요청에 귀속한다. 해당 요청의 `recommendation_requested`도 기록하지만 요청 수는 requested 하나만으로 집계한다. 일반 후속 질문은 현재 설명 대상 추천에 귀속한다.

스와이프 거리, 마우스 좌표, 키 입력, 페이지 전체 스크롤 원시 데이터는 초기 필수 수집 대상이 아니다. 카드 노출만으로 캐러셀 탐색을 측정하고, 설명 열기·선택·링크 클릭 등 의미 있는 행동을 우선 저장한다.

### DB에서 계산할 지표

비율·평균 같은 결과 지표를 각 이벤트 행에 저장하지 않는다. 원시 데이터에서 아래처럼 계산한다.

| 지표 | 집계 기준 |
| --- | --- |
| 추천 노출 세션 수 | 세션별 최초 initial 추천의 `recommendation_viewed`, DISTINCT session_id |
| 선택 성공률 | 위 최초 노출 요청에 관찰 구간 내 `wine_selected`가 있는 세션 / 최초 노출 세션 |
| 추천 이유 확인율 | 동일 최초 요청·관찰 구간에 reason_opened가 있는 세션 / 최초 노출 세션 |
| 선택까지 시간 | 동일 요청의 최초 selected elapsed_ms − viewed elapsed_ms, 선택 완료 세션의 중앙값/p75 |
| 만족도·응답률 | 최초 노출 요청의 feedback score 분포 및 응답 세션 / 최초 노출 세션 |
| 카드 탐색 깊이 | 최초 요청의 COUNT DISTINCT card_index 및 MAX rank |
| 후속 질문 이용률 | 첫 노출 이후 관찰 구간에 해당 여정의 chat 제출이 있는 세션 / 최초 노출 세션 |
| 재추천 이용률 | 첫 노출 이후 관찰 구간에 parent chain으로 연결된 새 재추천 요청이 있는 세션 / 최초 노출 세션 |
| 요청 대비 노출율 | viewed가 있는 DISTINCT recommendation_id / requested가 있는 DISTINCT recommendation_id |
| 오류율 | failed가 있는 DISTINCT recommendation_id / requested가 있는 DISTINCT recommendation_id |
| 첫 카드 표시 시간 | 유효한 time_to_first_card_ms의 중앙값/p95, 그룹·기기별 구분 |
| 중단/미완료율 | cancelled와 종료 이벤트 없는 요청을 각각 requested 대비 비율로 집계 |

- 선택은 최초 한 번으로 고정하고 만족도는 최초 응답을 사용한다. 응답 수정 정책이 필요하면 별도 버전 계약을 먼저 정한다.
- `elapsed_ms`는 모든 이벤트에서 같은 요청 시작 기준을 사용한다. 브라우저 시각 차이로 시간이 음수가 되거나 새로고침으로 monotonic clock이 바뀌면 해당 시간 표본만 제외하고 행동 자체의 유효 여부는 별도로 판단한다.
- 노출 판정에 필요한 1초를 첫 카드 성능에 더하지 않는다. 카드가 처음 보인 시점의 경과 시간을 보관하고 1초 노출 확인 후 `time_to_first_card_ms`로 전송한다.
- 관찰 구간이 끝나지 않은 세션은 확정 지표에서 제외하거나 별도 미성숙 표본으로 표시한다. 수집 종료 지연을 고려해 마감 기준을 고정한다.
- 최초 추천 실패 뒤 같은 세션에서 다시 initial 요청할 경우, 세션 비교는 최초 유효 initial 노출을 기준으로 하고 앞선 실패는 보호 지표에 포함한다.

## 11. 구현 전 결정 사항 및 검증 체크리스트

- [ ] 공통 선택 완료 버튼과 1~5점 만족도 질문의 UI·발생 조건 확정
- [ ] 분석 저장소, 수집 BFF 계약, 세션 정책 및 보관 기간 확정
- [ ] DB 제품/분석 영역, FK·중복 제약·인덱스 및 원시 데이터 만료 방식 확정
- [ ] 순서가 바뀐 배치·재시도 충돌·그룹 변경·누락된 종료 이벤트 저장 검증
- [ ] 실험 기간·최소 개선폭·표본 수·종료 조건 확정
- [ ] A/B 정상 인증과 Access 갱신 후 서버의 그룹 귀속 유지 검증
- [ ] 스켈레톤 제외, 캐러셀 노출, 반복 렌더링·재전송 중복 제거 검증
- [ ] A 뒤집기 / B CSS 기반 펼침을 동일한 의미로 집계하는지 검증
- [ ] B의 외부 링크 클릭이 수집 실패에도 정상 동작하는지 검증
- [ ] 재추천·후속 채팅의 턴과 원본 추천 연결 검증
- [ ] 민감 정보 미수집, 개발 이벤트 제외, 오류/abort 구분 검증
- [ ] 수집 전후 UI·스트리밍 성능 회귀 확인

이번 변경은 계획 초안 문서만 작성·보완한다. DB 생성/migration, 이벤트 수집 코드, 피드백 UI, 분석 서비스 연결, 커밋 및 푸시는 포함하지 않는다.
