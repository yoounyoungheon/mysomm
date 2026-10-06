"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MENU_CATEGORY,
  MENU_CATEGORIES,
  type RecommendedMenu,
} from "@/app/entity/menu-category-recommendation/model/menu-category-recommendation.type";
import { saveWinePairingSnapshot } from "@/app/entity/wine-pairing-workflow/lib/workflow-snapshot-storage";
import {
  WORKFLOW_SNAPSHOT_VERSION,
  type WineSelectionSnapshot,
} from "@/app/entity/wine-pairing-workflow/model/workflow-snapshot.type";
import Button from "@/app/shared/ui/atom/button";
import LoadingSpinner from "@/app/shared/ui/atom/loading-spinner";
import SkeletonList from "@/app/shared/ui/molecule/skeleton-list";
import { cn } from "@/app/utils/style/helper";
import { useMenuRecommendationsQuery } from "../api/use-menu-category-recommendations-query";
import { useStoredWineSelectionSnapshot } from "../lib/use-stored-recommendation-request";
import MenuNameBadge from "./MenuNameBadge";
import RecommendedMenuList from "./RecommendedMenuList";
import type { MenuCategoryRecommendationPageProps } from "./menu-category-recommendation-result.props";

/** 추천 메뉴가 마땅치 않을 때 직접 고를 수 있는 카테고리(기타 제외 10개). */
const FALLBACK_CATEGORIES = MENU_CATEGORIES.filter(
  (category) => category !== MENU_CATEGORY.OTHER
);

/** 선택한 세션 와인으로 추천 메뉴를 조회하고, 페어링에 사용할 메뉴 name을 고르는 화면. */
export default function MenuCategoryRecommendationPage({
  className,
}: MenuCategoryRecommendationPageProps) {
  const { snapshot, isHydrated } = useStoredWineSelectionSnapshot();

  return (
    <main
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-hidden",
        className
      )}
    >
      {!isHydrated ? (
        <HydrationShell />
      ) : snapshot ? (
        <RecommendationBody snapshot={snapshot} />
      ) : (
        <MissingSnapshotBody />
      )}
    </main>
  );
}

