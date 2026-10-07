import { describe, expect, it } from "vitest";
import { getMenuSelection, validateCustomFood } from "./menu-selection";
import {
  FIXED_FOOD_CATEGORIES,
  FIXED_FOOD_GROUPS,
} from "../model/fixed-food-categories";

describe("직접 입력과 음식 선택", () => {
  it("음식명은 trim하고 공백·중복·너무 긴 이름은 막는다", () => {
    expect(validateCustomFood("  떡볶이  ", []).name).toBe("떡볶이");
    expect(validateCustomFood("  ", []).error).not.toBeNull();
    expect(validateCustomFood("떡볶이", ["떡볶이"]).error).not.toBeNull();
    expect(validateCustomFood("가".repeat(101), []).error).not.toBeNull();
    expect(validateCustomFood("가".repeat(100), []).error).toBeNull();
  });
  it("추천 이름과 고정 카테고리를 모두 선택할 수 있다", () => {
    expect(getMenuSelection(["파전"], ["파전", "생선"]).canRequestPairing).toBe(
      true,
    );
    expect(getMenuSelection(["생선"], ["파전", "생선"]).canRequestPairing).toBe(
      true,
    );
  });
  it("추천·고정·직접 입력의 혼합 선택을 누락하지 않는다", () => {
    const result = getMenuSelection(
      ["파전", "생선", "떡볶이"],
      ["파전", "생선", "떡볶이"],
    );
    expect(result.names).toEqual(["파전", "생선", "떡볶이"]);
    expect(result.canRequestPairing).toBe(true);
  });
  it("삭제·응답 변경으로 사라진 선택과 중복을 제거한다", () => {
    expect(
      getMenuSelection(["파전", "파전", "오래된 메뉴"], ["파전"]).names,
    ).toEqual(["파전"]);
    expect(getMenuSelection([], []).canRequestPairing).toBe(false);
  });
  it("직접 입력 음식만 선택해도 요청할 수 있다", () => {
    expect(getMenuSelection(["떡볶이"], ["떡볶이"]).canRequestPairing).toBe(
      true,
    );
  });
  it("고정 11개 메뉴와 아이콘 순서를 보존한다", () => {
    expect(FIXED_FOOD_CATEGORIES.map((food) => food.name)).toEqual([
      "소·양고기",
      "돼지고기",
      "닭·오리",
      "생선",
      "조개·갑각류",
      "파스타·면",
      "햄버거·피자",
      "밥·곡물",
      "치즈·샤퀴테리",
      "빵",
      "디저트",
    ]);
    expect(FIXED_FOOD_CATEGORIES[4].icon).toBe("shrimp.png");
    expect(FIXED_FOOD_CATEGORIES[6].icon).toBe("hamburger.png");
    expect(FIXED_FOOD_GROUPS.map((foods) => foods.length)).toEqual([
      3, 2, 3, 3,
    ]);
    expect(FIXED_FOOD_GROUPS[3].map((food) => food.name)).toEqual([
      "치즈·샤퀴테리",
      "빵",
      "디저트",
    ]);
  });
});
