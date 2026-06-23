"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { AgentConfig, AgentConfigUpdate } from "@/types/agent-config";

interface AgentConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  effectiveConfig: AgentConfig;
  isSaving: boolean;
  isSynced: boolean;
  loadError: string | null;
  locked: boolean;
  onSave: (update: AgentConfigUpdate) => Promise<void>;
}

export function AgentConfigDialog({
  open,
  onOpenChange,
  effectiveConfig,
  isSaving,
  isSynced,
  loadError,
  locked,
  onSave,
}: AgentConfigDialogProps) {
  const [persona, setPersona] = useState(effectiveConfig.persona);
  const [scope, setScope] = useState(effectiveConfig.scope);
  const [deferToHuman, setDeferToHuman] = useState(effectiveConfig.deferToHuman);
  const [conversationRules, setConversationRules] = useState(
    effectiveConfig.conversationRules
  );
  const [customSystemPrompt, setCustomSystemPrompt] = useState(
    effectiveConfig.customSystemPrompt ?? ""
  );
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(effectiveConfig.customSystemPrompt)
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPersona(effectiveConfig.persona);
    setScope(effectiveConfig.scope);
    setDeferToHuman(effectiveConfig.deferToHuman);
    setConversationRules(effectiveConfig.conversationRules);
    setCustomSystemPrompt(effectiveConfig.customSystemPrompt ?? "");
    setShowAdvanced(Boolean(effectiveConfig.customSystemPrompt));
    setSaveError(null);
  }, [effectiveConfig, open]);

  const handleSave = async () => {
    setSaveError(null);
    try {
      await onSave({
        persona,
        scope,
        deferToHuman,
        conversationRules,
        customSystemPrompt: customSystemPrompt.trim() || null,
      });
      onOpenChange(false);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save agent config"
      );
    }
  };

  const readOnly = locked || !isSynced;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Agent behavior"
      description="Configure how the AI answers inbound calls. Safety guardrails always apply."
    >
      <div className="space-y-5">
        {loadError && (
          <div
            className="rounded border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
            role="status"
          >
            Showing default template. Connect backend to save changes.
          </div>
        )}

        <Field
          id="agent-persona"
          label="Persona & tone"
          value={persona}
          onChange={setPersona}
          disabled={readOnly}
          rows={6}
        />
        <Field
          id="agent-scope"
          label="What I can help with"
          value={scope}
          onChange={setScope}
          disabled={readOnly}
          rows={5}
        />
        <Field
          id="agent-defer"
          label="Hand off to human"
          value={deferToHuman}
          onChange={setDeferToHuman}
          disabled={readOnly}
          rows={4}
        />
        <Field
          id="agent-rules"
          label="Conversation rules"
          value={conversationRules}
          onChange={setConversationRules}
          disabled={readOnly}
          rows={4}
        />

        <div className="border-t border-border pt-3">
          <button
            type="button"
            className="text-xs text-primary hover:underline cursor-pointer"
            onClick={() => setShowAdvanced((v) => !v)}
            disabled={readOnly}
          >
            {showAdvanced ? "Hide advanced" : "Show advanced"}
          </button>
          {showAdvanced && (
            <div className="mt-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Full system prompt override. Safety guardrails are still appended.
              </p>
              <Textarea
                id="agent-custom-prompt"
                value={customSystemPrompt}
                onChange={(e) => setCustomSystemPrompt(e.target.value)}
                disabled={readOnly}
                rows={6}
                spellCheck={false}
                placeholder="Leave empty to use structured fields above"
              />
            </div>
          )}
        </div>

        {locked && (
          <p className="text-[11px] text-muted-foreground">
            Agent settings lock during an active session.
          </p>
        )}

        {saveError && (
          <p className="text-xs text-red-400" role="alert">
            {saveError}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer min-h-11 min-w-[88px]"
            onClick={() => onOpenChange(false)}
          >
            {readOnly && !locked ? "Close" : "Cancel"}
          </Button>
          <Button
            type="button"
            className="cursor-pointer min-h-11 min-w-[88px]"
            disabled={readOnly || isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? "Saving…" : "Apply"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  disabled,
  rows,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  rows: number;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="label-caps block">
        {label}
      </label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        spellCheck={false}
      />
    </div>
  );
}
