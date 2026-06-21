"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CallPanel } from "@/components/call/call-panel";
import { TranscriptPanel } from "@/components/transcript/transcript-panel";
import { useVoiceConversation } from "@/hooks/use-voice-conversation";

export default function CallPage() {
  const {
    status,
    transcript,
    duration,
    error,
    isSpeaking,
    isMuted,
    estimatedCost,
    startCall,
    endCall,
    resetCall,
    toggleMute,
    isConnected,
  } = useVoiceConversation();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">RecoverAi</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Voice Intake
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-gray-400"
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </header>

      {/* Main Content — 3 column layout */}
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Left Panel — Call Status & Controls */}
          <div className="lg:col-span-3">
            <CallPanel
              status={status}
              duration={duration}
              error={error}
              isMuted={isMuted}
              isSpeaking={isSpeaking}
              onStart={startCall}
              onEnd={endCall}
              onReset={resetCall}
              onToggleMute={toggleMute}
            />
          </div>

          {/* Center Panel — Transcript */}
          <div className="lg:col-span-6">
            <TranscriptPanel
              messages={transcript}
              isActive={status === "active"}
            />
          </div>

          {/* Right Panel — Call Information */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Call Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-medium capitalize">{status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm font-mono tabular-nums">
                      {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, "0")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Messages</p>
                    <p className="text-sm">{transcript.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Microphone</p>
                    <p className="text-sm">{isMuted ? "Muted" : status === "active" ? "Active" : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Est. API Cost</p>
                    <p className="text-sm font-mono tabular-nums text-amber-600">
                      ${estimatedCost.toFixed(4)}
                    </p>
                  </div>
                  {status === "complete" && (
                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground">Summary</p>
                      <p className="text-sm text-muted-foreground italic mt-1">
                        Call completed. {transcript.length} messages recorded.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-gray-400"
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {isConnected ? "WebSocket connected" : "WebSocket disconnected"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          RecoverAi MVP — Hackathon Demo
        </span>
      </footer>
    </div>
  );
}
