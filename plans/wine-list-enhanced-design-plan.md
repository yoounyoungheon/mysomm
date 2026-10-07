# `/wine/list` 세션 기반 와인 메뉴 추출 설계

## 2026-10-08 이미지 표시 보완

- 전체 선택/해제 버튼은 높이 36px, 세로 여백 4px로 축소한다. 글꼴·가로 여백·색상·선택 동작은 유지한다.

- 결과 목록의 보이는 제목 대신 shared/ui Button으로 전체 선택/해제 액션을 표시한다. 모든 현재 후보가 선택되었으면 전체 해제, 일부/미선택이면 미선택 후보만 추가 선택한다. 기존 toggleWineId 저장 경로와 선택 개수 표시를 유지하며 제목은 sr-only로 남긴다. 부분 선택·전체 선택·빈 목록·연속 토글을 Storybook으로 검증한다.

- `ExtractedWineCard`의 이미지 슬롯을 너비 72px·가로:세로 3:4 직사각형으로 변경하고 object-contain으로 병 전체를 표시한다.
- 실제 이미지가 없으면 `/images/wines/wine-bottle.png`와 기존 `bg-black/45` 오버레이, `이미지\n준비중` 두 줄 안내를 표시한다.
- shared/ui Card, checkbox 선택·클라이언트 경계·API 흐름은 유지한다. 새로운 상태나 API 호출은 추가하지 않는다.
- style-implementation/css-only-state/storybook-authoring 가이드를 적용하고 사진 유무·긴 이름 스토리와 비율·선택 동작을 검증한다.

## 1. 범위와 기준

- 대상 라우트: `web/src/app/wine/list/page.tsx`
- 화면 시안: `designs/enhanced_design_1.png`
- API 명세: `api/mysom-ocr.md`
- 기준 백엔드: `mysom-api-demo` `68a0cb7`
- 적용 가이드: `web/GUIDE.md`, `data-flow-layering`, `bff-api-gateway`, `rsc-rendering`, `rcc-rendering`, `storybook-authoring`
- 범위: 설계만 작성하며 코드는 변경하지 않는다.

이 페이지는 와인 페어링 세션의 시작점이다. 사용자가 한 장 이상의 메뉴 이미지를 선택하면 새 session UUID로 메뉴 추출을 요청하고, 반환된 session-bound wine 후보 중 페어링에 사용할 와인을 고른다.

## 2. 변경 계약과 현재 구현 차이

| 구분 | 현재 프론트 | 변경 계약 | 설계 결정 |
| --- | --- | --- | --- |
| backend path | `/v1/wine-pairing/wines/menu-ocr` | `/v1/wine-pairings/extract-wine-menu` | 새 path만 사용 |
| 세션 header | 없음 | `X-Session-Id: UUID` | 분석 요청마다 새 UUID 생성 |
| 이미지 | raw 단일 파일 | multipart `wineMenuImages` 반복 | UI/BFF 모두 `File[]` 지원 |
| 응답 구분 | `type: OCR | DB` 필터 | `type` 없음 | 모든 유효 wine 후보 사용 |
| 와인 상세 | 제한된 필드 | taste profile, image URL, match 여부 포함 | entity DTO와 화면 모델 확장 |

직접 와인 검색 결과는 세션의 현재 wine menu에 속하지 않아 이후 API에서 사용할 수 없다. 백엔드가 session wine 추가/search 계약을 제공하기 전까지 직접 검색 UI는 활성 선택 경로에서 제외한다.

## 3. 페이지 구조

```text
WineListPage [Server]
├─ PageHeader [Server]
└─ WineListSelectPage [Client]
   ├─ IntroSection
   ├─ WineMenuPhotoSection
   │  ├─ MultiPhotoPicker
   │  ├─ PhotoPreviewList
   │  ├─ 파일별 제거/검증 상태
   │  └─ AnalyzeButton
   ├─ ExtractionStatePanel
   ├─ ExtractedWineSection
   │  └─ SelectedWineCard[]
   └─ NextRecommendationButton
```

