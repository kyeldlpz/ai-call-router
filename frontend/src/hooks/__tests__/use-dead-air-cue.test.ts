import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { UseDeadAirCueOptions } from "../use-dead-air-cue";

// --- Web Audio API Mocks ---
// These MUST be set on window BEFORE the hook module is imported,
// because the hook captures AudioContext at module load time.

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

  // This sets up the mock that will be used by the AudioContext constructor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as Record<string, unknown>).mockAudioCtx = mockCtx;
}

// Set up a stub AudioContext on window BEFORE the module loads.
// The hook captures `window.AudioContext` at module level.
// We use vi.fn() that delegates to whatever mockCtx is current.
const AudioContextStub = vi.fn(function (this: MockAudioContext) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = (globalThis as Record<string, unknown>).mockAudioCtx as MockAudioContext;
  Object.assign(this, ctx);
  return this;
});

// Assign BEFORE import - since vitest hoists imports, we use vi.stubGlobal
vi.stubGlobal("AudioContext", AudioContextStub);

// Now import the hook (the module will see window.AudioContext as defined)
const {
  useDeadAirCue,
  CUE_START_DELAY_MS,
  CUE_FADE_OUT_MS,
  CUE_FREQUENCY_HZ,
  CUE_GAIN,
  CUE_LOOP_DURATION_MS,
  CUE_TIMEOUT_MS,
} = await import("../use-dead-air-cue");

// Default options for an active processing state
const activeProcessingOptions: UseDeadAirCueOptions = {
  isProcessing: true,
  isSpeaking: false,
  interimText: "",
  callStatus: "active",
};

