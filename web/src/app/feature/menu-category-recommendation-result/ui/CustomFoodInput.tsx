"use client";

import { useRef, useState } from "react";
import Button from "@/app/shared/ui/atom/button";
import TextInput from "@/app/shared/ui/atom/text-input";
import MenuNameBadge from "./MenuNameBadge";
import IconBadgeRow from "@/app/shared/ui/molecule/icon-badge-row";
import {
  CUSTOM_FOOD_MAX_LENGTH,
  validateCustomFood,
} from "../lib/menu-selection";

export default function CustomFoodInput({
  names,
  existingNames,
  selectedNames,
  onAdd,
  onRemove,
  onToggle,
}: {
  names: readonly string[];
  existingNames: readonly string[];
  selectedNames: readonly string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  onToggle: (name: string) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposing = useRef(false);
  const add = () => {
    if (!value.trim()) {
      setError(null);
      return;
    }
    const result = validateCustomFood(value, existingNames);
    setError(result.error);
    if (result.error) return;
    onAdd(result.name);
    setValue("");
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <section className="mt-7" aria-label="음식 직접 입력">
      <IconBadgeRow iconSrc="/images/menu-category/other.png" label="직접 입력">
        <div className="w-full min-w-0">
          <label htmlFor="custom-food-name" className="sr-only">
            음식 이름
          </label>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <TextInput
                ref={inputRef}
                id="custom-food-name"
                type="text"
                value={value}
                maxLength={CUSTOM_FOOD_MAX_LENGTH}
                placeholder="찾는 음식이 없으면 직접 입력해주세요!"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "custom-food-error" : undefined}
                onValueChange={(next) => {
                  setValue(next);
                  setError(null);
                }}
                onCompositionStart={() => {
                  isComposing.current = true;
                }}
                onCompositionEnd={() => {
                  isComposing.current = false;
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.nativeEvent.isComposing &&
                    !isComposing.current &&
                    event.keyCode !== 229
                  ) {
                    event.preventDefault();
                    add();
                  }
                }}
                className="min-h-11 border-white/70 bg-white/50 text-[14px] text-ink-card placeholder:text-ink-muted"
              />
            </div>
            <Button
              htmlType="button"
              variant="outline"
              radius="lg"
              onClick={add}
              className="h-11 shrink-0 border-white/70 bg-white/40 px-3 text-primary shadow-none"
            >
              추가
            </Button>
          </div>
          {error ? (
            <p
              id="custom-food-error"
              role="alert"
              className="mt-2 text-[12px] text-error-main"
            >
              {error}
            </p>
          ) : null}
          {names.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {names.map((name) => (
                <MenuNameBadge
                  key={name}
                  name={name}
                  isSelected={selectedNames.includes(name)}
                  onToggle={onToggle}
                  onRemove={() => {
                    onRemove(name);
                    setError(null);
                    inputRef.current?.focus({ preventScroll: true });
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </IconBadgeRow>
    </section>
  );
}
