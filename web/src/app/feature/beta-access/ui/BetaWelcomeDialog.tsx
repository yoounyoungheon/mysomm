"use client";

import { useRef, useState } from "react";
import Button from "@/app/shared/ui/atom/button";
import LoadingSpinner from "@/app/shared/ui/atom/loading-spinner";
import { Dialog, DialogContent } from "@/app/shared/ui/molecule/dialog";
import { cn } from "@/app/utils/style/helper";

export type BetaWelcomeDialogProps = {
  isEntering: boolean;
  errorMessage: string | null;
  needsReauthentication: boolean;
  onStart: () => void;
  onReauthenticate: () => void;
};

const TITLES = ["MYSOMM FOUNDING 500", "이번에 함께 확인할 것", "그리고 앞으로 더해질 것"];

export default function BetaWelcomeDialog({
  isEntering, errorMessage, needsReauthentication, onStart, onReauthenticate,
}: BetaWelcomeDialogProps) {
  const [slide, setSlide] = useState(0);
  const carousel = useRef<HTMLDivElement>(null);
  const locked = isEntering || needsReauthentication;
  const goTo = (index: number) => {
    if (locked || !carousel.current) return;
    carousel.current.scrollTo({
      left: Math.max(0, Math.min(2, index)) * carousel.current.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };

  return (
    <Dialog open>
      <DialogContent
        fullscreen
        title="마이쏨 첫 번째 버전 안내"
        description="좌우로 넘기거나 하단의 점을 눌러 세 페이지의 안내를 확인해 주세요."
        titleClassName="sr-only"
        descriptionClassName="sr-only"
        closeClassName="hidden"
        className="bg-primary px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-white sm:px-8"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => { event.preventDefault(); carousel.current?.focus(); }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          document.getElementById("beta-access-code")?.focus({ preventScroll: true });
        }}
      >
        <div className="flex h-full min-h-0 w-full max-w-[480px] flex-col">
          <p className="text-center text-xs font-semibold tracking-[0.2em] text-white/70" aria-live="polite">{slide + 1} / 3</p>
          <div
            ref={carousel}
            role="region"
            aria-label="마이쏨 환영 안내 캐러셀"
            aria-roledescription="캐러셀"
            tabIndex={0}
            onScroll={(event) => {
              const element = event.currentTarget;
              if (element.clientWidth) setSlide(Math.max(0, Math.min(2, Math.round(element.scrollLeft / element.clientWidth))));
            }}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                goTo(slide + (event.key === "ArrowRight" ? 1 : -1));
              }
            }}
            className={cn("flex min-h-0 w-full flex-1 snap-x snap-mandatory overscroll-x-contain outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", locked ? "overflow-x-hidden" : "overflow-x-auto")}
          >
            {TITLES.map((title, index) => (
            <section key={title} role="group" aria-roledescription="슬라이드" aria-label={title} inert={slide !== index} className="flex h-full min-w-0 w-full shrink-0 snap-start snap-always flex-col overflow-y-auto px-1 py-8 text-center">
            <div className="my-auto w-full space-y-8">
              <header>
                {index === 0 && <p className="mb-3 text-sm font-semibold tracking-[0.25em] text-white/80">WELCOME TO</p>}
                <h2 className="text-[28px] font-extrabold leading-tight outline-none sm:text-[32px]">{title}</h2>
              </header>
              {index === 0 && <p className="text-xl font-medium leading-relaxed">마이쏨의 첫 번째 버전에<br />오신 것을 환영합니다.</p>}
              {index === 1 && (
                <div className="space-y-6 text-xl font-medium leading-relaxed">
                  <p>1. 와인 리스트를 찍고</p>
                  <p>2. 함께 먹을 음식을 고르고</p>
                  <p>3. 지금 마실 와인을 쉽게 고를 수 있는지</p>
                  <p>함께 확인해주세요.</p>
                </div>
              )}
              {index === 2 && (
                <div className="space-y-8">
                  <ul className="mx-auto w-fit space-y-4 text-left text-base font-semibold leading-relaxed sm:text-lg">
                    <li>❤️ 내가 좋아한 와인 기억하기</li>
                    <li>🍷 나의 와인 취향 알아가기</li>
                    <li>✨ 사용할수록 나에게 맞는 추천</li>
                  </ul>
                  <p className="text-sm leading-relaxed text-white/80">이번 베타 이후 차례대로 만나볼 수 있어요.</p>
                </div>
              )}
            </div>
            </section>
            ))}
          </div>
          <footer className="flex shrink-0 flex-col gap-4">
            {errorMessage && <p role="alert" className="rounded-xl bg-white/10 px-4 py-3 text-center text-sm">{errorMessage}</p>}
            <div className="flex items-center justify-center" aria-label="환영 안내 페이지 이동">
              {TITLES.map((title, index) => (
                <Button key={title} variant="text" size="icon" disabled={locked}
                  aria-label={`${index + 1}번째 안내 보기`} aria-current={slide === index ? "true" : undefined}
                  onClick={() => goTo(index)}
                  className="h-11 w-11 bg-transparent p-0 text-white shadow-none hover:bg-white/10 focus-visible:ring-white">
                  <span aria-hidden className={cn("h-2 rounded-full transition-colors", slide === index ? "w-6 bg-white" : "w-2 bg-white/40")} />
                </Button>
              ))}
            </div>
            <div className="min-h-12">
              {slide === 2 && (needsReauthentication ? (
                <Button onClick={onReauthenticate} disabled={isEntering} className="h-12 w-full rounded-2xl bg-white text-primary hover:bg-white/90">베타 코드 다시 입력하기</Button>
              ) : (
                <Button onClick={onStart} disabled={isEntering} className="h-12 w-full gap-2 rounded-2xl bg-white text-primary hover:bg-white/90">
                  {isEntering && <LoadingSpinner label="인증 확인 중" className="h-4 w-4 text-primary" />}
                  {isEntering ? "인증 확인 중" : "첫 번째 마이쏨 시작하기"}
                </Button>
              ))}
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
