"use client";

import { ContactAvatar } from "./contact-avatar";
import { CallingAnimation } from "./calling-animation";
import { IPhoneCallControls } from "./iphone-call-controls";
import type { CallStatus } from "@/types";
import { cn } from "@/lib/utils";

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
  const isInCallLayout = isActive || isConnecting;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-gradient-to-b from-[#0a0e17] via-black to-black transition-all duration-300">
      <div className={cn("shrink-0", isInCallLayout ? "pt-12" : "pt-14")} />

      <div
        className={cn(
          "flex min-h-0 flex-col items-center px-4",
          isInCallLayout
            ? "flex-1 justify-center gap-3 py-2"
            : "mt-4 shrink-0"
        )}
      >
        <div className="relative flex shrink-0 items-center justify-center">
          <ContactAvatar
            isActive={isActive}
            isConnecting={isConnecting}
            compact={isInCallLayout}
          />
          <CallingAnimation isActive={isConnecting} />
        </div>

        <h2 className="shrink-0 text-lg font-medium text-white transition-all duration-300">
          RecoverAi
        </h2>

        <div className="flex min-h-[2.25rem] shrink-0 flex-col items-center transition-all duration-300">
          {status === "idle" && (
            <p className="text-sm text-white/70">Ready to call</p>
          )}

          {status === "connecting" && (
            <p className="text-sm text-white/70">Calling...</p>
          )}

          {status === "active" && (
            <>
              <p className="font-mono text-xl tabular-nums text-white">
                {formatDuration(duration)}
              </p>
              <p className="mt-0.5 text-sm text-primary/90">
                {isSpeaking ? "Speaking…" : "Listening…"}
              </p>
            </>
          )}

          {status === "ending" && (
            <>
              <p className="font-mono text-xl tabular-nums text-white">
                {formatDuration(duration)}
              </p>
              <p className="mt-0.5 text-sm text-white/70">Ending…</p>
            </>
          )}

          {status === "complete" && (
            <>
              <p className="text-sm text-white/70">Call Ended</p>
              <p className="mt-1 font-mono text-lg tabular-nums text-white">
                {formatDuration(duration)}
              </p>
            </>
          )}

          {status === "error" && (
            <p className="text-sm text-white/70">Call Failed</p>
          )}
        </div>

        {speechError && status === "active" && (
          <p className="max-w-[220px] shrink-0 text-center text-xs text-primary">
            {speechError}
          </p>
        )}

        {status === "error" && error && (
          <div className="w-full max-w-[240px] shrink-0 rounded-lg border border-red-500/50 bg-red-500/20 p-2">
            <p className="text-center text-xs text-red-200">{error}</p>
          </div>
        )}

        {!isSpeechSupported && status === "idle" && (
          <div className="w-full max-w-[240px] shrink-0 rounded-lg border border-primary/30 bg-primary/10 p-2">
            <p className="text-center text-xs text-primary/90">
              Speech recognition not supported. Use Chrome or Edge for voice
              features.
            </p>
          </div>
        )}
      </div>

      {!isInCallLayout && <div className="min-h-4 flex-grow" />}

      <div
        className={cn(
          "w-full shrink-0 px-3 transition-all duration-300",
          isInCallLayout ? "pb-5 pt-2" : "pb-6"
        )}
      >
        <IPhoneCallControls
          status={status}
          isMuted={isMuted}
          onStart={onStart}
          onEnd={onEnd}
          onReset={onReset}
          onToggleMute={onToggleMute}
        />
        {isInCallLayout && (
          <div
            className="mx-auto mt-4 h-1 w-[34%] min-w-[96px] max-w-[120px] rounded-full bg-white/25"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
