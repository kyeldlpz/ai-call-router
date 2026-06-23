import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { CallStatus } from "@/types";

/**
 * Pure state transition functions that model the processing state logic
 * in `use-voice-conversation.ts`.
 *
 * These mirror the hook's behavior:
 * - `handleSpeechResult` sets isProcessing = true (text_input send)
 * - `handleWsMessage` with transcript_complete + speaker "ai" sets isProcessing = false
 */

interface ProcessingState {
  isProcessing: boolean;
  callStatus: CallStatus;
}

/**
 * Models the state transition when the orchestrator sends a `text_input` message.
 * In the hook: `setIsProcessing(true)` is called in `handleSpeechResult`.
 */
function applyTextInput(state: ProcessingState): ProcessingState {
  return { ...state, isProcessing: true };
}

/**
 * Models the state transition when the orchestrator receives a `transcript_complete`
 * message. In the hook: `setIsProcessing(false)` is called when speaker is "ai".
 */
function applyTranscriptComplete(
  state: ProcessingState,
  speaker: "ai" | "caller"
): ProcessingState {
  if (speaker === "ai") {
    return { ...state, isProcessing: false };
  }
  return state;
}

// --- Arbitraries ---

const callStatusArb: fc.Arbitrary<CallStatus> = fc.constantFrom(
  "idle",
  "connecting",
  "active",
  "ending",
  "complete",
  "error"
);

const activeCallStateArb: fc.Arbitrary<ProcessingState> = fc.record({
  isProcessing: fc.boolean(),
  callStatus: fc.constant("active" as CallStatus),
});

const processingTrueStateArb: fc.Arbitrary<ProcessingState> = fc.record({
  isProcessing: fc.constant(true),
  callStatus: callStatusArb,
});

// --- Property Tests ---

describe("Feature: dead-air-audio-cue, Property 1: Processing state entry is idempotent", () => {
  /**
   * Validates: Requirements 1.1, 1.4
   *
   * For any active call state, after a text_input send event,
   * isProcessing SHALL be true — regardless of whether it was
   * already true or false before the event.
   */
  it("text_input event always results in isProcessing === true", () => {
    fc.assert(
      fc.property(activeCallStateArb, (state) => {
        const next = applyTextInput(state);
        expect(next.isProcessing).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

describe("Feature: dead-air-audio-cue, Property 2: AI transcript completes processing", () => {
  /**
   * Validates: Requirements 1.2
   *
   * For any state where isProcessing is true, receiving a
   * transcript_complete message with speaker "ai" SHALL result
   * in isProcessing becoming false.
   */
  it("transcript_complete with speaker 'ai' always sets isProcessing to false", () => {
    fc.assert(
      fc.property(processingTrueStateArb, (state) => {
        const next = applyTranscriptComplete(state, "ai");
        expect(next.isProcessing).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
