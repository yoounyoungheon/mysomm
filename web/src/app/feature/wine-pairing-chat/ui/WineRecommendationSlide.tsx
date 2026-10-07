"use client";

import { useLayoutEffect, useRef, useState, type MouseEventHandler, type Ref } from "react";
import Image from "next/image";
import { RotateCcw } from "lucide-react";
import type { PairingStreamWine } from "@/app/entity/wine-pairing/model/wine-pairing.type";
import {
  formatWineAlcohol,
  formatWineRegionSegments,
} from "@/app/entity/wine/lib/wine-format";
import { resolveWineBottleImage } from "@/app/entity/wine/lib/wine-image";
import { isCatalogExcluded } from "@/app/shared/config/wine-catalog";
import { Card } from "@/app/shared/ui/molecule/card";
import WineImageSkeleton from "@/app/shared/ui/atom/wine-image-skeleton";
import { cn } from "@/app/utils/style/helper";
import type { WineRecommendationSlideProps } from "./wine-pairing-chat.props";

const CARD_HEIGHT = "h-[392px]";
const TASTE_SCALE_MAX = 5;
type ExpandedField = "comment" | "reason";
type TasteKey = "body" | "sweetness" | "tannin" | "acid";

const TASTE_ROWS: Array<{ label: string; key: TasteKey }> = [
  { label: "바디", key: "body" },
  { label: "당도", key: "sweetness" },
  { label: "타닌", key: "tannin" },
  { label: "산도", key: "acid" },
];

/** 실제 taste 값이 모두 비어 있을 때 사용할 mock(데모용). */
const MOCK_TASTE: Record<TasteKey, number> = {
  body: 4,
  sweetness: 2,
  tannin: 1,
  acid: 3,
};

