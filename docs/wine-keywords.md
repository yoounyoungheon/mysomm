# `/wine/keywords` 메뉴 추천 개발 문서

## 홈 이동과 서버 로그

상단 홈 아이콘은 `/`로 replace 이동하며, 선택 스냅샷 저장 후 `/wine/chat` 진입도 router.replace한다. 추천 조회·선택 검증 정책은 그대로 유지한다.

recommend-menu BFF와 Entity 서버 helper는 요청 시작·인증·입력 검증(선택 개수)·백엔드 호출/상태·DTO 매핑·결과 개수·완료/오류를 요청별 JSON 로그로 남긴다. 세션·선택 ID·메뉴명·원문 오류를 출력하지 않고 timestamp/requestId/elapsedMs와 안전한 지표만 기록한다.

- 라우트: `web/src/app/wine/keywords/page.tsx`
- 시안: `designs/enhanced_design_2.png`
- API: `api/mysom-wine-pairing.md` (`POST /v1/wine-pairings/recommend-menu`)
- 기준 백엔드: `mysom-api-demo` `68a0cb7`

`/wine/list`에서 선택한 세션 wine으로 추천 메뉴를 조회하고, 다음 페어링에 사용할
**추천 메뉴 name**을 고르는 단계다.

## 페이지 구조와 RSC/RCC 경계

```text
WineKeywordsPage [Server]  (page.tsx)
├─ PageHeader [Server]
└─ MenuCategoryRecommendationPage [Client]
   ├─ FixedFoodSection → 명시적 4행 → MenuNameBadge (가변 너비·내부 아이콘)
   ├─ CustomFoodInput → TextInput + SelectionBadge (삭제 가능)
   ├─ Divider + AiIntro
   ├─ RecommendationResult (loading/error/empty/success)
   │  └─ RecommendedMenuList → MenuNameBadge[]
   └─ SelectedMenuCart + PairingCta (fixed)
```

- `page.tsx`와 header는 Server Component, page body만 Client Component다.
- 인트로는 추천 기준과 함께 `원하는 메뉴를 선택해 주세요.`라는 다음 행동을 안내한다.
- 상단은 `어떤 음식을 드시나요?`와 고정 11개 카테고리, 직접 입력 순서다. 구분선 아래에 AI 추천을 표시한다.
- 고정 메뉴는 네 행으로 유지한다: 소·양고기/돼지고기/닭·오리 → 생선/조개·갑각류 → 파스타·면/햄버거·피자/밥·곡물 → 치즈·샤퀴테리/빵/디저트. 각 뱃지 너비는 내용에 따라 가변적이며 좁은 화면에서 내부 간격을 축소한다. AI 메뉴도 가변 너비이며 flex-wrap으로 공간이 부족하면 다음 줄로 넘어간다. grouping 순서는 유지하고 화면보다 긴 이름만 뱃지 안에서 줄바꿈한다.
- 고정 UI 분류는 API enum과 분리한 `FIXED_FOOD_CATEGORIES` 및 행 배치용 `FIXED_FOOD_GROUPS`로 관리한다. 요청 메뉴명도 `햄버거·피자`를 사용한다.
- 아이콘은 `/images/menu-category/`의 기존 PNG를 사용한다. 조개·갑각류는 shrimp.png, 햄버거·피자는 hamburger.png다. AI 응답 category와 실제 name은 변경하지 않는다.
- `SelectionBadge`는 기존 보라색 선택 스타일을 유지하며 선택/삭제를 별도 버튼으로 제공한다. `icon` 슬롯을 통해 뱃지 내부에 작은 음식 아이콘을 표시한다. `MenuNameBadge`가 18px PNG를 연결하고, 직접 입력 뱃지는 other.png를 사용한다. 탭 영역은 최소 44px이며 긴 이름은 줄바꿈한다.
- 선택 개수는 AI 추천 영역에 표시하지 않고 CTA 위 오른쪽의 장바구니 플로팅 버튼에 표시한다. 고정·직접 입력·AI 선택 모두 합산한다. 버튼은 공통 Dialog를 열어 선택한 음식 목록을 확인/해제하며 마지막 항목 해제 시 0개·빈 목록 안내와 CTA 비활성 상태가 즉시 반영된다. 닫기/ESC와 포커스 복귀는 Dialog를 재사용한다.
- 장바구니 트리거는 52×52px full-round 원형으로 CTA와 같은 텍스트·반투명 배경·테두리·그림자를 적용한다. 숫자 뱃지는 원 오른쪽 위 모서리에 absolute 오버레이로 표시한다.
- 장바구니와 CTA 사이는 20px 간격을 두어 원형 버튼을 조금 위로 띄운다.
- 직접 입력한 음식 뱃지는 아이콘 없이 이름과 삭제 버튼만 표시한다. 직접 입력은 100자 UI draft 제한, trim·공백·중복 검증을 적용한다. Enter/추가로 확정하고 한글 IME 조합 중 Enter는 무시한다. 추가 시 선택하고 입력을 비운다. 삭제는 목록/선택에서 동시에 제거하고 입력으로 초점을 복구한다.
- 음식 입력은 공통 `TextInput`을 사용하며 공통 rounded-3xl 형태를 유지한다. 배경은 실제 input에만 적용해 외부 흰색 사각 래퍼가 남지 않는다. 공통 기본 흰색·disabled 회색 및 호출부 배경 커스터마이징을 유지한다.
- 직접 입력에서 빈 값·공백만 추가/Enter하면 뱃지를 만들지 않고 에러도 표시하지 않는다. 중복·길이 오류 안내는 유지한다.
- 시각적 `찾는 음식이 없어요` 라벨 없이 아이콘 옆 첫 행에 TextInput·추가 버튼을 표시한다. placeholder는 `찾는 음식이 없으면 직접 입력해주세요!`이며 스크린리더용 입력 label은 유지한다.

