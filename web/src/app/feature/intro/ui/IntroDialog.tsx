"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/app/shared/ui/molecule/dialog";
import { INTRO_DURATION_MS, INTRO_STORAGE_KEY, wasIntroClosedRecently } from "@/lib/intro/intro-policy";
import { useCompleteIntro, useIntroStatus } from "../api/use-intro";

export default function IntroDialog({ shouldShowIntro }: { shouldShowIntro: boolean }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const decided = useRef(false);
  const closed = useRef(false);
  const status = useIntroStatus();
  const { mutate } = useCompleteIntro();

  useEffect(() => {
    if (decided.current || !status.isFetchedAfterMount) return;
    decided.current = true;
    let recentlyClosed = false;
    try { recentlyClosed = wasIntroClosedRecently(sessionStorage.getItem(INTRO_STORAGE_KEY)); } catch { /* Storage may be blocked. */ }
    const show = (status.data?.isFirstVisit ?? shouldShowIntro) && !recentlyClosed;
    if (show && document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      previousFocus.current = document.activeElement;
    }
    setOpen(show);
  }, [status.isFetchedAfterMount, status.data, shouldShowIntro]);

  const close = useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    setOpen(false);
    try { sessionStorage.setItem(INTRO_STORAGE_KEY, String(Date.now())); } catch { /* Cookie is the durable source. */ }
    mutate(); // Never await persistence before closing the UI.
  }, [mutate]);

  useEffect(() => {
    if (!open) return;
    let remaining = INTRO_DURATION_MS;
    let startedAt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    let nextFrame = 0;
    const pause = () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(nextFrame);
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
        remaining = Math.max(0, remaining - (performance.now() - startedAt));
      }
    };
    const resume = () => {
      if (document.visibilityState !== "visible") return;
      // Wait for the portal, then allow a paint before counting visible time.
      frame = requestAnimationFrame(() => {
        if (!contentRef.current) { resume(); return; }
        nextFrame = requestAnimationFrame(() => {
          if (document.visibilityState !== "visible") return;
          startedAt = performance.now();
          timer = setTimeout(close, remaining);
        });
      });
    };
    const onVisibility = () => { pause(); resume(); };
    resume();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { pause(); document.removeEventListener("visibilitychange", onVisibility); };
  }, [open, close]);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent
        ref={contentRef}
        fullscreen
        title="마이쏨에 오신 것을 환영해요"
        description="내 손 안의 소믈리에"
        titleClassName="sr-only"
        descriptionClassName="sr-only"
        className="bg-primary text-white [&>button]:text-white"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const previous = previousFocus.current;
          const target = previous?.isConnected && !previous.closest('[inert], [aria-hidden="true"]')
            ? previous
            : document.getElementById("app-content");
          target?.focus({ preventScroll: true });
        }}
      >
        <div className="flex w-full max-w-md flex-col items-center gap-5 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
          <span className="text-[42px] font-extrabold tracking-tight text-white" aria-hidden="true">MYSOMM</span>
          <p className="text-sm font-medium text-white/90">내 손 안의 소믈리에</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
