import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { CourseAccessNotice } from "../CourseAccessNotice";

describe("CourseAccessNotice", () => {
  it("explains that an anonymous student reached the end of the lesson preview", () => {
    const html = renderToString(
      <CourseAccessNotice
        courseSlug="ppc-foundations"
        courseTitle="PPC Foundations"
        feature="lesson"
        reason="preview_limit"
        signedIn={false}
      />,
    );

    expect(html).toContain("This lesson is in the full course");
    expect(html).toContain("Sign in or enroll to keep learning past the preview");
    expect(html).toContain('href="/login?redirect=%2Fcourses%2Fppc-foundations"');
    expect(html).toContain("View course options");
  });

  it("explains that a signed-in student needs course access for a lesson", () => {
    const html = renderToString(
      <CourseAccessNotice
        courseSlug="ppc-foundations"
        courseTitle="PPC Foundations"
        feature="lesson"
        reason="preview_limit"
        signedIn
      />,
    );

    expect(html).toContain("Your preview ends here");
    expect(html).toContain("this lesson needs full course access");
    expect(html).not.toContain("Sign in");
  });

  it("explains why a quiz is unavailable without full access", () => {
    const html = renderToString(
      <CourseAccessNotice
        courseSlug="ppc-foundations"
        courseTitle="PPC Foundations"
        feature="quiz"
        reason="preview_limit"
        signedIn
      />,
    );

    expect(html).toContain("This quiz opens with full course access");
    expect(html).toContain("take quizzes and save your score");
  });

  it("explains when a student's current plan does not include a quiz", () => {
    const html = renderToString(
      <CourseAccessNotice
        courseSlug="ppc-foundations"
        courseTitle="PPC Foundations"
        feature="quiz"
        reason="plan_required"
        signedIn
        userTier="STARTER"
        requiredTier="ULTIMATE"
      />,
    );

    expect(html).toContain("This quiz is not included in your current plan");
    expect(html).toContain("Starter plan");
    expect(html).toContain("Ultimate access");
  });

  it("explains a temporary access-check failure without exposing internals", () => {
    const html = renderToString(
      <CourseAccessNotice
        courseSlug="ppc-foundations"
        courseTitle="PPC Foundations"
        feature="lesson"
        reason="verification_unavailable"
        signedIn
      />,
    );

    expect(html).toContain("We couldn&#x27;t verify your course access");
    expect(html).toContain("Refresh the page");
    expect(html).not.toContain("database");
  });
});
