import { describe, it, expect } from "vitest";
import { InMemoryComposioClient } from "@/infra/integrations/InMemoryComposioClient";

describe("InMemoryComposioClient", () => {
  it("createSession records the call and returns a stable id", async () => {
    const client = new InMemoryComposioClient();
    const r = await client.createSession("user_123");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.sessionId).toMatch(/^cs_test_/);
    expect(client.sessions).toHaveLength(1);
    expect(client.sessions[0]?.userId).toBe("user_123");
    expect(client.sessions[0]?.waitForConnections).toBe(false);
  });

  it("createSession persists toolkit and wait flags", async () => {
    const client = new InMemoryComposioClient();
    await client.createSession("u", { toolkits: ["gmail", "slack"], waitForConnections: true });
    expect(client.sessions[0]).toMatchObject({
      userId: "u",
      toolkits: ["gmail", "slack"],
      waitForConnections: true,
    });
  });

  it("createSession returns invalid_user_id for an empty userId", async () => {
    const client = new InMemoryComposioClient();
    const r = await client.createSession("   ");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_user_id");
  });

  it("useSession round-trips a previously created id", async () => {
    const client = new InMemoryComposioClient();
    const created = await client.createSession("u");
    if (!created.ok) throw new Error("setup");
    const used = await client.useSession(created.value.sessionId);
    expect(used.ok).toBe(true);
    if (!used.ok) return;
    expect(used.value.sessionId).toBe(created.value.sessionId);
  });

  it("useSession returns sdk_error for an unknown id", async () => {
    const client = new InMemoryComposioClient();
    const r = await client.useSession("nope");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("sdk_error");
  });

  it("setFailure makes the next call fail and then clears", async () => {
    const client = new InMemoryComposioClient();
    client.setFailure({ kind: "connection_request_timeout", message: "boom" });
    const r = await client.createSession("u");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("connection_request_timeout");

    // Cleared automatically — next call succeeds.
    const r2 = await client.createSession("u");
    expect(r2.ok).toBe(true);
  });

  it("clear resets all state", async () => {
    const client = new InMemoryComposioClient();
    await client.createSession("u");
    client.clear();
    expect(client.sessions).toHaveLength(0);
    const r = await client.useSession("cs_test_1");
    expect(r.ok).toBe(false);
  });
});
