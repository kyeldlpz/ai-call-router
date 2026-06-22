"use client";

import { IPhoneFrame } from "./iphone-frame";
import { IPhoneCallScreen } from "./iphone-call-screen";
import type { CallStatus } from "@/types";

interface CallPanelProps {
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

export function CallPanel({
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
}: CallPanelProps) {
  return (
    <IPhoneFrame>
      <IPhoneCallScreen
        status={status}
        duration={duration}
        error={error}
        speechError={speechError}
        isMuted={isMuted}
        isSpeaking={isSpeaking}
        isSpeechSupported={isSpeechSupported}
        onStart={onStart}
        onEnd={onEnd}
        onReset={onReset}
        onToggleMute={onToggleMute}
      />
    </IPhoneFrame>
  );
}
