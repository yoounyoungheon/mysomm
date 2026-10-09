import { describe, expect, it } from "vitest";
import { normalizePairingPayload } from "./normalize-pairing-payload";

const valid = {
  pairingId: "pairing-id",
  rank: 1,
  comment: "요약",
  reason: "추천 이유",
  wine: {
    id: "wine-id",
    wineName: "와인",
    alcohol: "13%",
    country: "France",
    region: "Bordeaux",
    wineBottleImageUrl: "/images/wines/wine-bottle.png",
    body: 0,
  },
};

describe("normalizePairingPayload", () => {
  it("preserves valid data without mutating input", () => {
    const normalized = normalizePairingPayload(valid)!;
    expect(normalized.wine.alcohol).toBe("13%");
    expect(normalized.wine.body).toBe(0);
    expect(normalized.comment).toBe(valid.comment);
    expect(normalized.wine).not.toBe(valid.wine);
  });
  it("normalizes malformed optional metadata without rejecting the recommendation", () => {
    const result = normalizePairingPayload({
      ...valid,
      wine: {
        ...valid.wine,
        vintage: {},
        alcohol: 13.5,
        country: [],
        region: {},
        wineBottleImageUrl: 123,
        variety: {},
        wineType: [],
        body: "4",
        acid: Infinity,
        sweetness: null,
        aromas: [null, 12, {}, " apple ", ""],
        price: [
          null,
          {},
          { amount: 100, currency: "KRW", currencySign: {}, koreanUnit: 5 },
        ],
      },
    })!;
    expect(result.wine).toMatchObject({
      vintage: null,
      alcohol: null,
      country: null,
      region: null,
      wineBottleImageUrl: null,
      variety: null,
      wineType: null,
      body: null,
      acid: null,
      aromas: ["apple"],
      price: [
        { amount: 100, currency: "KRW", currencySign: "", koreanUnit: "" },
      ],
    });
  });
  it.each([
    null,
    [],
    13,
    "bad",
    {},
    { ...valid, wine: null },
    { ...valid, rank: NaN },
    { ...valid, rank: -1 },
    { ...valid, rank: 1.5 },
    { ...valid, reason: {} },
    { ...valid, comment: null },
    { ...valid, pairingId: {} },
    { ...valid, wine: { id: "wine-id", wineName: {} } },
  ])("rejects invalid required payload %#", (value) => {
    expect(normalizePairingPayload(value)).toBeNull();
  });
});
