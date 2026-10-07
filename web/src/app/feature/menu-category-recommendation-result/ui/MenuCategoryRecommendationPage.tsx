"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RecommendedMenu } from "@/app/entity/menu-category-recommendation/model/menu-category-recommendation.type";
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
import CustomFoodInput from "./CustomFoodInput";
import SelectedMenuCart from "./SelectedMenuCart";
import {
  FIXED_FOOD_CATEGORIES,
  FIXED_FOOD_GROUPS,
} from "../model/fixed-food-categories";
import { getMenuSelection } from "../lib/menu-selection";

/** 선택한 세션 와인으로 추천 메뉴를 조회하고, 페어링에 사용할 메뉴 name을 고르는 화면. */
export default function MenuCategoryRecommendationPage({
  className,
}: MenuCategoryRecommendationPageProps) {
  const { snapshot, isHydrated } = useStoredWineSelectionSnapshot();

  return (
    <main
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-hidden",
        className,
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

function RecommendationBody({ snapshot }: { snapshot: WineSelectionSnapshot }) {
  const router = useRouter();
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [customNames, setCustomNames] = useState<string[]>([]);

  const { data, error, isLoading, isFetching, refetch } =
    useMenuRecommendationsQuery(snapshot.sessionId, snapshot.pairingWineIds);

  const menus = useMemo(() => data ?? [], [data]);
  const recommendedNames = menus.map((menu) => menu.name);
  const availableNames = [
    ...recommendedNames,
    ...FIXED_FOOD_CATEGORIES.map((food) => food.name),
    ...customNames,
  ];
  const selection = getMenuSelection(selectedNames, availableNames);
  const validSelectedNames = selection.names;
  // 추천 메뉴·고정 카테고리·직접 입력 모두 기존 menuNames shape로 전달한다.
  const canRequestPairing =
    selection.canRequestPairing && !isFetching && !error;

  const toggleName = (name: string) => {
    setSelectedNames((current) =>
      current.includes(name)
        ? current.filter((value) => value !== name)
        : [...current, name],
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
        <div className="mx-auto flex min-h-full w-full max-w-[680px] flex-col px-5 pb-36 pt-5">
          <section aria-labelledby="fixed-food-title">
            <h2
              id="fixed-food-title"
              className="text-[25px] font-extrabold leading-tight text-ink-page"
            >
              어떤 음식을 드시나요?
            </h2>
            <p className="mt-3 text-[14px] font-medium leading-relaxed text-ink-secondary">
              가장 가까운 카테고리를 선택해 주세요.
            </p>
            <div className="mt-6 space-y-2" data-fixed-food-rows>
              {FIXED_FOOD_GROUPS.map((foods) => (
                <ul
                  key={foods[0].name}
                  className="flex gap-2 max-[359px]:gap-1.5"
                >
                  {foods.map((food) => (
                    <li key={food.name} className="min-w-0">
                      <MenuNameBadge
                        name={food.name}
                        iconSrc={`/images/menu-category/${food.icon}`}
                        isSelected={validSelectedNames.includes(food.name)}
                        onToggle={toggleName}
                        className="[&>button]:gap-1 [&>button]:whitespace-nowrap [&>button]:px-1.5 [&>button]:text-[12px] min-[360px]:[&>button]:px-2 min-[360px]:[&>button]:text-[13px]"
                      />
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </section>

          <CustomFoodInput
            names={customNames}
            existingNames={availableNames}
            selectedNames={validSelectedNames}
            onAdd={(name) => {
              setCustomNames((current) => [...current, name]);
              setSelectedNames((current) => [...current, name]);
            }}
            onRemove={(name) => {
              setCustomNames((current) =>
                current.filter((value) => value !== name),
              );
              setSelectedNames((current) =>
                current.filter((value) => value !== name),
              );
            }}
            onToggle={toggleName}
          />

          <hr className="my-8 border-white/70" />
          <section
            className="pb-7"
            aria-labelledby="menu-recommendation-intro-title"
          >
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
            <h2 id="ai-recommended-menu-title" className="sr-only">
              추천 메뉴
            </h2>
            <div>
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
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-5 pb-[calc(16px_+_env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-[640px]">
          <div className="mb-5 flex justify-end">
            <div className="pointer-events-auto">
              <SelectedMenuCart
                selectedNames={validSelectedNames}
                onRemove={toggleName}
              />
            </div>
          </div>
          <Button
            htmlType="button"
            variant="solid"
            type="primary"
            radius="lg"
            disabled={!canRequestPairing}
            onClick={handleRequestPairing}
            className="pointer-events-auto h-[52px] w-full rounded-[18px] border border-white/60 bg-white/[0.08] text-[15px] font-bold text-ink-emphasis shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_12px_28px_rgba(72,52,112,0.07)] backdrop-blur-2xl backdrop-saturate-150 hover:bg-white/[0.14] disabled:!border-white/40 disabled:!bg-white/[0.02] disabled:!text-ink-muted disabled:!opacity-100"
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
    return <SkeletonList label={message} variant="menu-chips" />;
  }

  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className="flex w-full flex-col items-center justify-center gap-4 rounded-[16px] border border-white/55 bg-white/[0.04] px-5 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_10px_26px_rgba(72,52,112,0.04)] backdrop-blur-2xl backdrop-saturate-150"
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
