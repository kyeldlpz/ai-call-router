"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface UseElevenLabsSTTOptions {
  onResult: (text: string) => void;
  onInterim?: (text: string) => void;
  language?: string;
}

interface UseElevenLabsSTTReturn {
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
}

export function useElevenLabsSTT({
  onResult,
  onInterim,
  language = "tl",
}: UseElevenLabsSTTOptions): UseElevenLabsSTTReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);
  const shouldRunRef = useRef(false);

  onResultRef.current = onResult;
  onInterimRef.current = onInterim;

  // Check if AudioContext is available
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasAudioContext = "AudioContext" in window || "webkitAudioContext" in window;
    setIsSupported(hasAudioContext);
  }, []);

  const stopListening = useCallback(() => {
    shouldRunRef.current = false;

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError("AudioContext not supported in this browser.");
      return;
    }

    setError(null);
    shouldRunRef.current = true;

    try {
      // 1. Get token from backend
      const tokenRes = await fetch(`${API_BASE}/api/v1/elevenlabs/stt-token`);
      const tokenData = await tokenRes.json();
      if (!tokenData.success) {
        setError("Failed to get ElevenLabs STT token");
        return;
      }
      const { token, ws_url } = tokenData.data;

      // 2. Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 3. Connect WebSocket to ElevenLabs Scribe
      const langParam = language === "tl" ? "fil" : language;
      const wsUrl = `${ws_url}?model_id=scribe_v2&language_code=${langParam}&commit_strategy=vad&vad_silence_threshold_secs=1.0`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send auth via first message header approach — ElevenLabs uses query param or header
        // Since we can't set headers on browser WS, we'll use the xi-api-key approach
        // Actually, ElevenLabs realtime STT accepts token as query param
        setIsListening(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.message_type === "partial_transcript" && msg.text) {
            if (onInterimRef.current) {
              onInterimRef.current(msg.text);
            }
          } else if (
            msg.message_type === "committed_transcript" ||
            msg.message_type === "committed_transcript_with_timestamps"
          ) {
            if (msg.text && msg.text.trim()) {
              onResultRef.current(msg.text.trim());
            }
          } else if (msg.message_type === "auth_error" || msg.message_type === "error") {
            setError(`ElevenLabs STT: ${msg.error}`);
            stopListening();
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        setError("ElevenLabs STT WebSocket error");
        stopListening();
      };

      ws.onclose = () => {
        if (shouldRunRef.current) {
          setIsListening(false);
        }
      };

      // 4. Set up audio capture and stream to WebSocket
      // Wait for WS to open before sending audio
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("WS connect timeout")), 10000);
        ws.addEventListener("open", () => {
          clearTimeout(timeout);
          resolve();
        });
        ws.addEventListener("error", () => {
          clearTimeout(timeout);
          reject(new Error("WS connection failed"));
        });
      });

      // Re-construct the URL with token auth since we can't set headers
      // Close current and reopen with token query param
      ws.close();

      const wsUrlWithAuth = `${ws_url}?model_id=scribe_v2&language_code=${langParam}&commit_strategy=vad&vad_silence_threshold_secs=1.0&token=${token}`;
      const ws2 = new WebSocket(wsUrlWithAuth);
      wsRef.current = ws2;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("WS connect timeout")), 10000);
        ws2.addEventListener("open", () => {
          clearTimeout(timeout);
          resolve();
        });
        ws2.addEventListener("error", () => {
          clearTimeout(timeout);
          reject(new Error("WS connection failed"));
        });
      });

      ws2.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.message_type === "partial_transcript" && msg.text) {
            if (onInterimRef.current) {
              onInterimRef.current(msg.text);
            }
          } else if (
            msg.message_type === "committed_transcript" ||
            msg.message_type === "committed_transcript_with_timestamps"
          ) {
            if (msg.text && msg.text.trim()) {
              onResultRef.current(msg.text.trim());
            }
          } else if (msg.message_type === "auth_error" || msg.message_type === "error") {
            setError(`ElevenLabs STT: ${msg.error}`);
            stopListening();
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws2.onerror = () => {
        setError("ElevenLabs STT WebSocket error");
        stopListening();
      };

      // 5. Capture audio and send as PCM16 base64
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws2.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert float32 to int16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert to base64
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        ws2.send(
          JSON.stringify({
            message_type: "input_audio_chunk",
            audio_base_64: base64,
            commit: false,
            sample_rate: 16000,
          })
        );
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      setIsListening(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start ElevenLabs STT";
      setError(msg);
      stopListening();
    }
  }, [isSupported, language, stopListening]);

  return {
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
  };
}
