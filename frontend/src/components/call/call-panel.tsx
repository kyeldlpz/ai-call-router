"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CallStatusBadge } from "./call-status-badge";
import { CallControls } from "./call-controls";
import type { CallStatus } from "@/types";

interface CallPanelProps {
  status: CallStatus;
  duration: number;
  error: string | null;
  isMuted: boolean;
  isSpeaking: boolean;
  onStart: () => void;
  onEnd: () => void;
  onReset: () => void;
  onToggleMute: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function CallPanel({
  status,
  duration,
  error,
  isMuted,
  isSpeaking,
  onStart,
  onEnd,
  onReset,
  onToggleMute,
}: CallPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Conversation</CardTitle>
          <CallStatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        {/* Duration */}
        <div className="text-center">
          <p className="text-3xl font-mono font-light tabular-nums">
            {formatDuration(duration)}
          </p>
          {status === "active" && isSpeaking && (
            <p className="text-xs text-muted-foreground mt-1 animate-pulse">
              Listening...
            </p>
          )}
          {status === "active" && !isSpeaking && (
            <p className="text-xs text-muted-foreground mt-1">
              AI responding...
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="w-full max-w-[200px]">
          <CallControls
            status={status}
            onStart={onStart}
            onEnd={onEnd}
            onReset={onReset}
            isMuted={isMuted}
            onToggleMute={onToggleMute}
          />
        </div>

        {/* Error display */}
        {error && (
          <div className="w-full rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
