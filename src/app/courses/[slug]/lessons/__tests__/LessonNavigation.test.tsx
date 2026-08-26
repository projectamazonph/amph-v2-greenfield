// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LessonSidebar } from "../LessonSidebar";
import { LessonNavButtons } from "../LessonNavButtons";

const course = {
  slug: "foundations",
  title: "Amazon PPC Foundations",
  curriculum: {
    sections: [
      {
        id: "section-1",
        title: "Foundations",
        lessons: [
          { id: "lesson-1", title: "Account structure", type: "TEXT" as const, content: {} },
          { id: "lesson-2", title: "Search intent", type: "VIDEO" as const, plannedMinutes: 12, content: {} },
        ],
      },
      {
        id: "section-2",
        title: "Optimization",
        lessons: [
          { id: "lesson-3", title: "Bid decisions", type: "TEXT" as const, content: {} },
        ],
      },
    ],
  },
};

describe("LessonSidebar", () => {
  it("keeps the current section open and exposes the current lesson", () => {
    render(
      <LessonSidebar
        course={course}
        currentLessonId="lesson-1"
        completedLessonIds={[]}
      />,
    );

    expect(screen.getByRole("button", { name: /1\. Foundations/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("link", { name: "Account structure" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: /2\. Optimization/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByLabelText("Course progress: 0%")).toBeInTheDocument();
    expect(screen.getByText("0 of 3 lessons")).toBeInTheDocument();
  });

  it("allows students to collapse one section and open another", async () => {
    const user = userEvent.setup();
    render(
      <LessonSidebar
        course={course}
        currentLessonId="lesson-1"
        completedLessonIds={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /1\. Foundations/ }));
    expect(screen.queryByRole("link", { name: "Account structure" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /2\. Optimization/ }));
    expect(screen.getByRole("link", { name: "Bid decisions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2\. Optimization/ })).toHaveAttribute(
      "aria-controls",
      "foundations-section-section-2",
    );
  });
});

describe("LessonNavButtons", () => {
  it("names previous and next destinations with their lesson titles", () => {
    render(
      <LessonNavButtons
        courseSlug="foundations"
        prevLesson={{
          id: "lesson-1",
          title: "Account structure",
          sectionTitle: "Foundations",
        }}
        nextLesson={{
          id: "lesson-3",
          title: "Bid decisions",
          sectionTitle: "Optimization",
        }}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Previous lesson: Account structure" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next lesson: Bid decisions" })).toBeInTheDocument();
    expect(screen.getByText("Optimization")).toBeInTheDocument();
  });
});
