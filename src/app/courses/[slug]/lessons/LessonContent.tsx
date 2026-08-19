"use client";

/**
 * LessonContent — renders the body of a lesson by type.
 *
 * STORY-026: Lesson page (RSC + MDX render).
 * STORY-094: Wire QUIZ lessons to the dedicated quiz route.
 *
 * Types:
 *  - TEXT:  Markdown body via react-markdown + remark-gfm
 *  - VIDEO: YouTube/Vimeo embed or native <video>
 *  - QUIZ:  Question preview + Start Quiz CTA → /courses/[slug]/lessons/[lessonId]/quiz
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 */

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import type { ReactElement, ReactNode } from "react";
import { TradeOffTable, ProcessDiagram, PitfallCallout, SelfCheck } from "@/components/lesson";
import { directivePlugin } from "@/lib/mdx/directive-plugin";
import type {
  Lesson,
  LessonContent as DomainLessonContent,
  QuizQuestion,
  VideoContent,
  TextContent,
} from "@/domain/entities/Lesson";
import styles from "./LessonContent.module.css";
import { Play, CheckSquare, ChatCircleText } from "@phosphor-icons/react/dist/ssr";

interface TextLessonContent extends TextContent {
  type: "TEXT";
  body: string;
}

interface VideoLessonContent extends VideoContent {
  type: "VIDEO";
  videoUrl: string;
  durationMinutes: number;
  transcript?: string;
}

interface QuizLessonContent {
  type: "QUIZ";
  questions: readonly QuizQuestion[];
  quizHref: string;
}

type LessonContentForRender = TextLessonContent | VideoLessonContent | QuizLessonContent;

function isTextContent(c: DomainLessonContent): c is TextContent {
  return "body" in c && typeof (c as TextContent).body === "string";
}

function isVideoContent(c: DomainLessonContent): c is VideoContent {
  return "durationMinutes" in c && typeof (c as VideoContent).durationMinutes === "number";
}

function isQuizContent(c: DomainLessonContent): c is { questions: readonly QuizQuestion[] } {
  return "questions" in c && Array.isArray((c as { questions?: unknown }).questions);
}

function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

function getVimeoEmbedUrl(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  if (match) return `https://player.vimeo.com/video/${match[1]}`;
  return null;
}

// ── Sub-components ───────────────────────────────────────────

function parseProcessSteps(raw: string): { id: string; label: string }[] {
  return raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((label, i) => ({ id: `step-${i + 1}`, label }));
}

interface AmphBlockProps {
  "data-amph-block"?: string;
  "data-amph-id"?: string;
  "data-amph-title"?: string;
  "data-amph-caption"?: string;
  "data-amph-variant"?: string;
  "data-amph-steps"?: string;
  "data-amph-hint"?: string;
  "data-amph-rows"?: string;
  children?: ReactNode;
}

