import { describe, it, expect, beforeEach } from "vitest";
import { AdminListLiveClasses } from "../AdminListLiveClasses";
import { InMemoryLiveClassRepository } from "@/infra/live-class/InMemoryLiveClassRepository";
import { createLiveClass } from "@/domain/entities/LiveClass";

const futureDate = (daysAhead: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(10, 0, 0, 0);
  return d;
};

function makeLiveClass(overrides: Partial<Parameters<typeof createLiveClass>[0]> = {}) {
  const r = createLiveClass({
    id: "lc_1",
    courseId: "course_1",
    title: "Live Class 1",
    scheduledAt: futureDate(7),
    durationMinutes: 60,
    instructorId: "instructor_1",
    meetingUrl: "https://zoom.us/j/111",
    status: "scheduled" as const,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("AdminListLiveClasses", () => {
  let repo: InMemoryLiveClassRepository;
  let useCase: AdminListLiveClasses;

  beforeEach(() => {
    repo = new InMemoryLiveClassRepository();
    useCase = new AdminListLiveClasses({ liveClassRepo: repo });
  });

  it("returns all live classes sorted by scheduledAt", async () => {
    repo.seed(makeLiveClass({ id: "lc_2", scheduledAt: futureDate(5) }));
    repo.seed(makeLiveClass({ id: "lc_1", scheduledAt: futureDate(10) }));

    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(2);
    expect(r.value[0]!.id).toBe("lc_2"); // earlier date first
    expect(r.value[1]!.id).toBe("lc_1");
  });

  it("filters by courseId", async () => {
    repo.seed(makeLiveClass({ id: "lc_1", courseId: "course_1" }));
    repo.seed(makeLiveClass({ id: "lc_2", courseId: "course_2" }));

    const r = await useCase.execute({ courseId: "course_1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(1);
    expect(r.value[0]!.courseId).toBe("course_1");
  });

  it("excludes cancelled live classes", async () => {
    repo.seed(makeLiveClass({ id: "lc_active", status: "scheduled" as const }));
    repo.seed(makeLiveClass({ id: "lc_cancelled", status: "cancelled" as const }));

    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.map((lc) => lc.id)).toEqual(["lc_active"]);
  });

  it("returns empty list when no live classes", async () => {
    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(0);
  });

  it("returns db_error on repository failure", async () => {
    const badRepo = new InMemoryLiveClassRepository();
    badRepo.listAll = async () => ({
      ok: false,
      error: { kind: "db_error", message: "boom" },
    });
    const uc = new AdminListLiveClasses({ liveClassRepo: badRepo });
    const r = await uc.execute();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
