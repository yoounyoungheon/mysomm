"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import Button from "@/app/shared/ui/atom/button";
import SkeletonList from "@/app/shared/ui/molecule/skeleton-list";
import { cn } from "@/app/utils/style/helper";
import { useWinePairingConversation } from "../api/use-wine-pairing-conversation";
import type { PairingTurn } from "../model/conversation.types";
import ChatAnswerBubble from "./ChatAnswerBubble";
import ChatComposer from "./ChatComposer";
import WineRecommendationCarouselA from "./WineRecommendationCarouselA";
import WineRecommendationCarouselB from "./WineRecommendationCarouselB";
import type { WinePairingChatViewProps } from "./wine-pairing-chat.props";

/**
 * 와인 페어링 스트리밍 대화 화면(designs/enhanced_design_3_*.png).
 *
 * 진입 시 페어링 SSE로 추천 캐러셀을 점진 렌더하고, 완료 후 하단 입력창으로
 * 후속 질문(일반 대화 또는 재페어링)을 보낸다. 초기 pairing 실패나 리로드는
 * 자동 재호출하지 않고 "처음부터 다시 시작" 안내로 복구한다.
 */
export default function WinePairingChatView({
  className,
  recommendationVariant = "A",
}: WinePairingChatViewProps) {
  const {
    turns,
    hasRequest,
    alreadyConsumed,
    isHydrated,
    isPairingDone,
    isComposerEnabled,
    sendChat,
  } = useWinePairingConversation();

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTurn = turns[turns.length - 1];
  const lastChatAnswerLength =
    lastTurn?.kind === "chat" ? lastTurn.answer.length : -1;

  // 채팅 턴이 진행될 때만 대화 하단으로 자동 스크롤한다(캐러셀 페인팅 중에는 유지).
  useEffect(() => {
    if (lastChatAnswerLength >= 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [lastChatAnswerLength]);

  const showRestart = isHydrated && (!hasRequest || alreadyConsumed);

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col", className)}>
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="mx-auto flex min-h-full w-full max-w-[680px] flex-col gap-7 px-5 pb-28 pt-5">
          {!isHydrated ? (
            <StatePanel tone="pending" message="와인 추천을 준비하고 있어요." />
          ) : showRestart ? (
            <StatePanel
              tone="empty"
              message={
                alreadyConsumed
                  ? "이미 진행한 추천이에요. 새 추천을 시작해 주세요."
                  : "추천 정보를 찾을 수 없어요. 와인과 메뉴를 먼저 선택해 주세요."
              }
              action={<RestartLink />}
            />
          ) : (
            <>
              <section
                className={
                  recommendationVariant === "B" ? "sr-only" : undefined
                }
                aria-labelledby="wine-recommendation-intro-title"
              >
                <h2
                  id="wine-recommendation-intro-title"
                  className="text-[25px] font-extrabold leading-tight text-ink-page"
                >
                  마이쏨이 추천하는 와인이에요
                </h2>
                <p className="mt-3 text-[14px] font-medium leading-relaxed text-ink-secondary">
                  <span className="block">
                    선택한 메뉴와 잘 어울리는 순서예요.
                  </span>
                  <span className="block">
                    {recommendationVariant === "B"
                      ? "추천 이유를 펼쳐 와인과 음식의 궁합을 확인해 보세요."
                      : "카드를 뒤집어 상세 정보를 확인해 보세요."}
                  </span>
                </p>
              </section>
              {turns.map((turn, index) =>
                turn.kind === "pairing" ? (
                  <PairingTurnSection
                    key={`turn-${index}`}
                    turn={turn}
                    variant={recommendationVariant}
                  />
                ) : (
                  <ChatAnswerBubble key={`turn-${index}`} turn={turn} />
                ),
              )}
            </>
          )}
          <div ref={bottomRef} aria-hidden />
        </div>
      </main>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-5 pb-[calc(16px_+_env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto mx-auto w-full max-w-[640px]">
          <ChatComposer
            disabled={!isComposerEnabled}
            placeholder={
              isPairingDone
                ? "채팅을 입력하세요"
                : "와인 추천이 끝나면 질문할 수 있어요"
            }
            onSend={sendChat}
          />
        </div>
      </div>
    </div>
  );
}

function PairingTurnSection({
  turn,
  variant,
}: {
  turn: PairingTurn;
  variant: "A" | "B";
}) {
  const Carousel =
    variant === "B" ? WineRecommendationCarouselB : WineRecommendationCarouselA;
  return (
    <section aria-label="추천 와인" className="flex flex-col gap-4">
      {turn.source === "recommendation" && turn.question ? (
        <p className="max-w-[88%] self-end rounded-[16px] rounded-br-md border border-white/80 bg-white/55 px-4 py-3 text-[14px] leading-relaxed text-ink-page shadow-[0_8px_20px_rgba(72,52,112,0.05)]">
          {turn.question}
        </p>
      ) : null}

      {turn.slides.length > 0 ? (
        // 캐러셀 스크롤 영역은 페이지 패딩(px-5)을 상쇄해 화면 전체 폭을 쓴다.
        <Carousel slides={turn.slides} className="-mx-5 w-auto" />
      ) : null}

      {turn.status === "streaming" && turn.slides.length === 0 ? (
        <StatePanel tone="pending" message="어울리는 와인을 찾고 있어요." />
      ) : null}

      {turn.status === "error" ? (
        <StatePanel
          tone="error"
          message={turn.errorMessage ?? "와인 추천을 불러오지 못했습니다."}
          action={<RestartLink />}
        />
      ) : null}
    </section>
  );
}

function RestartLink() {
  return (
    <Button
      asChild
      variant="outline"
      type="primary"
      radius="lg"
      className="h-11 rounded-lg px-6 py-3 text-[14px] font-bold"
    >
      <Link href="/wine/list">처음부터 다시 시작</Link>
    </Button>
  );
}

function StatePanel({
  tone,
  message,
  action,
}: {
  tone: "pending" | "error" | "empty";
  message: string;
  action?: ReactNode;
}) {
  if (tone === "pending")
    return <SkeletonList label={message} variant="wine" />;

  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className="flex flex-col items-center justify-center gap-4 rounded-[16px] border border-white/80 bg-white/45 px-5 py-10 text-center shadow-[0_10px_26px_rgba(72,52,112,0.05)]"
    >
      <p
        className={cn(
          "text-[15px] leading-relaxed",
          tone === "error" ? "text-error-main" : "text-ink-secondary",
        )}
      >
        {message}
      </p>
      {action}
    </div>
  );
}
