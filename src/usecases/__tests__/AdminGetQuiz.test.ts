import { describe, it, expect, beforeEach } from "vitest";
import { AdminGetQuiz } from "../AdminGetQuiz";
import { InMemoryQuizRepository } from "@/infra/repositories/InMemoryQuizRepository";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { Result } from "@/domain/shared/Result";
import { createCourse, type Course } from "@/domain/entities/Course";
import { createQuiz, type Quiz } from "@/domain/entities/Quiz";

function makeCourse(id: string): Course {
  const r = createCourse({
    id,
    slug: id,
    title: `Course ${id}`,
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

function makeQuiz(id: string, courseId: string): Quiz {
  const r = createQuiz({
    id,
    courseId,
    title: "Quiz",
    passingScore: 70,
    questions: [
      {
        id: `${id}_q1`,
        questionText: "Q?",
        options: [
          { id: "o1", optionText: "A", isCorrect: true },
          { id: "o2", optionText: "B", isCorrect: false },
        ],
      },
    ],
  });
  if (!r.ok) throw new Error("makeQuiz failed: " + JSON.stringify(r.error));
  return r.value;
}

describe("AdminGetQuiz", () => {
  let quizRepo: InMemoryQuizRepository;
  let courseRepo: InMemoryCourseRepository;

  beforeEach(() => {
    quizRepo = new InMemoryQuizRepository();
    courseRepo = new InMemoryCourseRepository();
  });

  it("returns the quiz and its course", async () => {
    const c = makeCourse("c1");
    const q = makeQuiz("q1", "c1");
    await courseRepo.create(c);
    await quizRepo.create(q);

    const uc = new AdminGetQuiz({ quizRepo, courseRepo });
    const r = await uc.execute({ quizId: "q1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.quiz.id).toBe("q1");
    expect(r.value.course.id).toBe("c1");
  });

  it("returns quiz_not_found when no quiz exists with that id", async () => {
    const uc = new AdminGetQuiz({ quizRepo, courseRepo });
    const r = await uc.execute({ quizId: "missing" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("quiz_not_found");
  });

  it("returns course_not_found when the quiz's course is missing", async () => {
    await quizRepo.create(makeQuiz("q1", "missing_course"));
    const uc = new AdminGetQuiz({ quizRepo, courseRepo });
    const r = await uc.execute({ quizId: "q1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("course_not_found");
  });

  it("propagates db_error from the quiz repo", async () => {
    quizRepo.findById = async () => Result.err({ kind: "db_error", message: "down" });
    const uc = new AdminGetQuiz({ quizRepo, courseRepo });
    const r = await uc.execute({ quizId: "q1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
