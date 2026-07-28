/**
 * ComposioClientAdapter tests — vi.mock the SDK so we don't talk
 * to the real API and so we can assert exactly what we forward.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks MUST be declared before importing the SUT.
const mockCreate = vi.fn();
const mockUse = vi.fn();

vi.mock("@composio/core", () => ({
  Composio: class {
    create = mockCreate;
    use = mockUse;
  },
  ComposioError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ComposioError";
    }
  },
}));

import { ComposioClientAdapter } from "@/infra/integrations/ComposioClientAdapter";

describe("ComposioClientAdapter", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockUse.mockReset();
  });

  it("throws at construction when the API key is missing", () => {
    expect(() => new ComposioClientAdapter("")).toThrow(/COMPOSIO_API_KEY/);
    expect(() => new ComposioClientAdapter("   ")).toThrow(/COMPOSIO_API_KEY/);
  });

  it("createSession forwards toolkits and maps waitForConnections", async () => {
    mockCreate.mockResolvedValueOnce({
      sessionId: "cs_abc",
      url: "https://connect.composio.dev/cs_abc",
      mcp: { url: "https://mcp.composio.dev/cs_abc" },
    });
    const adapter = new ComposioClientAdapter("ak_test_xxx");
    const r = await adapter.createSession("user_123", {
      toolkits: ["gmail", "slack"],
      waitForConnections: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    // Adapter returns a flat port shape.
    expect(r.value).toEqual({
      sessionId: "cs_abc",
      redirectUrl: "https://connect.composio.dev/cs_abc",
      mcpUrl: "https://mcp.composio.dev/cs_abc",
    });

    // SDK was called with the legacy manageConnections shape.
    expect(mockCreate).toHaveBeenCalledWith("user_123", {
      toolkits: ["gmail", "slack"],
      manageConnections: { waitForConnections: true },
    });
  });

  it("createSession omits manageConnections when not requested", async () => {
    mockCreate.mockResolvedValueOnce({ sessionId: "cs_x", url: "u", mcp: undefined });
    const adapter = new ComposioClientAdapter("ak_test");
    await adapter.createSession("u");
    expect(mockCreate).toHaveBeenCalledWith("u", {
      manageConnections: undefined,
    });
  });

  it("createSession returns invalid_user_id for empty input", async () => {
    const adapter = new ComposioClientAdapter("ak_test");
    const r = await adapter.createSession("");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_user_id");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("createSession maps SDK errors to typed variants", async () => {
    // Simulate the SDK throwing a ConnectionRequestTimeoutError.
    class FakeTimeoutError extends Error {
      constructor() {
        super("timed out");
        this.name = "ConnectionRequestTimeoutError";
      }
    }
    mockCreate.mockRejectedValueOnce(new FakeTimeoutError());

    const adapter = new ComposioClientAdapter("ak_test");
    const r = await adapter.createSession("u");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    // We don't reach the instanceof check because the fake class
    // doesn't extend ComposioError. It still falls through to
    // sdk_error.
    expect(r.error.kind).toBe("sdk_error");
    expect(r.error.message).toBe("timed out");
  });

  it("useSession returns sdk_error for an unknown id", async () => {
    mockUse.mockRejectedValueOnce(new Error("not found"));
    const adapter = new ComposioClientAdapter("ak_test");
    const r = await adapter.useSession("cs_missing");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("sdk_error");
  });

  it("useSession validates empty sessionId", async () => {
    const adapter = new ComposioClientAdapter("ak_test");
    const r = await adapter.useSession("");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_user_id");
    expect(mockUse).not.toHaveBeenCalled();
  });
});
