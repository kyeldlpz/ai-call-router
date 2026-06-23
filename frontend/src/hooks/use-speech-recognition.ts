"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseSpeechRecognitionOptions {
  onResult: (text: string) => void;
  onInterim?: (text: string) => void;
  language?: string;
}

interface SpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
}

// Type declarations for the Web Speech API
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

const RETRYABLE_ERRORS = new Set(["network", "audio-capture", "aborted"]);

export function useSpeechRecognition({
  onResult,
  onInterim,
  language = "en-US",
}: UseSpeechRecognitionOptions): SpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);
  const shouldRestartRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  onResultRef.current = onResult;
  onInterimRef.current = onInterim;

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const stopRecognitionInstance = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
      }
      recognitionRef.current = null;
    }
  }, []);

  const scheduleRestart = useCallback(
    (delayMs = 250) => {
      if (!shouldRestartRef.current) return;
      clearRestartTimer();
      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        if (!shouldRestartRef.current) return;

        stopRecognitionInstance();

        const SpeechRecognitionCtor =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionCtor) return;

        const recognition = new SpeechRecognitionCtor();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language;

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = "";
          let interimTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }

          if (finalTranscript.trim()) {
            onResultRef.current(finalTranscript.trim());
          }

          if (interimTranscript.trim() && onInterimRef.current) {
            onInterimRef.current(interimTranscript.trim());
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          if (event.error === "no-speech") {
            return;
          }

          if (RETRYABLE_ERRORS.has(event.error)) {
            setError(`Speech recognition error: ${event.error}`);
            scheduleRestart(event.error === "network" ? 1000 : 300);
            return;
          }

          setError(`Speech recognition error: ${event.error}`);
          shouldRestartRef.current = false;
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          if (shouldRestartRef.current) {
            scheduleRestart();
          }
        };

        try {
          recognition.start();
        } catch {
          setError("Failed to start speech recognition.");
          scheduleRestart(500);
        }
      }, delayMs);
    },
    [clearRestartTimer, language, stopRecognitionInstance]
  );

  useEffect(() => {
    const supported =
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    setIsSupported(supported);

    return () => {
      shouldRestartRef.current = false;
      clearRestartTimer();
      stopRecognitionInstance();
    };
  }, [clearRestartTimer, stopRecognitionInstance]);

  const startListening = useCallback(() => {
    const supported =
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

    if (!supported) {
      setIsSupported(false);
      setError("Speech recognition is not supported in this browser. Use Chrome or Edge.");
      return;
    }

    setError(null);
    shouldRestartRef.current = true;
    clearRestartTimer();
    stopRecognitionInstance();
    scheduleRestart(0);
  }, [clearRestartTimer, scheduleRestart, stopRecognitionInstance]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    clearRestartTimer();
    stopRecognitionInstance();
    setIsListening(false);
  }, [clearRestartTimer, stopRecognitionInstance]);

  return {
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
  };
}
