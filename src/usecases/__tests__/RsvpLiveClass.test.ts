/**
 * RsvpLiveClass + CancelLiveClassRsvp — STORY-091.
 */

import { describe, expect, it } from "vitest";
import {
  createLiveClassRegistration,
  type LiveClassRegistration,
} from "@/domain/entities/LiveClassRegistration";
import { createLiveClass } from "@/domain/entities/LiveClass";
import { RsvpLiveClass } from "@/usecases/RsvpLiveClass";
import { CancelLiveClassRsvp } from "@/usecases/CancelLiveClassRsvp";
import { InMemoryLiveClassRegistrationRepository } from "@/infra/repositories/inmemory/InMemoryLiveClassRegistrationRepository";
import { InMemoryLiveClassRepository } from "@/infra/live-class/InMemoryLiveClassRepository";
import { FixedClock } from "@/ports/system/Clock";
import { UlidGenerator } from "@/infra/system/UlidGenerator";
import type { ILiveClassRepository } from "@/ports/repositories/ILiveClassRepository";

function makeClass(opts: { status?: "scheduled" | "cancelled" | "completed" } = {}) {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const result = createLiveClass({
    id: "lc-1",
    courseId: "c-1",
    title: "Bid elevator clinic",
    scheduledAt: future,
    durationMinutes: 60,
    instructorId: "u-1",
    meetingUrl: "https://zoom.example/lc-1",
    status: opts.status ?? "scheduled",
  });
  if (!result.ok) throw new Error("seed");
  return result.value;
}

function makeRepo(classes: ReturnType<typeof makeClass>[] = []): ILiveClassRepository {
  const repo = new InMemoryLiveClassRepository();
  for (const c of classes) {
    void repo.create(c);
  }
  return repo;
}

