# `/` 홈 메인 UI 피드백 반영 계획

## 아이콘 내부 여백 보완 (2026-10-08)

사용자 스크린샷의 취향 프로필·빠른 취향 채우기 EmojiBadge에 동일하게 적용한다. 44px 배경은 유지하고 내부 이미지만 26px에서 32px로 확대해 여백을 한쪽 9px에서 6px로 줄인다. 기존 이미지 파일·카드 배치·shared/ui 소비자·Client 경계·상태·API는 변경하지 않는다. ESLint 및 실제 모바일 홈의 이미지 크기를 확인한다.

## 1. 범위와 기준

- 대상 라우트: `web/src/app/page.tsx`
- 주요 구현: `web/src/app/feature/home/ui/HomeView.tsx`
- 피드백 원본: `temp/main-page-feedback-plan.md`의 ①~④
- 디자인 피드백 원본: `~/Downloads/메인페이지.pdf`
- 적용 가이드: `web/GUIDE.md`, `style-implementation`, `css-only-state`, `storybook-authoring`
- 범위: 히어로 타이포그래피, 추천 진입 카드 레이아웃/질감, 취향 프로필 진행 단계 표시

이번 작업은 홈 화면의 정보 위계와 카드 가독성을 개선하는 UI 변경이다. 라우팅, 출시 예정 토스트, 추천 플로우 상태와 API 계약은 변경하지 않는다.

## 2. 현재 구조와 변경 목표

현재 홈은 다음 순서로 구성된다.

```text
Home [Server]
└─ HomeView [Client]
   ├─ TopBar
   ├─ Hero
   ├─ FeatureCards
   │  └─ FeatureCard × 2
   ├─ TasteProfileSection
   ├─ QuickPreferenceSection
   ├─ BottomNav
   └─ Toast
```

변경 후에도 Server/Client 경계는 유지한다. `HomeView`는 출시 예정 토스트의 timer와 클릭 이벤트를 소유하므로 Client Component로 유지하고, 이번 스타일 변경을 위해 상태를 추가하지 않는다.

목표는 다음과 같다.

- 히어로에서 불필요한 eyebrow를 제거하고 핵심 제목을 가장 강한 정보로 만든다.
- 추천 카드는 제목과 설명을 먼저 읽고 아이콘을 행동 단서로 인식하도록 재배치한다.
- 취향 프로필의 진행 상황을 숫자와 진행바가 동일한 의미로 표현하게 한다.
- 모바일 폭에서 텍스트 대비와 클릭 영역을 유지한다.

## 3. 히어로 수정

### 카피

- `오늘도 실패 없는 한 잔` eyebrow를 제거한다.
- 제목과 본문 카피는 유지한다.
- eyebrow 제거 후 제목에 남는 불필요한 위쪽 margin을 제거한다.

### 타이포그래피

- 제목은 mobile-first 기준으로 `30px`에서 시작하고, 공간이 충분한 화면에서는 `32px`까지 확장한다.
- 굵기는 `font-extrabold`에서 `font-semibold`로 낮춘다.
- 행간은 두 줄 제목이 한 덩어리로 읽히되 글자가 겹치지 않는 범위로 유지한다.
- 본문보다 제목이 명확히 우선하도록 색상은 기존 `text-ink-page`를 유지한다.

## 4. 추천 진입 카드 수정

### 정보 구조

현재의 `아이콘 → 하단 제목/캡션` 구조를 다음 순서로 바꾼다.

```text
카드
├─ 제목
├─ 상세 설명
└─ 아이콘 (우측 하단)
```

- 텍스트와 아이콘은 가능한 한 normal flow에서 배치한다.
- 카드 root를 세로 flex로 유지하고 아이콘에 `margin-top: auto`, `align-self: flex-end` 성격의 배치를 적용한다.
- 아이콘 위치를 맞추기 위해 전체 콘텐츠를 absolute로 배치하지 않는다.
- 두 카드의 제목 길이가 달라도 아이콘의 기준선이 맞아야 한다.

### 제안 카피

| 카드 | 제목 | 상세 설명 |
| --- | --- | --- |
| 사진 추천 | 사진으로 추천받기 | 메뉴판을 찍으면 어울리는 와인을 찾아드려요 |
| 검색 추천 | 검색으로 추천받기 | 와인 이름을 검색해 어울리는 메뉴를 찾아보세요 |

