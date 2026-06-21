"use client";

import { cn } from "@/lib/utils";
import type { TranscriptMessage as TMessage } from "@/types";

interface TranscriptMessageProps {
  message: TMessage;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function TranscriptMessage({ message }: TranscriptMessageProps) {
  const isAi = message.speaker === "ai";

  return (
    <div className={cn("flex flex-col gap-1 px-4 py-3 rounded-lg", isAi ? "bg-muted" : "bg-primary/5")}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <span>{isAi ? "🤖" : "👤"}</span>
          <span>{isAi ? "AI Agent" : "Caller"}</span>
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatTime(message.timestamp)}
        </span>
      </div>
      <p className="text-sm leading-relaxed">
        {message.text}
        {message.isStreaming && (
          <span className="inline-block w-1.5 h-4 ml-0.5 bg-foreground/70 animate-pulse rounded-sm" />
        )}
      </p>
    </div>
  );
}
