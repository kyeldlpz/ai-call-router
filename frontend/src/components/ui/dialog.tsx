"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "fixed inset-0 z-50 m-auto w-[min(100%,42rem)] max-h-[90vh] overflow-hidden",
        "rounded-lg border border-border bg-background-elevated p-0 text-foreground shadow-xl",
        "backdrop:bg-black/60 open:animate-in open:fade-in-0",
        className
      )}
      onClose={() => onOpenChange(false)}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onOpenChange(false);
        }
      }}
    >
      <div className="flex max-h-[90vh] flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 cursor-pointer"
            aria-label="Close dialog"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
      </div>
    </dialog>
  );
}
