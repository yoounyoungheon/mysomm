"use client";
import React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent as ShadcnDialogContent,
  DialogDescription as ShadcnDialogDescription,
  DialogOverlay as ShadcnDialogOverlay,
  DialogPortal,
  DialogTitle as ShadcnDialogTitle,
  DialogTrigger,
} from "./../shadcn/dialog";
import { cn } from "@/app/utils/style/helper";

type DialogContentProps = React.ComponentPropsWithRef<
  typeof ShadcnDialogContent
> & {
  title?: string;
  description?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  fullscreen?: boolean;
};

function DialogOverlay({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ShadcnDialogOverlay>) {
  return (
    <ShadcnDialogOverlay
      className={cn("fixed inset-0 bg-black/50", className)}
      {...props}
    />
  );
}
DialogOverlay.displayName = "DialogOverlay";

function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ShadcnDialogTitle>) {
  return (
    <ShadcnDialogTitle
      className={cn("text-lg text-center font-bold mb-2", className)}
      {...props}
    />
  );
}
DialogTitle.displayName = "DialogTitle";

function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ShadcnDialogDescription>) {
  return (
    <ShadcnDialogDescription
      className={cn("text-sm mb-4", className)}
      {...props}
    />
  );
}
DialogDescription.displayName = "DialogDescription";

function DialogContent({
  children,
  className,
  title,
  description,
  titleClassName,
  descriptionClassName,
  fullscreen = false,
  ref,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <ShadcnDialogContent
        {...props}
        ref={ref}
        className={cn(
          fullscreen
            ? "fixed inset-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 transform-none flex-col items-center justify-center gap-0 rounded-none border-0 bg-white p-6 shadow-none data-[state=open]:animate-none data-[state=closed]:animate-none sm:rounded-none"
            : "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-md",
          className
        )}
      >
        {title ? (
          <DialogTitle className={titleClassName}>{title}</DialogTitle>
        ) : (
          <DialogTitle />
        )}
        {description ? (
          <DialogDescription className={descriptionClassName}>
            {description}
          </DialogDescription>
        ) : (
          <DialogDescription />
        )}
        {children}
      </ShadcnDialogContent>
    </DialogPortal>
  );
}

DialogContent.displayName = "DialogContent";

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
};