## 입력 snapshot과 검증

`/wine/list`가 저장한 `WineSelectionSnapshot`(`version: 2, sessionId, pairingWineIds`)을
hydration 이후 한 번 읽는다(`useStoredWineSelectionSnapshot`). hydration 전에는 loading
shell을 유지하고, snapshot이 없거나 invalid(legacy shape 포함)면 API를 호출하지 않고
`/wine/list` 복귀 액션을 제공한다.

## 상태 관리

- hydration 및 AI 추천 조회 중에는 `SkeletonList`의 menu-chips variant로 내부 아이콘·텍스트 윤곽을 가진 6개 뱃지를 반응형 grid로 표시한다. 완료 후 메뉴는 가변 너비 flex-wrap으로 표시한다. 보라색 톤·pulse·reduced-motion 정책은 유지한다. AI 조회 중에도 고정 음식과 직접 입력은 사용할 수 있다. 기존 menu/menu-rows/wine variant는 유지한다.
- pending 패널은 `role="status"`, `aria-busy="true"`와 추천 메뉴 로딩 안내를 제공한다. 성공·오류·빈 결과에서는 스켈레톤을 제거하며 결과 선택 및 재시도 로직은 유지한다.
- 최신 검증: 단위 테스트 104개, 페이지·AI 메뉴 목록 Storybook 14개, 변경 범위 타입 검사·ESLint 통과. 실제 Next.js 목업 화면에서 320/390/430px의 고정 4행 배치에 가로 넘침이 없고 AI 메뉴 뱃지 너비가 이름 길이에 따라 다르며 직접 입력 뱃지에는 이미지가 없음을 확인했다. Storybook에 App Router 문맥을 설정해 실제 페이지의 `useRouter`를 지원한다. 실제 AI 생성 요청은 검증 중 호출하지 않는다.

| 상태 | 출처 | 관리 |
| --- | --- | --- |
| session ID / pairingWineIds | list snapshot | hydration 후 로컬 읽기 |
| 추천 메뉴 | 서버 상태 | TanStack Query |
| 선택 menu name | 페이지 UI draft | `useState<string[]>` |
| 직접 입력 목록/입력값 | 페이지 UI draft | `useState` |
| CTA 활성 | 파생값 | 고정·직접 입력·AI 음식 1개 이상 선택 + 조회 중/오류 아님 |

query key는 세션과 선택 wine을 모두 포함한다.

