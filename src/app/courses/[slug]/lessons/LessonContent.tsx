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
import type {
  Lesson,
  LessonContent as DomainLessonContent,
  QuizQuestion,
  VideoContent,
  TextContent,
} from "@/domain/entities/Lesson";
import styles from "./LessonContent.module.css";

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

function TextContent({ body }: { body: string }) {
  return (
    <div className={styles.prose}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
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

      <Link
        href={quizHref}
        className="btn btn-primary"
        data-testid="start-quiz-link"
        style={{ marginTop: "var(--space-4)" }}
      >
        Start Quiz →
      </Link>
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────

function VideoIcon() {
  return (
    <svg
      className={styles.iconSmall}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function QuizIcon() {
  return (
    <svg
      className={styles.iconLarge}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}

function QuizCountIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3v.5"
      />
    </svg>
  );
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
