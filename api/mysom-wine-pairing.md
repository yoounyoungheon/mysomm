# Mysom 메뉴 추천·와인 페어링 API

- 기준 백엔드: `mysom-api-demo` `feature/wine-sample` (기존 계약 확인: `68a0cb7`)
- 전제: [와인 메뉴 추출](./mysom-ocr.md)이 같은 `X-Session-Id`로 선행되어야 한다.

## POST /v1/wine-pairings/recommend-menu

현재 세션의 와인 메뉴에서 선택한 wine ID를 바탕으로 메뉴를 추천하고, 결과를 세션에 저장한다.

### Request

```http
POST /v1/wine-pairings/recommend-menu
X-Session-Id: {uuid}
Content-Type: application/json
Accept: application/json
```

```ts
type MenuRecommendationRequest = {
  pairingWineIds: string[]; // non-empty UUID[]
};
```

```json
{
  "pairingWineIds": ["e501190d-ad82-460a-9d3d-b78999d49841"]
}
```

### Response

Status: `200 OK`

```ts
type MenuCategory =
  | "기타"
  | "붉은 고기"
  | "돼지고기"
  | "가금류"
  | "해산물"
  | "파스타 및 면"
  | "밥"
  | "채소"
  | "치즈"
  | "빵"
  | "디저트";

type MenuRecommendationResponse = {
  recommendedMenus: Array<{
    name: string;
    category: MenuCategory;
  }>;
};
```

```json
{
  "recommendedMenus": [
    { "name": "해산물 파전", "category": "해산물" },
    { "name": "바지락 오일 파스타", "category": "파스타 및 면" }
  ]
}
```

결과는 AI rank 순으로 정렬되고 정규화된 menu name 기준으로 중복 제거되며 최대 6개다. AI 추천에서 선택한 항목은 `name`을 그대로 전달한다. 2026-10-07 사용자 확인에 따라 페어링의 menuNames는 이 추천 목록에 한정되지 않으며 고정 카테고리·직접 입력 음식도 허용한다. HTTP/DTO shape는 변경하지 않는다.

### Error cases

| Status | 조건 | 대표 message |
| --- | --- | --- |
| `400` | `pairingWineIds`가 비었거나 UUID 형식이 아님 | validation/Spring 오류 |
| `404` | 세션 없음 | `페어링 세션을 찾을 수 없습니다.` |
| `404` | ID가 현재 세션의 현재 와인 메뉴에 없음 | `선택한 와인을 찾을 수 없습니다.` |
| `409` | 메뉴 snapshot이 처리 중 변경됨 | `와인 메뉴가 변경되었습니다. 메뉴 추천을 다시 진행해 주세요.` |
| `500` | AI가 유효한 추천을 만들지 못했거나 저장 실패 | `ErrorResponse` 또는 Spring 오류 |

## POST /v1/wine-pairings/pairing

선택한 와인과 앞 단계에서 추천된 메뉴로 페어링 결과를 생성해 SSE로 반환한다.

### Request

```http
POST /v1/wine-pairings/pairing
X-Session-Id: {uuid}
Content-Type: application/json
Accept: text/event-stream
```

```ts
type WinePairingRequest = {
  wineIds: string[]; // extract response의 ID
  menuNames: string[]; // AI 추천 메뉴명, 고정 카테고리명 또는 직접 입력 음식명
};
```

```json
{
  "wineIds": ["e501190d-ad82-460a-9d3d-b78999d49841"],
  "menuNames": ["해산물 파전"]
}
```

두 배열은 비어 있을 수 없다. `menuNames`는 AI 추천 메뉴명뿐 아니라 고정 카테고리명·직접 입력 음식명을 받는다(2026-10-07 사용자 확인). 요청 필드와 타입은 그대로다. 저장소 밖 로컬 백엔드 소스는 아직 이전 버전이며 해당 업데이트의 fetch는 별도 작업이다.

### SSE Response

Status: `200 OK`  
Content-Type: `text/event-stream`

이벤트명은 지정하지 않으며 기본 `data:` frame을 사용한다.

```ts
type PairingFieldName = "rank" | "name" | "comment" | "reason";

type PairingStreamEvent =
  | {
      type: "STREAM";
      data: { fieldName: PairingFieldName; hasNext: boolean; body: string };
    }
  | {
      type: "JSON";
      data: {
        pairingId: string;
        rank: number;
        wine: Wine;
        comment: string;
        reason: string;
      };
    };
```

추천 한 건마다 `rank` → `name` → `comment` → `reason`의 `STREAM` 청크가 오고, 마지막에 권위 있는 `JSON` frame이 온다. 한 필드는 최대 24자 안팎의 읽기 좋은 경계로 여러 frame에 나뉠 수 있다.