```ts
["wine-pairings", "recommend-menu", { sessionId, pairingWineIds }]
```

`POST`지만 화면 생명주기 동안 같은 입력을 재사용하는 조회 성격이므로
`staleTime: Infinity`, `refetchOnWindowFocus: false`, `retry: 0`으로 둔다.
자동 refetch/retry는 backend가 세션에 저장하는 추천 결과를 바꿀 수 있어 막는다.

## 데이터·BFF 흐름

```text
selection snapshot 복원
→ POST /api/wine-pairings/recommend-menu  (X-Session-Id, { pairingWineIds })
→ BFF: UUID/배열 개수 검증, 세션은 header로만 전달
→ POST /v1/wine-pairings/recommend-menu
→ { recommendedMenus: [{ name, category }] }
→ mapper: 순서 유지, category enum 검증(알 수 없으면 계약 오류), name trim
→ TanStack Query cache → RecommendedMenuList
→ 사용자가 추천 name 또는 고정/직접 입력 draft 선택
→ getMenuSelection: 표시 가능한 고정·직접 입력·AI 선택의 중복/오래된 값 제거
→ WinePairingSnapshot 저장 → /wine/chat
```

`mapMenuRecommendationDto`는 응답 순서(AI rank)를 유지하고, `MENU_CATEGORIES` enum에
없는 category는 조용히 바꾸지 않고 오류로 처리한다. 선택 식별자와 다음 요청 값은 `name`이다.

## 다음 페이지 snapshot

```ts
type WinePairingSnapshot = {
  version: 2;
  sessionId: string;
  wineIds: string[];   // = pairingWineIds
  menuNames: string[]; // 선택한 AI 메뉴명·고정 카테고리명·직접 입력 음식명
};
```

화면 선택은 현재 AI 응답 name, 고정 UI label, 현재 직접 입력 목록의 합집합으로 제한한다.
AI 추천 목록 포함 여부는 요청 조건이 아니다. 고정·직접 입력만 선택하거나 AI 추천과 함께 선택해도 기존 `menuNames` 배열로 그대로 전달한다. 준비 중 안내와 미지원 선택 차단은 제거했다. 오래된 추천 결과나 삭제된 직접 입력 선택은 유효 목록에서 제외한다.

## 오류 정책

- 항목은 자동 선택하지 않고, 같은 `name`은 한 번만 선택한다(category는 식별자 아님).
- 음식을 하나도 선택하지 않거나 재조회 중/오류면 CTA를 비활성화한다.
- BFF status 매핑: 400(요청 손상), 404(세션·wine 불일치), 409(메뉴 변경), 그 외(재시도).
- 오류 상태는 "다시 시도"(refetch) + "처음부터 다시 시작"(/wine/list) 액션을 함께 제공한다.

## Storybook

- `Feature/menu-category-recommendation-result/MenuNameBadge`
- `Feature/menu-category-recommendation-result/RecommendedMenuList`
- `Feature/menu-category-recommendation-result/MenuCategoryRecommendationPage`
  (default/selected/multiple selected/loading/error/custom input/mixed selection/empty)
- `Components/SelectionBadge` (선택/삭제/긴 이름)
- `Components/IconBadgeRow` (단일/줄바꿈)
- `Components/SkeletonList`의 MenuChips
- `Feature/menu-category-recommendation-result/SelectedMenuCart` (목록/0개/긴 이름)

## 알려진 제약

- 시안의 메뉴 썸네일·설명 문구는 API 계약(`{ name, category }`)에 없어 표시하지 않는다.
- "다시 추천" 버튼은 별도로 두지 않았다. 필요 시 성공 시 selection 초기화를 포함해 추가한다.
- 2026-10-07 사용자가 고정·자유 입력 지원과 API shape 유지(`wineIds`, `menuNames`)를 확인했다. 프론트는 이 계약에 맞춰 선택한 모든 음식명을 전달한다. 현재 로컬 백엔드는 아직 업데이트를 fetch하지 않았으므로 이번 검증은 UI·snapshot 계약까지 수행했고 실제 자유 입력 페어링 성공을 검증한 것은 아니다. 백엔드 fetch/수정은 수행하지 않았다.
