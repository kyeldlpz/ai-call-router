"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeConnection } from "./use-realtime-connection";
import { useSpeechRecognition } from "./use-speech-recognition";
import { useSpeechSynthesis } from "./use-speech-synthesis";
import { useElevenLabsTTS } from "./use-elevenlabs-tts";
import { useElevenLabsSTT } from "./use-elevenlabs-stt";
import { useCallContext } from "@/context/call-context";
import type { CallStatus, TranscriptMessage, WsMessage, TTSProvider, STTProvider } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

interface VoiceConversationReturn {
  status: CallStatus;
  transcript: TranscriptMessage[];
  duration: number;
  error: string | null;
  speechError: string | null;
  isSpeaking: boolean;
  interimText: string;
  isProcessing: boolean;
  startCall: () => Promise<void>;
  endCall: () => void;
  resetCall: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  isConnected: boolean;
  connectionState: string;
  isSpeechSupported: boolean;
  ttsProvider: TTSProvider;
  sttProvider: STTProvider;
  setTtsProvider: (p: TTSProvider) => void;
  setSttProvider: (p: STTProvider) => void;
  elevenlabsVoiceId: string;
  setElevenlabsVoiceId: (id: string) => void;
}

export function useVoiceConversation(): VoiceConversationReturn {
  const { state, dispatch } = useCallContext();
  const [isMuted, setIsMuted] = useState(false);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [interimText, setInterimText] = useState("");
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>("browser");
  const [sttProvider, setSttProvider] = useState<STTProvider>("browser");
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState("onwK4e9ZLuTAKqWW03F9");
  const [isProcessing, setIsProcessing] = useState(false);

  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMutedRef = useRef(isMuted);
  const ttsProviderRef = useRef(ttsProvider);
  isMutedRef.current = isMuted;
  ttsProviderRef.current = ttsProvider;

  // --- TTS providers ---
  const browserTTS = useSpeechSynthesis();
  const elevenLabsTTS = useElevenLabsTTS(elevenlabsVoiceId);

  // Use a ref-based speak function so handleWsMessage doesn't re-create on provider change
  const speakRef = useRef<(text: string) => void>((text: string) => {
    if (ttsProviderRef.current === "elevenlabs") {
      elevenLabsTTS.speak(text);
    } else {
      browserTTS.speak(text);
    }
  });
  speakRef.current = (text: string) => {
    if (ttsProviderRef.current === "elevenlabs") {
      elevenLabsTTS.speak(text);
    } else {
      browserTTS.speak(text);
    }
  };

  const cancelAllTTS = useCallback(() => {
    browserTTS.cancel();
    elevenLabsTTS.cancel();
  }, [browserTTS, elevenLabsTTS]);

  const isSpeaking = ttsProvider === "elevenlabs" ? elevenLabsTTS.isSpeaking : browserTTS.isSpeaking;
  const isSpeakingRef = useRef(isSpeaking);
  isSpeakingRef.current = isSpeaking;

  // --- Handle incoming WebSocket messages ---
  const handleWsMessage = useCallback(
    (message: WsMessage) => {
      switch (message.type) {
        case "call_status": {
          const data = message.data as { status: string };
          if (data.status === "active") {
            dispatch({ type: "CALL_CONNECTED" });
          }
          break;
        }

        case "transcript_complete": {
          const data = message.data as { speaker: "ai" | "caller"; text: string };
          const msg: TranscriptMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            speaker: data.speaker,
            text: data.text,
            timestamp: new Date().toISOString(),
            isStreaming: false,
          };
          dispatch({ type: "TRANSCRIPT_ADD", message: msg });

          if (data.speaker === "ai") {
            setIsProcessing(false);
            speakRef.current(data.text);
          }
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

  // --- WebSocket ---
  const { isConnected, connectionState, send, disconnect } = useRealtimeConnection({
    url: wsUrl,
    onMessage: handleWsMessage,
  });

  // --- STT: speech result handlers ---
  const handleSpeechResult = useCallback(
    (text: string) => {
      if (isMutedRef.current) return;
      // Suppress echo — ignore mic input while AI is speaking through speakers
      if (isSpeakingRef.current) return;
      setInterimText("");
      setIsProcessing(true);
      send({ type: "text_input", data: { text } });
    },
    [send]
  );

  const handleInterimResult = useCallback((text: string) => {
    if (isMutedRef.current) return;
    // Suppress echo — ignore interim results while AI is speaking
    if (isSpeakingRef.current) return;
    setInterimText(text);
  }, []);

  // --- STT providers ---
  const browserSTT = useSpeechRecognition({
    onResult: handleSpeechResult,
    onInterim: handleInterimResult,
  });

  const elevenLabsSTT = useElevenLabsSTT({
    onResult: handleSpeechResult,
    onInterim: handleInterimResult,
    language: "tl",
  });

  const activeSTT = sttProvider === "elevenlabs" ? elevenLabsSTT : browserSTT;
  const speechError = activeSTT.error;
  const isSpeechSupported = activeSTT.isSupported;

  // --- Duration timer ---
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

  // Surface speech recognition errors (non-fatal for mic permission)
  useEffect(() => {
    if (speechError) {
      if (speechError.includes("not-allowed")) return;
      dispatch({ type: "CALL_ERROR", error: speechError });
    }
  }, [speechError, dispatch]);

  // Reset processing state on connection failure or disconnection
  useEffect(() => {
    if (
      isProcessing &&
      (connectionState === "failed" || connectionState === "disconnected")
    ) {
      setIsProcessing(false);
    }
  }, [connectionState, isProcessing]);

  // --- Actions ---
  const startCall = useCallback(async () => {
    dispatch({ type: "CALL_INIT", callId: "" });

    try {
      // Request mic permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        // Continue without mic
      }

      // Create call via REST
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

      // Start STT
      activeSTT.startListening();

      // Connect WebSocket
      setWsUrl(`${WS_BASE}/ws/v1/call/${callId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start call";
      dispatch({ type: "CALL_ERROR", error: message });
    }
  }, [dispatch, activeSTT]);

  const endCall = useCallback(() => {
    dispatch({ type: "CALL_ENDING" });
    send({ type: "call_end", data: {} });
    activeSTT.stopListening();
    cancelAllTTS();
    setWsUrl(null);
    disconnect();
    dispatch({ type: "CALL_COMPLETE" });
    setInterimText("");
  }, [dispatch, send, activeSTT, cancelAllTTS, disconnect]);

  const resetCall = useCallback(() => {
    activeSTT.stopListening();
    cancelAllTTS();
    setWsUrl(null);
    disconnect();
    setIsMuted(false);
    setInterimText("");
    dispatch({ type: "CALL_RESET" });
  }, [dispatch, activeSTT, cancelAllTTS, disconnect]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  return {
    status: state.status,
    transcript: state.transcript,
    duration: state.duration,
    error: state.error,
    speechError,
    isSpeaking,
    interimText,
    isProcessing,
    startCall,
    endCall,
    resetCall,
    isMuted,
    toggleMute,
    isConnected,
    connectionState,
    isSpeechSupported,
    ttsProvider,
    sttProvider,
    setTtsProvider,
    setSttProvider,
    elevenlabsVoiceId,
    setElevenlabsVoiceId,
  };
}
