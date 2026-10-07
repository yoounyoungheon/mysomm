import Image from "next/image";
import { resolveWineBottleImage } from "@/app/entity/wine/lib/wine-image";
import { formatWineRegionLines } from "@/app/entity/wine/lib/wine-format";
import { Card } from "@/app/shared/ui/molecule/card";
import { cn } from "@/app/utils/style/helper";
import type { ExtractedWineCardProps } from "./wine-list-select.props";

/**
 * 추출된 세션 와인 후보 카드(다중 선택).
 * `country`는 badge로, `region`은 라벨 없이 인라인 텍스트로 표시한다.
 * 값이 없는 항목은 렌더하지 않는다.
 */
export default function ExtractedWineCard({
  wine,
  isSelected = false,
  onToggle,
  className,
}: ExtractedWineCardProps) {
  const regionLines = formatWineRegionLines(wine.region);
  const image = resolveWineBottleImage(wine, wine.id);

  return (
    <label
      className={cn(
        "group relative block cursor-pointer rounded-[16px]",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
        className
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={isSelected}
        onChange={() => onToggle(wine.id)}
      />
      <Card
        className={cn(
          "relative flex min-h-[112px] w-full min-w-0 items-start gap-4 rounded-[16px] border p-3 backdrop-blur-2xl backdrop-saturate-150 transition-colors",
          isSelected
            ? "border-primary/55 bg-primary/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_30px_rgba(110,58,245,0.10)]"
            : "border-white/70 bg-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_12px_30px_rgba(72,52,112,0.06)] hover:border-white/80 hover:bg-white/[0.18]"
        )}
      >
        <div className="relative aspect-[3/4] w-[72px] shrink-0 overflow-hidden rounded-[12px] bg-white/70">
          <Image
            src={image.isPlaceholder ? "/images/wines/wine-bottle.png" : image.src}
            alt=""
            fill
            sizes="72px"
            className="object-contain p-1"
            unoptimized
          />
          {image.isPlaceholder ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
              <span className="whitespace-pre-line text-center text-[9px] font-bold text-white">{"이미지\n준비중"}</span>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[14px] font-bold leading-[1.35] text-ink-card">
            {wine.wineName}
          </h3>

          {wine.country ? (
            <span className="mt-1 inline-flex items-center rounded-full bg-primary/[0.14] px-2 py-0.5 text-[10px] font-bold text-primary">
              {wine.country}
            </span>
          ) : null}

          {regionLines.length > 0 ? (
            <div className="mt-1.5 space-y-0.5">
              {regionLines.map((line, index) => (
                <p
                  key={index}
                  className="truncate text-[12px] font-medium leading-[1.45] text-ink-secondary"
                >
                  {line}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </Card>
    </label>
  );
}
