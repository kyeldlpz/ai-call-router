"use client";

import { Headset } from "lucide-react";

interface ContactAvatarProps {
  isActive: boolean;
  isConnecting: boolean;
}

export function ContactAvatar({ isActive }: ContactAvatarProps) {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className={`
          relative flex items-center justify-center
          w-20 h-20 sm:w-24 sm:h-24
          rounded-full bg-gradient-to-b from-secondary to-muted border border-border
          ${isActive ? "animate-avatar-glow" : ""}
        `}
      >
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-card border border-border flex items-center justify-center">
          <Headset className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
        </div>
      </div>
    </div>
  );
}
