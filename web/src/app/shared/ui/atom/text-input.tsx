"use client";
import React from "react";
import { Input } from "../shadcn/input";
import { cn } from "@/app/utils/style/helper";

export interface TextInputProps extends React.ComponentPropsWithRef<"input"> {
  type?: "text" | "password" | "number";
  withIcon?: React.ElementType;
  status?: "default" | "error" | "success";
  helperMessages?: string[];
  disabled?: boolean;
  label?: string;
  onIconClick?: () => void;
  onValueChange?: (value: string) => void;
}

function TextInput({
  type,
  withIcon,
  status = "default",
  helperMessages,
  disabled = false,
  label,
  onIconClick,
  placeholder,
  onValueChange,
  onChange,
  className,
  ref,
  ...props
}: TextInputProps) {
  const Icon = withIcon;

  return (
    <>
      <div className="flex flex-col items-start gap-1">
        {label ? (
          <label
            className={cn(
              "text-sm",
              status === "error"
                ? "text-error-main"
                : status === "success"
                  ? "text-primary-main"
                  : "text-text-03",
            )}
          >
            {label}
          </label>
        ) : null}
        <div className="relative w-full">
          <div className="flex flex-row items-center gap-1">
            <Input
              {...props}
              ref={ref}
              type={type}
              className={cn(
                "w-full rounded-3xl border text-text-03 p-1.5 resize-none focus:outline-none",
                disabled ? "bg-gray-1" : "bg-white",
                status === "error"
                  ? "border-error-main focus:border-error-main"
                  : status === "success"
                    ? "border-primary-main focus:border-primary-main"
                    : "border-text-03 focus:border-text-03",
                "shadow-none",
                "py-2",
                "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                Icon ? "pl-10" : "pl-3",
                "pr-3",
                disabled
                  ? "text-gray-6 placeholder:text-gray-6"
                  : "placeholder:text-gray-6",
                className,
              )}
              placeholder={placeholder}
              disabled={disabled}
              onChange={(e) => {
                onChange?.(e);
                onValueChange?.(e.target.value);
              }}
            />
          </div>
          {Icon ? (
            <button
              type="button"
              onClick={onIconClick}
              disabled={!onIconClick}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1"
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  onIconClick ? "cursor-pointer" : "cursor-default",
                  status === "error"
                    ? "text-error-main"
                    : status === "success"
                      ? "text-primary-main"
                      : "text-text-03",
                )}
              />
            </button>
          ) : null}
        </div>
      </div>
      {helperMessages
        ? helperMessages.map((message, index) => (
            <p
              key={index}
              className={cn(
                "mt-1 text-sm",
                status === "error" ? "text-error-main" : "text-text-03",
              )}
            >
              {message}
            </p>
          ))
        : null}
    </>
  );
}

export default TextInput;
