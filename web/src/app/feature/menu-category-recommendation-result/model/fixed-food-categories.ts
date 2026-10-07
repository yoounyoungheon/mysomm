/** API category enum과 독립적인 UI 분류. 순서와 그룹 간격은 화면 사양을 따른다. */
export const FIXED_FOOD_CATEGORIES = [
  { name: "소·양고기", icon: "red-meat.png", startsGroup: false },
  { name: "돼지고기", icon: "pork.png", startsGroup: false },
  { name: "닭·오리", icon: "poultry.png", startsGroup: false },
  { name: "생선", icon: "seafood.png", startsGroup: true },
  { name: "조개·갑각류", icon: "shrimp.png", startsGroup: false },
  { name: "파스타·면", icon: "pasta.png", startsGroup: true },
  { name: "햄버거·피자", icon: "hamburger.png", startsGroup: false },
  { name: "밥·곡물", icon: "rice.png", startsGroup: false },
  { name: "치즈·샤퀴테리", icon: "cheese.png", startsGroup: true },
  { name: "빵", icon: "bread.png", startsGroup: false },
  { name: "디저트", icon: "dessert.png", startsGroup: false },
] as const;

/** 화면에서 유지할 네 행: 육류 / 해산물 / 주식 / 치즈·빵·디저트. */
export const FIXED_FOOD_GROUPS = [
  FIXED_FOOD_CATEGORIES.slice(0, 3),
  FIXED_FOOD_CATEGORIES.slice(3, 5),
  FIXED_FOOD_CATEGORIES.slice(5, 8),
  FIXED_FOOD_CATEGORIES.slice(8),
] as const;
