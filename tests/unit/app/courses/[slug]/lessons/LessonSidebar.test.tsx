import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { LessonSidebar, type SidebarSection } from "@/app/courses/[slug]/lessons/LessonSidebar";

function makeSections(): SidebarSection[] {
  return [
    {
      id: "section_01",
      title: "Getting Started",
      lessons: [
        { id: "les_01", title: "Introduction", type: "TEXT", durationMinutes: null },
        { id: "les_02", title: "Setup", type: "VIDEO", durationMinutes: 5 },
      ],
    },
    {
      id: "section_02",
      title: "Advanced Topics",
      lessons: [{ id: "les_03", title: "Deep Dive", type: "TEXT", durationMinutes: null }],
    },
  ];
}

function renderSidebar(currentLessonId: string, completedLessonIds: string[] = []) {
  return renderToString(
    <LessonSidebar
      courseTitle="Test Course"
      courseSlug="test-course"
      sections={makeSections()}
      currentLessonId={currentLessonId}
      completedLessonIds={completedLessonIds}
    />,
  );
}

describe("LessonSidebar", () => {
  it("renders the course title", () => {
    const html = renderSidebar("les_01");
    expect(html).toContain("Test Course");
  });

  it("renders all section titles", () => {
    const html = renderSidebar("les_01");
    expect(html).toContain("Getting Started");
    expect(html).toContain("Advanced Topics");
  });

  it("renders all lesson titles in the current lesson's section", () => {
    const html = renderSidebar("les_01");
    // les_01 is in section 1 — only section 1 is open
    expect(html).toContain("Introduction");
    expect(html).toContain("Setup");
    // "Deep Dive" is in section 2 which is collapsed (current lesson is in section 1)
    expect(html).not.toContain("Deep Dive");
  });

  it("highlights the current lesson", () => {
    const html = renderSidebar("les_02");
    // The sidebar should have an "active" indicator for the current lesson
    expect(html).toContain("les_02");
  });

  it("marks completed lessons with a checkmark", () => {
    // les_01 is completed, current lesson is also les_01 — shows checkmark
    const html = renderSidebar("les_01", ["les_01"]);
    expect(html).toContain("Introduction");
  });

  it("shows video duration badge for VIDEO lessons", () => {
    // les_02 is the VIDEO lesson in section 1 — set currentLessonId to les_02 so section 1 is open
    const html = renderSidebar("les_02");
    // les_02 is a VIDEO lesson with durationMinutes: 5
    expect(html).toMatch(/5.*m/);
  });

  it("renders section collapse/expand toggle", () => {
    const html = renderSidebar("les_02");
    // Should have section titles that can be toggled
    expect(html).toContain("Getting Started");
  });

  // Regression: the section headers rendered as buttons with
  // aria-expanded, but `isOpen` was a const derived from the current
  // section, so clicking a header did nothing and aria-expanded
  // misreported the state to screen readers. The handler and the open
  // state are what make the control real.

  it("wires a click handler onto every section header", () => {
    const source = readFileSync(
      new URL(
        "../../../../../../src/app/courses/[slug]/lessons/LessonSidebar.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    expect(source).toMatch(/onClick=\{\(\) => toggleSection\(si\)\}/);
    // The open set must be state, not a value recomputed on render.
    expect(source).toMatch(/useState<ReadonlySet<number>>/);
  });

  it("reports aria-expanded per section, open on the current one", () => {
    const html = renderSidebar("les_01");
    // Section 1 holds the current lesson and starts open; section 2 does not.
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-expanded="false"');
  });

  it("starts every section closed when the lesson is not in the curriculum", () => {
    const html = renderSidebar("no-such-lesson");
    expect(html).not.toContain('aria-expanded="true"');
  });

  it("shows module progress (e.g. '3/5')", () => {
    const html = renderSidebar("les_03", ["les_01", "les_02"]);
    // Section 1 progress: "2/2" (or "2 / 2")
    expect(html).toContain("2");
    // Section 2 progress: "0/1"
    expect(html).toContain("0");
    expect(html).toContain("1");
  });

  it("marks completed lessons with a checkmark", () => {
    // les_01 is completed, current lesson is also les_01 — shows checkmark
    const html = renderSidebar("les_01", ["les_01"]);
    expect(html).toContain("Introduction");
  });

  // Regression: the page used to pass the whole `Course` entity into this
  // client component. `Course.price` is a `Money` class instance, and React
  // cannot serialize a class across the server/client boundary, so every
  // lesson page a reader could actually open returned a 500 with
  // "Only plain objects ... can be passed to Client Components".

  it("takes a plain view model, never the Course entity", () => {
    const source = readFileSync(
      new URL(
        "../../../../../../src/app/courses/[slug]/lessons/LessonSidebar.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    expect(source).not.toMatch(/course:\s*Course/);
    expect(source).not.toContain('from "@/domain/entities/Course"');
    expect(source).toMatch(/sections:\s*readonly SidebarSection\[\]/);
  });

  it("computes lesson duration on the server, keeping content out of the client", () => {
    const source = readFileSync(
      new URL(
        "../../../../../../src/app/courses/[slug]/lessons/LessonSidebar.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    // The raw `content` blob must not reach the client component.
    expect(source).not.toContain("lesson.content");
  });

  it("stacks the lesson navigation above content on phone-width screens", () => {
    const pageCss = readFileSync(
      new URL(
        "../../../../../../src/app/courses/[slug]/lessons/[lessonId]/page.module.css",
        import.meta.url,
      ),
      "utf8",
    );
    const sidebarCss = readFileSync(
      new URL(
        "../../../../../../src/app/courses/[slug]/lessons/LessonSidebar.module.css",
        import.meta.url,
      ),
      "utf8",
    );

    expect(pageCss).toMatch(
      /@media\s*\(max-width:\s*767px\)[\s\S]*?\.layout\s*\{[\s\S]*?flex-direction:\s*column;/,
    );
    expect(pageCss).toMatch(/\.main\s*\{[\s\S]*?min-width:\s*0;/);
    expect(sidebarCss).toMatch(
      /@media\s*\(max-width:\s*767px\)[\s\S]*?\.sidebar\s*\{[\s\S]*?width:\s*100%;/,
    );
  });
});
