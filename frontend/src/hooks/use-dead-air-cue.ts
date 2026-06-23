import { useRef, useEffect, useState, useCallback } from "react";
import type { CallStatus } from "@/types";

// --- Configuration Constants ---
// Soft ambient chord frequencies (C major triad in low octave — warm & soothing)
export const CUE_FREQUENCIES_HZ = [261.63, 329.63, 392.0]; // C4, E4, G4
export const CUE_FREQUENCY_HZ = 261.63; // Primary frequency (for test compatibility)
export const CUE_GAIN = 0.06; // Very soft — barely perceptible ambient pad
export const CUE_FADE_OUT_MS = 300; // Slower fade-out for smoother transition
export const CUE_FADE_IN_MS = 400; // Gentle fade-in so it doesn't startle
export const CUE_START_DELAY_MS = 600; // Longer delay before starting (feels less abrupt)
export const CUE_LOOP_DURATION_MS = 4000; // Longer loop — more ambient, less repetitive
export const CUE_TIMEOUT_MS = 30_000;
export const CUE_STOP_ON_INTERIM_MS = 80;

// --- Interfaces ---
export interface UseDeadAirCueOptions {
  isProcessing: boolean;
  isSpeaking: boolean;
  interimText: string;
  callStatus: CallStatus;
  onTimeout?: () => void;
}

export interface UseDeadAirCueReturn {
  isPlayingCue: boolean;
  isSupported: boolean;
}

// --- Browser Support Check ---
const AudioContextClass: typeof AudioContext | undefined =
  typeof window !== "undefined"
    ? window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    : undefined;

const isSupported: boolean = !!AudioContextClass;