export default function WineRecommendationSlide({
  slide,
  className,
}: WineRecommendationSlideProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [expandedField, setExpandedField] = useState<ExpandedField | null>(null);
  const detailButtonRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const shouldMoveFocus = useRef(false);
  const canFlip = slide.isCommitted && slide.wine !== null;

  useLayoutEffect(() => {
    if (!shouldMoveFocus.current) return;
    shouldMoveFocus.current = false;
    const button = isFlipped ? backButtonRef.current : detailButtonRef.current;
    button?.focus({ preventScroll: true });
  }, [isFlipped]);

  const handleFlip: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.currentTarget.blur();
    shouldMoveFocus.current = true;
    setExpandedField(null);
    setIsFlipped(true);
  };

  const handleBack: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.currentTarget.blur();
    shouldMoveFocus.current = true;
    setIsFlipped(false);
  };

  return (
    <article className={cn("relative w-full", className)}>
      <div className="[perspective:1200px]">
        <div
          className={cn(
            "relative transition-transform duration-500 motion-reduce:transition-none [transform-style:preserve-3d]",
            isFlipped && "[transform:rotateY(180deg)]"
          )}
        >
          <div
            data-card-face="front"
            inert={isFlipped}
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
            className={cn(isFlipped && "invisible pointer-events-none")}
          >
            <RecommendationFront
              slide={slide}
              canFlip={canFlip}
              onFlip={handleFlip}
              buttonRef={detailButtonRef}
              expandedField={expandedField}
              onExpandField={setExpandedField}
              onDismissExpandedField={() => setExpandedField(null)}
              isActive={!isFlipped}
            />
          </div>

          <div
            data-card-face="back"
            inert={!isFlipped}
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
            className={cn(
              "absolute inset-0 [transform:rotateY(180deg)]",
              !isFlipped && "invisible pointer-events-none"
            )}
          >
            {slide.wine ? (
              <WineDetailBack
                wine={slide.wine}
                onBack={handleBack}
                buttonRef={backButtonRef}
                isActive={isFlipped}
              />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function RecommendationFront({
  slide,
  canFlip,
  onFlip,
  buttonRef,
  expandedField,
  onExpandField,
  onDismissExpandedField,
  isActive,
}: {
  slide: WineRecommendationSlideProps["slide"];
  canFlip: boolean;
  onFlip: MouseEventHandler<HTMLButtonElement>;
  buttonRef: Ref<HTMLButtonElement>;
  expandedField: ExpandedField | null;
  onExpandField: (field: ExpandedField) => void;
  onDismissExpandedField: () => void;
  isActive: boolean;
}) {
  const image = slide.wine
    ? resolveWineBottleImage(slide.wine, slide.wine.id)
    : slide.imageUrl
      ? { src: slide.imageUrl, isPlaceholder: false }
      : resolveWineBottleImage({ wineBottleImageUrl: null }, slide.name || slide.rank);
  const showImageSkeleton = !slide.isCommitted && image.isPlaceholder;

  return (
    <Card
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[18px] border border-white/80 bg-white/52 p-5 text-ink-page shadow-[0_18px_44px_rgba(72,52,112,0.08)] backdrop-blur-sm",
        CARD_HEIGHT
      )}
    >
      {canFlip ? (
        <button
          type="button"
          onClick={onFlip}
          ref={buttonRef}
          tabIndex={isActive ? 0 : -1}
          aria-label={`${slide.name} 상세 정보 보기`}
          className="absolute right-3 top-3 z-10 rounded-[9px] border border-white/60 bg-primary/[0.10] px-2.5 py-1.5 text-[11px] font-bold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl transition-colors hover:bg-primary/[0.16]"
        >
          와인 상세
        </button>
      ) : null}

      <div className="flex min-h-[136px] items-start gap-4 min-[480px]:min-h-[144px]">
        <div className="relative flex h-[136px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-white/70 text-primary min-[480px]:h-[144px] min-[480px]:w-[72px]">
          {showImageSkeleton ? (
            <>
              <WineImageSkeleton />
              <span className="sr-only">와인 이미지 준비 중</span>
            </>
          ) : (
            <>
              <Image
              src={image.isPlaceholder ? "/images/wines/wine-bottle.png" : image.src}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 480px) 72px, 68px"
              className="object-contain p-1"
              />
              {image.isPlaceholder ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                  <span className="whitespace-pre-line text-center text-[9px] font-bold text-white">{"이미지\n준비중"}</span>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="min-w-0 flex-1 pt-1">
          <p className="pr-14 text-[12px] font-bold text-primary">
            {slide.rank ? `${slide.rank}순위` : " "}
          </p>
          <h3 className="mt-2 line-clamp-3 break-words text-base font-extrabold leading-[1.32] text-ink-card">
            {slide.name || "추천 와인을 찾고 있어요"}
          </h3>
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-4 overflow-hidden">
        <div>
          <p className="text-[12px] font-bold text-ink-secondary">한줄평</p>
          <button
            type="button"
            disabled={!slide.comment}
            tabIndex={isActive ? 0 : -1}
            aria-label="한줄평 전체 보기"
            onClick={() => slide.comment && onExpandField("comment")}
            className={cn(
              "mt-1.5 line-clamp-2 block w-full text-left text-[14px] font-medium leading-relaxed text-ink-page disabled:cursor-default",
              slide.comment && "cursor-pointer"
            )}
          >
            {slide.comment || "추천 설명을 준비하고 있어요."}
          </button>
        </div>
        <div>
          <p className="text-[12px] font-bold text-ink-secondary">추천 이유</p>
          <button
            type="button"
            disabled={!slide.reason}
            tabIndex={isActive ? 0 : -1}
            aria-label="추천 이유 전체 보기"
            onClick={() => slide.reason && onExpandField("reason")}
            className={cn(
              "mt-1.5 block w-full text-left text-[13px] leading-relaxed text-ink-secondary disabled:cursor-default",
              slide.reason && "line-clamp-4 cursor-pointer"
            )}
          >
            {slide.reason || "메뉴와의 궁합을 분석하고 있어요."}
          </button>
        </div>
      </div>

      {expandedField ? (
        <button
          type="button"
          tabIndex={isActive ? 0 : -1}
          aria-label="상세 설명 닫기"
          onClick={onDismissExpandedField}
          className="absolute inset-0 z-20 flex cursor-pointer flex-col justify-center rounded-[18px] bg-ink-page/90 px-6 py-7 text-left backdrop-blur-xl"
        >
          <span className="text-[12px] font-bold text-white/65">
            {expandedField === "comment" ? "한줄평" : "추천 이유"}
          </span>
          <span className="mt-3 max-h-[280px] overflow-y-auto break-words text-[14px] leading-relaxed text-white">
            {expandedField === "comment" ? slide.comment : slide.reason}
          </span>
        </button>
      ) : null}
    </Card>
  );
}

function WineDetailBack({
  wine,
  onBack,
  buttonRef,
  isActive,
}: {
  wine: PairingStreamWine;
  onBack: MouseEventHandler<HTMLButtonElement>;
  buttonRef: Ref<HTMLButtonElement>;
  isActive: boolean;
}) {
  const regionSegments = formatWineRegionSegments(wine.region);
  const alcoholLabel = formatWineAlcohol(wine.alcohol);
  const aromas = wine.aromas?.filter((aroma) => aroma.trim().length > 0) ?? [];
  const detailItems = [
    wine.variety ? { label: "품종", value: wine.variety } : null,
    wine.vintage != null ? { label: "빈티지", value: String(wine.vintage) } : null,
    alcoholLabel ? { label: "도수", value: alcoholLabel } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  // 실제 taste가 하나도 없으면 데모용 mock 값을 사용한다.
  const hasRealTaste = TASTE_ROWS.some(({ key }) => {
    const value = wine[key];
    return typeof value === "number" && Number.isFinite(value);
  });
  const taste: Record<TasteKey, number | null> = hasRealTaste
    ? {
        body: wine.body,
        sweetness: wine.sweetness,
        tannin: wine.tannin,
        acid: wine.acid,
      }
    : MOCK_TASTE;

  // 카탈로그 제외 모드이거나 표시할 정보가 없으면 상세(정보~테이스트~풍미)를 "준비 중" 오버레이로 덮는다.
  const showDetailPreparingOverlay =
    isCatalogExcluded() || detailItems.length === 0;

  return (
    <Card
      className={cn(
        "relative flex flex-col overflow-y-auto rounded-[18px] border border-white/80 bg-white/58 p-5 text-ink-page shadow-[0_18px_44px_rgba(72,52,112,0.08)] backdrop-blur-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        CARD_HEIGHT
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 line-clamp-3 break-words text-base font-extrabold leading-snug text-ink-card">
          {wine.wineName}
        </p>
        <button
          type="button"
          onClick={onBack}
          ref={buttonRef}
          tabIndex={isActive ? 0 : -1}
          aria-label={`${wine.wineName} 추천 설명으로 돌아가기`}
          className={cn(
            "relative z-20 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-transparent transition-colors",
            showDetailPreparingOverlay
              ? "text-white hover:bg-white/20"
              : "text-primary hover:bg-primary/[0.10] hover:text-ink-emphasis"
          )}
        >
          <RotateCcw className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
        </button>
      </div>

      {wine.wineType ? (
        <div className="mt-2 flex items-center gap-2">
          <span
            aria-hidden
            className="h-3.5 w-3.5 shrink-0 rounded-full"
            style={{ backgroundColor: wineTypeDotColor(wine.wineType) }}
          />
          <span className="text-[14px] font-bold text-ink-secondary">
            {wine.wineType}
          </span>
        </div>
      ) : null}

      {regionSegments.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="inline-flex shrink-0 items-center rounded-full border border-primary/30 bg-primary/[0.10] px-2.5 py-0.5 font-bold text-primary">
            {regionSegments[0]}
          </span>
          {regionSegments.slice(1).map((segment, index) => (
            <span key={`${segment}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? (
                <span aria-hidden className="text-ink-muted">
                  ›
                </span>
              ) : null}
              <span className="font-medium text-ink-secondary">{segment}</span>
            </span>
          ))}
        </div>
      ) : null}

      {/* 정보~테이스트~풍미 상세 영역. 준비 중이면 카드 전체를 오버레이로 덮는다. */}
      <div className="mt-5">
        {showDetailPreparingOverlay ? (
          <dl className="grid grid-cols-3 gap-2" aria-hidden>
            {["품종", "빈티지", "도수"].map((label) => (
              <div
                key={label}
                className="min-w-0 rounded-[14px] border border-white/60 bg-primary/[0.10] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl"
              >
                <dt className="text-[11px] font-medium text-ink-muted">{label}</dt>
                <dd className="mt-1 text-[13px] font-bold leading-snug text-ink-emphasis">
                  -
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <dl className="grid grid-cols-3 gap-2">
            {detailItems.map((item) => (
              <div
                key={item.label}
                className="min-w-0 rounded-[14px] border border-white/60 bg-primary/[0.10] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl"
              >
                <dt className="text-[11px] font-medium text-ink-muted">
                  {item.label}
                </dt>
                <dd className="mt-1 break-keep text-[13px] font-bold leading-snug text-ink-emphasis">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-6">
          <p className="text-[12px] font-bold text-ink-secondary">테이스트</p>
          <dl className="mt-3 space-y-2.5">
            {TASTE_ROWS.map(({ label, key }) => (
              <TasteRow key={label} label={label} value={taste[key]} />
            ))}
          </dl>
        </div>

        {aromas.length > 0 ? (
          <div className="mt-6">
            <p className="text-[12px] font-bold text-ink-secondary">풍미</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {aromas.map((aroma, index) => (
                <span
                  key={`${aroma}-${index}`}
                  className="inline-flex items-center rounded-full bg-white/70 px-3 py-1.5 text-[13px] font-bold text-ink-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                >
                  {aroma}
                </span>
              ))}
            </div>
          </div>
        ) : null}

      </div>

      {showDetailPreparingOverlay ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[18px] bg-black/60">
          <span className="text-[13px] font-bold text-white">
            준비 중인 기능이에요
          </span>
        </div>
      ) : null}
    </Card>
  );
}

/** 와인 타입 문자열에서 표시용 점 색을 추정한다. 알 수 없으면 중립 회색. */
function wineTypeDotColor(wineType: string): string {
  const value = wineType.toLowerCase();
  if (value.includes("white") || value.includes("화이트")) return "#E4D06A";
  if (
    value.includes("sparkl") ||
    value.includes("스파클") ||
    value.includes("champagne") ||
    value.includes("샴페인")
  ) {
    return "#EBC65A";
  }
  if (value.includes("ros") || value.includes("로제")) return "#E8A5A5";
  if (value.includes("red") || value.includes("레드")) return "#7A2E3A";
  return "#B8B8C4";
}

/** 0..5 taste scale 한 줄. 값이 없으면 "정보 없음"으로 표시하고 0으로 그리지 않는다. */
function TasteRow({ label, value }: { label: string; value: number | null }) {
  const hasValue = typeof value === "number" && Number.isFinite(value);
  const filled = hasValue ? Math.round(value) : 0;

  return (
    <div className="flex items-center gap-3">
      <dt className="w-9 shrink-0 text-[12px] font-medium text-ink-muted">
        {label}
      </dt>
      <dd className="flex flex-1 items-center gap-2">
        {hasValue ? (
          <>
            <span className="flex flex-1 gap-1" aria-hidden>
              {Array.from({ length: TASTE_SCALE_MAX }, (_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1.5 flex-1 rounded-full",
                    index < filled
                      ? "bg-gradient-to-r from-[#8E72F3] to-[#6E3AF5]"
                      : "bg-ink-muted/20"
                  )}
                />
              ))}
            </span>
            <span className="w-4 shrink-0 text-right text-[12px] font-bold text-primary">
              {filled}
            </span>
          </>
        ) : (
          <span className="text-[12px] font-medium text-ink-muted">정보 없음</span>
        )}
      </dd>
    </div>
  );
}
