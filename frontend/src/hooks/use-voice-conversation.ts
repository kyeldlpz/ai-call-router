"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeConnection } from "./use-realtime-connection";
import { useAudioRecorder } from "./use-audio-recorder";
import { useAudioPlayback } from "./use-audio-playback";
import { useCallContext } from "@/context/call-context";
import type { CallStatus, TranscriptMessage, WsMessage } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

interface VoiceConversationReturn {
  // State
  status: CallStatus;
  transcript: TranscriptMessage[];
  duration: number;
  error: string | null;
  isSpeaking: boolean;
  estimatedCost: number;

  // Actions
  startCall: () => Promise<void>;
  endCall: () => void;
  resetCall: () => void;

  // Audio controls
  isMuted: boolean;
  toggleMute: () => void;

  // Connection info
  isConnected: boolean;
  connectionState: string;
}

export function useVoiceConversation(): VoiceConversationReturn {
  const { state, dispatch } = useCallContext();
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [estimatedCost, setEstimatedCost] = useState(0);

  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef(0);
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  // Audio playback
  const { playChunk, stop: stopPlayback, initContext: initAudioContext } = useAudioPlayback();

  // Handle incoming WebSocket messages
  const handleWsMessage = useCallback(
    (message: WsMessage) => {
      switch (message.type) {
        case "call_status": {
          const data = message.data as { status: string };
          if (data.status === "active") {
            dispatch({ type: "CALL_CONNECTED" });
            setIsSpeaking(false);
          }
          break;
        }

        case "transcript_delta": {
          const data = message.data as { speaker: "ai"; text: string };
          dispatch({ type: "TRANSCRIPT_DELTA", speaker: "ai", text: data.text });
          setIsSpeaking(false);
          // Estimate cost: ~$0.06 per 1K output tokens, roughly 4 chars per token
          setEstimatedCost((prev) => prev + (data.text.length / 4) * 0.00006);
          break;
        }

        case "transcript_complete": {
          const data = message.data as {
            id?: string;
            speaker: "ai" | "caller";
            text: string;
            timestamp?: string;
          };
          const msg: TranscriptMessage = {
            id: data.id || `msg_${Date.now()}`,
            speaker: data.speaker,
            text: data.text,
            timestamp: data.timestamp || new Date().toISOString(),
            isStreaming: false,
          };
          dispatch({ type: "TRANSCRIPT_ADD", message: msg });
          if (data.speaker === "caller") {
            setIsSpeaking(false);
            // Estimate cost: ~$0.04 per 1K input tokens
            setEstimatedCost((prev) => prev + (data.text.length / 4) * 0.00004);
          }
          break;
        }

        case "response_done": {
          // Finalize the current streaming AI message
          dispatch({ type: "CALL_CONNECTED" }); // no-op if already active, just ensures state
          // Mark streaming message as done by dispatching a special delta with empty text won't work
          // Instead, set streaming to false on last message
          break;
        }

        case "error": {
          const data = message.data as { message: string };
          dispatch({ type: "CALL_ERROR", error: data.message });
          break;
        }

        default:
          break;
      }
    },
    [dispatch]
  );

  // Handle audio delta (routed separately for performance)
  const handleAudioDelta = useCallback(
    (base64Audio: string) => {
      playChunk(base64Audio);
      // Estimate audio output cost: ~$0.10 per minute of audio, roughly 24000 samples/sec
      audioChunksRef.current += 1;
      // Every 6 chunks ≈ 1 second of audio ≈ $0.0017
      if (audioChunksRef.current % 6 === 0) {
        setEstimatedCost((prev) => prev + 0.0017);
      }
    },
    [playChunk]
  );

  // WebSocket connection
  const { isConnected, connectionState, send, disconnect } = useRealtimeConnection({
    url: wsUrl,
    onMessage: handleWsMessage,
    onAudioDelta: handleAudioDelta,
  });

  // Audio recorder — sends chunks over WebSocket
  const handleAudioChunk = useCallback(
    (base64Pcm: string) => {
      if (!isMutedRef.current) {
        send({ type: "audio_input", data: { audio: base64Pcm } });
        setIsSpeaking(true);
      }
    },
    [send]
  );

  const { isRecording, permissionError, startRecording, stopRecording } = useAudioRecorder({
    onAudioChunk: handleAudioChunk,
  });

  // Duration timer
  useEffect(() => {
    if (state.status === "active") {
      durationIntervalRef.current = setInterval(() => {
        dispatch({ type: "DURATION_TICK" });
      }, 1000);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
  }, [state.status, dispatch]);

  // Surface permission errors to state
  useEffect(() => {
    if (permissionError) {
      dispatch({ type: "CALL_ERROR", error: permissionError });
    }
  }, [permissionError, dispatch]);

  // --- Actions ---

  const startCall = useCallback(async () => {
    dispatch({ type: "CALL_INIT", callId: "" });

    try {
      // 1. Create call via REST
      const response = await fetch(`${API_BASE}/api/v1/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: null }),
      });

      const result = await response.json();

      if (!result.success || !result.data) {
        dispatch({ type: "CALL_ERROR", error: result.error || "Failed to create call" });
        return;
      }

      const callId = result.data.callId || result.data.call_id;
      dispatch({ type: "CALL_INIT", callId });

      // 2. Initialize audio context (must be from user gesture)
      initAudioContext();

      // 3. Start microphone capture
      await startRecording();

      // 4. Connect WebSocket (triggers connection, which triggers OpenAI session on backend)
      setWsUrl(`${WS_BASE}/ws/v1/call/${callId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start call";
      dispatch({ type: "CALL_ERROR", error: message });
    }
  }, [dispatch, initAudioContext, startRecording]);

  const endCall = useCallback(() => {
    dispatch({ type: "CALL_ENDING" });

    // Signal backend to end
    send({ type: "call_end", data: {} });

    // Stop audio
    stopRecording();
    stopPlayback();

    // Disconnect WebSocket
    setWsUrl(null);
    disconnect();

    // Finalize state
    dispatch({ type: "CALL_COMPLETE" });
    setIsSpeaking(false);
  }, [dispatch, send, stopRecording, stopPlayback, disconnect]);

  const resetCall = useCallback(() => {
    stopRecording();
    stopPlayback();
    setWsUrl(null);
    disconnect();
    setIsMuted(false);
    setIsSpeaking(false);
    setEstimatedCost(0);
    audioChunksRef.current = 0;
    dispatch({ type: "CALL_RESET" });
  }, [dispatch, stopRecording, stopPlayback, disconnect]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  return {
    status: state.status,
    transcript: state.transcript,
    duration: state.duration,
    error: state.error,
    isSpeaking,
    estimatedCost,
    startCall,
    endCall,
    resetCall,
    isMuted,
    toggleMute,
    isConnected,
    connectionState,
  };
}
