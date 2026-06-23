"use client";

import { CallPanel } from "@/components/call/call-panel";
import { MissionControlPanel } from "@/components/dashboard/mission-control-panel";
import { TranscriptPanel } from "@/components/transcript/transcript-panel";
import { useVoiceConversation } from "@/hooks/use-voice-conversation";
import { useDeadAirCue } from "@/hooks/use-dead-air-cue";
import { cn } from "@/lib/utils";

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

  const isCallActive = status === "active" || status === "connecting";

  return (
    <div className="flex flex-col h-screen overflow-hidden terminal-shell">
      <header className="border-b border-border px-6 py-3.5 flex items-center justify-between bg-card/50">
        <div className="flex items-baseline gap-4">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground">
            RecoverAi
          </h1>
          <span className="label-caps hidden sm:inline">Revenue Recovery Command Center</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors duration-200",
              isConnected ? "bg-intent-positive" : "bg-score-low"
            )}
          />
          <span className="text-xs text-muted-foreground tabular-nums">
            {isConnected ? "System online" : "System offline"}
          </span>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-5 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 h-full max-w-[1600px] mx-auto">
          <div className="lg:col-span-3 flex items-center justify-center min-h-0 order-2 lg:order-1">
            <div className="panel-surface p-4 w-full max-w-[360px] flex items-center justify-center">
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
          </div>

          <div className="lg:col-span-6 min-h-0 order-1 lg:order-2">
            <TranscriptPanel
              messages={transcript}
              isActive={status === "active"}
            />
          </div>

          <div className="lg:col-span-3 min-h-0 order-3">
            <MissionControlPanel
              status={status}
              duration={duration}
              transcriptLength={transcript.length}
              isMuted={isMuted}
              isConnected={isConnected}
              isCallActive={isCallActive}
              isPlayingCue={isPlayingCue}
              interimText={interimText}
              showHandoff={status === "complete"}
              ttsProvider={ttsProvider}
              sttProvider={sttProvider}
              elevenlabsVoiceId={elevenlabsVoiceId}
              onTtsProviderChange={setTtsProvider}
              onSttProviderChange={setSttProvider}
              onElevenlabsVoiceChange={setElevenlabsVoiceId}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-2.5 flex items-center justify-between bg-card/50">
        <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
          WS {isConnected ? "connected" : "disconnected"}
        </span>
        <span className="text-[11px] text-muted-foreground">
          RecoverAi · Voice Intake
        </span>
      </footer>
    </div>
  );
}
