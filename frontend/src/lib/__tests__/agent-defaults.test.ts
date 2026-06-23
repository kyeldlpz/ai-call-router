import { describe, expect, it } from "vitest";

import { COLLECTIONS_DEFAULT_CONFIG } from "@/lib/agent-defaults";

describe("agent-defaults", () => {
  it("ships a non-empty collections default config", () => {
    expect(COLLECTIONS_DEFAULT_CONFIG.persona).toContain("RecoverAi");
    expect(COLLECTIONS_DEFAULT_CONFIG.scope).toContain("Balance and payment");
    expect(COLLECTIONS_DEFAULT_CONFIG.deferToHuman).toContain("Hand off");
    expect(COLLECTIONS_DEFAULT_CONFIG.conversationRules).toContain(
      "CONVERSATION RULES"
    );
  });
});
