"use client";

import { Bot, User } from "lucide-react";
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
        "flex flex-col gap-1 px-3 py-2.5 rounded border transition-colors duration-200",
        isAi
          ? "bg-muted/30 border-border panel-rail-purple"
          : "bg-muted border-border"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide flex items-center gap-1.5 text-muted-foreground">
          <span
            className={cn(
              "w-4 h-4 rounded flex items-center justify-center",
              isAi ? "text-brand-purple" : "text-muted-foreground"
            )}
          >
            {isAi ? (
              <Bot className="w-2.5 h-2.5" aria-hidden="true" />
            ) : (
              <User className="w-2.5 h-2.5" aria-hidden="true" />
            )}
          </span>
          {isAi ? "AI Agent" : "Caller"}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums font-mono">
          {formatTime(message.timestamp)}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90 pl-5">
        {message.text}
        {message.isStreaming && (
          <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-primary/80 rounded-sm" />
        )}
      </p>
    </div>
  );
}
