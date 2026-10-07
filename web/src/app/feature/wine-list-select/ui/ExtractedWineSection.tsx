import { cn } from "@/app/utils/style/helper";
import Button from "@/app/shared/ui/atom/button";
import ExtractedWineCard from "./ExtractedWineCard";
import type { ExtractedWineSectionProps } from "./wine-list-select.props";

const DEFAULT_TITLE = "찾은 와인";

/**
 * 추출된 세션 와인 후보 목록. 사용자가 페어링에 사용할 와인을 다중 선택한다.
 * 선택된 항목 수를 함께 표시한다.
 */
export default function ExtractedWineSection({
  wines,
  selectedWineIds,
  onToggleWine,
  title = DEFAULT_TITLE,
  className,
}: ExtractedWineSectionProps) {
  const selectedSet = new Set(selectedWineIds);
  const selectedCount = wines.filter((wine) => selectedSet.has(wine.id)).length;
  const allSelected = wines.length > 0 && selectedCount === wines.length;
  const toggleAll = () => {
    for (const wine of wines) {
      if (allSelected || !selectedSet.has(wine.id)) onToggleWine(wine.id);
    }
  };

  return (
    <section className={cn("w-full", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="sr-only">{title}</h2>
        <Button
          htmlType="button"
          variant="text"
          radius="full"
          disabled={wines.length === 0}
          onClick={toggleAll}
          className="min-h-11 border border-white/70 bg-white/30 px-3 py-2 text-[13px] font-bold text-primary shadow-none hover:bg-white/50"
        >
          {allSelected ? "전체 해제" : "전체 선택"}
        </Button>
        {selectedCount > 0 ? (
          <p className="text-[13px] font-bold text-primary">
            {selectedCount}개 선택
          </p>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2">
        {wines.map((wine) => (
          <ExtractedWineCard
            key={wine.id}
            wine={wine}
            isSelected={selectedSet.has(wine.id)}
            onToggle={onToggleWine}
          />
        ))}
      </div>
    </section>
  );
}
