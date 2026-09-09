/**
 * Tests for SetAnnouncementOptOut.
 *
 * P1-07 (P4 PR-A). Round-trips: opt out -> hasOptOut true -> opt in -> false.
 */

import { describe, it, expect } from "vitest";
import { SetAnnouncementOptOut } from "../SetAnnouncementOptOut";
import { InMemoryAnnouncementOptOutRepository } from "@/infra/repositories/inmemory/InMemoryAnnouncementOptOutRepository";

describe("SetAnnouncementOptOut", () => {
  it("sets and clears the opt-out flag", async () => {
    const repo = new InMemoryAnnouncementOptOutRepository();
    const useCase = new SetAnnouncementOptOut({ optOutRepo: repo });
    const a = await useCase.execute({ userId: "u1", optedOut: true });
    expect(a.ok).toBe(true);
    const has = await repo.hasOptOut("u1");
    expect(has.ok && has.value).toBe(true);
    const b = await useCase.execute({ userId: "u1", optedOut: false });
    expect(b.ok).toBe(true);
    const has2 = await repo.hasOptOut("u1");
    expect(has2.ok && has2.value).toBe(false);
  });

  it("is idempotent on opt-in then opt-in again", async () => {
    const repo = new InMemoryAnnouncementOptOutRepository();
    const useCase = new SetAnnouncementOptOut({ optOutRepo: repo });
    await useCase.execute({ userId: "u1", optedOut: true });
    await useCase.execute({ userId: "u1", optedOut: true });
    const has = await repo.hasOptOut("u1");
    expect(has.ok && has.value).toBe(true);
  });
});