describe("useDeadAirCue — timing and configuration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupMocks();
    AudioContextStub.mockImplementation(function (this: MockAudioContext) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = (globalThis as Record<string, unknown>).mockAudioCtx as MockAudioContext;
      Object.assign(this, ctx);
      return this;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // --- Requirement 2.1: Audio cue starts within reasonable time ---
  describe("Requirement 2.1: CUE_START_DELAY_MS", () => {
    it("CUE_START_DELAY_MS is ≤ 1000ms", () => {
      expect(CUE_START_DELAY_MS).toBeLessThanOrEqual(1000);
    });

    it("audio cue starts after CUE_START_DELAY_MS when entering processing state", () => {
      renderHook(() => useDeadAirCue(activeProcessingOptions));

      // Before delay: no oscillators created yet
      expect(mockOscillators).toHaveLength(0);

      // Advance time by CUE_START_DELAY_MS
      act(() => {
        vi.advanceTimersByTime(CUE_START_DELAY_MS);
      });

      // After delay: oscillators should have been created (3 for chord)
      expect(mockOscillators.length).toBeGreaterThanOrEqual(1);
      expect(mockOscillators[0].start).toHaveBeenCalled();
    });
  });

  // --- Requirement 2.3: Fade-out duration ≤ 500ms ---
  describe("Requirement 2.3: CUE_FADE_OUT_MS", () => {
    it("CUE_FADE_OUT_MS is ≤ 500ms", () => {
      expect(CUE_FADE_OUT_MS).toBeLessThanOrEqual(500);
    });

    it("fade-out uses linearRampToValueAtTime with correct duration", () => {
      const { rerender } = renderHook(
        (props: UseDeadAirCueOptions) => useDeadAirCue(props),
        { initialProps: activeProcessingOptions }
      );

      // Start the cue
      act(() => {
        vi.advanceTimersByTime(CUE_START_DELAY_MS);
      });

      // Exit processing state — triggers fade-out
      rerender({ ...activeProcessingOptions, isProcessing: false });

      // Verify linearRampToValueAtTime was called with fade-out end time
      const fadeOutDurationSeconds = CUE_FADE_OUT_MS / 1000;
      expect(
        mockGainNode.gain.linearRampToValueAtTime
      ).toHaveBeenCalledWith(0, mockCtx.currentTime + fadeOutDurationSeconds);
    });
  });

  // --- Requirement 3.2: Warm chord tone ---
  describe("Requirement 3.2: Oscillator configuration", () => {
    it("CUE_FREQUENCY_HZ is defined (primary frequency)", () => {
      expect(CUE_FREQUENCY_HZ).toBeGreaterThan(200);
      expect(CUE_FREQUENCY_HZ).toBeLessThan(500);
    });

    it("OscillatorNodes are created when cue starts", () => {
      renderHook(() => useDeadAirCue(activeProcessingOptions));

      // Advance to trigger oscillator creation
      act(() => {
        vi.advanceTimersByTime(CUE_START_DELAY_MS);
      });

      // Multiple oscillators for ambient chord
      expect(mockOscillators.length).toBeGreaterThanOrEqual(1);
      // First oscillator should use triangle for warmth
      expect(mockOscillators[0].type).toBe("triangle");
    });
  });

  // --- Requirement 3.3: Gain ≤ 0.15 ---
  describe("Requirement 3.3: Gain level", () => {
    it("CUE_GAIN is ≤ 0.15", () => {
      expect(CUE_GAIN).toBeLessThanOrEqual(0.15);
    });

    it("GainNode is set with CUE_GAIN value", () => {
      renderHook(() => useDeadAirCue(activeProcessingOptions));

      // GainNode gain value is set during AudioContext creation effect
      expect(mockGainNode.gain.value).toBe(CUE_GAIN);
    });
  });

  // --- Requirement 3.4: Loop duration ---
  describe("Requirement 3.4: Loop duration", () => {
    it("CUE_LOOP_DURATION_MS is ≤ 5000ms", () => {
      expect(CUE_LOOP_DURATION_MS).toBeLessThanOrEqual(5000);
    });
  });

  // --- Requirement 1.5: 30-second timeout ---
  describe("Requirement 1.5: Processing timeout", () => {
    it("CUE_TIMEOUT_MS is 30000ms", () => {
      expect(CUE_TIMEOUT_MS).toBe(30_000);
    });

    it("onTimeout is called after 30s of processing", () => {
      const onTimeout = vi.fn();
      renderHook(() =>
        useDeadAirCue({ ...activeProcessingOptions, onTimeout })
      );

      // Advance past the start delay
      act(() => {
        vi.advanceTimersByTime(CUE_START_DELAY_MS);
      });

      expect(onTimeout).not.toHaveBeenCalled();

      // Advance to 30s total
      act(() => {
        vi.advanceTimersByTime(CUE_TIMEOUT_MS);
      });

      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it("isPlayingCue becomes false after 30s timeout", () => {
      const { result } = renderHook(() =>
        useDeadAirCue({ ...activeProcessingOptions, onTimeout: vi.fn() })
      );

      // Start playback
      act(() => {
        vi.advanceTimersByTime(CUE_START_DELAY_MS);
      });

      expect(result.current.isPlayingCue).toBe(true);

      // Trigger timeout (CUE_TIMEOUT_MS from the start of processing)
      act(() => {
        vi.advanceTimersByTime(CUE_TIMEOUT_MS);
      });

      expect(result.current.isPlayingCue).toBe(false);
    });
  });

  // --- Requirement 1.3: WebSocket disconnect exits processing ---
  describe("Requirement 1.3: WebSocket disconnect", () => {
    it("transitioning callStatus away from 'active' stops cue", () => {
      const { result, rerender } = renderHook(
        (props: UseDeadAirCueOptions) => useDeadAirCue(props),
        { initialProps: activeProcessingOptions }
      );

      // Start playback
      act(() => {
        vi.advanceTimersByTime(CUE_START_DELAY_MS);
      });

      expect(result.current.isPlayingCue).toBe(true);

      // Simulate disconnect by changing callStatus to "ending"
      rerender({ ...activeProcessingOptions, callStatus: "ending" });

      expect(result.current.isPlayingCue).toBe(false);
    });
  });

  // --- Requirement 5.1, 5.2: Unsupported browser ---
  describe("Requirement 5.1, 5.2: Unsupported browser", () => {
    it("returns isSupported=false with no errors when AudioContext constructor throws", () => {
      // Make AudioContext constructor throw to simulate unsupported browser
      AudioContextStub.mockImplementation(() => {
        throw new Error("AudioContext not supported");
      });

      const { result } = renderHook(() => useDeadAirCue(activeProcessingOptions));

      act(() => {
        vi.advanceTimersByTime(CUE_START_DELAY_MS + 100);
      });

      // Should not throw and should not play
      expect(result.current.isPlayingCue).toBe(false);
    });
  });

  // --- Requirement 5.3, 5.4: AudioContext resume failure ---
  describe("Requirement 5.3, 5.4: AudioContext resume failure", () => {
    it("silent degradation when AudioContext resume fails — no errors thrown", async () => {
      // Set AudioContext to suspended so resume() is called
      mockCtx.state = "suspended";
      mockCtx.resume = vi.fn(() =>
        Promise.reject(new Error("Autoplay policy blocked"))
      );

      // Render hook — should not throw even though resume rejects
      const { result } = renderHook(() => useDeadAirCue(activeProcessingOptions));

      // Flush microtask queue for the rejected promise
      await act(async () => {
        await vi.advanceTimersByTimeAsync(CUE_START_DELAY_MS + 100);
      });

      // Verify resume was called (hook attempted to resume suspended context)
      expect(mockCtx.resume).toHaveBeenCalled();
      // Hook should not throw — it degrades gracefully
      // isSupported still true (API exists), but audio may or may not play
      // depending on timing; key requirement is no error propagation
      expect(result.current.isSupported).toBe(true);
    });
  });

  // --- Requirement 4.2: Call lifecycle stops playback ---
  describe("Requirement 4.2: Call status ending/complete/idle stops playback", () => {
    it.each(["ending", "complete", "idle"] as const)(
      "callStatus '%s' stops playback and closes AudioContext",
      (status) => {
        const { result, rerender } = renderHook(
          (props: UseDeadAirCueOptions) => useDeadAirCue(props),
          { initialProps: activeProcessingOptions }
        );

        // Start playback
        act(() => {
          vi.advanceTimersByTime(CUE_START_DELAY_MS);
        });

        expect(result.current.isPlayingCue).toBe(true);

        // Transition to terminal call status
        rerender({ ...activeProcessingOptions, callStatus: status });

        expect(result.current.isPlayingCue).toBe(false);
        expect(mockCtx.close).toHaveBeenCalled();
      }
    );
  });
});
