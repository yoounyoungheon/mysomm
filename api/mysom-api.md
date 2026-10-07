# Mysom API 명세

이 문서는 프론트엔드가 참조할 `mysom-api-demo`의 현재 버전(`feature/wine-sample`, OCR + 카탈로그 매칭) HTTP 계약과 로컬 연결 방법을 정리한다. 세부 요청·응답은 [와인 메뉴 추출](./mysom-ocr.md)과 [와인 페어링](./mysom-wine-pairing.md) 문서를 기준으로 한다.

- 기준 프로젝트: `/Users/yoon-yeongheon/dev/mysom-demo/mysom-api-demo`
- 기준 브랜치: `feature/wine-sample`
- 기존 HTTP 계약 확인 커밋: `68a0cb7` (2026-09-07)
- 버전 가이드 통합 및 웹 연결 설정 확인일: 2026-10-03
- Local Base URL: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

## 활성 API

| 순서 | 기능 | Method | Path | 응답 |
| --- | --- | --- | --- | --- |
| 1 | 와인 메뉴 이미지 추출 및 세션 생성 | `POST` | `/v1/wine-pairings/extract-wine-menu` | JSON |
| 2 | 선택 와인 기반 메뉴 추천 | `POST` | `/v1/wine-pairings/recommend-menu` | JSON |
| 3 | 와인 페어링 생성 | `POST` | `/v1/wine-pairings/pairing` | SSE |
| 4 | 일반 후속 대화 또는 재페어링 | `POST` | `/v1/wine-pairings/chat` | SSE |

현재 웹이 사용하는 백엔드 업무 API는 위 네 라우트다.

## 세션 기반 호출 순서

모든 요청은 동일한 `X-Session-Id`를 사용한다. 값은 임의 문자열이 아니라 UUID여야 한다.

```text
클라이언트가 새 UUID 생성
-> extract-wine-menu (세션과 와인 메뉴 생성)
-> recommend-menu (선택 wine ID로 추천 메뉴 저장)
-> pairing (선택 wine ID + 추천 menu name으로 페어링)
-> chat (완료된 페어링 문맥으로 대화 또는 재페어링)
```

핵심 불변식:

- `extract-wine-menu` 응답의 `wines[].id`만 이후 `pairingWineIds`와 `wineIds`에 사용한다.
- `pairing.menuNames`에는 AI 추천 name, 고정 카테고리명, 직접 입력 음식명을 사용한다. 요청 shape는 유지하며 2026-10-07 사용자 확인을 반영했다.
- 다른 세션의 wine ID는 허용하지 않는다. 메뉴명은 현재 추천 목록에 한정하지 않는다.
- `/chat`은 페어링이 완료되어 세션 상태가 채팅 가능해진 뒤 호출한다.
- 프론트는 페이지마다 새 ID를 만들지 않고 한 워크플로 전체에서 같은 `X-Session-Id`를 유지한다.

## 공통 헤더

```http
X-Session-Id: 0198b013-f4a7-7a91-a232-20f4fe638b38
```

- 네 API 모두 필수다.
- Spring이 `UUID`로 역직렬화하므로 누락되거나 UUID 형식이 아니면 요청 단계에서 `400`이 발생할 수 있다.
- 현재 Spring Security 설정은 없으며 bearer 인증 계약도 없다.

## 공통 타입

```ts
type SessionId = string; // UUID
type PairingWineId = string; // UUID, 현재 세션의 wine menu 항목 ID

type Price = {
  amount: number; // JSON decimal number
  currency: "KRW" | "USD" | "EUR";
  currencySign: "₩" | "$" | "€";
  koreanUnit: "원" | "달러" | "유로";
};

type Wine = {
  id: PairingWineId;
  wineName: string;
  vintage: number | null;
  alcohol: string | null;
  price: Price[] | null;
  country: string | null;
  region: string | null;
  tannin: number | null; // 0..5
  body: number | null; // 0..5
  sweetness: number | null; // 0..5
  acid: number | null; // 0..5
  wineBottleImageUrl: string | null;
};
```

`alcohol`은 숫자가 아니라 `"12.5% ~ 13.0%"` 같은 문자열이다. 산도 필드명은 `acidity`가 아니라 `acid`다.

`Wine`은 추출과 페어링에서 공유한다. 추출 항목은 여기에 `confidence`와 필수 boolean `isCatalogMatched`가 추가된다. 카탈로그 매칭은 OCR 와인명을 내부 DB와 대조해 이름·병 이미지·맛 특성 등의 메타데이터를 보강한다.

공용 와인 필드는 추출 응답과 페어링 SSE의 최종 `JSON.data.wine`에 적용된다. `isCatalogMatched`는 추출 항목의 추가 필드이며 공용 `Wine` 필드는 아니다. 웹의 `wine.schema.ts`는 nullable 필드에 `.catch(null)`, 추출의 `isCatalogMatched`에 `.catch(false)`를 사용한다. `id`, `wineName`, 응답의 `wines` 배열은 필수 검증 대상이다. 병 이미지가 없으면 fallback 이미지를 표시한다.

