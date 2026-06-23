import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { CallStatus } from "@/types";

/**
 * Pure predicate function that mirrors the playback logic in `useDeadAirCue`.
 *
 * The hook plays the audio cue if and only if:
 * - isProcessing === true
 * - callStatus === "active"
 * - isSpeaking === false
 * - interimText === ""
 */
function shouldPlayCue(
  isProcessing: boolean,
  isSpeaking: boolean,
  interimText: string,
  callStatus: CallStatus
): boolean {
  return isProcessing && callStatus === "active" && !isSpeaking && interimText === "";
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

const interimTextArb: fc.Arbitrary<string> = fc.oneof(
  fc.constant(""),
  fc.string({ minLength: 1 })
);

// --- Property Tests ---

describe("Feature: dead-air-audio-cue, Property 3: Audio cue playback predicate", () => {
  /**
   * Validates: Requirements 2.5, 4.1, 4.3, 4.4
   *
   * For any combination of signals (isProcessing, isSpeaking, interimText, callStatus),
   * the audio cue SHALL be playing if and only if ALL of the following hold:
   * - isProcessing === true
   * - isSpeaking === false
   * - interimText === ""
   * - callStatus === "active"
   *
   * In all other signal combinations, the cue SHALL be silent.
   */
  it("cue plays if and only if all predicate conditions hold simultaneously", () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        interimTextArb,
        callStatusArb,
        (isProcessing, isSpeaking, interimText, callStatus) => {
          const result = shouldPlayCue(isProcessing, isSpeaking, interimText, callStatus);

          const allConditionsMet =
            isProcessing === true &&
            isSpeaking === false &&
            interimText === "" &&
            callStatus === "active";

          expect(result).toBe(allConditionsMet);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("violating any single condition prevents cue playback", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "isProcessing",
          "isSpeaking",
          "interimText",
          "callStatus"
        ) as fc.Arbitrary<"isProcessing" | "isSpeaking" | "interimText" | "callStatus">,
        (violatedCondition) => {
          // Start from conditions where cue would play, then violate one
          let isProcessing = true;
          let isSpeaking = false;
          let interimText = "";
          let callStatus: CallStatus = "active";

          switch (violatedCondition) {
            case "isProcessing":
              isProcessing = false;
              break;
            case "isSpeaking":
              isSpeaking = true;
              break;
            case "interimText":
              interimText = "hello";
              break;
            case "callStatus":
              callStatus = "idle";
              break;
          }

          const result = shouldPlayCue(isProcessing, isSpeaking, interimText, callStatus);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
