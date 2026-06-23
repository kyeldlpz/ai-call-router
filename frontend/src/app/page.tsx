"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CallPanel } from "@/components/call/call-panel";
import { TranscriptPanel } from "@/components/transcript/transcript-panel";
import { useVoiceConversation } from "@/hooks/use-voice-conversation";
import { useDeadAirCue } from "@/hooks/use-dead-air-cue";
import { cn } from "@/lib/utils";
import type { TTSProvider, STTProvider } from "@/types";

export default function CallPage() {
  const {
    status,
    transcript,
    duration,
    error,
    speechError,
    isSpeaking,
    isMuted,
    interimText,
    isProcessing,
    isSpeechSupported,
    startCall,
    endCall,
    resetCall,
    toggleMute,
    isConnected,
    ttsProvider,
    sttProvider,
    setTtsProvider,
    setSttProvider,
    elevenlabsVoiceId,
    setElevenlabsVoiceId,
  } = useVoiceConversation();

  const { isPlayingCue } = useDeadAirCue({
    isProcessing,
    isSpeaking,
    interimText,
    callStatus: status,
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden">
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
      <main className="flex-1 p-6 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Left Panel — Call Status & Controls */}
          <div className="lg:col-span-4 flex items-center justify-center min-h-0">
            <CallPanel
              status={status}
              duration={duration}
              error={error}
              speechError={speechError}
              isMuted={isMuted}
              isSpeaking={isSpeaking}
              isSpeechSupported={isSpeechSupported}
              onStart={startCall}
              onEnd={endCall}
              onReset={resetCall}
              onToggleMute={toggleMute}
            />
          </div>

          {/* Center Panel — Transcript */}
          <div className="lg:col-span-5 min-h-0">
            <TranscriptPanel
              messages={transcript}
              isActive={status === "active"}
            />
          </div>

          {/* Right Panel — Call Information + Settings */}
          <div className="lg:col-span-3 space-y-4 min-h-0 overflow-y-auto">
            <Card className="shadow-lg border bg-gradient-to-b from-card to-card/80">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-semibold tracking-tight">Call Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-1">
                    <p className="text-xs text-muted-foreground font-medium">Status</p>
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full capitalize",
                      status === "active" ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" :
                      status === "error" ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400" :
                      status === "connecting" ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <p className="text-xs text-muted-foreground font-medium">Duration</p>
                    <p className="text-sm font-mono tabular-nums font-medium">
                      {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, "0")}
                    </p>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <p className="text-xs text-muted-foreground font-medium">Messages</p>
                    <p className="text-sm font-medium">{transcript.length}</p>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <p className="text-xs text-muted-foreground font-medium">Microphone</p>
                    <p className="text-sm font-medium">{isMuted ? "Muted" : status === "active" ? "Active" : "—"}</p>
                  </div>
                  {isPlayingCue && (
                    <div className="flex items-center justify-between py-1">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                        Processing
                      </span>
                    </div>
                  )}
                  {interimText && status === "active" && (
                    <div className="pt-2 border-t border-border/30">
                      <p className="text-xs text-muted-foreground font-medium">Hearing...</p>
                      <p className="text-sm italic text-muted-foreground/80 mt-1">{interimText}</p>
                    </div>
                  )}
                  {status === "complete" && (
                    <div className="pt-3 border-t border-border/30">
                      <p className="text-xs text-muted-foreground font-medium">Summary</p>
                      <p className="text-sm text-muted-foreground/80 italic mt-1">
                        Call completed. {transcript.length} messages recorded.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Provider Settings */}
            <Card className="shadow-lg border bg-gradient-to-b from-card to-card/80">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-semibold tracking-tight">Voice Settings</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1.5">
                      Text-to-Speech (AI Voice)
                    </label>
                    <select
                      className="w-full text-sm border border-border/50 rounded-lg px-3 py-2 bg-background shadow-sm focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors"
                      value={ttsProvider}
                      onChange={(e) => setTtsProvider(e.target.value as TTSProvider)}
                      disabled={status === "active"}
                    >
                      <option value="browser">Browser (Free)</option>
                      <option value="elevenlabs">ElevenLabs (Conversational)</option>
                    </select>
                  </div>
                  {ttsProvider === "elevenlabs" && (
                    <div>
                      <label className="text-xs text-muted-foreground font-medium block mb-1.5">
                        Voice
                      </label>
                      <select
                        className="w-full text-sm border border-border/50 rounded-lg px-3 py-2 bg-background shadow-sm focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors"
                        value={elevenlabsVoiceId}
                        onChange={(e) => setElevenlabsVoiceId(e.target.value)}
                        disabled={status === "active"}
                      >
                        <option value="onwK4e9ZLuTAKqWW03F9">Daniel (Male, Warm)</option>
                        <option value="JBFqnCBsd6RMkjVDRZzb">George (Male, Professional)</option>
                        <option value="TX3LPaxmHKxFdv7VOQHJ">Liam (Male, Energetic)</option>
                        <option value="bIHbv24MWmeRgasZH58o">Will (Male, Deep)</option>
                        <option value="nPczCjzI2devNBz1zQrb">Aria (Female, Warm)</option>
                        <option value="EXAVITQu4vr4xnSDxMaL">Sarah (Female, Professional)</option>
                        <option value="pFZP5JQG7iQjIQuC4Bku">Lily (Female, Friendly)</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1.5">
                      Speech-to-Text (Your Voice)
                    </label>
                    <select
                      className="w-full text-sm border border-border/50 rounded-lg px-3 py-2 bg-background shadow-sm focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors"
                      value={sttProvider}
                      onChange={(e) => setSttProvider(e.target.value as STTProvider)}
                      disabled={status === "active"}
                    >
                      <option value="browser">Browser (Free)</option>
                      <option value="elevenlabs">ElevenLabs Scribe (Accurate)</option>
                    </select>
                  </div>
                  {status === "active" && (
                    <p className="text-xs text-muted-foreground/70 italic">
                      Change providers between calls
                    </p>
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
