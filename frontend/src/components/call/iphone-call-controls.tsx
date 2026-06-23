"use client";

import { Phone, PhoneOff, Mic, MicOff, Volume2, Grid3X3 } from "lucide-react";
import type { CallStatus } from "@/types";

interface IPhoneCallControlsProps {
  status: CallStatus;
  isMuted: boolean;
  onStart: () => void;
  onEnd: () => void;
  onReset: () => void;
  onToggleMute: () => void;
}

const controlButtonBase =
  "rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

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
          className={`w-16 h-16 min-h-11 min-w-11 bg-primary hover:bg-amber-400 ${controlButtonBase}`}
          aria-label="Start call"
        >
          <Phone className="w-7 h-7 text-primary-foreground" />
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
          className={`w-16 h-16 min-h-11 min-w-11 bg-red-500 hover:bg-red-600 ${controlButtonBase}`}
          aria-label="End call"
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </button>
        <span className="text-xs text-white/70">end</span>
      </div>
    );
  }

  if (status === "active" || status === "ending") {
    const isDisabled = status === "ending";

    return (
      <div className="flex items-end justify-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onToggleMute}
            disabled={isDisabled}
            className={`w-14 h-14 min-h-11 min-w-11 ${controlButtonBase} ${
              isMuted
                ? "bg-white text-gray-900"
                : "bg-white/10 backdrop-blur-sm text-white hover:bg-white/20"
            } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>
          <span className="text-xs text-white/70">mute</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            disabled
            className={`w-14 h-14 min-h-11 min-w-11 bg-white/10 backdrop-blur-sm opacity-50 cursor-not-allowed ${controlButtonBase}`}
            aria-label="Keypad"
          >
            <Grid3X3 className="w-6 h-6 text-white" />
          </button>
          <span className="text-xs text-white/70">keypad</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            disabled
            className={`w-14 h-14 min-h-11 min-w-11 bg-white/10 backdrop-blur-sm opacity-50 cursor-not-allowed ${controlButtonBase}`}
            aria-label="Speaker"
          >
            <Volume2 className="w-6 h-6 text-white" />
          </button>
          <span className="text-xs text-white/70">speaker</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onEnd}
            disabled={isDisabled}
            className={`w-16 h-16 min-h-11 min-w-11 bg-red-500 ${controlButtonBase} ${
              isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-red-600"
            }`}
            aria-label="End call"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
          <span className="text-xs text-white/70">end</span>
        </div>
      </div>
    );
  }

  if (status === "complete") {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onReset}
          className={`w-16 h-16 min-h-11 min-w-11 bg-primary hover:bg-amber-400 ${controlButtonBase}`}
          aria-label="New call"
        >
          <Phone className="w-7 h-7 text-primary-foreground" />
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
          className={`w-16 h-16 min-h-11 min-w-11 bg-primary hover:bg-amber-400 ${controlButtonBase}`}
          aria-label="Retry call"
        >
          <Phone className="w-7 h-7 text-primary-foreground" />
        </button>
        <span className="text-xs text-white/70">retry</span>
      </div>
    );
  }

  return null;
}
