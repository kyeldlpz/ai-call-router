"use client";

import { Headset } from "lucide-react";

interface ContactAvatarProps {
  isActive: boolean;
  isConnecting: boolean;
}

export function ContactAvatar({ isActive, isConnecting }: ContactAvatarProps) {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className={`
          relative flex items-center justify-center
          w-20 h-20 sm:w-24 sm:h-24
          rounded-full bg-gradient-to-br from-blue-500 to-purple-600
          ${isActive ? "shadow-lg shadow-blue-500/50 animate-avatar-glow" : ""}
          ${isConnecting ? "" : ""}
        `}
      >
        <Headset className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
      </div>
    </div>
  );
}
