import {
  normalizeWineAromas,
  normalizeWineText,
} from "@/app/entity/wine/lib/wine-format";
import type {
  PairingSlidePayload,
  PairingStreamWinePrice,
} from "../model/wine-pairing.type";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function prices(value: unknown): PairingStreamWinePrice[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((item) => {
    if (
      !isRecord(item) ||
      finiteNumber(item.amount) === null ||
      (item.currency !== "KRW" &&
        item.currency !== "USD" &&
        item.currency !== "EUR")
    )
      return [];
    return [
      {
        amount: item.amount as number,
        currency: item.currency,
        currencySign: normalizeWineText(item.currencySign),
        koreanUnit: normalizeWineText(item.koreanUnit),
      },
    ];
  });
}

/** 필수 필드는 거부하고, 잘못된 nullable 메타데이터는 비어 있는 값으로 표시한다. */
export function normalizePairingPayload(
  value: unknown,
): PairingSlidePayload | null {
  if (!isRecord(value) || !isRecord(value.wine)) return null;
  const wine = value.wine;
  if (
    !normalizeWineText(value.pairingId) ||
    !normalizeWineText(wine.id) ||
    !normalizeWineText(wine.wineName) ||
    typeof value.comment !== "string" ||
    typeof value.reason !== "string" ||
    typeof value.rank !== "number" ||
    !Number.isInteger(value.rank) ||
    value.rank < 1
  )
    return null;
  return {
    pairingId: value.pairingId as string,
    rank: value.rank,
    comment: value.comment,
    reason: value.reason,
    wine: {
      id: wine.id as string,
      wineName: wine.wineName as string,
      vintage: finiteNumber(wine.vintage),
      alcohol: normalizeWineText(wine.alcohol) || null,
      price: prices(wine.price),
      country: normalizeWineText(wine.country) || null,
      region: normalizeWineText(wine.region) || null,
      body: finiteNumber(wine.body),
      sweetness: finiteNumber(wine.sweetness),
      tannin: finiteNumber(wine.tannin),
      acid: finiteNumber(wine.acid),
      wineBottleImageUrl: normalizeWineText(wine.wineBottleImageUrl) || null,
      variety: normalizeWineText(wine.variety) || null,
      wineType: normalizeWineText(wine.wineType) || null,
      aromas: normalizeWineAromas(wine.aromas),
    },
  };
}
