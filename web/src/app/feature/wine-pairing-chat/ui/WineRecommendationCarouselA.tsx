"use client";

import { useRef, useState } from "react";
import { cn } from "@/app/utils/style/helper";
import WineRecommendationSlide from "./WineRecommendationSlide";
import type { WineRecommendationCarouselProps } from "./wine-pairing-chat.props";

/**
 * 와인 추천 가로 스크롤 캐러셀.
 * CSS scroll snap으로 슬라이드를 넘기고, dots는 스크롤 위치에서 파생한다.
 * 스트리밍으로 새 슬라이드가 생기면 해당 슬라이드로 자동 스크롤한다.
 */
export default function WineRecommendationCarouselA({
  slides,
  className,
}: WineRecommendationCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element || element.clientWidth === 0) {
      return;
    }
    // 슬라이드 stride는 두 슬라이드의 offsetLeft 차이로 측정한다.
    // (offsetLeft는 offsetParent 기준이라 절대값을 그대로 쓰면 페이지 오프셋이 섞인다.)
    const firstSlide = element.children[0] as HTMLElement | undefined;
    const secondSlide = element.children[1] as HTMLElement | undefined;
    const measuredStride =
      firstSlide && secondSlide
        ? secondSlide.offsetLeft - firstSlide.offsetLeft
        : 0;
    const stride = measuredStride > 0 ? measuredStride : element.clientWidth;
    setActiveIndex(
      Math.min(
        slides.length - 1,
        Math.max(0, Math.round(element.scrollLeft / stride))
      )
    );
  };

  if (slides.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex w-full flex-col", className)}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth px-5 pb-3 [scroll-padding-inline:20px] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => (
          <div
            key={`slide-${index}`}
            className={cn(
              "max-w-[560px] shrink-0 snap-start",
              slides.length === 1 ? "w-full" : "w-[92%]"
            )}
          >
            <WineRecommendationSlide slide={slide} />
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <div
          role="tablist"
          aria-label="추천 와인 슬라이드"
          className="mt-4 flex items-center justify-center gap-1.5"
        >
          {slides.map((_, index) => (
            <span
              key={`dot-${index}`}
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`${index + 1}번째 추천`}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                index === activeIndex ? "bg-primary" : "bg-ink-muted/25"
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
