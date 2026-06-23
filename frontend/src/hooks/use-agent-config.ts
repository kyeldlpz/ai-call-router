"use client";

import { useCallback, useEffect, useState } from "react";

import { COLLECTIONS_DEFAULT_CONFIG } from "@/lib/agent-defaults";
import {
  getAgentConfig,
  resetAgentConfig,
  updateAgentConfig,
} from "@/lib/api";
import type {
  AgentConfig,
  AgentConfigResponse,
  AgentConfigUpdate,
} from "@/types/agent-config";

interface UseAgentConfigResult {
  effectiveConfig: AgentConfig;
  isCustomized: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isSynced: boolean;
  loadError: string | null;
  refresh: () => Promise<void>;
  save: (update: AgentConfigUpdate) => Promise<void>;
  reset: () => Promise<void>;
}

export function useAgentConfig(): UseAgentConfigResult {
  const [data, setData] = useState<AgentConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const applyResponse = useCallback((response: AgentConfigResponse) => {
    setData(response);
    setLoadError(null);
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getAgentConfig();
      applyResponse(response);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load agent config"
      );
    } finally {
      setIsLoading(false);
    }
  }, [applyResponse]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (update: AgentConfigUpdate) => {
      setIsSaving(true);
      try {
        const response = await updateAgentConfig(update);
        applyResponse(response);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save agent config";
        setLoadError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [applyResponse]
  );

  const reset = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await resetAgentConfig();
      applyResponse(response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reset agent config";
      setLoadError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [applyResponse]);

  const effectiveConfig = data?.config ?? COLLECTIONS_DEFAULT_CONFIG;

  return {
    effectiveConfig,
    isCustomized: data?.isCustomized ?? false,
    isLoading,
    isSaving,
    isSynced: data !== null && loadError === null,
    loadError,
    refresh,
    save,
    reset,
  };
}