검색 추천은 아직 출시 예정 동작이므로 설명을 추가하더라도 기존 toast 동작을 유지한다.

### 공통 UI와 글래스 스타일

- `shared/ui/molecule/card`의 `Card`를 카드의 시각적 shell로 우선 재사용한다.
- 실제 클릭 요소인 `Link` 또는 `button`은 카드 내부 전체 영역을 채우게 하여 기존 클릭 범위를 축소하지 않는다.
- 기존 violet gradient는 카드별 구분 수단으로 유지한다.
- 반투명 surface, 흰색 border, 상단 inset highlight, 낮은 강도의 shadow로 glass rim을 표현한다.
- blur, gradient, shadow를 동시에 과도하게 사용하지 않고 제목과 설명의 대비를 우선한다.
- hover뿐 아니라 `focus-visible` outline을 제공한다.
- 장식용 원은 텍스트를 침범하지 않도록 낮은 opacity와 비상호작용 레이어로 유지하거나 제거한다.

## 5. 취향 프로필 진행 단계

- 프로필 제목/설명 영역과 충돌하지 않는 위치에 `1/5` 라벨을 추가한다.
- `1/5`를 기준값으로 사용하므로 진행바도 `20%`로 맞춘다. 기존 `32%`는 유지하지 않는다.
- 숫자 라벨과 진행바는 동일한 상수 또는 계산값에서 파생해 서로 어긋나지 않게 한다.
- 진행바에는 `role="progressbar"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`와 식별 가능한 label을 제공한다.
- 이 표시는 정적 데모 값이며 신규 Zustand/store나 서버 상태를 추가하지 않는다.
- 프로필 panel도 수정 범위 안에서 공통 `Card` 재사용을 우선 검토한다.

## 6. 파일별 구현 범위

```text
web/src/app/feature/home/ui/HomeView.tsx
web/src/app/feature/home/ui/HomeView.stories.tsx (신규)
docs/home.md (구현 후 신규)
```

- `page.tsx`, layout, API/BFF 파일은 변경하지 않는다.
- 공통 `Card` API만으로 해결 가능하면 `shared/ui` 자체는 변경하지 않는다.
- 공통 컴포넌트 변경이 필요해질 경우 별도 Storybook variant와 영향 범위를 먼저 정의한다.

## 7. Storybook 및 검증

`HomeView.stories.tsx`를 실제 모바일 화면 맥락을 재현하는 최소 wrapper로 작성한다.

- `Default`: 390px 폭의 기본 홈
- `NarrowViewport`: 360px 폭에서 제목, 카드 설명, 아이콘 정렬 확인
- `ComingSoonToast`: 검색 추천 또는 미구현 액션 클릭 후 toast 노출 확인
- 카드의 링크/버튼 역할과 accessible name이 유지되는지 확인한다.

검증 명령:

```text
npx tsc --noEmit
npm run test:unit
npm run build-storybook
npm run build
```

시각 검증 폭은 360px, 390px, 520px로 한다. 텍스트 overflow, 카드 높이 불일치, focus 표시, 하단 navigation 및 toast 겹침을 확인한다.

## 8. 구현 순서

1. `HomeView` Storybook 기준 화면을 추가한다.
2. eyebrow를 제거하고 제목 typography와 간격을 조정한다.
3. `FeatureCard`를 제목/설명/아이콘 순서로 재구성한다.
4. 공통 `Card`를 사용해 glass surface와 상호작용 상태를 정리한다.
5. 프로필 진행 단계 상수와 `1/5`, 20% 진행바를 연결한다.
6. Storybook에서 세 화면 폭과 toast 동작을 확인한다.
7. 구현 결과를 `docs/home.md`에 기록한다.

## 9. 완료 기준

- eyebrow 문구가 노출되지 않는다.
- 히어로 제목이 30~32px, semibold 계열로 표현된다.
- 두 추천 카드가 `제목 → 상세 설명 → 우측 하단 아이콘` 구조를 갖는다.
- 카드의 glass rim이 보이면서 텍스트 대비가 유지된다.
- `1/5`와 진행바 20%가 일치한다.
- 사진 추천 링크와 출시 예정 toast가 기존과 동일하게 동작한다.
- 360px 화면에서 수평 overflow나 카드 콘텐츠 겹침이 없다.
