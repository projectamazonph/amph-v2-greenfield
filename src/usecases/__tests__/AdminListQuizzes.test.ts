import { describe, it, expect, beforeEach } from "vitest";
import { AdminListQuizzes } from "../AdminListQuizzes";
import { InMemoryQuizRepository } from "@/infra/repositories/InMemoryQuizRepository";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { Result } from "@/domain/shared/Result";
import { createCourse, type Course } from "@/domain/entities/Course";
import { createQuiz, type Quiz } from "@/domain/entities/Quiz";

function makeCourse(id: string, title: string): Course {
  const r = createCourse({
    id,
    slug: id,
    title,
    tagline: "t",
    description: "d",
    priceMinor: 0,
    currency: "PHP",
    coverImage: null,
    isFeatured: false,
    displayOrder: 0,
    courseTier: "PREVIEW",
    previewLessonCount: 1,
    curriculum: {
      sections: [
        {
          id: `${id}_s1`,
          title: "Section 1",
          lessons: [
            { id: `${id}_l1`, title: "Lesson 1", type: "TEXT", content: { body: "hi" } as never },
          ],
        },
      ],
    },
  });
  if (!r.ok) throw new Error("makeCourse failed: " + JSON.stringify(r.error));
  return r.value;
}

function makeQuiz(id: string, courseId: string, title: string): Quiz {
  const r = createQuiz({
    id,
    courseId,
    title,
    passingScore: 70,
    questions: [
      {
        id: `${id}_q1`,
        questionText: "Q1?",
        options: [
          { id: `${id}_q1_o1`, optionText: "A", isCorrect: true },
          { id: `${id}_q1_o2`, optionText: "B", isCorrect: false },
        ],
      },
    ],
  });
  if (!r.ok) throw new Error("makeQuiz failed: " + JSON.stringify(r.error));
  return r.value;
}

describe("AdminListQuizzes", () => {
  let quizRepo: InMemoryQuizRepository;
  let courseRepo: InMemoryCourseRepository;

  beforeEach(() => {
    quizRepo = new InMemoryQuizRepository();
    courseRepo = new InMemoryCourseRepository();
  });

  it("returns all quizzes when no courseId filter is set", async () => {
    const c1 = makeCourse("c1", "Course 1");
    const c2 = makeCourse("c2", "Course 2");
    await courseRepo.create(c1);
    await courseRepo.create(c2);
    const q1 = makeQuiz("q1", "c1", "Quiz 1");
    const q2 = makeQuiz("q2", "c2", "Quiz 2");
    await quizRepo.create(q1);
    await quizRepo.create(q2);

    const uc = new AdminListQuizzes({ quizRepo, courseRepo });
    const r = await uc.execute({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.quizzes).toHaveLength(2);
    expect(r.value.courses.size).toBe(2);
    expect(r.value.courses.get("c1")?.title).toBe("Course 1");
    expect(r.value.courses.get("c2")?.title).toBe("Course 2");
  });

  it("filters to a single course when courseId is provided", async () => {
    await courseRepo.create(makeCourse("c1", "Course 1"));
    await courseRepo.create(makeCourse("c2", "Course 2"));
    await quizRepo.create(makeQuiz("q1", "c1", "Q1"));
    await quizRepo.create(makeQuiz("q2", "c2", "Q2"));

    const uc = new AdminListQuizzes({ quizRepo, courseRepo });
    const r = await uc.execute({ courseId: "c1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.quizzes).toHaveLength(1);
    expect(r.value.quizzes[0]?.id).toBe("q1");
    expect(r.value.courses.size).toBe(1);
  });

  it("returns empty list when no quizzes exist", async () => {
    const uc = new AdminListQuizzes({ quizRepo, courseRepo });
    const r = await uc.execute({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.quizzes).toHaveLength(0);
    expect(r.value.courses.size).toBe(0);
  });

  it("propagates db_error from the quiz repo", async () => {
    quizRepo.findAll = async () => Result.err({ kind: "db_error", message: "down" });
    const uc = new AdminListQuizzes({ quizRepo, courseRepo });
    const r = await uc.execute({});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("returns course_error if a referenced course is missing", async () => {
    // Quiz references course c1, but c1 doesn't exist in the course repo.
    await quizRepo.create(makeQuiz("q1", "missing_course", "Q1"));
    const uc = new AdminListQuizzes({ quizRepo, courseRepo });
    const r = await uc.execute({});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("course_error");
  });
});
