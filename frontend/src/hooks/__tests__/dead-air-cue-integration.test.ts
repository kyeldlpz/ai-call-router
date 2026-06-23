import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { UseDeadAirCueOptions } from "../use-dead-air-cue";

// --- Web Audio API Mocks ---
// Must be set BEFORE the hook module is imported (module-level capture).

interface MockGainParam {
  value: number;
  cancelScheduledValues: ReturnType<typeof vi.fn>;
  setValueAtTime: ReturnType<typeof vi.fn>;
  linearRampToValueAtTime: ReturnType<typeof vi.fn>;
}

interface MockGainNode {
  gain: MockGainParam;
  connect: ReturnType<typeof vi.fn>;
}

interface MockOscillator {
  type: OscillatorType;
  frequency: { value: number };
  detune: { value: number };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

interface MockAudioContext {
  state: AudioContextState;
  currentTime: number;
  destination: object;
  createOscillator: ReturnType<typeof vi.fn>;
  createGain: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

function createMockGainNode(): MockGainNode {
  return {
    gain: {
      value: 0,
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  };
}

function createMockOscillator(): MockOscillator {
  return {
    type: "sine",
    frequency: { value: 0 },
    detune: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
  };
}

let mockGainNode: MockGainNode;
let mockOscillators: MockOscillator[];
let mockCtx: MockAudioContext;

function setupMocks() {
  mockGainNode = createMockGainNode();
  mockOscillators = [];

  mockCtx = {
    state: "running",
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(() => {
      const osc = createMockOscillator();
      mockOscillators.push(osc);
      return osc;
    }),
    createGain: vi.fn(() => mockGainNode),
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  };

  (globalThis as Record<string, unknown>).mockAudioCtx = mockCtx;
}

const AudioContextStub = vi.fn(function (this: MockAudioContext) {
  const ctx = (globalThis as Record<string, unknown>).mockAudioCtx as MockAudioContext;
  Object.assign(this, ctx);
  return this;
});

vi.stubGlobal("AudioContext", AudioContextStub);

// Import hook after AudioContext is stubbed
const { useDeadAirCue, CUE_START_DELAY_MS } = await import("../use-dead-air-cue");

describe("Dead Air Cue Integration — Full Signal Flow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupMocks();
    AudioContextStub.mockImplementation(function (this: MockAudioContext) {
      const ctx = (globalThis as Record<string, unknown>).mockAudioCtx as MockAudioContext;
      Object.assign(this, ctx);
      return this;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  /**
   * Validates: Requirements 1.1, 2.5
   *
   * Simulates the orchestrator flow:
   *   text_input send → isProcessing=true → hook receives signal → cue starts
   */
  it("text_input send → isProcessing=true → hook starts cue after delay", () => {
    // Initial state: not processing (before text_input is sent)
    const initialProps: UseDeadAirCueOptions = {
      isProcessing: false,
      isSpeaking: false,
      interimText: "",
      callStatus: "active",
    };

    const { result, rerender } = renderHook(
      (props: UseDeadAirCueOptions) => useDeadAirCue(props),
      { initialProps }
    );

    // Cue should not be playing initially
    expect(result.current.isPlayingCue).toBe(false);

    // Simulate orchestrator setting isProcessing=true (text_input sent)
    rerender({
      ...initialProps,
      isProcessing: true,
    });

    // Before CUE_START_DELAY_MS: cue not yet audible
    expect(result.current.isPlayingCue).toBe(false);

    // Advance past the start delay
    act(() => {
      vi.advanceTimersByTime(CUE_START_DELAY_MS);
    });

    // Hook should now be playing the cue
    expect(result.current.isPlayingCue).toBe(true);
    // Oscillators were created and started (multiple for ambient chord)
    expect(mockOscillators.length).toBeGreaterThanOrEqual(1);
    expect(mockOscillators[0].start).toHaveBeenCalled();
  });

  /**
   * Validates: Requirements 1.2
   *
   * Simulates the orchestrator flow:
   *   transcript_complete ai → isProcessing=false → cue stops
   */
  it("transcript_complete ai → isProcessing=false → cue stops", () => {
    // Start with active processing state (cue will play)
    const processingProps: UseDeadAirCueOptions = {
      isProcessing: true,
      isSpeaking: false,
      interimText: "",
      callStatus: "active",
    };

    const { result, rerender } = renderHook(
      (props: UseDeadAirCueOptions) => useDeadAirCue(props),
      { initialProps: processingProps }
    );

    // Advance past start delay so cue is playing
    act(() => {
      vi.advanceTimersByTime(CUE_START_DELAY_MS);
    });

    expect(result.current.isPlayingCue).toBe(true);

    // Simulate orchestrator receiving transcript_complete (ai) → sets isProcessing=false
    rerender({
      ...processingProps,
      isProcessing: false,
    });

    // Cue should stop
    expect(result.current.isPlayingCue).toBe(false);
  });

  /**
   * Validates: Requirements 4.3
   *
   * Simulates: isSpeaking=true suppresses cue mid-processing.
   * The orchestrator's TTS playback (isSpeaking flag) should suppress the audio cue
   * even while isProcessing remains true.
   */
  it("isSpeaking=true suppresses cue mid-processing", () => {
    // Start with processing and cue playing
    const processingProps: UseDeadAirCueOptions = {
      isProcessing: true,
      isSpeaking: false,
      interimText: "",
      callStatus: "active",
    };

    const { result, rerender } = renderHook(
      (props: UseDeadAirCueOptions) => useDeadAirCue(props),
      { initialProps: processingProps }
    );

    // Advance past start delay so cue is playing
    act(() => {
      vi.advanceTimersByTime(CUE_START_DELAY_MS);
    });

    expect(result.current.isPlayingCue).toBe(true);

    // Simulate AI speech starting (isSpeaking=true) while still processing
    rerender({
      ...processingProps,
      isSpeaking: true,
    });

    // Cue should be suppressed
    expect(result.current.isPlayingCue).toBe(false);
  });

  /**
   * Validates: Requirements 4.4
   *
   * Simulates: non-empty interimText suppresses cue mid-processing.
   * When the user starts speaking (interim STT fires), the cue should stop
   * even while isProcessing remains true.
   */
  it("non-empty interimText suppresses cue mid-processing", () => {
    // Start with processing and cue playing
    const processingProps: UseDeadAirCueOptions = {
      isProcessing: true,
      isSpeaking: false,
      interimText: "",
      callStatus: "active",
    };

    const { result, rerender } = renderHook(
      (props: UseDeadAirCueOptions) => useDeadAirCue(props),
      { initialProps: processingProps }
    );

    // Advance past start delay so cue is playing
    act(() => {
      vi.advanceTimersByTime(CUE_START_DELAY_MS);
    });

    expect(result.current.isPlayingCue).toBe(true);

    // Simulate user starting to speak (interimText becomes non-empty)
    rerender({
      ...processingProps,
      interimText: "hello",
    });

    // Cue should be suppressed
    expect(result.current.isPlayingCue).toBe(false);
  });
});