```text
data:{"type":"STREAM","data":{"fieldName":"rank","hasNext":false,"body":"1"}}

data:{"type":"STREAM","data":{"fieldName":"name","hasNext":false,"body":"클라우디 베이 소비뇽 블랑"}}

data:{"type":"STREAM","data":{"fieldName":"comment","hasNext":false,"body":"차갑게 즐겨보세요."}}

data:{"type":"STREAM","data":{"fieldName":"reason","hasNext":false,"body":"산뜻한 산도가 해산물의 풍미와 어울립니다."}}

data:{"type":"JSON","data":{"pairingId":"b9753122-8efa-4191-8df7-a0643a3a4caf","rank":1,"wine":{"id":"e501190d-ad82-460a-9d3d-b78999d49841","wineName":"클라우디 베이 소비뇽 블랑","vintage":2023,"alcohol":"12.5% ~ 13.0%","price":[{"amount":55000,"currency":"KRW","currencySign":"₩","koreanUnit":"원"}],"country":"New Zealand","region":"Marlborough","tannin":1.0,"body":2.5,"sweetness":1.0,"acid":4.0,"wineBottleImageUrl":"https://example.com/wines/cloudy-bay.jpg"},"comment":"차갑게 즐겨보세요.","reason":"산뜻한 산도가 해산물의 풍미와 어울립니다."}}
```

프론트 조립 규칙:

- 같은 `fieldName`의 `body`를 도착 순서대로 이어 붙인다.
- `hasNext: false`는 해당 필드가 끝났다는 뜻이며 추천 한 건이나 전체 stream의 종료 신호가 아니다.
- `JSON.data`로 현재 임시 추천을 최종 교체한다.
- 추천 한 건의 key는 `pairingId + wine.id + rank` 조합을 사용한다. 같은 pairing의 여러 추천은 `pairingId`를 공유할 수 있다.
- 전체 완료는 `ReadableStream.done`으로 판단한다. 별도의 완료 frame은 없다.
- 적어도 하나의 `JSON` frame 없이 종료되면 성공 결과로 확정하지 않는다.

현재 `PairingStreamController` mapper는 domain wine의 `body`를 최종 `JSON.data.wine`에 전달하지 않아 페어링 응답의 `body`는 사실상 항상 `null`이다. OCR 응답에는 값이 있을 수 있다. 백엔드 mapper가 수정되기 전까지 채팅 상세 화면은 `body`가 없음을 정상 상태로 처리한다.

`Wine`의 전체 정의는 [공통 명세](./mysom-api.md#공통-타입)를 참고한다. `isCatalogMatched`는 추출 항목에만 정의되므로 이 SSE wine의 필수 필드로 가정하지 않는다.

### Error cases

| Status/형태 | 조건 |
| --- | --- |
| `400` | header/request validation 실패 |
| `404` | 세션, 선택 wine, 저장된 추천 menu 중 하나를 찾지 못함 |
| `409` | 메뉴 추천 전 호출, 이미 페어링 진행 중 등 세션 상태 충돌 |
| stream error | SSE 시작 뒤 AI 페어링 생성 실패 |

생성 실패 event는 컨트롤러에서 `PairingStreamException`으로 바뀌므로 JSON 오류 frame 계약이 없다. 동일 세션에 대한 자동 재호출은 중복 생성 또는 `409` 위험이 있어 금지한다.

## POST /v1/wine-pairings/chat

최신 완료 페어링과 최근 대화 문맥을 바탕으로 후속 메시지를 처리한다. 서버가 일반 대화와 재페어링 의도를 분류한다.

### Request

```http
POST /v1/wine-pairings/chat
X-Session-Id: {uuid}
Content-Type: application/json
Accept: text/event-stream
```

```ts
type WinePairingConversationRequest = {
  message: string; // @NotBlank
};
```

### SSE Response

일반 대화는 field name 없는 `STREAM` frame만 보낸다.

```text
data:{"type":"STREAM","data":{"body":"가장 맛있는 서빙 온도는 "}}

data:{"type":"STREAM","data":{"body":"8~10도 정도예요."}}
```

재페어링은 `/pairing`과 같은 field `STREAM` + 최종 `JSON` frame을 보낸다. 첫 frame shape으로 분기한다.

```ts
type ChatStreamEvent = {
  type: "STREAM";
  data: { body: string };
};

type PairingChatStreamEvent = ChatStreamEvent | PairingStreamEvent;
```

일반 대화와 재페어링 모두 전체 완료 frame은 없다. 일반 대화 완료 event는 HTTP 응답에 노출되지 않는다.

### Error cases

| Status/형태 | 조건 |
| --- | --- |
| `400` | header/request validation 실패 |
| `404` | 세션 또는 완료된 기준 페어링 없음 |
| `409` | 현재 세션 상태에서 채팅 불가, 동시 채팅 lease 충돌 |
| stream error | 의도 분류, 일반 대화 생성 또는 재페어링 생성 실패 |