function renderAmphDiv(props: AmphBlockProps): ReactElement | null {
  const block = props["data-amph-block"];
  if (!block) return <div>{props.children}</div>;

  if (block === "trade-off") {
    let rows: { label: string; value: string }[] | undefined;
    const rowsAttr = props["data-amph-rows"];
    if (rowsAttr) {
      try {
        rows = JSON.parse(rowsAttr.replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
      } catch {
        rows = undefined;
      }
    }
    return (
      <TradeOffTable
        id={props["data-amph-id"] ?? "trade-off"}
        title={props["data-amph-title"] ?? "Trade-off"}
        caption={props["data-amph-caption"]}
        columns={rows && rows.length > 0 ? ["Metric", "What it answers"] : undefined}
        rows={rows}
      />
    );
  }

  if (block === "process") {
    const steps = parseProcessSteps(props["data-amph-steps"] ?? "");
    return (
      <ProcessDiagram
        id={props["data-amph-id"] ?? "process"}
        title={props["data-amph-title"] ?? "Process"}
        steps={steps}
        hint={props["data-amph-hint"]}
      />
    );
  }

  if (block === "callout") {
    const variant =
      props["data-amph-variant"] === "warning" || props["data-amph-variant"] === "pitfall"
        ? props["data-amph-variant"]
        : "info";
    return (
      <PitfallCallout
        id={props["data-amph-id"] ?? "callout"}
        variant={variant}
        title={props["data-amph-title"]}
      >
        {props.children}
      </PitfallCallout>
    );
  }

  return <div>{props.children}</div>;
}

const markdownComponents = {
  div: renderAmphDiv,
  SelfCheck,
} as const;

function TextContent({ body }: { body: string }) {
  return (
    <div className={styles.prose}>
      <ReactMarkdown
        remarkPlugins={[directivePlugin, remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={markdownComponents}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}

function VideoContent({ content }: { content: VideoLessonContent }) {
  const embedUrl = getYouTubeEmbedUrl(content.videoUrl);
  const vimeoUrl = getVimeoEmbedUrl(content.videoUrl);

  return (
    <div className={styles.videoBlock}>
      {embedUrl ? (
        <div className={styles.videoFrameWrap}>
          <iframe
            className={styles.videoFrame}
            src={embedUrl}
            title="Lesson video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : vimeoUrl ? (
        <div className={styles.videoFrameWrap}>
          <iframe
            className={styles.videoFrame}
            src={vimeoUrl}
            title="Lesson video"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <video className={styles.video} controls src={content.videoUrl} preload="metadata" />
      )}
      <div className={styles.videoMeta}>
        <VideoIcon />
        <span>{content.durationMinutes}m</span>
      </div>
      {content.transcript && (
        <details className={styles.transcript}>
          <summary className={styles.transcriptSummary}>Show transcript</summary>
          <div className={styles.transcriptBody}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.transcript}</ReactMarkdown>
          </div>
        </details>
      )}
    </div>
  );
}

function QuizContent({ content, quizHref }: { content: QuizLessonContent; quizHref: string }) {
  const questionCount = content.questions.length;
  const firstQuestion = content.questions[0];

  return (
    <div className={styles.quizCard}>
      <QuizIcon />
      <div className={styles.quizIntro}>
        <h3 className={styles.quizTitle}>Quick check</h3>
        <p className={styles.quizSubtitle}>
          {questionCount === 1
            ? "1 question in this lesson"
            : `${questionCount} questions in this lesson`}
        </p>
      </div>

      <div className={styles.quizMeta}>
        <span className={styles.quizMetaItem}>
          <QuizCountIcon />
          {questionCount} {questionCount === 1 ? "question" : "questions"}
        </span>
      </div>

      {firstQuestion && (
        <ol className={styles.quizQuestionsList} aria-label="Question preview">
          {content.questions.slice(0, 2).map((q: QuizQuestion, i: number) => (
            <li key={q.id} className={styles.quizQuestionItem}>
              <span className={styles.quizQuestionNumber} aria-hidden="true">
                {i + 1}
              </span>
              <div className={styles.quizQuestionPrompt}>{q.prompt}</div>
            </li>
          ))}
          {content.questions.length > 2 && (
            <li className={styles.quizQuestionItem}>
              <span className={styles.quizQuestionNumber} aria-hidden="true">
                …
              </span>
              <div className={styles.quizQuestionPrompt}>
                {content.questions.length - 2} more{" "}
                {content.questions.length - 2 === 1 ? "question" : "questions"}
              </div>
            </li>
          )}
        </ol>
      )}

      <Link href={quizHref} className={styles.quizCta}>
        Start Quiz
      </Link>
    </div>
  );
}

function VideoIcon() {
  return <Play size={16} weight="fill" className={styles.iconSmall} aria-hidden />;
}

function QuizIcon() {
  return <CheckSquare size={48} weight="fill" className={styles.iconLarge} aria-hidden />;
}

function QuizCountIcon() {
  return <ChatCircleText size={16} weight="regular" className={styles.iconSmall} aria-hidden />;
}

// ── Main component ──────────────────────────────────────────

export interface LessonContentProps {
  lesson: Lesson;
  courseSlug: string;
}

export function LessonContent({ lesson, courseSlug }: LessonContentProps) {
  const quizHref = `/courses/${courseSlug}/lessons/${lesson.id}/quiz`;
  const rawContent = lesson.content as unknown;

  // Build the typed render-shape from the actual domain content.
  let renderable: LessonContentForRender;
  if (isQuizContent(rawContent as DomainLessonContent) && lesson.type === "QUIZ") {
    const quizContent = rawContent as { questions: readonly QuizQuestion[] };
    renderable = {
      type: "QUIZ",
      questions: quizContent.questions,
      quizHref,
    };
  } else if (isVideoContent(rawContent as DomainLessonContent) && lesson.type === "VIDEO") {
    const vc = rawContent as VideoContent & { videoUrl?: string };
    renderable = {
      type: "VIDEO",
      videoUrl: (vc as { videoUrl?: string }).videoUrl ?? "",
      durationMinutes: vc.durationMinutes,
      transcript: (vc as { transcript?: string }).transcript,
    };
  } else if (isTextContent(rawContent as DomainLessonContent) && lesson.type === "TEXT") {
    const tc = rawContent as TextContent;
    renderable = { type: "TEXT", body: tc.body };
  } else {
    return (
      <div className={styles.unavailable}>
        <p>Lesson content unavailable.</p>
      </div>
    );
  }

  if (renderable.type === "TEXT") {
    return <TextContent body={renderable.body} />;
  }

  if (renderable.type === "VIDEO") {
    return <VideoContent content={renderable} />;
  }

  // renderable.type === "QUIZ"
  return <QuizContent content={renderable} quizHref={renderable.quizHref} />;
}
