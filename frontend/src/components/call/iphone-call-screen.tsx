"use client";

import { ContactAvatar } from "./contact-avatar";
import { CallingAnimation } from "./calling-animation";
import { IPhoneCallControls } from "./iphone-call-controls";
import type { CallStatus } from "@/types";

interface IPhoneCallScreenProps {
  status: CallStatus;
  duration: number;
  error: string | null;
  speechError: string | null;
  isMuted: boolean;
  isSpeaking: boolean;
  isSpeechSupported: boolean;
  onStart: () => void;
  onEnd: () => void;
  onReset: () => void;
  onToggleMute: () => void;
}

function formatDuration(duration: number): string {
  const minutes = Math.floor(duration / 60);
  const seconds = (duration % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function IPhoneCallScreen({
  status,
  duration,
  error,
  speechError,
  isMuted,
  isSpeaking,
  isSpeechSupported,
  onStart,
  onEnd,
  onReset,
  onToggleMute,
}: IPhoneCallScreenProps) {
  const isConnecting = status === "connecting";
  const isActive = status === "active" || status === "ending";

  return (
    <div className="relative flex flex-col items-center h-full w-full bg-gradient-to-b from-gray-900 via-gray-950 to-black transition-all duration-300 overflow-hidden">
      {/* Top spacer — just enough for Dynamic Island pill clearance */}
      <div className="pt-14 shrink-0" />

      {/* Contact avatar area */}
      <div className="relative flex items-center justify-center mt-4 shrink-0">
        <ContactAvatar
          isActive={isActive}
          isConnecting={isConnecting}
        />
        <CallingAnimation isActive={isConnecting} />
      </div>

      {/* Contact name */}
      <h2 className="text-white text-xl font-medium mt-4 shrink-0 transition-all duration-300">
        RecoverAi
      </h2>

      {/* Status text / timer / indicators */}
      <div className="flex flex-col items-center mt-2 min-h-[2.5rem] shrink-0 transition-all duration-300">
        {status === "idle" && (
          <p className="text-white/70 text-sm">Ready to call</p>
        )}

        {status === "connecting" && (
          <p className="text-white/70 text-sm">Calling...</p>
        )}

        {status === "active" && (
          <>
            <p className="text-white text-lg font-mono tabular-nums">
              {formatDuration(duration)}
            </p>
            <p className="text-white/70 text-sm mt-1">
              {isSpeaking ? "Speaking..." : "Listening..."}
            </p>
          </>
        )}

        {status === "ending" && (
          <>
            <p className="text-white text-lg font-mono tabular-nums">
              {formatDuration(duration)}
            </p>
            <p className="text-white/70 text-sm mt-1">Ending...</p>
          </>
        )}

        {status === "complete" && (
          <>
            <p className="text-white/70 text-sm">Call Ended</p>
            <p className="text-white text-lg font-mono tabular-nums mt-1">
              {formatDuration(duration)}
            </p>
          </>
        )}

        {status === "error" && (
          <p className="text-white/70 text-sm">Call Failed</p>
        )}
      </div>

      {/* Speech error warning (non-blocking, only during active call) */}
      {speechError && status === "active" && (
        <div className="mt-2 px-4 shrink-0 transition-all duration-300">
          <p className="text-amber-400 text-xs text-center">{speechError}</p>
        </div>
      )}

      {/* Error banner */}
      {status === "error" && error && (
        <div className="mx-4 mt-3 bg-red-500/20 border border-red-500/50 rounded-lg p-2 shrink-0 transition-all duration-300">
          <p className="text-red-200 text-xs text-center">{error}</p>
        </div>
      )}

      {/* Browser not supported warning */}
      {!isSpeechSupported && status === "idle" && (
        <div className="mx-4 mt-3 bg-amber-500/20 border border-amber-500/50 rounded-lg p-2 shrink-0">
          <p className="text-amber-200 text-xs text-center">
            Speech recognition not supported. Use Chrome or Edge for voice features.
          </p>
        </div>
      )}

      {/* Spacer to push controls to bottom */}
      <div className="flex-grow min-h-4" />

      {/* Call controls bar — safe bottom area */}
      <div className="w-full px-4 pb-6 shrink-0 transition-all duration-300">
        <IPhoneCallControls
          status={status}
          isMuted={isMuted}
          onStart={onStart}
          onEnd={onEnd}
          onReset={onReset}
          onToggleMute={onToggleMute}
        />
      </div>
    </div>
  );
}
