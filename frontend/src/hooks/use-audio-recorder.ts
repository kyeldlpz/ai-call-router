"use client";

import { useCallback, useRef, useState } from "react";

const SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096;

interface UseAudioRecorderOptions {
  onAudioChunk: (base64Pcm: string) => void;
}

interface AudioRecorderReturn {
  isRecording: boolean;
  isPermissionGranted: boolean;
  permissionError: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

/**
 * Converts Float32 audio samples to base64-encoded PCM16.
 */
function float32ToPcm16Base64(float32Array: Float32Array): string {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < float32Array.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function useAudioRecorder({ onAudioChunk }: UseAudioRecorderOptions): AudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const onAudioChunkRef = useRef(onAudioChunk);
  onAudioChunkRef.current = onAudioChunk;

  const startRecording = useCallback(async () => {
    setPermissionError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      setIsPermissionGranted(true);

      // Create AudioContext at the correct sample rate
      const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      // Use ScriptProcessorNode for broad browser compatibility
      // AudioWorklet would be preferred but requires a separate file and HTTPS in some browsers
      const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event: AudioProcessingEvent) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const base64 = float32ToPcm16Base64(inputData);
        onAudioChunkRef.current(base64);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone access denied. Please allow microphone permission and try again."
          : "Failed to access microphone. Please check your audio settings.";

      setPermissionError(message);
      setIsPermissionGranted(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    // Disconnect and close processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop all media tracks (releases microphone)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  }, []);

  return {
    isRecording,
    isPermissionGranted,
    permissionError,
    startRecording,
    stopRecording,
  };
}
