"use client";

import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";

interface ContactAvatarProps {
  isActive: boolean;
  isConnecting: boolean;
}

export function ContactAvatar({ isActive }: ContactAvatarProps) {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden",
          "w-20 h-20 sm:w-24 sm:h-24",
          "rounded-full bg-gradient-to-b from-secondary to-muted border border-border",
          isActive && "animate-avatar-glow"
        )}
      >
        <BrandLogo size="avatar" className="scale-[0.88] sm:scale-90" />
      </div>
    </div>
  );
}
