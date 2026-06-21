"use client";

import { useCallback, useRef, useState } from "react";
import type { TranscriptMessage, WsMessage } from "@/types";

interface RealtimeTranscriptReturn {
  transcript: TranscriptMessage[];
  isStreaming: boolean;
  currentStreamText: string;
  addCompleteMessage: (message: TranscriptMessage) => void;
  appendDelta: (speaker: "ai", text: string) => void;
  finalizeStreaming: () => void;
  handleWsMessage: (message: WsMessage) => void;
  clearTranscript: () => void;
  getHistory: () => TranscriptMessage[];
}

export function useRealtimeTranscript(): RealtimeTranscriptReturn {
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamText, setCurrentStreamText] = useState("");
  const historyRef = useRef<TranscriptMessage[]>([]);

  /**
   * Add a complete message (caller transcription or finalized AI message).
   */
  const addCompleteMessage = useCallback((message: TranscriptMessage) => {
    const finalMsg: TranscriptMessage = { ...message, isStreaming: false };
    setTranscript((prev) => {
      // If the last message is a streaming AI message, replace it with the final version
      const last = prev[prev.length - 1];
      if (last?.isStreaming && last.speaker === "ai" && message.speaker === "ai") {
        const updated = [...prev.slice(0, -1), finalMsg];
        historyRef.current = updated;
        return updated;
      }
      const updated = [...prev, finalMsg];
      historyRef.current = updated;
      return updated;
    });
    setIsStreaming(false);
    setCurrentStreamText("");
  }, []);

  /**
   * Append a text delta to the current streaming AI message.
   * Creates a new streaming message if none exists.
   */
  const appendDelta = useCallback((speaker: "ai", text: string) => {
    setIsStreaming(true);
    setCurrentStreamText((prev) => prev + text);

    setTranscript((prev) => {
      const last = prev[prev.length - 1];

      if (last && last.speaker === "ai" && last.isStreaming) {
        // Append to existing streaming message
        const updated: TranscriptMessage = {
          ...last,
          text: last.text + text,
        };
        return [...prev.slice(0, -1), updated];
      }

      // Create new streaming message
      const newMsg: TranscriptMessage = {
        id: `msg_stream_${Date.now()}`,
        speaker,
        text,
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };
      return [...prev, newMsg];
    });
  }, []);

  /**
   * Finalize the current streaming message (mark isStreaming=false).
   * Called when response.done is received from OpenAI.
   */
  const finalizeStreaming = useCallback(() => {
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last?.isStreaming) {
        const finalized: TranscriptMessage = { ...last, isStreaming: false };
        const updated = [...prev.slice(0, -1), finalized];
        historyRef.current = updated;
        return updated;
      }
      return prev;
    });
    setIsStreaming(false);
    setCurrentStreamText("");
  }, []);

  /**
   * Process a WebSocket message and update transcript state accordingly.
   */
  const handleWsMessage = useCallback(
    (message: WsMessage) => {
      switch (message.type) {
        case "transcript_delta": {
          const data = message.data as { speaker: "ai"; text: string };
          appendDelta("ai", data.text);
          break;
        }

        case "transcript_complete": {
          const data = message.data as {
            id?: string;
            speaker: "ai" | "caller";
            text: string;
            timestamp?: string;
          };
          const completeMsg: TranscriptMessage = {
            id: data.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            speaker: data.speaker,
            text: data.text,
            timestamp: data.timestamp || message.timestamp || new Date().toISOString(),
            isStreaming: false,
          };
          addCompleteMessage(completeMsg);
          break;
        }

        default:
          // Not a transcript message — ignore
          break;
      }
    },
    [appendDelta, addCompleteMessage]
  );

  /**
   * Clear all transcript state for a new call.
   */
  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setIsStreaming(false);
    setCurrentStreamText("");
  }, []);

  /**
   * Get the full transcript history (for post-call review).
   */
  const getHistory = useCallback((): TranscriptMessage[] => {
    return historyRef.current;
  }, []);

  return {
    transcript,
    isStreaming,
    currentStreamText,
    addCompleteMessage,
    appendDelta,
    finalizeStreaming,
    handleWsMessage,
    clearTranscript,
    getHistory,
  };
}
