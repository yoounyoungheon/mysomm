/**
 * 백엔드 `MenuCategory` enum과 1:1 대응하는 카테고리 목록.
 *
 * key   = 백엔드 enum 명(OTHER, RED_MEAT, …) — 코드에서 상수로 참조해 오탈자를 방지한다.
 * value = API 응답 `category`로 내려오는 한글 displayName.
 * 기준 백엔드: `mysom-api` `MenuCategory.kt`의 `@JsonValue displayName`.
 *
 * 알 수 없는 category는 조용히 바꾸지 않고 계약 오류로 처리한다.
 */
export const MENU_CATEGORY = {
  OTHER: "기타",
  RED_MEAT: "붉은 고기",
  PORK: "돼지고기",
  POULTRY: "가금류",
  SEAFOOD: "해산물",
  PASTA_AND_NOODLE: "파스타 및 면",
  RICE: "밥",
  VEGETABLE: "채소",
  CHEESE: "치즈",
  BREAD: "빵",
  DESSERT: "디저트",
} as const;

/** 백엔드 enum 코드(키). 예: `"SEAFOOD"`. */
export type MenuCategoryCode = keyof typeof MENU_CATEGORY;

/** API `category` 값(한글 displayName)의 union. 예: `"해산물"`. */
export type MenuCategory = (typeof MENU_CATEGORY)[MenuCategoryCode];

/** 검증·순회용 category 값 목록(응답 category 허용 목록). */
export const MENU_CATEGORIES = Object.values(MENU_CATEGORY) as MenuCategory[];

/** 카테고리별 이모지 아이콘 에셋 경로(`public/images/menu-category`). */
export const MENU_CATEGORY_ICON: Record<MenuCategory, string> = {
  [MENU_CATEGORY.OTHER]: "/images/menu-category/other.png",
  [MENU_CATEGORY.RED_MEAT]: "/images/menu-category/red-meat.png",
  [MENU_CATEGORY.PORK]: "/images/menu-category/pork.png",
  [MENU_CATEGORY.POULTRY]: "/images/menu-category/poultry.png",
  [MENU_CATEGORY.SEAFOOD]: "/images/menu-category/seafood.png",
  [MENU_CATEGORY.PASTA_AND_NOODLE]: "/images/menu-category/pasta.png",
  [MENU_CATEGORY.RICE]: "/images/menu-category/rice.png",
  [MENU_CATEGORY.VEGETABLE]: "/images/menu-category/vegetable.png",
  [MENU_CATEGORY.CHEESE]: "/images/menu-category/cheese.png",
  [MENU_CATEGORY.BREAD]: "/images/menu-category/bread.png",
  [MENU_CATEGORY.DESSERT]: "/images/menu-category/dessert.png",
};

/**
 * `POST /v1/wine-pairings/recommend-menu` 요청 body.
 * 현재 세션 wine menu에서 선택한 wine ID(UUID)로 메뉴를 추천한다.
 */
export type MenuRecommendationRequest = {
  pairingWineIds: string[];
};

/**
 * 추천 메뉴 한 건. 다음 단계 pairing 입력의 한 출처이며,
 * pairing에는 선택 항목의 `name`을 철자까지 그대로 전달한다.
 */
export type RecommendedMenu = {
  name: string;
  category: MenuCategory;
};

/** 백엔드 추천 응답 DTO. mapper를 통해서만 앱 모델로 변환한다. */
export type MenuRecommendationResponseDto = {
  recommendedMenus: Array<{ name: string; category: string }>;
};
