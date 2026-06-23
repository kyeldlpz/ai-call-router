"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TranscriptMessage } from "./transcript-message";
import type { TranscriptMessage as TMessage } from "@/types";

interface TranscriptPanelProps {
  messages: TMessage[];
  isActive: boolean;
}

export function TranscriptPanel({ messages, isActive }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.text]);

  return (
    <Card className="h-full flex flex-col panel-surface panel-rail-blue border-0 ring-0">
      <CardHeader className="pb-4 border-b border-border">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="label-caps mb-1">Live feed</p>
            <CardTitle className="text-lg font-semibold tracking-tight uppercase">
              Transcript
            </CardTitle>
          </div>
          {isActive && (
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-primary border border-primary/40 px-2 py-0.5 rounded">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(0,210,255,0.8)]" />
              Live
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pt-5 overflow-hidden">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 px-6">
            <p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed">
              Transcript entries appear here once a session begins.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-2 pr-4">
              {messages.map((msg) => (
                <TranscriptMessage key={msg.id} message={msg} />
              ))}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
