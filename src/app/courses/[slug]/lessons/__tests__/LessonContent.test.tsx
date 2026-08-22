/**
 * LessonContent.test.tsx — render tests for the migrated lesson body component.
 *
 * Specifically validates STORY-094 (lesson-to-quiz transition wiring).
 * What we cover:
 *  - Renders TEXT lessons via react-markdown
 *  - Renders VIDEO lessons with the YouTube embed path
 *  - Renders QUIZ lessons with a "Start Quiz" link to /courses/[slug]/lessons/[id]/quiz
 *  - QUIZ lessons show a preview of the first question and the question count
 *  - Renders the "unavailable" fallback for malformed content
 *
 * TDD: this test is written first to lock in the QUIZ transition before
 * further simulator work builds on top of it.
 */

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Lesson } from "@/domain/entities/Lesson";
import { LessonContent } from "../LessonContent";

const courseSlug = "ppc-foundations";

function makeLesson(overrides: Partial<Lesson>): Lesson {
  return {
    id: overrides.id ?? "lesson-1",
    moduleId: "module-1",
    title: overrides.title ?? "Sample Lesson",
    type: overrides.type ?? "TEXT",
    content: overrides.content ?? { body: "Hello world" },
    displayOrder: 1,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  } as Lesson;
}

describe("LessonContent (render)", () => {
  it("renders TEXT lessons through react-markdown", () => {
    const lesson = makeLesson({
      type: "TEXT",
      content: { body: "# Heading\n\nBody text" },
    });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    expect(html).toContain("Heading");
    expect(html).toContain("Body text");
    // No quiz placeholder text should appear for a TEXT lesson.
    expect(html).not.toContain("Start Quiz");
  });

  it("renders VIDEO lessons with the YouTube embed iframe when the URL matches", () => {
    const lesson = makeLesson({
      type: "VIDEO",
      content: {
        durationMinutes: 12,
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      } as unknown as Lesson["content"],
    });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    expect(html).toContain("youtube.com/embed/dQw4w9WgXcQ");
    // React renders adjacent text nodes as "12<!-- -->m" — accept either form.
    expect(html).toMatch(/12(?:<!-- -->)?m/);
    expect(html).not.toContain("Start Quiz");
  });

  it("renders the unavailable fallback for malformed content", () => {
    const lesson = makeLesson({
      type: "TEXT",
      content: { unexpectedShape: true } as unknown as Lesson["content"],
    });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    expect(html).toContain("Lesson content unavailable.");
  });

  // ── STORY-094: lesson-to-quiz transition ────────────────────────

  it("renders QUIZ lessons with a Start Quiz CTA pointing at the quiz route", () => {
    const lesson = makeLesson({
      id: "quiz-lesson",
      type: "QUIZ",
      content: {
        questions: [
          {
            id: "q1",
            prompt: "What is ACoS?",
            options: ["Advertising Cost of Sales", "Average Click Order"],
            correctOptionIndex: 0,
          },
        ],
      },
    });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);

    // CTA exists with the right link
    expect(html).toContain("Start Quiz");
    expect(html).toContain(`/courses/${courseSlug}/lessons/quiz-lesson/quiz`);
  });

  it("shows QUIZ question count in plural form for multiple questions", () => {
    const lesson = makeLesson({
      type: "QUIZ",
      content: {
        questions: [
          { id: "q1", prompt: "Q1", options: ["a", "b"], correctOptionIndex: 0 },
          { id: "q2", prompt: "Q2", options: ["a", "b"], correctOptionIndex: 0 },
          { id: "q3", prompt: "Q3", options: ["a", "b"], correctOptionIndex: 0 },
          { id: "q4", prompt: "Q4", options: ["a", "b"], correctOptionIndex: 0 },
          { id: "q5", prompt: "Q5", options: ["a", "b"], correctOptionIndex: 0 },
        ],
      },
    });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    expect(html).toContain("5 questions in this lesson");
    // Only first 2 questions preview
    expect(html).toContain("Q1");
    expect(html).toContain("Q2");
    // Tail summary line for the rest (React inserts `<!-- -->` between
    // adjacent text nodes — accept both the merged and the split form).
    expect(html).toMatch(/3(?:<!-- -->)? more/);
  });

  it("shows singular 'question' wording for a 1-question QUIZ", () => {
    const lesson = makeLesson({
      type: "QUIZ",
      content: {
        questions: [
          {
            id: "q1",
            prompt: "Only one?",
            options: ["yes", "no"],
            correctOptionIndex: 0,
          },
        ],
      },
    });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    expect(html).toContain("1 question in this lesson");
    expect(html).not.toContain("1 questions");
  });

  it("replaces the 'coming soon!' placeholder text with real lesson-to-quiz wiring", () => {
    const lesson = makeLesson({
      type: "QUIZ",
      content: {
        questions: [{ id: "q1", prompt: "Q", options: ["a", "b"], correctOptionIndex: 0 }],
      },
    });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    // Story-094 acceptance: the "coming soon" placeholder is gone.
    expect(html).not.toContain("coming soon");
    expect(html).not.toContain("Interactive quiz");
  });

  it("uses direct voice for the quiz card title (no 'Knowledge check' slop)", () => {
    // The voice guide (§marketing-ese / sentence-level) bans the
    // "knowledge check" framing — it's a tell of AI-generated copy.
    // The card title should describe the action instead.
    const lesson = makeLesson({
      type: "QUIZ",
      content: {
        questions: [{ id: "q1", prompt: "Q", options: ["a", "b"], correctOptionIndex: 0 }],
      },
    });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    expect(html).not.toContain("Knowledge check");
    expect(html).not.toContain("knowledge check");
    expect(html).toContain("Quick check");
  });

  // ── STORY-097: directive plugin → primitive renderer ─────────

  it("renders :::trade-off as a TradeOffTable", () => {
    const lesson = makeLesson({
      type: "TEXT",
      content: {
        body: `:::trade-off{id="big-six" title="The Big Six" caption="What each metric answers"}\n| Metric | What it answers |\n| --- | --- |\n| CPC | How much per click |\n| CTR | Share of impressions that become clicks |\n:::`,
      },
    });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    expect(html).toContain("<table");
    expect(html).toContain('id="big-six"');
    // Body says "How much per click" — assertion matches body content.
    expect(html).toContain("How much per click");
    expect(html).toContain("Share of impressions that become clicks");
  });

  it("renders :::visual as an enriched lesson visual", () => {
    const lesson = makeLesson({
      type: "TEXT",
      content: {
        body: `:::visual{id="map" kind="diagnostic-map" title="Read the path"}\n{}\n:::`,
      },
    });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    expect(html).toContain('id="map"');
    expect(html).toContain("Diagnostic map");
    expect(html).toContain("Read the path");
    expect(html).toContain("Impression");
    expect(html).toContain("Click");
    expect(html).toContain("Order");
    expect(html).toContain("Sale");
    expect(html).not.toContain(":::visual");
  });

  it("renders :::visual worked-example with calculated PPC outputs", () => {
    const lesson = makeLesson({
      type: "TEXT",
      content: {
        body: `:::visual{id="case" kind="worked-example" title="Coffee grinder"}\n{"case":{"impressions":20000,"clicks":160,"spend":192,"orders":8,"adSales":320,"totalSales":800,"price":40,"targetAcos":30}}\n:::`,
      },
    });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    expect(html).toContain("60%");
    expect(html).toContain("0.8%");
    expect(html).toContain("5.0%");
    expect(html).toContain("1.67x");
    expect(html).toContain("Coffee grinder");
    expect(html).toContain("calculated outputs");
  });

  it("renders dedicated Tranche 1 lesson components from MDX", () => {
    const body = [
      `:::comparison-table{id="compare" title="Compare"}\n{"columns":["A","B"],"rows":[{"label":"Cost","values":["Low","High"]},{"label":"Intent","values":["Discovery","Protection"]}]}\n:::`,
      `:::formula-ladder{id="formula" title="Formula"}\n{"steps":[{"label":"Input","expression":"A"},{"label":"Result","expression":"B"}],"result":{"label":"Answer","value":"B"}}\n:::`,
      `:::classification-board{id="classify" title="Classify"}\n{"categories":[{"id":"keep","label":"Keep"},{"id":"block","label":"Block"}],"items":[{"id":"term","label":"Term","categoryId":"keep","rationale":"Fits"}]}\n:::`,
      `:::decision-flow{id="flow" title="Decide"}\n{"steps":[{"id":"one","label":"One","question":"Question one","evidence":"Evidence one","action":"Action one"},{"id":"two","label":"Two","question":"Question two","evidence":"Evidence two","action":"Action two"}]}\n:::`,
      `:::simulation-rubric{id="rubric" title="Rubric"}\n{"scenario":"Scenario text","criteria":[{"id":"c1","label":"Structure","lookFor":"Organized"},{"id":"c2","label":"Bids","lookFor":"Reasonable"}]}\n:::`,
    ].join("\n\n");
    const lesson = makeLesson({ type: "TEXT", content: { body } });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    expect(html).toContain("Compare");
    expect(html).toContain("Formula");
    expect(html).toContain("Classify");
    expect(html).toContain("Question one");
    expect(html).toContain("Scenario text");
    expect(html).toContain("Structure");
    expect(html).not.toContain(":::comparison-table");
  });

  it("renders dedicated Tranche 2 lesson components from MDX", () => {
    const body = [
      `:::annotated-listing{id="listing" title="Listing"}\n{"sections":[{"id":"title","label":"Title","role":"Relevance","content":"Product title","effect":"Earn the click"},{"id":"images","label":"Images","role":"Confidence","content":"Image sequence","effect":"Remove doubt"}]}\n:::`,
      `:::hierarchy-builder{id="hierarchy" title="Hierarchy"}\n{"root":{"id":"account","label":"Account","type":"account","children":[{"id":"campaign","label":"Campaign","type":"campaign"}]}}\n:::`,
      `:::funnel-canvas{id="funnel" title="Funnel"}\n{"stages":[{"id":"top","label":"Awareness","role":"Top","formats":["SB video"],"question":"Who should know?"},{"id":"bottom","label":"Conversion","role":"Bottom","formats":["SP exact"],"question":"Who is ready?"}]}\n:::`,
      `:::timeline-calendar{id="timeline" title="Timeline"}\n{"periods":["Week 1","Week 2"],"rows":[{"id":"monitor","label":"Monitor","values":["Baseline","Adjust"]}]}\n:::`,
    ].join("\n\n");
    const lesson = makeLesson({ type: "TEXT", content: { body } });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    expect(html).toContain("Product title");
    expect(html).toContain("Campaign");
    expect(html).toContain("Awareness");
    expect(html).toContain("Week 1");
    expect(html).not.toContain(":::annotated-listing");
  });

  it("renders learner-first reveal mode with coach rationale hidden initially", () => {
    const body = `:::decision-flow{id="flow" title="Flow" reveal-mode="after-choice"}\n{"steps":[{"id":"a","label":"Choose","question":"What is the signal?","evidence":"Inspect the report","action":"Make one safe change"}]}\n:::`;
    const lesson = makeLesson({ type: "TEXT", content: { body } });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    expect(html).toContain("Reveal coach rationale");
    expect(html).toContain("State the evidence you would inspect");
    expect(html).not.toContain("Evidence to inspect:");
  });

  it("renders next-tranche components from MDX", () => {
    const body = [
      `:::lesson-pathway{id="path" title="Path"}\n{"steps":[{"id":"a","label":"Learn","purpose":"Understand","action":"Read"},{"id":"b","label":"Practice","purpose":"Apply","action":"Try"}]}\n:::`,
      `:::simulation-brief{id="brief" title="Brief"}\n{"fields":[{"id":"a","label":"Goal","prompt":"Goal"},{"id":"b","label":"Budget","prompt":"Budget"}]}\n:::`,
      `:::portfolio-map{id="portfolio" title="Portfolio"}\n{"groups":[{"id":"a","label":"Core","share":"60%","purpose":"Profit","campaigns":[]},{"id":"b","label":"Launch","share":"20%","purpose":"Growth","campaigns":[]}]}\n:::`,
      `:::seasonal-calendar{id="season" title="Season"}\n{"phases":[{"id":"a","label":"Pre","timing":"Before","goal":"Prepare","actions":["Test"],"risk":"Late"},{"id":"b","label":"In","timing":"During","goal":"Scale","actions":["Watch"],"risk":"Waste"}]}\n:::`,
      `:::evidence-ledger{id="evidence" title="Evidence"}\n{"entries":[{"id":"a","source":"Report","signal":"Signal","implication":"Implication","nextCheck":"Check"},{"id":"b","source":"Basket","signal":"Signal 2","implication":"Implication 2","nextCheck":"Check 2"}]}\n:::`,
      `:::sov-positioner{id="sov" title="SOV"}\n{"bands":[{"id":"a","label":"Contender","range":"<15%","posture":"Grow","actions":["Test"]},{"id":"b","label":"Established","range":"15-35%","posture":"Defend","actions":["Optimize"]}]}\n:::`,
    ].join("\n\n");
    const lesson = makeLesson({ type: "TEXT", content: { body } });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    expect(html).toContain("Learn");
    expect(html).toContain("Goal");
    expect(html).toContain("Core");
    expect(html).toContain("Prepare");
    expect(html).toContain("Signal");
    expect(html).toContain("Contender");
    expect(html).not.toContain(":::lesson-pathway");
  });

  it("renders competitive intelligence components from MDX", () => {
    const body = [
      `:::competitive-gap-matrix{id="gaps" title="Gaps"}\n{"dimensions":["Visibility","Offer"],"competitors":[{"id":"a","label":"A","values":["Strong","Weak"],"signal":"Signal A","action":"Action A"},{"id":"b","label":"B","values":["Weak","Strong"],"signal":"Signal B","action":"Action B"}]}\n:::`,
      `:::insight-router{id="insights" title="Insights"}\n{"routes":[{"id":"r1","signal":"Signal one","implication":"Implication one","evidence":"Evidence one","action":"Action one"},{"id":"r2","signal":"Signal two","implication":"Implication two","evidence":"Evidence two","action":"Action two"}]}\n:::`,
    ].join("\n\n");
    const lesson = makeLesson({ type: "TEXT", content: { body } });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    expect(html).toContain("Visibility");
    expect(html).toContain("Signal A");
    expect(html).toContain("Signal one");
    expect(html).toContain("Action one");
    expect(html).not.toContain(":::competitive-gap-matrix");
  });

  it.each([
    ["comparison-table", `:::comparison-table{id="bad-comparison" title="Bad"}\n{"rows":[]}\n:::`],
    ["decision-flow", `:::decision-flow{id="bad-flow" title="Bad"}\n{"initialStep":0}\n:::`],
    ["simulation-rubric", `:::simulation-rubric{id="bad-rubric" title="Bad"}\n{"criteria":[]}\n:::`],
    ["visual without kind", `:::visual{id="bad-visual" title="Bad"}\n{}\n:::`],
  ])("fails closed for malformed %s payloads", (_label, body) => {
    const lesson = makeLesson({ type: "TEXT", content: { body } });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);

    expect(html).not.toContain("data-amph-id=");
    expect(html).not.toContain(":::");
  });

  it("renders :::process as a ProcessDiagram", () => {
    const lesson = makeLesson({
      type: "TEXT",
      content: {
        body: `:::process{id="loop" title="Loop" steps="Read|Decide|Change|Explain"}\n:::`,
      },
    });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    expect(html).toContain("<ol");
    expect(html).toContain("Read");
    expect(html).toContain("Explain");
  });

  it("renders :::callout as a PitfallCallout", () => {
    const lesson = makeLesson({
      type: "TEXT",
      content: {
        body: `:::callout{variant="warning" title="Be careful"}\nWatch this.\n:::`,
      },
    });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    expect(html).toContain("aside");
    expect(html).toContain('role="note"');
    expect(html).toContain("Be careful");
  });

  it("renders plain markdown unchanged when there are no directives", () => {
    const lesson = makeLesson({
      type: "TEXT",
      content: { body: `A regular paragraph with **bold** text.` },
    });
    const html = renderToString(<LessonContent lesson={lesson} courseSlug={courseSlug} />);
    expect(html).toContain("<strong>");
    // No directive HTML emitted when none in body
    expect(html).not.toContain("data-amph-block");
  });
});
