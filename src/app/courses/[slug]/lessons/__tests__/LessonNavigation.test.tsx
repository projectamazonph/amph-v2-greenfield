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
          {
            id: "lesson-2",
            title: "Search intent",
            type: "VIDEO" as const,
            plannedMinutes: 12,
            content: {},
          },
        ],
      },
      {
        id: "section-2",
        title: "Optimization",
        lessons: [{ id: "lesson-3", title: "Bid decisions", type: "TEXT" as const, content: {} }],
      },
    ],
  },
};

describe("LessonSidebar", () => {
  it("keeps the current section open and exposes the current lesson", () => {
    render(<LessonSidebar course={course} currentLessonId="lesson-1" completedLessonIds={[]} />);

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
    render(<LessonSidebar course={course} currentLessonId="lesson-1" completedLessonIds={[]} />);

    await user.click(screen.getByRole("button", { name: /1\. Foundations/ }));
    expect(screen.queryByRole("link", { name: "Account structure" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /2\. Optimization/ }));
    expect(
      screen.getByLabelText("Bid decisions locked until the previous lesson is complete"),
    ).toBeInTheDocument();
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

  it("renders a sticky-positioned footer band with the module-position label centered", () => {
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
        positionLabel="Module 1 of 2 · Lesson 2 of 2"
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Lesson navigation" });
    expect(nav).toHaveAttribute("data-sticky", "true");
    expect(nav).toHaveAttribute("data-lesson-nav-footer", "true");

    // Position label is rendered between the two buttons.
    const position = screen.getByLabelText("Lesson position: Module 1 of 2 · Lesson 2 of 2");
    expect(position).toBeInTheDocument();
    expect(position.textContent).toContain("Module 1 of 2");
    expect(position.textContent).toContain("Lesson 2 of 2");
    const prev = screen.getByRole("link", { name: "Previous lesson: Account structure" });
    const next = screen.getByRole("link", { name: "Next lesson: Bid decisions" });
    expect(prev.compareDocumentPosition(position) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(position.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("falls back to a single button row when only one neighbor exists", () => {
    render(
      <LessonNavButtons
        courseSlug="foundations"
        prevLesson={null}
        nextLesson={{
          id: "lesson-2",
          title: "Search intent",
          sectionTitle: "Foundations",
        }}
        positionLabel="Module 1 of 3 · Lesson 1 of 2"
      />,
    );

    expect(screen.queryByRole("link", { name: /Previous lesson/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next lesson: Search intent" })).toBeInTheDocument();
    expect(
      screen.getByLabelText("Lesson position: Module 1 of 3 · Lesson 1 of 2"),
    ).toBeInTheDocument();
  });

  it("renders nothing when neither neighbor exists", () => {
    const { container } = render(
      <LessonNavButtons
        courseSlug="foundations"
        prevLesson={null}
        nextLesson={null}
        positionLabel="Module 1 of 1 · Lesson 1 of 1"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("still marks both buttons focusable when rendered as a sticky band", () => {
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
        positionLabel="Module 1 of 2 · Lesson 2 of 2"
      />,
    );

    expect(
      screen.getByRole("link", { name: "Previous lesson: Account structure" }),
    ).not.toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("link", { name: "Next lesson: Bid decisions" })).not.toHaveAttribute(
      "tabindex",
      "-1",
    );
  });
});