function RecommendationBody({
  snapshot,
}: {
  snapshot: WineSelectionSnapshot;
}) {
  const router = useRouter();
  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  const { data, error, isLoading, isFetching, refetch } =
    useMenuRecommendationsQuery(snapshot.sessionId, snapshot.pairingWineIds);

  const menus = useMemo(() => data ?? [], [data]);
  const availableNames = useMemo(
    // 추천 응답의 메뉴명 + 하단에서 직접 고를 수 있는 카테고리를 유효 선택값으로 둔다.
    () => new Set<string>([...menus.map((menu) => menu.name), ...FALLBACK_CATEGORIES]),
    [menus]
  );
  // 현재 추천 응답에 존재하는 선택 name(또는 선택 가능한 카테고리)만 유효하다.
  const validSelectedNames = selectedNames.filter((name) =>
    availableNames.has(name)
  );
  const canRequestPairing = validSelectedNames.length > 0;

  const toggleName = (name: string) => {
    setSelectedNames((current) =>
      current.includes(name)
        ? current.filter((value) => value !== name)
        : [...current, name]
    );
  };

  const handleRequestPairing = () => {
    if (!canRequestPairing) return;

    saveWinePairingSnapshot({
      version: WORKFLOW_SNAPSHOT_VERSION,
      sessionId: snapshot.sessionId,
      wineIds: snapshot.pairingWineIds,
      menuNames: validSelectedNames,
    });
    router.replace("/wine/chat");
  };

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="mx-auto flex min-h-full w-full max-w-[680px] flex-col px-5 pb-28 pt-5">
          <section className="pb-7" aria-labelledby="menu-recommendation-intro-title">
            <h2
              id="menu-recommendation-intro-title"
              className="text-[25px] font-extrabold leading-tight text-ink-page"
            >
              어울리는 메뉴를 골라봤어요
            </h2>
            <p className="mt-3 text-[14px] font-medium leading-relaxed text-ink-secondary">
              <span className="block">
                선택한 와인을 기준으로 마이쏨이 추천했어요.
              </span>
              <span className="block">원하는 메뉴를 선택해 주세요.</span>
            </p>
          </section>

          <section aria-labelledby="ai-recommended-menu-title">
            <div className="flex min-h-5 items-center justify-between gap-4">
              <h2 id="ai-recommended-menu-title" className="sr-only">
                추천 메뉴
              </h2>
              {validSelectedNames.length > 0 ? (
                <p className="ml-auto text-[13px] font-bold text-ink-card">
                  {validSelectedNames.length}개 선택
                </p>
              ) : null}
            </div>

            <div className="mt-3">
              <RecommendationResult
                menus={menus}
                isLoading={isLoading}
                isFetching={isFetching}
                error={error}
                selectedNames={validSelectedNames}
                onToggleName={toggleName}
                onRetry={() => refetch()}
              />
            </div>
          </section>

          <section className="mt-9" aria-labelledby="fallback-category-title">
            <h2
              id="fallback-category-title"
              className="text-[17px] font-extrabold text-ink-page"
            >
              찾으시는 메뉴가 없나요?
            </h2>
            <p className="mt-1 text-[13px] font-medium leading-relaxed text-ink-secondary">
              원하는 카테고리를 직접 선택해 보세요
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {FALLBACK_CATEGORIES.map((category) => (
                <MenuNameBadge
                  key={category}
                  name={category}
                  isSelected={validSelectedNames.includes(category)}
                  onToggle={toggleName}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-5 pb-[calc(16px_+_env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto mx-auto w-full max-w-[640px]">
          <Button
            htmlType="button"
            variant="solid"
            type="primary"
            radius="lg"
            disabled={!canRequestPairing}
            onClick={handleRequestPairing}
            className="h-[52px] w-full rounded-[18px] border border-white/60 bg-white/[0.08] text-[15px] font-bold text-ink-emphasis shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_12px_28px_rgba(72,52,112,0.07)] backdrop-blur-2xl backdrop-saturate-150 hover:bg-white/[0.14] disabled:!border-white/40 disabled:!bg-white/[0.02] disabled:!text-ink-muted disabled:!opacity-100"
          >
            와인 추천받기
          </Button>
        </div>
      </div>
    </>
  );
}

function RecommendationResult({
  menus,
  isLoading,
  isFetching,
  error,
  selectedNames,
  onToggleName,
  onRetry,
}: {
  menus: RecommendedMenu[];
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  selectedNames: readonly string[];
  onToggleName: (name: string) => void;
  onRetry: () => void;
}) {
  if (isLoading) {
    return <StatePanel tone="pending" message="추천 메뉴를 불러오고 있어요." />;
  }

  if (error) {
    return (
      <StatePanel
        tone="error"
        message={
          error instanceof Error
            ? error.message
            : "추천 메뉴를 불러오지 못했습니다."
        }
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <RetryButton onRetry={onRetry} isRetrying={isFetching} />
            <RestartLink />
          </div>
        }
      />
    );
  }

  if (menus.length === 0) {
    return (
      <StatePanel
        tone="empty"
        message="추천된 메뉴가 없어요. 와인을 다시 선택해 주세요."
        action={<RestartLink />}
      />
    );
  }

  return (
    <RecommendedMenuList
      menus={menus}
      selectedNames={selectedNames}
      onToggleName={onToggleName}
    />
  );
}

function HydrationShell() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-5">
      <StatePanel tone="pending" message="추천 메뉴를 불러오고 있어요." />
    </div>
  );
}

function MissingSnapshotBody() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-5">
      <StatePanel
        tone="empty"
        message="선택된 와인이 없어요. 먼저 와인을 선택해 주세요."
        action={<RestartLink label="와인 선택하러 가기" />}
      />
    </div>
  );
}

function RestartLink({ label = "처음부터 다시 시작" }: { label?: string }) {
  return (
    <Button
      asChild
      variant="outline"
      type="primary"
      radius="lg"
      className="h-11 rounded-[14px] border border-white/60 bg-white/[0.05] px-6 py-3 text-[14px] font-bold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_8px_22px_rgba(72,52,112,0.05)] backdrop-blur-xl hover:bg-white/[0.12]"
    >
      <Link href="/wine/list">{label}</Link>
    </Button>
  );
}

type StatePanelTone = "pending" | "error" | "empty";

function StatePanel({
  tone,
  message,
  action,
}: {
  tone: StatePanelTone;
  message: string;
  action?: ReactNode;
}) {
  if (tone === "pending") {
    return <SkeletonList label={message} />;
  }

  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className="flex w-full flex-col items-center justify-center gap-4 rounded-[16px] border border-white/55 bg-white/[0.04] px-5 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_10px_26px_rgba(72,52,112,0.04)] backdrop-blur-2xl backdrop-saturate-150"
    >
      <p
        className={cn(
          "text-[15px] leading-relaxed",
          tone === "error" ? "text-error-main" : "text-ink-secondary"
        )}
      >
        {message}
      </p>
      {action}
    </div>
  );
}

function RetryButton({
  onRetry,
  isRetrying,
}: {
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <Button
      htmlType="button"
      variant="outline"
      type="primary"
      radius="lg"
      disabled={isRetrying}
      onClick={onRetry}
      className="h-11 gap-2 rounded-[14px] border border-white/60 bg-white/[0.05] px-6 py-3 text-[14px] font-bold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_8px_22px_rgba(72,52,112,0.05)] backdrop-blur-xl hover:bg-white/[0.12]"
    >
      {isRetrying ? (
        <>
          <LoadingSpinner label="다시 시도 중" className="h-5 w-5" />
          다시 시도 중
        </>
      ) : (
        "다시 시도"
      )}
    </Button>
  );
}
