// Call types
export type CallStatus = "idle" | "connecting" | "active" | "ending" | "complete" | "error";

export interface CallState {
  callId: string | null;
  status: CallStatus;
  transcript: TranscriptMessage[];
  error: string | null;
  duration: number;
}

// Transcript types
export interface TranscriptMessage {
  id: string;
  speaker: "ai" | "caller";
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}

// WebSocket message types
export type WsMessageType =
  | "call_status"
  | "transcript_delta"
  | "transcript_complete"
  | "audio_delta"
  | "response_done"
  | "error";

export interface WsMessage<T = unknown> {
  type: WsMessageType;
  data: T;
  timestamp: string;
  sequence: number;
}

// API response envelope
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  timestamp: string;
}

// Call API response types
export interface CallCreatedData {
  callId: string;
  status: string;
  websocketUrl: string;
}

export interface CallData {
  callId: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  transcript: TranscriptMessage[];
  durationSeconds: number;
}

// Reducer action types
export type CallAction =
  | { type: "CALL_INIT"; callId: string }
  | { type: "CALL_CONNECTED" }
  | { type: "TRANSCRIPT_ADD"; message: TranscriptMessage }
  | { type: "TRANSCRIPT_DELTA"; speaker: "ai"; text: string }
  | { type: "CALL_ENDING" }
  | { type: "CALL_COMPLETE" }
  | { type: "CALL_ERROR"; error: string }
  | { type: "CALL_RESET" }
  | { type: "DURATION_TICK" };
