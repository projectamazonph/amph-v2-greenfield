/**
 * CancelLiveClassRsvp — STORY-091.
 *
 * The cancel use case itself is also covered (with a describe block) by
 * RsvpLiveClass.test.ts — this file exists to satisfy the TDD-compliance
 * coverage check (`tests/architecture/use-case-coverage.test.ts`) which
 * requires a `{Name}.test.ts` file for every use case class.
 */

import { describe, it, expect } from "vitest";
import { CancelLiveClassRsvp } from "@/usecases/CancelLiveClassRsvp";
import { createLiveClassRegistration } from "@/domain/entities/LiveClassRegistration";
import { InMemoryLiveClassRegistrationRepository } from "@/infra/repositories/inmemory/InMemoryLiveClassRegistrationRepository";
import { FixedClock } from "@/ports/system/Clock";

describe("CancelLiveClassRsvp use case (coverage)", () => {
  it("exports a class with an execute method", () => {
    expect(typeof CancelLiveClassRsvp).toBe("function");
    expect(typeof CancelLiveClassRsvp.prototype.execute).toBe("function");
  });

  it("returns not_registered when the user has no RSVP for the live class", async () => {
    const useCase = new CancelLiveClassRsvp({
      liveClassRegistrationRepo: new InMemoryLiveClassRegistrationRepository(),
      clock: new FixedClock(new Date()),
    });
    const r = await useCase.execute({ userId: "u-1", liveClassId: "lc-1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_registered");
  });

  it("cancels an existing registered RSVP and stamps cancelledAt", async () => {
    const repo = new InMemoryLiveClassRegistrationRepository();
    const seedResult = createLiveClassRegistration({
      id: "r-1",
      userId: "u-1",
      liveClassId: "lc-1",
    });
    expect(seedResult.ok).toBe(true);
    if (!seedResult.ok) return;
    const created = await repo.create(seedResult.value);
    expect(created.ok).toBe(true);

    const cancelAt = new Date("2026-08-02T00:00:00Z");
    const useCase = new CancelLiveClassRsvp({
      liveClassRegistrationRepo: repo,
      clock: new FixedClock(cancelAt),
    });
    const r = await useCase.execute({ userId: "u-1", liveClassId: "lc-1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe("cancelled");
    expect(r.value.cancelledAt?.toISOString()).toBe(cancelAt.toISOString());
  });
});