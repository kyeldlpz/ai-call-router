import type { ApiResponse } from "@/types";
import type {
  AgentConfigResponse,
  AgentConfigUpdate,
} from "@/types/agent-config";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function formatApiError(status: number, detail: string, path: string): string {
  if (status === 404) {
    return "Agent config API not found. Restart the backend server.";
  }
  if (detail && detail !== "Not Found") {
    return detail;
  }
  return `Request failed (${status}) for ${path}`;
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });
  } catch {
    const target = API_BASE || "this app origin (proxied to :8000)";
    throw new Error(`Cannot reach backend at ${target}`);
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.detail ?? body.error ?? detail;
    } catch {
      // use statusText
    }
    throw new Error(
      formatApiError(
        response.status,
        typeof detail === "string" ? detail : JSON.stringify(detail),
        path
      )
    );
  }

  return response.json() as Promise<ApiResponse<T>>;
}

export async function getAgentConfig(): Promise<AgentConfigResponse> {
  const result = await request<AgentConfigResponse>("/api/v1/agent-config");
  if (!result.data) {
    throw new Error("Agent config response missing data");
  }
  return result.data;
}

export async function updateAgentConfig(
  update: AgentConfigUpdate
): Promise<AgentConfigResponse> {
  const result = await request<AgentConfigResponse>("/api/v1/agent-config", {
    method: "PUT",
    body: JSON.stringify(update),
  });
  if (!result.data) {
    throw new Error("Agent config response missing data");
  }
  return result.data;
}

export async function resetAgentConfig(): Promise<AgentConfigResponse> {
  const result = await request<AgentConfigResponse>(
    "/api/v1/agent-config/reset",
    { method: "POST" }
  );
  if (!result.data) {
    throw new Error("Agent config response missing data");
  }
  return result.data;
}

export { API_BASE };
