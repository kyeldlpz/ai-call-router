"use client";

import { useCallback, useRef } from "react";

const SAMPLE_RATE = 24000;

interface AudioPlaybackReturn {
  playChunk: (base64Pcm: string) => void;
  stop: () => void;
  initContext: () => void;
}

/**
 * Decodes base64 PCM16 to Float32 audio samples.
 */
function pcm16Base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const view = new DataView(bytes.buffer);
  const float32 = new Float32Array(bytes.length / 2);

  for (let i = 0; i < float32.length; i++) {
    const int16 = view.getInt16(i * 2, true);
    float32[i] = int16 / (int16 < 0 ? 0x8000 : 0x7fff);
  }

  return float32;
}

export function useAudioPlayback(): AudioPlaybackReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);

  /**
   * Must be called from a user gesture (button click) to satisfy
   * browser autoplay policy.
   */
  const initContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      nextStartTimeRef.current = 0;
    }
  }, []);

  const playChunk = useCallback((base64Pcm: string) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const float32 = pcm16Base64ToFloat32(base64Pcm);
    const buffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
    buffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    // Schedule seamlessly after previous chunk
    const now = ctx.currentTime;
    const startTime = Math.max(now, nextStartTimeRef.current);
    source.start(startTime);
    nextStartTimeRef.current = startTime + buffer.duration;
  }, []);

  const stop = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      nextStartTimeRef.current = 0;
    }
  }, []);

  return { playChunk, stop, initContext };
}
