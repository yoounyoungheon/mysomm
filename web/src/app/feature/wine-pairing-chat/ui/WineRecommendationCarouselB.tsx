"use client";

import { useRef, useState } from "react";
import Button from "@/app/shared/ui/atom/button";
import { cn } from "@/app/utils/style/helper";
import WineRecommendationSlideB from "./WineRecommendationSlideB";
import type { WineRecommendationCarouselProps } from "./wine-pairing-chat.props";

export default function WineRecommendationCarouselB({
  slides,
  className,
}: WineRecommendationCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const currentIndex = Math.min(activeIndex, Math.max(0, slides.length - 1));
  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    const children = Array.from(element.children) as HTMLElement[];
    const first = children[0];
    if (!first) return;
    let nearest = 0;
    children.forEach((child, index) => {
      if (
        Math.abs(child.offsetLeft - first.offsetLeft - element.scrollLeft) <
        Math.abs(
          children[nearest].offsetLeft - first.offsetLeft - element.scrollLeft,
        )
      )
        nearest = index;
    });
    setActiveIndex(nearest);
  };
  const goTo = (index: number) => {
    const element = scrollRef.current;
    const first = element?.children[0] as HTMLElement | undefined;
    const child = element?.children[index] as HTMLElement | undefined;
    if (element && first && child)
      element.scrollTo({
        left: child.offsetLeft - first.offsetLeft,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  };
  if (!slides.length) return null;
  return (
    <div
      data-recommendation-carousel="B"
      className={cn("flex w-full flex-col", className)}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="region"
        aria-label="추천 와인 캐러셀"
        className="flex w-full snap-x snap-mandatory items-start overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => (
          <div
            key={`slide-${index}`}
            role="group"
            aria-label={`${index + 1}/${slides.length}번째 추천`}
            className="w-full shrink-0 snap-start px-5"
          >
            <WineRecommendationSlideB slide={slide} />
          </div>
        ))}
      </div>
      {slides.length > 1 ? (
        <div
          className="mt-4 flex items-center justify-center gap-1.5"
          aria-label="추천 와인 이동"
        >
          {slides.map((_, index) => (
            <Button
              key={index}
              htmlType="button"
              variant="text"
              size="icon"
              aria-label={`${index + 1}번째 추천 보기`}
              aria-current={index === currentIndex ? "true" : undefined}
              onClick={() => goTo(index)}
              className="h-1.5 w-1.5 bg-transparent p-0 shadow-none hover:bg-transparent focus-visible:ring-primary"
            >
              <span
                aria-hidden
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  index === currentIndex
                    ? "bg-primary"
                    : "bg-ink-muted/25",
                )}
              />
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
