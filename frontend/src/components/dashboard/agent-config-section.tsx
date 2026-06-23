"use client";

import { useState } from "react";
import { Bot } from "lucide-react";

import { AgentConfigDialog } from "@/components/dashboard/agent-config-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgentConfig, AgentConfigUpdate } from "@/types/agent-config";

interface AgentConfigSectionProps {
  effectiveConfig: AgentConfig;
  isCustomized: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isSynced: boolean;
  loadError: string | null;
  locked: boolean;
  onSave: (update: AgentConfigUpdate) => Promise<void>;
  onReset: () => Promise<void>;
  onRetry: () => Promise<void>;
}

export function AgentConfigSection({
  effectiveConfig,
  isCustomized,
  isLoading,
  isSaving,
  isSynced,
  loadError,
  locked,
  onSave,
  onReset,
  onRetry,
}: AgentConfigSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const presetLabel = !isSynced
    ? isLoading
      ? "Syncing…"
      : "Local default"
    : isCustomized || effectiveConfig.presetId === "custom"
      ? "Custom"
      : "Collections Default";

  const previewLines = [effectiveConfig.persona, effectiveConfig.scope]
    .map((text) => text.split("\n")[0]?.trim())
    .filter(Boolean)
    .slice(0, 2);

  return (
    <section className="pt-2 border-t border-border">
      <p className="label-caps mb-3">Agent</p>
      <div className="rounded border border-border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            Behavior preset
          </p>
          <span
            className={cn(
              "text-[11px] font-medium px-2 py-0.5 rounded border tabular-nums",
              !isSynced
                ? "bg-score-low/10 text-score-low border-score-low/30"
                : isCustomized
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-muted text-muted-foreground border-border"
            )}
          >
            {presetLabel}
          </span>
        </div>

        <div className="space-y-1">
          {previewLines.map((line) => (
            <p
              key={line}
              className="text-xs text-foreground/80 leading-relaxed line-clamp-2"
            >
              {line}
            </p>
          ))}
        </div>

        {isLoading && isSynced && (
          <p className="text-[11px] text-muted-foreground">Syncing…</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer min-h-11"
            disabled={locked}
            onClick={() => setDialogOpen(true)}
          >
            Customize
          </Button>
          {isSynced && isCustomized && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="cursor-pointer min-h-11"
              disabled={locked || isSaving}
              onClick={() => void onReset()}
            >
              Reset to default
            </Button>
          )}
          {loadError && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="cursor-pointer min-h-11"
              disabled={isLoading}
              onClick={() => void onRetry()}
            >
              Retry
            </Button>
          )}
        </div>

        {locked && (
          <p className="text-[11px] text-muted-foreground">
            Agent settings lock during an active session.
          </p>
        )}

        {loadError && (
          <p className="text-[11px] text-red-400" role="alert">
            {loadError}
          </p>
        )}
      </div>

      <AgentConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        effectiveConfig={effectiveConfig}
        isSaving={isSaving}
        isSynced={isSynced}
        loadError={loadError}
        locked={locked}
        onSave={onSave}
      />
    </section>
  );
}
