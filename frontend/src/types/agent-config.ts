export type AgentPresetId = "collections_default" | "custom";

export interface AgentConfig {
  presetId: AgentPresetId;
  persona: string;
  scope: string;
  deferToHuman: string;
  conversationRules: string;
  customSystemPrompt: string | null;
  updatedAt: string;
}

export interface AgentConfigResponse {
  config: AgentConfig;
  composedPreview: string;
  isCustomized: boolean;
}

export interface AgentConfigUpdate {
  presetId?: AgentPresetId;
  persona?: string;
  scope?: string;
  deferToHuman?: string;
  conversationRules?: string;
  customSystemPrompt?: string | null;
}
