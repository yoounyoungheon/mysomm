import Image from "next/image";
import { ChevronRight, FileText } from "lucide-react";
import {
  formatWineAlcohol,
  formatWineRegionSegments,
} from "@/app/entity/wine/lib/wine-format";
import Button from "@/app/shared/ui/atom/button";
import WineImageSkeleton from "@/app/shared/ui/atom/wine-image-skeleton";
import { Card } from "@/app/shared/ui/molecule/card";
import DisclosureCard from "@/app/shared/ui/molecule/disclosure-card";
import { cn } from "@/app/utils/style/helper";
import type { WineRecommendationSlideProps } from "./wine-pairing-chat.props";

const tasteFields = [
  { key: "body", label: "바디", icon: "body.png" },
  { key: "sweetness", label: "당도", icon: "candy.png" },
  { key: "tannin", label: "타닌", icon: "grape.png" },
  { key: "acid", label: "산도", icon: "lemon.png" },
] as const;

export default function WineRecommendationSlideB({
  slide,
  className,
}: WineRecommendationSlideProps) {
  const wine = slide.wine;
  const imageUrl = wine?.wineBottleImageUrl?.trim() || slide.imageUrl?.trim();
  const pendingImage = !imageUrl && !slide.isCommitted;
  const alcohol = formatWineAlcohol(wine?.alcohol);
  const hasReason = Boolean(slide.reason.trim());
  const region = formatWineRegionSegments(wine?.region).join(" · ");
  const summary = slide.comment || "어울리는 와인을 추천하고 있어요";
  const isLongSummary = Array.from(summary).length > 24;

  return (
    <article
      data-recommendation-slide="B"
      className={cn("flex min-w-0 flex-col gap-3", className)}
    >
      <div>
        <p className="text-[12px] font-extrabold tracking-wide text-primary">
          MYSOMM PICK
        </p>
        <h3
          className={cn(
            "mt-2 whitespace-pre-line break-words font-extrabold leading-tight text-ink-page",
            isLongSummary ? "text-[20px]" : "text-[23px]",
          )}
        >
          {summary}
        </h3>
      </div>
      <div className="flex items-start gap-4 py-2">
        <div className="min-w-0 flex-1">
          {slide.rank ? (
            <span className="inline-flex rounded-full bg-primary px-2.5 py-1 text-[12px] font-bold text-white">
              {slide.rank}순위
            </span>
          ) : null}
          <h4 className="mt-2 break-words text-[16px] font-extrabold leading-snug text-ink-card">
            {wine?.wineName || slide.name || "추천 와인을 찾고 있어요"}
          </h4>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-secondary">
            {wine?.country?.trim() ? (
              <span className="rounded-full border border-primary/30 px-2 py-0.5 text-primary">
                {wine.country}
              </span>
            ) : null}
            {region ? <span className="break-words">{region}</span> : null}
            {wine?.variety?.trim() ? <span>{wine.variety}</span> : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-ink-secondary">
            <span className="rounded-lg bg-white/90 px-2 py-1">
              빈티지{" "}
              <strong className="text-ink-card">{wine?.vintage ?? "-"}</strong>
            </span>
            <span className="rounded-lg bg-white/90 px-2 py-1">
              도수{" "}
              <strong className="text-ink-card">
                {alcohol && alcohol !== "???" ? alcohol : "-"}
              </strong>
            </span>
          </div>
        </div>
        <div className="relative flex h-[144px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-white/65">
          {pendingImage ? (
            <>
              <WineImageSkeleton />
              <span className="sr-only">와인 이미지 준비 중</span>
            </>
          ) : (
            <>
              <Image
                src={imageUrl || "/images/wines/wine-bottle.png"}
                alt=""
                fill
                unoptimized
                sizes="76px"
                className="object-contain p-1"
              />
              {!imageUrl ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                  <span className="whitespace-pre-line text-center text-[9px] font-bold text-white">
                    {"이미지\n준비중"}
                  </span>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
      <Card className="rounded-[20px] border-white/70 bg-white/90 p-4 shadow-none">
        <h4 className="text-[15px] font-bold text-ink-card">
          이 와인은 이런 스타일이에요
        </h4>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {tasteFields.map(({ key, label, icon }) => {
            const rawValue = wine?.[key];
            const value =
              typeof rawValue === "number" && Number.isFinite(rawValue)
                ? Math.max(0, Math.min(5, rawValue))
                : null;
            return (
              <div
                key={key}
                data-taste-field={key}
                className="flex min-w-0 items-center gap-2 rounded-[14px] bg-primary/[0.05] p-2.5"
              >
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"
                >
                  <Image
                    src={`/images/emoji/${icon}`}
                    alt=""
                    width={22}
                    height={22}
                    className="h-[22px] w-[22px] object-contain"
                  />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="text-[12px] font-bold text-ink-card">
                      {label}
                    </span>
                    <span className="text-[10px] text-ink-muted">
                      {value === null ? "준비중입니다." : `${value}/5`}
                    </span>
                  </div>
                  <div
                    role="img"
                    aria-label={
                      value === null
                        ? `${label} 정보 준비중`
                        : `${label} ${value}/5`
                    }
                    className="mt-1.5 flex gap-1"
                  >
                    {Array.from({ length: 5 }, (_, index) => (
                      <span
                        key={index}
                        aria-hidden
                        data-taste-dot
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          value !== null && index < Math.round(value)
                            ? "bg-primary"
                            : "bg-primary/15",
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <DisclosureCard
        title="왜 이 와인을 추천했나요?"
        description="음식과 와인의 궁합 이유를 알려드릴게요"
        icon={<FileText className="h-4 w-4" />}
        disabled={!hasReason && !slide.isCommitted}
      >
        <p className="whitespace-pre-line break-words">
          {hasReason ? slide.reason : "추천 이유 정보가 없어요."}
        </p>
      </DisclosureCard>
      {slide.isCommitted ? (
        <Button
          asChild
          variant="solid"
          radius="lg"
          className="h-12 w-full justify-between rounded-[16px] bg-primary px-5 text-[14px] font-bold text-white hover:bg-primary/90"
        >
          <a
            href="https://www.wine21.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="flex-1 text-center">
              이 와인 자세히 보기<span className="sr-only"> (새 탭)</span>
            </span>
            <ChevronRight aria-hidden className="h-5 w-5" />
          </a>
        </Button>
      ) : (
        <Button
          disabled
          htmlType="button"
          className="h-12 w-full rounded-[16px] text-[14px]"
          aria-label="추천 완료 후 와인 자세히 보기"
        >
          이 와인 자세히 보기
        </Button>
      )}
    </article>
  );
}
