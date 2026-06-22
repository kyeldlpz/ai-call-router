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

export function useSpeechRecognition({
  onResult,
  onInterim,
  language = "en-US",
}: UseSpeechRecognitionOptions): SpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  // Default to true to match server render and avoid hydration mismatch.
  // Updated to actual value in useEffect (client-only).
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);
  const shouldRestartRef = useRef(false);

  onResultRef.current = onResult;
  onInterimRef.current = onInterim;

  // Detect browser support after hydration (client-only)
  useEffect(() => {
    const supported =
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    setIsSupported(supported);
  }, []);

  const startListening = useCallback(() => {
    // Runtime check in case called before useEffect updates state
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

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
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
      // "no-speech" and "aborted" are non-fatal — just restart
      if (event.error === "no-speech" || event.error === "aborted") {
        return;
      }
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
      shouldRestartRef.current = false;
    };

    recognition.onend = () => {
      // Auto-restart if we're still supposed to be listening
      if (shouldRestartRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started or other issue — ignore
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
    } catch {
      setError("Failed to start speech recognition.");
    }
  }, [language]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
  };
}
