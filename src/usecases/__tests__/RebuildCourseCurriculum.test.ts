/**
 * RebuildCourseCurriculum.test.ts — audit hardening follow-up
 * (docs/audit-2026-07-26-hardening-review.md, STORY-048b/c follow-up).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RebuildCourseCurriculum } from "@/usecases/RebuildCourseCurriculum";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryModuleRepository } from "@/infra/repositories/InMemoryModuleRepository";
import { InMemoryLessonRepository } from "@/infra/repositories/InMemoryLessonRepository";
import { createCourse } from "@/domain/entities/Course";
import { createModule } from "@/domain/entities/Module";
import { createLesson } from "@/domain/entities/Lesson";
import { SilentLogger } from "@/infra/observability/SilentLogger";

function seedCourse(repo: InMemoryCourseRepository) {
  const r = createCourse({
    id: "course_01",
    slug: "ppc-foundations",
    title: "PPC Foundations",
    tagline: "Learn PPC",
    description: "desc",
    priceMinor: 299900,
    // Stale stub curriculum from creation — should be overwritten by rebuild.
    curriculum: {
      sections: [
        {
          id: "stub",
          title: "Stub",
          lessons: [{ id: "stub-l", title: "Stub", type: "TEXT", content: "" }],
        },
      ],
    },
    status: "PUBLISHED",
  });
  if (!r.ok) throw new Error("seed failed");
  repo.seed([r.value]);
  return r.value;
}

async function seedModuleWithLessons(
  moduleRepo: InMemoryModuleRepository,
  lessonRepo: InMemoryLessonRepository,
  params: {
    id: string;
    courseId: string;
    title: string;
    displayOrder: number;
    lessons: Array<{ id: string; title: string }>;
  },
) {
  const modResult = createModule({
    id: params.id,
    courseId: params.courseId,
    title: params.title,
    displayOrder: params.displayOrder,
  });
  if (!modResult.ok) throw new Error("module seed failed");
  await moduleRepo.create(modResult.value);

  for (const [i, l] of params.lessons.entries()) {
    const lesResult = createLesson({
      id: l.id,
      moduleId: params.id,
      title: l.title,
      type: "TEXT",
      content: { body: "hello" },
      displayOrder: i + 1,
    });
    if (!lesResult.ok) throw new Error("lesson seed failed");
    await lessonRepo.create(lesResult.value);
  }
}

describe("RebuildCourseCurriculum", () => {
  let courseRepo: InMemoryCourseRepository;
  let moduleRepo: InMemoryModuleRepository;
  let lessonRepo: InMemoryLessonRepository;
  let useCase: RebuildCourseCurriculum;

  beforeEach(() => {
    courseRepo = new InMemoryCourseRepository();
    moduleRepo = new InMemoryModuleRepository();
    lessonRepo = new InMemoryLessonRepository();
    useCase = new RebuildCourseCurriculum({
      courseRepo,
      moduleRepo,
      lessonRepo,
      logger: new SilentLogger(),
    });
  });

  it("rebuilds curriculum from the current Module/Lesson rows and persists it", async () => {
    seedCourse(courseRepo);
    await seedModuleWithLessons(moduleRepo, lessonRepo, {
      id: "mod_1",
      courseId: "course_01",
      title: "Intro",
      displayOrder: 1,
      lessons: [{ id: "les_1", title: "Welcome" }],
    });

    const result = await useCase.execute("course_01");
    expect(result.rebuilt).toBe(true);

    const found = await courseRepo.findById("course_01");
    if (!found.ok) throw new Error("expected course");
    expect(found.value.curriculum.sections).toHaveLength(1);
    expect(found.value.curriculum.sections[0]?.id).toBe("mod_1");
    expect(found.value.curriculum.sections[0]?.lessons[0]?.id).toBe("les_1");
  });

  it("fixes the drift bug: a lesson added via the admin editor is reachable after rebuild", async () => {
    // This is the exact bug from docs/audit-2026-07-26-hardening-review.md:
    // a lesson added via Module/Lesson shows in the catalog but wasn't
    // reflected in Course.curriculum (read by lesson viewing/access
    // control), so it 404'd/was access-denied when opened.
    const course = seedCourse(courseRepo);
    expect(course.curriculum.sections.flatMap((s) => s.lessons.map((l) => l.id))).not.toContain(
      "les_new",
    );

    await seedModuleWithLessons(moduleRepo, lessonRepo, {
      id: "mod_1",
      courseId: "course_01",
      title: "Intro",
      displayOrder: 1,
      lessons: [{ id: "les_new", title: "New lesson" }],
    });

    await useCase.execute("course_01");

    const found = await courseRepo.findById("course_01");
    if (!found.ok) throw new Error("expected course");
    const lessonIds = found.value.curriculum.sections.flatMap((s) => s.lessons.map((l) => l.id));
    expect(lessonIds).toContain("les_new");
  });

  it("preserves every other Course field (status, displayOrder, etc.)", async () => {
    seedCourse(courseRepo);
    await seedModuleWithLessons(moduleRepo, lessonRepo, {
      id: "mod_1",
      courseId: "course_01",
      title: "Intro",
      displayOrder: 1,
      lessons: [{ id: "les_1", title: "Welcome" }],
    });

    await useCase.execute("course_01");

    const found = await courseRepo.findById("course_01");
    if (!found.ok) throw new Error("expected course");
    expect(found.value.status).toBe("PUBLISHED");
    expect(found.value.slug).toBe("ppc-foundations");
    expect(found.value.title).toBe("PPC Foundations");
  });

  it("orders sections/lessons to match the modules/lessons repos' displayOrder-ascending contract", async () => {
    seedCourse(courseRepo);
    await seedModuleWithLessons(moduleRepo, lessonRepo, {
      id: "mod_2",
      courseId: "course_01",
      title: "Second",
      displayOrder: 2,
      lessons: [{ id: "les_2", title: "L2" }],
    });
    await seedModuleWithLessons(moduleRepo, lessonRepo, {
      id: "mod_1",
      courseId: "course_01",
      title: "First",
      displayOrder: 1,
      lessons: [{ id: "les_1", title: "L1" }],
    });

    await useCase.execute("course_01");

    const found = await courseRepo.findById("course_01");
    if (!found.ok) throw new Error("expected course");
    // InMemoryModuleRepository.findByCourseId sorts by displayOrder asc
    expect(found.value.curriculum.sections.map((s) => s.id)).toEqual(["mod_1", "mod_2"]);
  });

  it("returns rebuilt: false and does not throw when the course doesn't exist", async () => {
    const result = await useCase.execute("nonexistent");
    expect(result.rebuilt).toBe(false);
  });

  it("returns rebuilt: false when moduleRepo.findByCourseId fails", async () => {
    seedCourse(courseRepo);
    moduleRepo.findByCourseId = async () => ({
      ok: false,
      error: { kind: "db_error", message: "list failed" },
    });

    const result = await useCase.execute("course_01");
    expect(result.rebuilt).toBe(false);
  });

  it("returns rebuilt: false when lessonRepo.findByModuleId fails", async () => {
    seedCourse(courseRepo);
    await seedModuleWithLessons(moduleRepo, lessonRepo, {
      id: "mod_1",
      courseId: "course_01",
      title: "Intro",
      displayOrder: 1,
      lessons: [{ id: "les_1", title: "Welcome" }],
    });
    lessonRepo.findByModuleId = async () => ({
      ok: false,
      error: { kind: "db_error", message: "list failed" },
    });

    const result = await useCase.execute("course_01");
    expect(result.rebuilt).toBe(false);
  });

  it("returns rebuilt: false when courseRepo.update fails", async () => {
    seedCourse(courseRepo);
    courseRepo.update = async () => ({
      ok: false,
      error: { kind: "db_error", message: "update failed" },
    });

    const result = await useCase.execute("course_01");
    expect(result.rebuilt).toBe(false);
  });
});
