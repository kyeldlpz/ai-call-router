"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WsMessage } from "@/types";

type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting" | "failed";

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

interface UseRealtimeConnectionOptions {
  url: string | null;
  onMessage: (message: WsMessage) => void;
  onAudioDelta?: (base64Audio: string) => void;
}

interface RealtimeConnectionReturn {
  connectionState: ConnectionState;
  isConnected: boolean;
  send: (message: object) => void;
  disconnect: () => void;
}

export function useRealtimeConnection({
  url,
  onMessage,
  onAudioDelta,
}: UseRealtimeConnectionOptions): RealtimeConnectionReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const intentionalCloseRef = useRef(false);
  const onMessageRef = useRef(onMessage);
  const onAudioDeltaRef = useRef(onAudioDelta);

  // Keep refs current without re-triggering effects
  onMessageRef.current = onMessage;
  onAudioDeltaRef.current = onAudioDelta;

  const connect = useCallback((wsUrl: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionState(retriesRef.current > 0 ? "reconnecting" : "connecting");
    intentionalCloseRef.current = false;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionState("connected");
      retriesRef.current = 0;
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as WsMessage;

        // Route audio deltas separately for performance (skip reducer dispatch)
        if (message.type === "audio_delta" && onAudioDeltaRef.current) {
          const data = message.data as { audio: string };
          onAudioDeltaRef.current(data.audio);
          return;
        }

        onMessageRef.current(message);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      wsRef.current = null;

      if (intentionalCloseRef.current) {
        setConnectionState("disconnected");
        return;
      }

      // Attempt reconnection
      if (retriesRef.current < MAX_RETRIES) {
        const delay = RETRY_DELAYS_MS[retriesRef.current] ?? 4000;
        retriesRef.current += 1;
        setConnectionState("reconnecting");
        setTimeout(() => connect(wsUrl), delay);
      } else {
        setConnectionState("failed");
      }
    };

    ws.onerror = () => {
      // onclose will fire after this — let it handle state
    };
  }, []);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    retriesRef.current = 0;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState("disconnected");
  }, []);

  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Connect when url changes, disconnect on null
  useEffect(() => {
    if (url) {
      retriesRef.current = 0;
      connect(url);
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [url, connect, disconnect]);

  return {
    connectionState,
    isConnected: connectionState === "connected",
    send,
    disconnect,
  };
}
