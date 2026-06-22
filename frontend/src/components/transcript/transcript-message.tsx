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
    <div
      className={cn(
        "flex flex-col gap-1.5 px-4 py-3 rounded-xl transition-colors",
        isAi
          ? "bg-muted/70 border border-border/30"
          : "bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30"
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-xs font-semibold flex items-center gap-1.5",
          isAi ? "text-muted-foreground" : "text-blue-700 dark:text-blue-400"
        )}>
          <span className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
            isAi ? "bg-gray-200 dark:bg-gray-700" : "bg-blue-100 dark:bg-blue-900/50"
          )}>
            {isAi ? "🤖" : "👤"}
          </span>
          <span>{isAi ? "AI Agent" : "Caller"}</span>
        </span>
        <span className="text-[10px] text-muted-foreground/60 tabular-nums font-mono">
          {formatTime(message.timestamp)}
        </span>
      </div>
      <p className="text-sm leading-relaxed pl-7">
        {message.text}
        {message.isStreaming && (
          <span className="inline-block w-1.5 h-4 ml-0.5 bg-foreground/70 animate-pulse rounded-sm" />
        )}
      </p>
    </div>
  );
}
