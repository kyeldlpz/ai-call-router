"use client";

import { Button } from "@/components/ui/button";
import type { CallStatus } from "@/types";

interface CallControlsProps {
  status: CallStatus;
  onStart: () => void;
  onEnd: () => void;
  onReset: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export function CallControls({
  status,
  onStart,
  onEnd,
  onReset,
  isMuted,
  onToggleMute,
}: CallControlsProps) {
  if (status === "idle") {
    return (
      <Button
        onClick={onStart}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
        size="lg"
      >
        🎙️ Start Call
      </Button>
    );
  }

  if (status === "connecting") {
    return (
      <Button disabled className="w-full" size="lg">
        Connecting...
      </Button>
    );
  }

  if (status === "active") {
    return (
      <div className="flex flex-col gap-2 w-full">
        <Button
          onClick={onEnd}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
          size="lg"
        >
          End Call
        </Button>
        <Button
          onClick={onToggleMute}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {isMuted ? "🔇 Unmute" : "🎤 Mute"}
        </Button>
      </div>
    );
  }

  if (status === "complete" || status === "error") {
    return (
      <Button
        onClick={onReset}
        variant="outline"
        className="w-full"
        size="lg"
      >
        New Call
      </Button>
    );
  }

  return null;
}
