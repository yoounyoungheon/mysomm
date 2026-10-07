import {
  MAX_WINE_MENU_IMAGE_COUNT,
  WINE_MENU_IMAGE_ACCEPT,
} from "@/app/entity/wine/model/wine-menu-image";
import Button from "@/app/shared/ui/atom/button";
import LoadingSpinner from "@/app/shared/ui/atom/loading-spinner";
import PhotoPicker from "@/app/shared/ui/molecule/photo-picker";
import { cn } from "@/app/utils/style/helper";
import type { WineMenuPhotoSectionProps } from "./wine-list-select.props";

/**
 * 메뉴판 이미지 다중 첨부 + 분석 실행 영역.
 * 이미지가 하나도 없거나 분석 중이면 분석 버튼을 비활성화한다.
 */
export default function WineMenuPhotoSection({
  previews,
  isAnalyzing = false,
  imageErrorMessage,
  extractionErrorMessage,
  onAddFiles,
  onRemoveFile,
  onAnalyze,
  className,
}: WineMenuPhotoSectionProps) {
  const isAnalyzeDisabled = previews.length === 0 || isAnalyzing;
  const errorMessage = imageErrorMessage ?? extractionErrorMessage ?? null;

  return (
    <section className={cn("w-full", className)}>
      <h2 className="sr-only">사진으로 와인 리스트 찾기</h2>

      <PhotoPicker
        previews={previews}
        accept={WINE_MENU_IMAGE_ACCEPT}
        maxCount={MAX_WINE_MENU_IMAGE_COUNT}
        isLoading={isAnalyzing}
        emptyLabel="와인 리스트 사진 올리기"
        emptyHint="사진을 선택하거나 이곳에 올려주세요"
        onAddFiles={onAddFiles}
        onRemoveFile={onRemoveFile}
      />

      <Button
        htmlType="button"
        variant="outline"
        type="primary"
        size="default"
        radius="lg"
        disabled={isAnalyzeDisabled}
        aria-busy={isAnalyzing}
        aria-label={isAnalyzing ? "와인 리스트 분석 중" : "와인 리스트 분석"}
        className={cn(
          "mt-3 h-[48px] w-full rounded-[18px] border border-white/55 bg-white/[0.04] px-4 py-3 text-[14px] font-bold text-ink-emphasis shadow-[inset_0_1px_0_rgba(255,255,255,0.82),inset_0_-1px_0_rgba(110,58,245,0.06),0_14px_34px_rgba(72,52,112,0.045)] backdrop-blur-2xl backdrop-saturate-150 hover:bg-white/[0.09] disabled:!opacity-100",
          isAnalyzeDisabled &&
            "!border-white/45 !bg-white/[0.02] !text-ink-muted hover:!bg-white/[0.02]",
          isAnalyzing && "cursor-wait"
        )}
        onClick={onAnalyze}
      >
        {isAnalyzing ? (
          <LoadingSpinner label="와인 리스트 분석 중" className="h-5 w-5 text-primary [&_svg]:size-5" />
        ) : "와인 리스트 분석"}
      </Button>

      {errorMessage ? (
        <p role="alert" className="mt-2 text-[12px] font-medium text-error-main">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
