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
          className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors duration-200"
          aria-label="Start call"
        >
          <Phone className="w-7 h-7 text-white" />
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
          className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors duration-200"
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
        {/* Mute button */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onToggleMute}
            disabled={isDisabled}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors duration-200 ${
              isMuted
                ? "bg-white text-gray-900"
                : "bg-white/10 backdrop-blur-sm text-white"
            } ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
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

        {/* Keypad button (decorative/disabled) */}
        <div className="flex flex-col items-center gap-2">
          <button
            disabled
            className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-50 cursor-not-allowed"
            aria-label="Keypad"
          >
            <Grid3X3 className="w-6 h-6 text-white" />
          </button>
          <span className="text-xs text-white/70">keypad</span>
        </div>

        {/* Speaker button (decorative/disabled) */}
        <div className="flex flex-col items-center gap-2">
          <button
            disabled
            className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-50 cursor-not-allowed"
            aria-label="Speaker"
          >
            <Volume2 className="w-6 h-6 text-white" />
          </button>
          <span className="text-xs text-white/70">speaker</span>
        </div>

        {/* End call button */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onEnd}
            disabled={isDisabled}
            className={`w-16 h-16 rounded-full bg-red-500 flex items-center justify-center transition-colors duration-200 ${
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
          className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors duration-200"
          aria-label="New call"
        >
          <Phone className="w-7 h-7 text-white" />
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
          className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors duration-200"
          aria-label="Retry call"
        >
          <Phone className="w-7 h-7 text-white" />
        </button>
        <span className="text-xs text-white/70">retry</span>
      </div>
    );
  }

  return null;
}