describe("RsvpLiveClass", () => {
  it("creates a registration when the class exists and is scheduled", async () => {
    const liveClassRepo = makeRepo([makeClass()]);
    const liveClassRegistrationRepo =
      new InMemoryLiveClassRegistrationRepository();
    const useCase = new RsvpLiveClass({
      liveClassRepo,
      liveClassRegistrationRepo,
      ids: new UlidGenerator(),
      clock: new FixedClock(new Date("2026-08-01T00:00:00Z")),
    });
    const r = await useCase.execute({
      userId: "u-2",
      liveClassId: "lc-1",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.status).toBe("registered");
      expect(r.value.userId).toBe("u-2");
      expect(r.value.liveClassId).toBe("lc-1");
      expect(r.value.id).toBeTruthy();
    }
  });

  it("rejects when the live class does not exist", async () => {
    const liveClassRepo = makeRepo([]);
    const liveClassRegistrationRepo =
      new InMemoryLiveClassRegistrationRepository();
    const useCase = new RsvpLiveClass({
      liveClassRepo,
      liveClassRegistrationRepo,
      ids: new UlidGenerator(),
      clock: new FixedClock(new Date()),
    });
    const r = await useCase.execute({
      userId: "u-2",
      liveClassId: "missing",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("not_found");
  });

  it("rejects when the class is cancelled", async () => {
    const liveClassRepo = makeRepo([
      makeClass({ status: "cancelled" }),
    ]);
    const liveClassRegistrationRepo =
      new InMemoryLiveClassRegistrationRepository();
    const useCase = new RsvpLiveClass({
      liveClassRepo,
      liveClassRegistrationRepo,
      ids: new UlidGenerator(),
      clock: new FixedClock(new Date()),
    });
    const r = await useCase.execute({
      userId: "u-2",
      liveClassId: "lc-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("class_cancelled_or_completed");
  });

  it("is idempotent when the user is already registered", async () => {
    const liveClassRepo = makeRepo([makeClass()]);
    const liveClassRegistrationRepo =
      new InMemoryLiveClassRegistrationRepository();
    const existing = createLiveClassRegistration({
      id: "r-1",
      userId: "u-2",
      liveClassId: "lc-1",
    });
    if (!existing.ok) throw new Error("seed");
    const seedReg: LiveClassRegistration = {
      ...existing.value,
      status: "registered",
      registeredAt: new Date("2026-08-01T00:00:00Z"),
      createdAt: new Date("2026-08-01T00:00:00Z"),
      updatedAt: new Date("2026-08-01T00:00:00Z"),
    };
    await liveClassRegistrationRepo.create(seedReg);

    const useCase = new RsvpLiveClass({
      liveClassRepo,
      liveClassRegistrationRepo,
      ids: new UlidGenerator(),
      clock: new FixedClock(new Date("2026-08-01T00:00:00Z")),
    });
    const r = await useCase.execute({
      userId: "u-2",
      liveClassId: "lc-1",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.id).toBe("r-1");
  });

  it("re-registers a cancelled RSVP", async () => {
    const liveClassRepo = makeRepo([makeClass()]);
    const liveClassRegistrationRepo =
      new InMemoryLiveClassRegistrationRepository();
    const existing = createLiveClassRegistration({
      id: "r-1",
      userId: "u-2",
      liveClassId: "lc-1",
    });
    if (!existing.ok) throw new Error("seed");
    const seedReg: LiveClassRegistration = {
      ...existing.value,
      status: "cancelled",
      cancelledAt: new Date("2026-08-01T00:00:00Z"),
      registeredAt: new Date("2026-07-01T00:00:00Z"),
      createdAt: new Date("2026-07-01T00:00:00Z"),
      updatedAt: new Date("2026-08-01T00:00:00Z"),
    };
    await liveClassRegistrationRepo.create(seedReg);

    const useCase = new RsvpLiveClass({
      liveClassRepo,
      liveClassRegistrationRepo,
      ids: new UlidGenerator(),
      clock: new FixedClock(new Date("2026-08-02T00:00:00Z")),
    });
    const r = await useCase.execute({
      userId: "u-2",
      liveClassId: "lc-1",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.status).toBe("registered");
      expect(r.value.cancelledAt).toBeNull();
    }
  });
});

describe("CancelLiveClassRsvp", () => {
  it("cancels an existing registration", async () => {
    const liveClassRegistrationRepo =
      new InMemoryLiveClassRegistrationRepository();
    const existing = createLiveClassRegistration({
      id: "r-1",
      userId: "u-2",
      liveClassId: "lc-1",
    });
    if (!existing.ok) throw new Error("seed");
    const seedReg: LiveClassRegistration = {
      ...existing.value,
      status: "registered",
      registeredAt: new Date("2026-08-01T00:00:00Z"),
      createdAt: new Date("2026-08-01T00:00:00Z"),
      updatedAt: new Date("2026-08-01T00:00:00Z"),
    };
    await liveClassRegistrationRepo.create(seedReg);

    const useCase = new CancelLiveClassRsvp({
      liveClassRegistrationRepo,
      clock: new FixedClock(new Date("2026-08-02T00:00:00Z")),
    });
    const r = await useCase.execute({
      userId: "u-2",
      liveClassId: "lc-1",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.status).toBe("cancelled");
      expect(r.value.cancelledAt?.toISOString()).toBe(
        "2026-08-02T00:00:00.000Z",
      );
    }
  });

  it("rejects when the user has not registered", async () => {
    const useCase = new CancelLiveClassRsvp({
      liveClassRegistrationRepo: new InMemoryLiveClassRegistrationRepository(),
      clock: new FixedClock(new Date()),
    });
    const r = await useCase.execute({
      userId: "u-2",
      liveClassId: "lc-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("not_registered");
  });

  it("is idempotent — cancelling an already-cancelled RSVP is a no-op", async () => {
    const liveClassRegistrationRepo =
      new InMemoryLiveClassRegistrationRepository();
    const existing = createLiveClassRegistration({
      id: "r-1",
      userId: "u-2",
      liveClassId: "lc-1",
    });
    if (!existing.ok) throw new Error("seed");
    const seedReg: LiveClassRegistration = {
      ...existing.value,
      status: "cancelled",
      cancelledAt: new Date("2026-08-01T00:00:00Z"),
      registeredAt: new Date("2026-07-01T00:00:00Z"),
      createdAt: new Date("2026-07-01T00:00:00Z"),
      updatedAt: new Date("2026-08-01T00:00:00Z"),
    };
    await liveClassRegistrationRepo.create(seedReg);

    const useCase = new CancelLiveClassRsvp({
      liveClassRegistrationRepo,
      clock: new FixedClock(new Date("2026-08-02T00:00:00Z")),
    });
    const r = await useCase.execute({
      userId: "u-2",
      liveClassId: "lc-1",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.status).toBe("cancelled");
      expect(r.value.cancelledAt?.toISOString()).toBe(
        "2026-08-01T00:00:00.000Z",
      );
    }
  });
});