- `page.tsx`는 Server Component를 유지하고 정적 shell과 header만 조합한다.
- 파일 선택, preview URL, mutation, 선택, sessionStorage 접근이 필요한 `WineListSelectPage` 하위만 Client Component다.
- 기존 `PageHeader`, `Button`, `Card`, `LoadingSpinner`를 `shared/ui`에서 재사용한다.
- 다중 파일 picker가 공통 업로드 역할로 재사용될 가능성이 있으면 `shared/ui/molecule`로 올리고 `Default`, `Multiple`, `LimitReached`, `InvalidFile`, `Disabled` story를 함께 설계한다. 페이지 전용 OCR 상태는 feature에 둔다.

## 4. 이미지 입력 정책

백엔드는 각 이미지에만 10MiB 제한을 두고 전체 개수/총량을 제한하지 않는다. BFF 보호를 위해 프론트 계약을 다음과 같이 둔다.

- 파일 형식: PNG, JPG/JPEG
- 파일당 최대: 10MiB
- 파일 개수: 최대 5장
- 총 파일 크기: 최대 50MiB
- part 이름: 각 파일 모두 `wineMenuImages`
- 선택 순서와 multipart append 순서를 동일하게 유지
- 중복 파일은 `name + size + lastModified` 기준으로 UI에서 제외

개수/총량은 백엔드 계약이 아니라 프론트/BFF 운영 정책이다. 운영 인프라의 request body limit이 더 작다면 그 값을 우선해 이 문서와 함께 조정한다.

## 5. 세션과 상태 소유권

| 상태 | 소유권 | 관리 방식 |
| --- | --- | --- |
| 선택 파일·preview URL | 현재 컴포넌트 | `useState`, unmount/제거 시 URL revoke |
| 분석 mutation 결과 | 서버 상태 | TanStack Query mutation 및 known-wines cache |
| 선택 wine ID | 페이지 간 공유 UI draft | 기존 flow-scoped Zustand store |
| session ID | 클라이언트가 생성한 워크플로 식별자 | versioned `sessionStorage` snapshot |
| CTA 활성 여부 | 결과 + 선택 상태 | 파생값, 별도 저장 금지 |

분석 버튼을 누를 때 `crypto.randomUUID()`로 session ID를 생성한다. 성공하면 session ID와 응답 wine ID를 함께 snapshot에 저장하고 기존 workflow snapshot을 원자적으로 교체한다. 실패한 요청의 ID는 재사용하지 않는다.

```ts
type WineSelectionSnapshotV2 = {
  version: 2;
  sessionId: string;
  wineIds: string[];
};
```

다시 분석하면 새 UUID를 생성하고 기존 선택 store, known-wines cache의 이전 후보, 하위 단계 snapshot을 초기화한다. 이 정책은 백엔드의 재추출 허용 여부와 무관하게 stale menu/session 혼합을 막는다.

## 6. 데이터 및 BFF 흐름

```text
사용자가 File[] 선택
-> client가 파일별 형식/크기와 전체 제한 검증
-> 새 sessionId 생성
-> POST /api/wine-pairings/extract-wine-menu
   Header X-Session-Id
   multipart wineMenuImages[]
-> BFF가 UUID, part 이름, magic bytes, 파일별/전체 limit 재검증
-> POST /v1/wine-pairings/extract-wine-menu
   Header X-Session-Id
   multipart wineMenuImages[]
-> backend WineMenuExtractResponse
-> BFF safe DTO validation/정규화
-> TanStack Query cache + 선택 UI
-> 다음 클릭 시 { version, sessionId, pairingWineIds } 저장
-> /wine/keywords 이동
```

브라우저는 backend origin을 직접 호출하지 않는다. BFF는 browser의 전체 header를 전달하지 않고 `X-Session-Id`, `Accept`만 명시적으로 재구성한다. multipart `Content-Type`은 boundary를 포함해야 하므로 fetch/FormData가 생성하게 하고 수동 문자열로 지정하지 않는다.

