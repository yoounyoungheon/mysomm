"use client";

import { useRef } from "react";
import { ShoppingBasket } from "lucide-react";
import Button from "@/app/shared/ui/atom/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/app/shared/ui/molecule/dialog";

/** 페이지의 선택 상태를 그대로 보여주는 플로팅 장바구니. 서버 상태를 복제하지 않는다. */
export default function SelectedMenuCart({
  selectedNames,
  onRemove,
}: {
  selectedNames: readonly string[];
  onRemove: (name: string) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          htmlType="button"
          variant="solid"
          radius="full"
          aria-label={`선택한 음식 보기, ${selectedNames.length}개`}
          className="relative h-[52px] w-[52px] shrink-0 rounded-full border border-white/60 bg-white/[0.08] p-0 text-ink-emphasis shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_12px_28px_rgba(72,52,112,0.07)] backdrop-blur-2xl backdrop-saturate-150 hover:bg-white/[0.14] [&_svg]:size-6"
        >
          <ShoppingBasket className="h-5 w-5" aria-hidden="true" />
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border border-white/80 bg-primary px-1 text-[11px] font-bold text-white"
          >
            {selectedNames.length}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent
        title="선택한 음식"
        description={`${selectedNames.length}개를 골랐어요. 원하지 않는 음식은 선택을 해제할 수 있어요.`}
        className="max-h-[80dvh] rounded-3xl border-white/80 bg-background-03 text-ink-page"
      >
        {selectedNames.length ? (
          <ul className="max-h-[45dvh] space-y-2 overflow-y-auto overscroll-contain">
            {selectedNames.map((name) => (
              <li
                key={name}
                className="flex min-w-0 items-center gap-3 rounded-2xl bg-white/50 py-1 pl-3 pr-1"
              >
                <span className="min-w-0 flex-1 break-words text-[14px] font-medium [overflow-wrap:anywhere]">
                  {name}
                </span>
                <Button
                  htmlType="button"
                  variant="text"
                  radius="full"
                  aria-label={`${name} 선택 해제`}
                  className="min-h-11 shrink-0 bg-transparent px-3 text-[12px] text-primary shadow-none"
                  onClick={() => {
                    onRemove(name);
                    closeRef.current?.focus({ preventScroll: true });
                  }}
                >
                  해제
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-5 text-center text-[14px] text-ink-secondary">
            선택한 음식이 없어요.
          </p>
        )}
        <DialogClose asChild>
          <Button
            ref={closeRef}
            htmlType="button"
            variant="solid"
            radius="full"
            className="min-h-11 bg-primary text-white shadow-none hover:bg-primary/90"
          >
            닫기
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
