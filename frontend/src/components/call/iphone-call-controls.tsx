"use client";

import { Phone, PhoneOff, Mic, MicOff, Volume2, Grid3X3 } from "lucide-react";
import type { CallStatus } from "@/types";
import { cn } from "@/lib/utils";

interface IPhoneCallControlsProps {
  status: CallStatus;
  isMuted: boolean;
  onStart: () => void;
  onEnd: () => void;
  onReset: () => void;
  onToggleMute: () => void;
}

const controlButtonBase =
  "rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

const callCtaClasses = "call-cta w-16 h-16 min-h-11 min-w-11";

const secondaryControl =
  "h-11 w-11 min-h-11 min-w-11 border border-white/10 bg-white/10 text-white hover:bg-white/15";

function ControlCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {children}
      <span className="text-[10px] uppercase tracking-wide text-white/55">
        {label}
      </span>
    </div>
  );
}

export function IPhoneCallControls({
  status,
  isMuted,
  onStart,
  onEnd,
  onReset,
  onToggleMute,
}: IPhoneCallControlsProps) {
  if (status === "idle") {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onStart}
          className={`${callCtaClasses} ${controlButtonBase}`}
          aria-label="Start call"
        >
          <Phone className="h-7 w-7 text-current" />
        </button>
        <span className="text-xs text-white/70">call</span>
      </div>
    );
  }

  if (status === "connecting") {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onEnd}
          className={`h-16 w-16 min-h-11 min-w-11 bg-red-500 hover:bg-red-600 ${controlButtonBase}`}
          aria-label="End call"
        >
          <PhoneOff className="h-7 w-7 text-white" />
        </button>
        <span className="text-xs text-white/70">end</span>
      </div>
    );
  }

  if (status === "active" || status === "ending") {
    const isDisabled = status === "ending";

    return (
      <div className="grid w-full grid-cols-4 items-end justify-items-center gap-x-1">
        <ControlCell label="mute">
          <button
            onClick={onToggleMute}
            disabled={isDisabled}
            className={cn(
              controlButtonBase,
              secondaryControl,
              isMuted && "border-white/20 bg-white text-gray-900 hover:bg-white/90",
              isDisabled && "cursor-not-allowed opacity-50"
            )}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>
        </ControlCell>

        <ControlCell label="keypad">
          <button
            disabled
            className={cn(
              controlButtonBase,
              secondaryControl,
              "cursor-not-allowed opacity-40"
            )}
            aria-label="Keypad"
          >
            <Grid3X3 className="h-5 w-5" />
          </button>
        </ControlCell>

        <ControlCell label="speaker">
          <button
            disabled
            className={cn(
              controlButtonBase,
              secondaryControl,
              "cursor-not-allowed opacity-40"
            )}
            aria-label="Speaker"
          >
            <Volume2 className="h-5 w-5" />
          </button>
        </ControlCell>

        <ControlCell label="end">
          <button
            onClick={onEnd}
            disabled={isDisabled}
            className={cn(
              "h-12 w-12 min-h-11 min-w-11 bg-red-500 text-white",
              controlButtonBase,
              isDisabled ? "cursor-not-allowed opacity-50" : "hover:bg-red-600"
            )}
            aria-label="End call"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
        </ControlCell>
      </div>
    );
  }

  if (status === "complete") {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onReset}
          className={`${callCtaClasses} ${controlButtonBase}`}
          aria-label="New call"
        >
          <Phone className="h-7 w-7 text-current" />
        </button>
        <span className="text-xs text-white/70">new call</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onReset}
          className={`${callCtaClasses} ${controlButtonBase}`}
          aria-label="Retry call"
        >
          <Phone className="h-7 w-7 text-current" />
        </button>
        <span className="text-xs text-white/70">retry</span>
      </div>
    );
  }

  return null;
}