BFF 응답은 backend DTO를 그대로 흘리지 않고 프론트 entity DTO로 검증한다. 최소 보존 필드는 `id`, `wineName`, `vintage`, `alcohol`, `price`, `country`, `region`, `tannin`, `body`, `sweetness`, `acid`, `wineBottleImageUrl`, `confidence`, `isCatalogMatched`다.

## 7. 화면 모델과 표현

- 카드 제목: `wineName`
- 이미지: `wineBottleImageUrl`; null/실패 시 기존 wine placeholder
- 보조 정보: `country`, `region`, `vintage`, `alcohol` 중 존재하는 값만 조합
- 가격: 통화별 첫 값만 임의 선택하지 말고 목록을 모두 표현하거나 명시한 우선순위(KRW → USD → EUR) mapper를 둔다.
- `isCatalogMatched`: “카탈로그 매칭” badge로 표시할 수 있으나 선택 가능 여부를 결정하지 않는다.
- `confidence`: 내부 품질 값이다. 제품에서 노출하기로 결정하지 않았다면 UI에 직접 백분율로 표시하지 않는다.
- 맛 특성은 선택 카드의 필수 정보가 아니므로 상세/후속 화면에서 사용한다.

응답이 빈 배열이면 성공 화면으로 처리하지 않고 “인식한 와인이 없습니다” 상태와 이미지 다시 선택 액션을 제공한다.

## 8. 오류와 복구

- `400/413`: 파일별 오류를 가능한 경우 해당 preview에 연결하고 수정 후 재시도 허용
- `409`: 이전 세션 재사용으로 간주하고 로컬 workflow를 폐기한 뒤 새 UUID로만 수동 재시도
- `500/502/timeout`: safe message와 수동 재시도 제공; 재시도도 새 UUID 사용
- 요청 중 페이지 이탈 시 AbortController로 취소하고 완료 후 state update를 막는다.
- 자동 retry는 OCR 비용과 유령 세션 생성을 늘릴 수 있으므로 mutation `retry: 0`을 기본으로 한다.

## 9. 파일별 구현 범위

```text
web/src/app/wine/list/page.tsx
web/src/app/feature/wine-list-select/**
web/src/app/entity/wine/model/wine.type.ts
web/src/app/entity/wine/api/wine.api.ts
web/src/app/entity/wine/api/wine.mapper.ts
web/src/app/entity/wine-pairing-workflow/**          # versioned snapshot 제안
web/src/app/api/wine-pairings/extract-wine-menu/route.ts
```

기존 `/api/wine-lists/analyze`를 유지해야 한다면 외부 BFF path만 유지하고 내부 backend path와 계약을 교체할 수 있다. 새 backend path와 혼동을 줄이려면 same-origin BFF도 `/api/wine-pairings/extract-wine-menu`로 맞추는 것을 권장한다.

## 10. Storybook·검증 범위

- 페이지: empty, 1장/여러 장 선택, 일부 invalid, 분석 중, 빈 결과, 오류, 결과 선택
- 카드: catalog matched/unmatched, 이미지 없음, 긴 이름, null 메타, 다중 가격
- picker: 키보드 접근, 파일 제거, 5장 제한, 같은 파일 재선택
- BFF: 잘못된 UUID, 잘못된 part, 0장/6장, 파일당/전체 초과, fake extension/magic bytes, backend 409/413/500
- 모바일 320/390px에서 preview list와 고정 CTA가 겹치지 않는지 확인

## 11. 완료 기준

- 한 번의 분석 요청에서 최대 5장의 이미지를 순서대로 전송한다.
- 각 분석은 새 `X-Session-Id`로 시작하고 성공한 ID가 다음 페이지까지 유지된다.
- `type` 필터와 `WINE_DATA_TYPE` 설정에 의존하지 않는다.
- 추출 응답의 모든 유효 wine ID만 선택 후보가 되며 직접 검색 wine을 섞지 않는다.
- 새 분석 시 이전 session-bound 상태가 남지 않는다.
