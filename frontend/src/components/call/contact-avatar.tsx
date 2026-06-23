"use client";

import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";

interface ContactAvatarProps {
  isActive: boolean;
  isConnecting: boolean;
  compact?: boolean;
}

export function ContactAvatar({
  isActive,
  compact = false,
}: ContactAvatarProps) {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full border border-border bg-gradient-to-b from-secondary to-muted",
          compact ? "h-[4.5rem] w-[4.5rem]" : "h-20 w-20 sm:h-24 sm:w-24",
          isActive && "animate-avatar-glow"
        )}
      >
        <BrandLogo
          size="avatar"
          className={cn(
            compact
              ? "h-[3.25rem] w-[3.25rem] sm:h-14 sm:w-14"
              : "scale-[0.88] sm:scale-90"
          )}
        />
      </div>
    </div>
  );
}
