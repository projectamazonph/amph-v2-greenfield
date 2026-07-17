import { describe, it, expect } from "vitest";
import { UlidGenerator } from "../UlidGenerator";
import { InMemoryIdGenerator } from "../InMemoryIdGenerator";

describe("UlidGenerator", () => {
  it("newId() returns a 26-character lowercase hex string", () => {
    const gen = new UlidGenerator();
    const id = gen.newId();
    expect(id).toHaveLength(26);
    expect(id).toMatch(/^[0-9a-f]{26}$/); // first 26 chars of a v4 UUID hex string
  });

  it("newId() returns different IDs on each call", () => {
    const gen = new UlidGenerator();
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(gen.newId());
    }
    expect(ids.size).toBe(1000);
  });

  it("newId() uses crypto.randomUUID (128 bits, unique)", async () => {
    const gen = new UlidGenerator();
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(gen.newId());
    }
    expect(ids.size).toBe(1000); // no duplicates
  });

  it("paymentRef() returns AMPH-{26-uppercase-hex} format", () => {
    const gen = new UlidGenerator();
    const ref = gen.paymentRef();
    expect(ref).toMatch(/^AMPH-[0-9A-F]{26}$/);
  });

  it("receiptNumber() returns AMPH-{YYYY}-{6-digit-seq}", () => {
    const gen = new UlidGenerator();
    const r1 = gen.receiptNumber();
    const r2 = gen.receiptNumber();
    expect(r1).toMatch(/^AMPH-\d{4}-\d{6}$/);
    const year = new Date().getFullYear();
    expect(r1).toContain(`AMPH-${year}`);
    // Sequence increments
    const seq1 = parseInt(r1.split("-")[2]!, 10);
    const seq2 = parseInt(r2.split("-")[2]!, 10);
    expect(seq2).toBe(seq1 + 1);
  });
});

describe("InMemoryIdGenerator (test fake)", () => {
  it("newId() returns deterministic 26-char string", () => {
    const gen = new InMemoryIdGenerator();
    expect(gen.newId()).toBe("00000000000000000000000001");
    expect(gen.newId()).toBe("00000000000000000000000002");
  });

  it("reset() rewinds the counter", () => {
    const gen = new InMemoryIdGenerator();
    gen.newId();
    gen.newId();
    gen.reset();
    expect(gen.newId()).toBe("00000000000000000000000001");
  });

  it("paymentRef() prefixes with AMPH-", () => {
    const gen = new InMemoryIdGenerator();
    expect(gen.paymentRef()).toBe("AMPH-00000000000000000000000001");
  });

  it("receiptNumber() uses current year and increments", () => {
    const gen = new InMemoryIdGenerator();
    const r = gen.receiptNumber();
    const year = new Date().getFullYear();
    expect(r).toBe(`AMPH-${year}-000001`);
  });
});
