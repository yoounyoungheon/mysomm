import type { Wine } from "../model/wine.type";
import { normalizeWineText } from "./wine-format";

/**
 * 병 이미지가 없을 때 사용할 fallback 이미지들.
 * seed 기반으로 결정적으로 하나를 골라 같은 와인에 항상 같은 이미지를 보여준다.
 */
export const FALLBACK_WINE_BOTTLE_IMAGES = [
  "https://wine21.speedgabia.com/WINE_MST/TITLE/0149000/W0149862.jpg",
  "https://wine21.speedgabia.com/WINE_MST/TITLE/0158000/W0158280.jpg",
  "https://wine21.speedgabia.com/WINE_MST/IMAGE/0144000/T0144699_002.png",
] as const;

export type ResolvedWineImage = {
  src: string;
  /** 실제 병 이미지가 아니라 fallback(준비중) 이미지인지 여부. */
  isPlaceholder: boolean;
};

function hashSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

/**
 * 표시할 병 이미지를 결정한다.
 * 실제 `wineBottleImageUrl`이 있으면 그대로(placeholder=false),
 * 없으면 seed로 고른 fallback 이미지를 반환하고 placeholder=true로 표시한다.
 */
export function resolveWineBottleImage(
  wine: Pick<Wine, "wineBottleImageUrl">,
  seed: string,
): ResolvedWineImage {
  const url = normalizeWineText(wine.wineBottleImageUrl);
  if (url && url.length > 0) {
    return { src: url, isPlaceholder: false };
  }
  const index = hashSeed(seed) % FALLBACK_WINE_BOTTLE_IMAGES.length;
  return { src: FALLBACK_WINE_BOTTLE_IMAGES[index], isPlaceholder: true };
}
