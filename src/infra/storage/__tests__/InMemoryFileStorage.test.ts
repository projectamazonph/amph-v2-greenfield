import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryFileStorage } from "../InMemoryFileStorage";

describe("InMemoryFileStorage", () => {
  let storage: InMemoryFileStorage;

  beforeEach(() => {
    storage = new InMemoryFileStorage();
  });

  it("uploads and returns a fetchable url containing the key", async () => {
    const r = await storage.upload({
      key: "resources/a.pdf",
      data: Buffer.from("hello"),
      contentType: "application/pdf",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.key).toBe("resources/a.pdf");
    expect(r.value.url).toBe("https://fake-storage.test/resources/a.pdf");
  });

  it("stores the bytes, retrievable via the test helper", async () => {
    await storage.upload({ key: "k", data: Buffer.from("payload"), contentType: "text/plain" });
    expect(storage.get("k")?.toString()).toBe("payload");
  });

  it("deletes an uploaded file", async () => {
    await storage.upload({ key: "k", data: Buffer.from("x"), contentType: "text/plain" });
    const r = await storage.delete("k");
    expect(r.ok).toBe(true);
    expect(storage.has("k")).toBe(false);
  });

  it("delete is a no-op success for a missing key", async () => {
    const r = await storage.delete("missing");
    expect(r.ok).toBe(true);
  });

  it("clear() empties the store", async () => {
    await storage.upload({ key: "k", data: Buffer.from("x"), contentType: "text/plain" });
    storage.clear();
    expect(storage.has("k")).toBe(false);
  });
});
