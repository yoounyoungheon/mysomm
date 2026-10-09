import { describe, expect, it } from "vitest";
import {
  formatWineAlcohol,
  formatWineOrigin,
  formatWinePriceLabel,
  formatWineRegionLines,
  formatWineRegionSegments,
  normalizeRegionSegment,
  normalizeWineAromas,
  normalizeWineText,
} from "./wine-format";
import type { WinePrice } from "../model/wine.type";

describe("malformed external wine values", () => {
  it.each([13.5, false, {}, [], null, undefined])(
    "does not trim non-strings %#",
    (value) => {
      expect(normalizeWineText(value)).toBe("");
      // Deliberately violate the static DTO to simulate untrusted JSON.
      const invalid = value as unknown as string;
      expect(formatWineAlcohol(invalid)).toBeNull();
      expect(formatWineRegionLines(invalid)).toEqual([]);
      expect(formatWineRegionSegments(invalid)).toEqual([]);
      expect(normalizeRegionSegment(invalid)).toBe("");
    },
  );
  it("filters malformed aromas and rejects non-array lists", () => {
    expect(normalizeWineAromas([null, {}, 5, "apple", " "])).toEqual(["apple"]);
    expect(normalizeWineAromas({})).toEqual([]);
    expect(normalizeWineAromas("apple")).toEqual([]);
  });
  it("ignores malformed prices", () => {
    expect(formatWinePriceLabel({} as WinePrice[])).toBeNull();
    expect(
      formatWinePriceLabel([
        null,
        {},
        { amount: "100", currency: "KRW" },
      ] as unknown as WinePrice[]),
    ).toBeNull();
  });
});

describe("formatWineOrigin", () => {
  it("존재하는 값만 이어붙인다", () => {
    expect(formatWineOrigin({ country: "France", region: "Bordeaux" })).toBe(
      "France · Bordeaux",
    );
    expect(formatWineOrigin({ country: "France", region: null })).toBe(
      "France",
    );
    expect(formatWineOrigin({ country: null, region: null })).toBe("");
  });
});

describe("formatWinePriceLabel", () => {
  it("KRW는 한글 단위로 표시한다", () => {
    const price: WinePrice[] = [
      { amount: 55000, currency: "KRW", currencySign: "₩", koreanUnit: "원" },
    ];
    expect(formatWinePriceLabel(price)).toBe("55,000원");
  });

  it("KRW → USD → EUR 우선순위로 첫 가격을 고른다", () => {
    const price: WinePrice[] = [
      { amount: 40, currency: "USD", currencySign: "$", koreanUnit: "달러" },
      { amount: 55000, currency: "KRW", currencySign: "₩", koreanUnit: "원" },
    ];
    expect(formatWinePriceLabel(price)).toBe("55,000원");
  });

  it("빈 목록이나 null이면 null을 반환한다", () => {
    expect(formatWinePriceLabel(null)).toBeNull();
    expect(formatWinePriceLabel([])).toBeNull();
  });
});

describe("formatWineRegionLines", () => {
  it("국가(첫 세그먼트) 제외 + 괄호(영문 병기) 제거한 하위 경로를 줄 배열로 반환한다", () => {
    expect(
      formatWineRegionLines(
        "미국(U.S.A) > 캘리포니아(California) > 소노마 카운티(Sonoma County)",
      ),
    ).toEqual(["캘리포니아", "소노마 카운티"]);
  });

  it("국가 제외 후에도 최대 3줄까지만 남기고 나머지는 잘라낸다", () => {
    expect(formatWineRegionLines("A > B > C > D > E")).toEqual(["B", "C", "D"]);
  });

  it("국가 세그먼트만 있으면(중복) 빈 배열을 반환한다", () => {
    expect(formatWineRegionLines("미국(U.S.A)")).toEqual([]);
  });

  it("null/빈 값은 빈 배열을 반환한다", () => {
    expect(formatWineRegionLines(null)).toEqual([]);
    expect(formatWineRegionLines("   ")).toEqual([]);
  });
});

describe("normalizeRegionSegment", () => {
  it("뒤에 붙은 괄호(영문 병기)를 제거하고 한글 이름만 남긴다", () => {
    expect(normalizeRegionSegment("미국(U.S.A)")).toBe("미국");
    expect(normalizeRegionSegment("나파 카운티(Napa County)")).toBe(
      "나파 카운티",
    );
  });

  it("괄호를 제거하면 빈 값이 되는 경우 원본을 유지한다", () => {
    expect(normalizeRegionSegment("(Napa Valley)")).toBe("(Napa Valley)");
  });
});

describe("formatWineRegionSegments", () => {
  it("모든 세그먼트를 괄호 제거해 배열로 반환한다(국가 포함)", () => {
    expect(
      formatWineRegionSegments(
        "미국(U.S.A) > 캘리포니아(California) > 나파 밸리(Napa Valley)",
      ),
    ).toEqual(["미국", "캘리포니아", "나파 밸리"]);
  });

  it("null/빈 값은 빈 배열을 반환한다", () => {
    expect(formatWineRegionSegments(null)).toEqual([]);
  });
});

describe("formatWineAlcohol", () => {
  it("문자열을 그대로 표시하되 %를 보정한다", () => {
    expect(formatWineAlcohol("12.5% ~ 13.0%")).toBe("12.5% ~ 13.0%");
    expect(formatWineAlcohol("13")).toBe("13%");
    expect(formatWineAlcohol(null)).toBeNull();
    expect(formatWineAlcohol("  ")).toBeNull();
  });

  it("DB null placeholder(\\N%)는 ???로 표시한다", () => {
    expect(formatWineAlcohol("\\N%")).toBe("???");
    expect(formatWineAlcohol("N%")).toBe("???");
  });
});
