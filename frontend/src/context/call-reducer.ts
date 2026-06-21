import type { CallState, CallAction, TranscriptMessage } from "@/types";

export const INITIAL_CALL_STATE: CallState = {
  callId: null,
  status: "idle",
  transcript: [],
  error: null,
  duration: 0,
};

export function callReducer(state: CallState, action: CallAction): CallState {
  switch (action.type) {
    case "CALL_INIT":
      return {
        ...INITIAL_CALL_STATE,
        callId: action.callId || state.callId,
        status: "connecting",
      };

    case "CALL_CONNECTED":
      if (state.status !== "connecting") return state;
      return { ...state, status: "active", error: null };

    case "TRANSCRIPT_ADD":
      return {
        ...state,
        transcript: [...state.transcript, action.message],
      };

    case "TRANSCRIPT_DELTA": {
      const lastMsg = state.transcript[state.transcript.length - 1];
      if (lastMsg && lastMsg.speaker === "ai" && lastMsg.isStreaming) {
        const updated: TranscriptMessage = {
          ...lastMsg,
          text: lastMsg.text + action.text,
        };
        return {
          ...state,
          transcript: [...state.transcript.slice(0, -1), updated],
        };
      }
      const newMsg: TranscriptMessage = {
        id: `msg_stream_${Date.now()}`,
        speaker: "ai",
        text: action.text,
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };
      return {
        ...state,
        transcript: [...state.transcript, newMsg],
      };
    }

    case "CALL_ENDING":
      if (state.status !== "active") return state;
      return { ...state, status: "ending" };

    case "CALL_COMPLETE": {
      const finalized = state.transcript.map((msg) =>
        msg.isStreaming ? { ...msg, isStreaming: false } : msg
      );
      return { ...state, status: "complete", transcript: finalized };
    }

    case "CALL_ERROR":
      return { ...state, status: "error", error: action.error };

    case "CALL_RESET":
      return INITIAL_CALL_STATE;

    case "DURATION_TICK":
      if (state.status !== "active") return state;
      return { ...state, duration: state.duration + 1 };

    default:
      return state;
  }
}
