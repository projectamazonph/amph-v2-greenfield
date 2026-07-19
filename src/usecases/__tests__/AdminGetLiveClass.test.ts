import { describe, it, expect, beforeEach } from "vitest";
import { AdminGetLiveClass } from "../AdminGetLiveClass";
import { InMemoryLiveClassRepository } from "@/infra/live-class/InMemoryLiveClassRepository";
import { createLiveClass } from "@/domain/entities/LiveClass";

function makeLiveClass(overrides: Partial<Parameters<typeof createLiveClass>[0]> = {}) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const r = createLiveClass({
    id: "lc_1",
    courseId: "course_1",
    title: "Live Class 1",
    scheduledAt: futureDate,
    durationMinutes: 60,
    instructorId: "instructor_1",
    meetingUrl: "https://zoom.us/j/111",
    status: "scheduled" as const,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("AdminGetLiveClass", () => {
  let repo: InMemoryLiveClassRepository;
  let useCase: AdminGetLiveClass;

  beforeEach(() => {
    repo = new InMemoryLiveClassRepository();
    useCase = new AdminGetLiveClass({ liveClassRepo: repo });
  });

  it("returns the live class when found", async () => {
    const lc = makeLiveClass({ id: "lc_found" });
    repo.seed(lc);

    const r = await useCase.execute("lc_found");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.id).toBe("lc_found");
  });

  it("returns not_found when the live class does not exist", async () => {
    const r = await useCase.execute("nonexistent");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  it("returns db_error on repository failure", async () => {
    const badRepo = new InMemoryLiveClassRepository();
    badRepo.findById = async () => ({
      ok: false,
      error: { kind: "db_error", message: "boom" },
    });
    const uc = new AdminGetLiveClass({ liveClassRepo: badRepo });
    const r = await uc.execute("lc_1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
