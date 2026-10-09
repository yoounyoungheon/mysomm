import type { Wine, WinePrice } from "../model/wine.type";

/** 외부 응답의 타입은 런타임에 확인한다. 숫자/객체를 문자열로 꾸미지 않는다. */
export function normalizeWineText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeWineAromas(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(normalizeWineText).filter(Boolean)
    : [];
}

/** country · region 조합. 존재하는 값만 이어붙인다. */
export function formatWineOrigin(
  wine: Pick<Wine, "country" | "region">,
): string {
  return [normalizeWineText(wine.country), normalizeWineText(wine.region)]
    .filter(Boolean)
    .join(" · ");
}

/** description 지역 경로에 표시할 최대 줄 수. */
export const MAX_WINE_REGION_LINES = 3;

/**
 * 지역 세그먼트에서 뒤에 붙은 괄호부(영문 병기)를 제거해 한글 이름만 남긴다.
 * 예: `"미국(U.S.A)"` → `"미국"`, `"나파 카운티(Napa County)"` → `"나파 카운티"`.
 * 괄호를 제거하면 빈 문자열이 되는 경우(영문만 있는 값)에는 원본을 유지한다.
 */
export function normalizeRegionSegment(segment: string): string {
  if (typeof segment !== "string") return "";
  const stripped = segment.replace(/\s*\([^()]*\)\s*$/, "").trim();
  return stripped.length > 0 ? stripped : segment.trim();
}

/**
 * `region` 계층 경로를 개행 단위 줄 배열로 반환한다.
 *
 * backend `region`은 `"미국(U.S.A) > 캘리포니아(California) > ..."`처럼 국가로 시작하는
 * 경로 문자열이다. 국가는 별도 badge로 표시하므로 첫 세그먼트(국가)는 제외하고,
 * 각 하위 세그먼트를 한 줄씩 표시하되 최대 `maxLines`줄까지만 남기고 나머지는 잘라낸다.
 */
export function formatWineRegionLines(
  region: string | null | undefined,
  maxLines: number = MAX_WINE_REGION_LINES,
): string[] {
  const value = normalizeWineText(region);
  if (!value) return [];

  const segments = value
    .split(">")
    .map((segment) => segment.trim())
    .filter(Boolean);

  // 첫 세그먼트(국가)는 badge와 중복이므로 제외하고, 최대 maxLines줄까지만 남긴다.
  return segments.slice(1, 1 + maxLines).map(normalizeRegionSegment);
}

/**
 * 가격 목록을 표시 문자열로 만든다.
 * 우선순위(KRW → USD → EUR)로 첫 유효 가격을 골라 통화 단위/기호로 표시한다.
 */
export function formatWinePriceLabel(
  prices: WinePrice[] | null | undefined,
): string | null {
  if (!Array.isArray(prices) || prices.length === 0) return null;

  const priorityOrder = ["KRW", "USD", "EUR"] as const;
  const sorted = prices
    .filter(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        typeof item.amount === "number" &&
        Number.isFinite(item.amount) &&
        priorityOrder.includes(item.currency),
    )
    .sort(
      (a, b) =>
        priorityOrder.indexOf(a.currency) - priorityOrder.indexOf(b.currency),
    );
  const price = sorted.find((item) => Number.isFinite(item.amount));
  if (!price) return null;

  const amountLabel = price.amount.toLocaleString(
    price.currency === "KRW" ? "ko-KR" : "en-US",
  );

  return price.currency === "KRW"
    ? `${amountLabel}${normalizeWineText(price.koreanUnit) || "원"}`
    : `${normalizeWineText(price.currencySign) || price.currency}${amountLabel}`;
}

/**
 * 도수 문자열을 표시용으로 보정한다. `alcohol`은 이미 문자열이다.
 * `\N%`, `N%`처럼 DB null placeholder가 들어오면 `???`로 표시한다.
 */
export function formatWineAlcohol(
  alcohol: string | null | undefined,
): string | null {
  const label = normalizeWineText(alcohol);
  if (!label) return null;
  // "\N"(DB null 표기)로 시작하는 값은 유효 도수가 아니다.
  if (label.replace(/\\/g, "").toUpperCase().startsWith("N")) {
    return "???";
  }
  return label.includes("%") ? label : `${label}%`;
}

/** `region` 계층 경로를 `>` 기준 세그먼트 배열로 반환한다(배지 표시용, 국가 포함). */
export function formatWineRegionSegments(
  region: string | null | undefined,
): string[] {
  const value = normalizeWineText(region);
  if (!value) return [];
  return value
    .split(">")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map(normalizeRegionSegment);
}