## 웹 BFF 연결과 카탈로그 표시 정책

브라우저는 같은 오리진의 BFF Route Handler를 호출하고, BFF가 백엔드에 요청한다. 백엔드 주소는 `web/src/app/utils/http/api-query.ts`의 `getMysomApiBaseUrl()`이 서버 환경변수 `MYSOM_API_BASE_URL`에서 읽는다. 코드에 기본 주소는 없으며 미설정 시 오류가 발생한다. 로컬 값은 `http://localhost:8080`이다.

추출 BFF는 `web/src/app/shared/config/wine-catalog.ts`의 `isCatalogExcluded()`로 표시 정책을 결정한다.

```ts
const excludeCatalog = process.env.NEXT_PUBLIC_WINE_EXCLUDE_CATALOG !== "false";
const wines = excludeCatalog
  ? parsed.data.wines.filter((wine) => !wine.isCatalogMatched)
  : parsed.data.wines;
```

`NEXT_PUBLIC_` 값은 빌드 시 반영되므로 변경 후 개발 서버를 재시작하거나 다시 빌드한다. 이 설정은 추출 필터뿐 아니라 추천 상세의 와인 정보 영역을 “준비 중”으로 표시하는 정책에도 사용된다.

| `NEXT_PUBLIC_WINE_EXCLUDE_CATALOG` | 추출 BFF가 반환하는 와인 |
| --- | --- |
| 미설정 또는 `"false"` 이외 값 | 미매칭 항목만 |
| `false` | 전체 (카탈로그 매칭·보강 포함) |

예를 들어 서버가 10개 후보(매칭 6개 + 미매칭 4개)를 반환해도 제외 설정이면 화면에는 4개만 표시된다. OCR 항목 하나에 여러 카탈로그 후보가 대응할 수 있으므로 응답 후보 수가 사진의 와인 수와 같다는 보장은 없다. `web/.env.example`은 카탈로그 포함 값인 `NEXT_PUBLIC_WINE_EXCLUDE_CATALOG=false`를 명시한다.

## 로컬 실행

### 현재 서버 (`feature/wine-sample`)

백엔드 프로젝트의 `.env`에 `ACTIVE_PROFILE=local`과 GCP 설정을 준비하고, Vertex AI용 ADC(Application Default Credentials) 인증을 설정한다. 로컬 PostgreSQL은 `mysom-api-demo-db-1` 컨테이너의 `localhost:5432`를 사용한다.

```bash
cd /Users/yoon-yeongheon/dev/mysom-demo/mysom-api-demo
set -a; . ./.env; set +a
./gradlew :apps:mysomm-api-app:bootRun
```

현재 서버는 기본 8080 포트에서 실행하며 `mysomm` DB와 Flyway `V1`, `V2__add_wine_catalog` 마이그레이션을 사용한다.

### 웹 연결

이 저장소 루트에서 다음과 같이 실행한다. 별도 `.env`를 사용할 때도 같은 환경변수를 설정한다.

```bash
cd web
MYSOM_API_BASE_URL=http://localhost:8080 NEXT_PUBLIC_WINE_EXCLUDE_CATALOG=false npm run dev
```

현재 서버의 OCR + 카탈로그 결과 전체를 확인하려면 `false`를 사용한다. 미매칭 OCR 항목만 확인하려면 `true`를 사용하거나 표시 정책 변수를 설정하지 않는다. 백엔드 주소 변경도 `MYSOM_API_BASE_URL`로 설정한다.

관련 웹 구현:

- 백엔드 주소: `web/src/app/utils/http/api-query.ts`
- 추출 BFF: `web/src/app/api/wine-pairings/extract-wine-menu/route.ts`
- 카탈로그 정책: `web/src/app/shared/config/wine-catalog.ts`
- 와인 타입·검증: `web/src/app/entity/wine/model/wine.type.ts`, `wine.schema.ts`
- 병 이미지 fallback: `web/src/app/entity/wine/lib/wine-image.ts`

## 오류 응답

도메인 오류는 다음 형태다.

```ts
type ErrorResponse = {
  status: number;
  message: string | null;
};

type BadRequestErrorResponse = ErrorResponse & {
  status: 400;
  fields: Record<string, string[]>;
};
```

컨트롤러가 OpenAPI에 `BadRequestErrorResponse`를 선언하지만, 현재 전역 validation 변환기가 확인되지 않으므로 malformed JSON, header type mismatch, bean validation 오류는 Spring WebFlux 기본 오류 body일 수 있다. 프론트 BFF는 백엔드 오류 body를 그대로 노출하지 말고 HTTP status 중심으로 안전한 메시지로 변환한다.

SSE 연결이 시작된 뒤 AI 생성이 실패하면 정상 JSON 오류 응답이 아니라 연결 오류로 끝날 수 있다. 스트림 소비자는 HTTP `200`만으로 성공을 확정하지 말고 최종 `JSON` frame과 stream completion을 함께 확인해야 한다.
