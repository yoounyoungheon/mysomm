# `/wine/list` 와인 메뉴 추출 개발 문서

## 카드 이미지

결과 목록 상단에는 제목 대신 전체 선택/전체 해제 버튼을 표시한다. 일부 또는 미선택 상태에서는 나머지 후보를 선택하고, 모두 선택된 상태에서는 현재 후보를 모두 해제한다. 오른쪽 선택 개수와 개별 카드 선택은 유지하며 빈 목록에서는 버튼을 비활성화한다. 접근성용 제목은 유지한다.

`ExtractedWineCard`의 이미지 영역은 72×96px(가로:세로 3:4) 직사각형이다. object-contain으로 실제 병 사진 전체를 표시한다. 사진 URL이 비어 있으면 `/images/wines/wine-bottle.png`와 기존 어두운 오버레이(`bg-black/45`), 중앙의 `이미지\n준비중` 두 줄 문구를 표시한다. 카드 선택과 데이터 흐름은 유지한다.

## 홈 이동과 서버 로그

상단 홈 아이콘은 `/`로 replace 이동한다. 와인 선택 스냅샷을 저장한 후 `/wine/keywords`로 router.replace한다. 선택이 없으면 이동하지 않는다.

extract-wine-menu BFF는 요청 시작·인증 통과·이미지 검증 완료(장수/총 바이트)·백엔드 호출/응답·응답 검증 실패·카탈로그 제외 플래그·결과 개수·HTTP 상태를 요청별 JSON 로그로 출력한다. 파일명·이미지·세션 ID·결과 원문은 남기지 않는다. 공통 서버 로거의 timestamp/requestId/elapsedMs로 처리 흐름을 추적한다. API 및 기존 UI 동작은 유지한다.

- 라우트: `web/src/app/wine/list/page.tsx`
- 시안: `designs/enhanced_design_1.png`
- API: `api/mysom-ocr.md` (`POST /v1/wine-pairings/extract-wine-menu`)
- 기준 백엔드: `mysom-api-demo` `68a0cb7`

와인 페어링 워크플로의 시작점이다. 사용자가 한 장 이상의 메뉴 이미지를 첨부하면
새 세션 UUID로 추출을 요청하고, 반환된 세션 wine 후보 중 페어링에 쓸 와인을 다중 선택한다.

## 페이지 구조와 RSC/RCC 경계

```text
WineListPage [Server]  (page.tsx)
├─ PageHeader [Server]
└─ WineListSelectPage [Client]
   ├─ IntroSection
   ├─ WineMenuPhotoSection
   │  └─ PhotoPicker (shared/ui/molecule)
   ├─ 빈 결과 안내
   ├─ ExtractedWineSection → ExtractedWineCard[]
   └─ NextRecommendationButton (sticky CTA)
```

- `page.tsx`는 Server Component로 정적 shell과 header만 조합한다.
- 파일 선택/미리보기/mutation/선택/sessionStorage 접근이 필요한 `WineListSelectPage`
  하위만 Client Component다.

## 상태 소유권

| 상태 | 소유 | 관리 |
| --- | --- | --- |
| 선택 파일·preview URL | 컴포넌트 로컬 | `useState<MenuImagePreview[]>`, 제거/언마운트 시 `URL.revokeObjectURL` |
| 추출 결과(wines) | 서버 상태 | TanStack Query mutation `data` (useState로 복제하지 않음) |
| 세션 ID·선택 wine ID | 플로우 draft | `wine-list-selection.store` (Zustand, `/wine/layout` 제공) |
| CTA 활성 | 파생값 | `sessionId && selectedWineIds.length > 0` |

세션 ID는 분석 버튼을 누를 때마다 `generateUuid()`로 새로 만든다. 추출이 성공하면
`startSession(sessionId, 추출 wine ID 전체)`로 커밋하고 하위 단계 snapshot을 초기화한다
(`clearDownstreamWorkflowSnapshots`). 실패한 세션 ID는 재사용하지 않는다.

## 이미지 입력 정책 (프론트/BFF 운영 정책)

- 형식: PNG, JPG/JPEG (MIME + 파일명 확장자 + magic bytes)
- 파일당 최대: 10MiB / 파일 개수: 최대 5장 / 총량: 최대 50MiB
- multipart part 이름: 모두 `wineMenuImages`, 선택 순서를 유지
- 중복은 `name + size + lastModified` 기준 제거

정의: `entity/wine/model/wine-menu-image.ts` (`validateWineMenuImageAddition` 등).

## 데이터·BFF 흐름

```text
File[] 선택 → 클라이언트 검증 → generateUuid()
→ POST /api/wine-pairings/extract-wine-menu  (X-Session-Id, multipart wineMenuImages[])
→ BFF: UUID/part/개수/총량/파일별 형식·magic bytes 재검증, boundary는 fetch가 생성
→ POST /v1/wine-pairings/extract-wine-menu
→ WineMenuExtractResponse → zod(`wineMenuExtractResponseSchema`) 정규화
→ safe DTO { wines: ExtractedWine[] } 반환
→ mutation data → 선택 UI
→ "다음" 클릭 시 WineSelectionSnapshot 저장 → /wine/keywords
```

BFF는 browser header를 통째로 전달하지 않고 `X-Session-Id`, `Accept`만 재구성한다.
backend 오류 body/내부 URL은 노출하지 않고 status 기준 safe message로 매핑한다
(400/409/413/기타).

## 핸드오프 snapshot

```ts
type WineSelectionSnapshot = {
  version: 2;
  sessionId: string;
  pairingWineIds: string[]; // 선택한 wine ID
};
```

`entity/wine-pairing-workflow/lib/workflow-snapshot-storage.ts`의 versioned sessionStorage.

## 오류·복구

- 파일 형식/크기/개수/총량 오류는 preview 아래 alert로 표시하고 수정 후 재시도.
- 추출 실패는 safe message + 수동 재시도(mutation `retry: 0`, 재시도는 새 UUID).
- 빈 결과(`wines: []`)는 성공 화면으로 넘기지 않고 "인식한 와인이 없습니다" 안내.

## Storybook

- `Components/PhotoPicker` (empty/previews/limit/loading/disabled)
- `Feature/wine-list-select/ExtractedWineCard` (selected/catalog/null meta/long name)
- `Feature/wine-list-select/ExtractedWineSection`, `WineMenuPhotoSection`

## 남은 제약

- 백엔드 세션 wine 추가/검색 계약이 없어 직접 와인 검색 UI는 제외했다(시안의 검색 박스 비활성).
- 리로드 후 추출 결과(wines)는 서버 상태라 복원하지 않는다. 재분석이 필요하다.
