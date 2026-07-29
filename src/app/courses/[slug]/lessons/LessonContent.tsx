"use client";

/**
 * LessonContent — renders the body of a lesson by type.
 *
 * STORY-026: Lesson page (RSC + MDX render).
 *
 * Types:
 *  - TEXT: Markdown body via react-markdown + remark-gfm
 *  - VIDEO: YouTube/Vimeo embed or native <video>
 *  - QUIZ: card linking to the quiz player
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Lesson } from "@/domain/entities/Course";
import styles from "./LessonContent.module.css";

interface TextLessonContent {
  type: "TEXT";
  body: string;
}

interface VideoLessonContent {
  type: "VIDEO";
  videoUrl: string;
  durationMinutes: number;
  transcript?: string;
}

interface QuizLessonContent {
  type: "QUIZ";
  title: string;
}

/**
 * Resolve the lesson's kind.
 *
 * `Lesson.type` is the authoritative column; the `content` JSON blob is
 * just the payload and is not required to repeat the discriminator. The
 * importers write `{ body }` / `{ durationMinutes }` with no `type` key,
 * so keying only off `content.type` made every seeded lesson fall
 * through to "Lesson content unavailable" — a reachable page with no
 * body on it. Prefer the column, fall back to the blob for older rows
 * that do carry a type.
 */
function resolveLessonKind(lesson: Lesson): string | null {
  if (typeof lesson.type === "string" && lesson.type.length > 0) {
    return lesson.type;
  }
  const c = lesson.content;
  if (typeof c === "object" && c !== null && typeof (c as { type?: string }).type === "string") {
    return (c as { type: string }).type;
  }
  return null;
}

function isRecord(c: unknown): c is Record<string, unknown> {
  return typeof c === "object" && c !== null;
}

function asTextContent(c: unknown): TextLessonContent | null {
  if (!isRecord(c) || typeof c.body !== "string") return null;
  return { type: "TEXT", body: c.body };
}

function asVideoContent(c: unknown): VideoLessonContent | null {
  if (!isRecord(c)) return null;
  return {
    type: "VIDEO",
    videoUrl: typeof c.videoUrl === "string" ? c.videoUrl : "",
    durationMinutes: typeof c.durationMinutes === "number" ? c.durationMinutes : 0,
    ...(typeof c.transcript === "string" ? { transcript: c.transcript } : {}),
  };
}

function asQuizContent(c: unknown, fallbackTitle: string): QuizLessonContent {
  if (isRecord(c) && typeof c.title === "string" && c.title.length > 0) {
    return { type: "QUIZ", title: c.title };
  }
  return { type: "QUIZ", title: fallbackTitle };
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
        <video className={styles.video} controls src={content.videoUrl} preload="metadata">
          <track kind="captions" />
        </video>
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

function QuizContent({
  title,
  courseSlug,
  lessonId,
}: {
  title: string;
  courseSlug: string;
  lessonId: string;
}) {
  return (
    <div className={styles.quizPlaceholder}>
      <QuizIcon />
      <h3 className={styles.quizTitle}>{title}</h3>
      <p className={styles.quizHint}>
        Answer the questions to check what you picked up in this section.
      </p>
      <a className={styles.quizLink} href={`/courses/${courseSlug}/lessons/${lessonId}/quiz`}>
        Start the quiz
      </a>
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

// ── Main component ──────────────────────────────────────────

export function LessonContent({
  lesson,
  courseSlug,
  lessonId,
}: {
  lesson: Lesson;
  courseSlug: string;
  lessonId: string;
}) {
  const content = lesson.content as unknown;
  const kind = resolveLessonKind(lesson);

  if (kind === "VIDEO") {
    const video = asVideoContent(content);
    if (video) return <VideoContent content={video} />;
  }

  if (kind === "QUIZ") {
    return (
      <QuizContent
        title={asQuizContent(content, lesson.title).title}
        courseSlug={courseSlug}
        lessonId={lessonId}
      />
    );
  }

  // TEXT, and anything else that carries a markdown body.
  const text = asTextContent(content);
  if (text) {
    return <TextContent body={text.body} />;
  }

  return (
    <div className={styles.unavailable}>
      <p>Lesson content unavailable.</p>
    </div>
  );
}
