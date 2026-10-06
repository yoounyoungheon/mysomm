"use client";

import { useRouter } from "next/navigation";
import { saveWineSelectionSnapshot } from "@/app/entity/wine-pairing-workflow/lib/workflow-snapshot-storage";
import { WORKFLOW_SNAPSHOT_VERSION } from "@/app/entity/wine-pairing-workflow/model/workflow-snapshot.type";
import Button from "@/app/shared/ui/atom/button";
import { cn } from "@/app/utils/style/helper";
import type { NextRecommendationButtonProps } from "./wine-list-select.props";

/**
 * 선택한 세션 wine으로 메뉴 추천 화면(`/wine/keywords`)으로 이동한다.
 *
 * 이동 전에 세션 ID와 선택 wine ID를 versioned snapshot으로 저장해
 * 리로드/이동 후에도 같은 세션으로 추천을 이어가게 한다.
 */
export default function NextRecommendationButton({
  sessionId,
  selectedWineIds,
  className,
}: NextRecommendationButtonProps) {
  const router = useRouter();
  const isDisabled = !sessionId || selectedWineIds.length === 0;

  const handleClick = () => {
    if (!sessionId || selectedWineIds.length === 0) return;

    saveWineSelectionSnapshot({
      version: WORKFLOW_SNAPSHOT_VERSION,
      sessionId,
      pairingWineIds: [...new Set(selectedWineIds)],
    });
    router.replace("/wine/keywords");
  };

  return (
    <Button
      htmlType="button"
      variant="solid"
      type="primary"
      radius="lg"
      disabled={isDisabled}
      onClick={handleClick}
      className={cn(
        "h-[52px] w-full rounded-[18px] border border-white/70 bg-white/[0.14] px-4 py-3 text-[15px] font-bold text-ink-emphasis shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(110,58,245,0.08),0_12px_30px_rgba(72,52,112,0.08)] backdrop-blur-2xl backdrop-saturate-150 hover:bg-white/[0.22] disabled:!border-white/40 disabled:!bg-white/[0.02] disabled:!text-ink-muted disabled:!opacity-100",
        className
      )}
    >
      다음
    </Button>
  );
}
