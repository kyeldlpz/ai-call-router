"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentConfigSection } from "@/components/dashboard/agent-config-section";
import { cn } from "@/lib/utils";
import { BarChart3, FileText, Target } from "lucide-react";
import type { CallStatus, STTProvider, TTSProvider } from "@/types";
import type { AgentConfig, AgentConfigUpdate } from "@/types/agent-config";

interface MissionControlPanelProps {
  status: CallStatus;
  duration: number;
  transcriptLength: number;
  isMuted: boolean;
  isConnected: boolean;
  isCallActive: boolean;
  isPlayingCue: boolean;
  interimText: string | null;
  showHandoff: boolean;
  agentConfig: AgentConfig;
  isAgentCustomized: boolean;
  isAgentConfigLoading: boolean;
  isAgentConfigSaving: boolean;
  isAgentConfigSynced: boolean;
  agentConfigLoadError: string | null;
  onAgentConfigSave: (update: AgentConfigUpdate) => Promise<void>;
  onAgentConfigReset: () => Promise<void>;
  onAgentConfigRetry: () => Promise<void>;
  ttsProvider: TTSProvider;
  sttProvider: STTProvider;
  elevenlabsVoiceId: string;
  onTtsProviderChange: (value: TTSProvider) => void;
  onSttProviderChange: (value: STTProvider) => void;
  onElevenlabsVoiceChange: (value: string) => void;
}

function StatusBadge({ status }: { status: CallStatus }) {
  return (
    <span
      className={cn(
        "text-[11px] font-medium px-2 py-0.5 rounded capitalize tabular-nums",
        status === "active" &&
          "bg-primary/10 text-primary border border-primary/30",
        status === "error" &&
          "bg-destructive/10 text-red-400 border border-destructive/25",
        status === "connecting" &&
          "bg-brand-blue/10 text-brand-blue border border-brand-blue/30",
        status !== "active" &&
          status !== "error" &&
          status !== "connecting" &&
          "bg-muted text-muted-foreground border border-border"
      )}
    >
      {status}
    </span>
  );
}

export function MissionControlPanel({
  status,
  duration,
  transcriptLength,
  isMuted,
  isConnected,
  isCallActive,
  isPlayingCue,
  interimText,
  showHandoff,
  agentConfig,
  isAgentCustomized,
  isAgentConfigLoading,
  isAgentConfigSaving,
  isAgentConfigSynced,
  agentConfigLoadError,
  onAgentConfigSave,
  onAgentConfigReset,
  onAgentConfigRetry,
  ttsProvider,
  sttProvider,
  elevenlabsVoiceId,
  onTtsProviderChange,
  onSttProviderChange,
  onElevenlabsVoiceChange,
}: MissionControlPanelProps) {
  const durationLabel = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}`;

  return (
    <Card className="panel-surface border-0 ring-0 h-full flex flex-col">
      <CardHeader className="pb-4 border-b border-border">
        <CardTitle className="text-sm font-semibold tracking-tight uppercase">
          Mission Control
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Session intelligence, agent behavior, and voice configuration
        </p>
      </CardHeader>

      <CardContent className="pt-5 flex-1 min-h-0 overflow-y-auto space-y-6">
        <section>
          <p className="label-caps mb-3">Session</p>
          <dl className="space-y-2.5">
            <div className="flex items-center justify-between">
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge status={status} />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-xs text-muted-foreground">Duration</dt>
              <dd className="text-sm font-mono tabular-nums font-medium">{durationLabel}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-xs text-muted-foreground">Messages</dt>
              <dd className="text-sm font-mono tabular-nums">{transcriptLength}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-xs text-muted-foreground">Microphone</dt>
              <dd className="text-sm">
                {isMuted ? "Muted" : status === "active" ? "Active" : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-xs text-muted-foreground">Link</dt>
              <dd className="text-xs flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isConnected ? "bg-primary" : "bg-score-low"
                  )}
                />
                {isConnected ? "Online" : "Offline"}
              </dd>
            </div>
          </dl>

          {isPlayingCue && (
            <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-primary" />
              Processing response
            </p>
          )}

          {interimText && status === "active" && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="label-caps mb-1">Incoming</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{interimText}</p>
            </div>
          )}
        </section>

        <section className="pt-2 border-t border-border">
          <p className="label-caps mb-3">Intelligence</p>
          <div className="space-y-3">
            <div className="panel-rail-blue pl-3 py-2">
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-brand-blue" aria-hidden="true" />
                Caller intent
              </p>
              {isCallActive ? (
                <span className="text-xs text-primary font-medium">Analyzing conversation</span>
              ) : (
                <span className="text-xs text-muted-foreground">No active session</span>
              )}
            </div>

            <div className="panel-rail-purple pl-3 py-2">
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-brand-purple" aria-hidden="true" />
                Opportunity score
              </p>
              {isCallActive ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-0 rounded-full bg-primary transition-all duration-500" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground tabular-nums">—</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Available during live calls</span>
              )}
            </div>

            <div className="panel-rail-cyan pl-3 py-2">
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                Agent handoff
              </p>
              {showHandoff ? (
                <div className="rounded border border-border bg-muted/40 p-3">
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {transcriptLength} exchanges recorded. Briefing ready for review.
                  </p>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Generated when session ends</span>
              )}
            </div>
          </div>
        </section>

        <AgentConfigSection
          effectiveConfig={agentConfig}
          isCustomized={isAgentCustomized}
          isLoading={isAgentConfigLoading}
          isSaving={isAgentConfigSaving}
          isSynced={isAgentConfigSynced}
          loadError={agentConfigLoadError}
          locked={status === "active"}
          onSave={onAgentConfigSave}
          onReset={onAgentConfigReset}
          onRetry={onAgentConfigRetry}
        />

        <section className="pt-2 border-t border-border">
          <p className="label-caps mb-3">Voice</p>
          <div className="space-y-3">
            <div>
              <label htmlFor="tts-provider" className="text-xs text-muted-foreground block mb-1.5">
                AI voice output
              </label>
              <select
                id="tts-provider"
                className="select-terminal"
                value={ttsProvider}
                onChange={(e) => onTtsProviderChange(e.target.value as TTSProvider)}
                disabled={status === "active"}
              >
                <option value="browser">Browser (Free)</option>
                <option value="elevenlabs">ElevenLabs (Conversational)</option>
              </select>
            </div>

            {ttsProvider === "elevenlabs" && (
              <div>
                <label htmlFor="elevenlabs-voice" className="text-xs text-muted-foreground block mb-1.5">
                  Voice profile
                </label>
                <select
                  id="elevenlabs-voice"
                  className="select-terminal"
                  value={elevenlabsVoiceId}
                  onChange={(e) => onElevenlabsVoiceChange(e.target.value)}
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
              <label htmlFor="stt-provider" className="text-xs text-muted-foreground block mb-1.5">
                Caller voice input
              </label>
              <select
                id="stt-provider"
                className="select-terminal"
                value={sttProvider}
                onChange={(e) => onSttProviderChange(e.target.value as STTProvider)}
                disabled={status === "active"}
              >
                <option value="browser">Browser (Free)</option>
                <option value="elevenlabs">ElevenLabs Scribe (Accurate)</option>
              </select>
            </div>

            {status === "active" && (
              <p className="text-[11px] text-muted-foreground">
                Voice settings lock during an active session.
              </p>
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