// --- Hook ---
export function useDeadAirCue(options: UseDeadAirCueOptions): UseDeadAirCueReturn {
  const { isProcessing, isSpeaking, interimText, callStatus, onTimeout } = options;

  const [isPlayingCue, setIsPlayingCue] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const oscillatorsArrayRef = useRef<OscillatorNode[]>([]);
  const startDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loopTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failedRef = useRef<boolean>(false);
  const onTimeoutRef = useRef(onTimeout);

  // Keep onTimeout ref current to avoid stale closures
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Determine if the call is in an active state where audio cue could play
  const isCallActive = callStatus === "active";

  // --- AudioContext creation and resume on processing state entry ---
  useEffect(() => {
    if (!isSupported || failedRef.current) return;
    if (!isProcessing || !isCallActive) return;

    // Create AudioContext lazily on first processing state entry
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContextClass!();
        const gainNode = audioContextRef.current.createGain();
        gainNode.gain.value = CUE_GAIN;
        gainNode.connect(audioContextRef.current.destination);
        gainNodeRef.current = gainNode;
      } catch {
        failedRef.current = true;
        return;
      }
    }

    // Resume AudioContext if suspended (autoplay policy)
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(() => {
        // If resume fails, skip cue for the session
        failedRef.current = true;
      });
    }
  }, [isProcessing, isCallActive]);

  // --- Tone playback helpers ---

  /** Create and start multiple soft oscillators as an ambient chord */
  const createAndStartOscillator = useCallback((): OscillatorNode | null => {
    const ctx = audioContextRef.current;
    const gainNode = gainNodeRef.current;
    if (!ctx || !gainNode || ctx.state === "closed") return null;

    try {
      // Create a sub-gain for fade-in
      const now = ctx.currentTime;

      // Create multiple oscillators for a warm ambient chord
      const oscillators: OscillatorNode[] = [];
      CUE_FREQUENCIES_HZ.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        // Alternate between triangle and sine for a softer timbre
        osc.type = i === 0 ? "triangle" : "sine";
        osc.frequency.value = freq;
        // Slight detune for warmth (chorus effect)
        osc.detune.value = (i - 1) * 3;
        osc.connect(gainNode);
        osc.start();
        oscillators.push(osc);
      });

      // Gentle fade-in
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(CUE_GAIN, now + CUE_FADE_IN_MS / 1000);

      // Return the first oscillator as the "primary" (used for stop tracking)
      // Store all oscillators in a ref for cleanup
      oscillatorsArrayRef.current = oscillators;
      return oscillators[0] ?? null;
    } catch {
      // Degrade to silence on failure
      return null;
    }
  }, []);

  /** Start playing the audio cue after CUE_START_DELAY_MS */
  const startCue = useCallback(() => {
    if (!isSupported || failedRef.current) return;
    if (!audioContextRef.current || !gainNodeRef.current) return;

    // Clear any existing timers to avoid duplicates
    if (startDelayTimerRef.current !== null) {
      clearTimeout(startDelayTimerRef.current);
    }
    if (loopTimerRef.current !== null) {
      clearInterval(loopTimerRef.current);
    }

    startDelayTimerRef.current = setTimeout(() => {
      startDelayTimerRef.current = null;

      // Ensure gain is at target level for new playback cycle
      try {
        const gainNode = gainNodeRef.current;
        if (gainNode) {
          gainNode.gain.cancelScheduledValues(0);
          gainNode.gain.value = CUE_GAIN;
        }
      } catch {
        // Ignore gain reset errors
      }

      const osc = createAndStartOscillator();
      if (!osc) return;

      oscillatorRef.current = osc;
      setIsPlayingCue(true);

      // Loop: stop current oscillators and start new ones every CUE_LOOP_DURATION_MS
      loopTimerRef.current = setInterval(() => {
        // Stop all current oscillators
        oscillatorsArrayRef.current.forEach((o) => {
          try {
            o.stop();
            o.disconnect();
          } catch {
            // Ignore stop errors on expired oscillator
          }
        });
        oscillatorsArrayRef.current = [];

        const newOsc = createAndStartOscillator();
        oscillatorRef.current = newOsc;

        if (!newOsc) {
          // If oscillator creation fails, stop looping
          if (loopTimerRef.current !== null) {
            clearInterval(loopTimerRef.current);
            loopTimerRef.current = null;
          }
          setIsPlayingCue(false);
        }
      }, CUE_LOOP_DURATION_MS);
    }, CUE_START_DELAY_MS);
  }, [createAndStartOscillator]);

  /** Stop the audio cue with a fade-out */
  const stopCue = useCallback(() => {
    // Clear pending start delay
    if (startDelayTimerRef.current !== null) {
      clearTimeout(startDelayTimerRef.current);
      startDelayTimerRef.current = null;
    }

    // Clear loop interval
    if (loopTimerRef.current !== null) {
      clearInterval(loopTimerRef.current);
      loopTimerRef.current = null;
    }

    // Fade out and stop all oscillators
    const ctx = audioContextRef.current;
    const gainNode = gainNodeRef.current;
    const oscillators = oscillatorsArrayRef.current;

    if (oscillators.length > 0 && ctx && gainNode && ctx.state !== "closed") {
      try {
        const now = ctx.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0, now + CUE_FADE_OUT_MS / 1000);

        // Stop all oscillators after fade-out completes
        setTimeout(() => {
          oscillators.forEach((osc) => {
            try {
              osc.stop();
              osc.disconnect();
            } catch {
              // Ignore stop errors on already-stopped oscillator
            }
          });
          oscillatorsArrayRef.current = [];
          oscillatorRef.current = null;

          // Reset gain for next cycle
          try {
            if (gainNodeRef.current && audioContextRef.current && audioContextRef.current.state !== "closed") {
              gainNodeRef.current.gain.cancelScheduledValues(0);
              gainNodeRef.current.gain.value = CUE_GAIN;
            }
          } catch {
            // Ignore gain reset errors
          }
        }, CUE_FADE_OUT_MS);
      } catch {
        // If fade-out fails, force-stop immediately
        oscillators.forEach((osc) => {
          try {
            osc.stop();
            osc.disconnect();
          } catch {
            // Ignore
          }
        });
        oscillatorsArrayRef.current = [];
        oscillatorRef.current = null;
      }
    } else {
      oscillatorsArrayRef.current = [];
      oscillatorRef.current = null;
    }

    setIsPlayingCue(false);
  }, []);

  // --- Play/stop effect based on signal conditions ---
  useEffect(() => {
    const shouldPlay = isProcessing && isCallActive && !isSpeaking && interimText === "";

    if (shouldPlay && !isPlayingCue) {
      startCue();
    } else if (!shouldPlay && isPlayingCue) {
      stopCue();
    }
  }, [isProcessing, isCallActive, isSpeaking, interimText, isPlayingCue, startCue, stopCue]);

  // --- 30-second timeout watchdog ---
  useEffect(() => {
    if (isProcessing) {
      timeoutTimerRef.current = setTimeout(() => {
        timeoutTimerRef.current = null;
        stopCue();
        onTimeoutRef.current?.();
      }, CUE_TIMEOUT_MS);
    } else {
      if (timeoutTimerRef.current !== null) {
        clearTimeout(timeoutTimerRef.current);
        timeoutTimerRef.current = null;
      }
    }

    return () => {
      if (timeoutTimerRef.current !== null) {
        clearTimeout(timeoutTimerRef.current);
        timeoutTimerRef.current = null;
      }
    };
  }, [isProcessing, stopCue]);

  // --- Close AudioContext on call end ---
  useEffect(() => {
    if (callStatus === "ending" || callStatus === "complete" || callStatus === "idle") {
      // Stop any playing cue first
      stopCue();

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {
          // Ignore close errors — resource cleanup is best-effort
        });
        audioContextRef.current = null;
        gainNodeRef.current = null;
      }
    }
  }, [callStatus, stopCue]);

  // --- Clean up on unmount ---
  useEffect(() => {
    return () => {
      // Clear timers
      if (startDelayTimerRef.current !== null) {
        clearTimeout(startDelayTimerRef.current);
      }
      if (loopTimerRef.current !== null) {
        clearInterval(loopTimerRef.current);
      }
      if (timeoutTimerRef.current !== null) {
        clearTimeout(timeoutTimerRef.current);
      }

      // Stop all oscillators
      oscillatorsArrayRef.current.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // Ignore
        }
      });
      oscillatorsArrayRef.current = [];

      // Close AudioContext
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {
          // Ignore close errors on unmount
        });
        audioContextRef.current = null;
        gainNodeRef.current = null;
      }
    };
  }, []);

  return {
    isPlayingCue,
    isSupported,
  };
}
