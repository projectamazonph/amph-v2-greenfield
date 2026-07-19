"use client";

/**
 * LessonContent — renders the body of a lesson by type.
 *
 * STORY-026: Lesson page (RSC + MDX render).
 *
 * Types:
 *  - TEXT: Markdown body via react-markdown + remark-gfm
 *  - VIDEO: YouTube/Vimeo embed or native <video>
 *  - QUIZ: "Coming soon" placeholder
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

function isTextContent(c: unknown): c is TextLessonContent {
  return typeof c === "object" && c !== null && (c as { type?: string }).type === "TEXT";
}

function isVideoContent(c: unknown): c is VideoLessonContent {
  return typeof c === "object" && c !== null && (c as { type?: string }).type === "VIDEO";
}

function isQuizContent(c: unknown): c is QuizLessonContent {
  return typeof c === "object" && c !== null && (c as { type?: string }).type === "QUIZ";
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
          <summary className={styles.transcriptSummary}>
            Show transcript
          </summary>
          <div className={styles.transcriptBody}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.transcript}</ReactMarkdown>
          </div>
        </details>
      )}
    </div>
  );
}

function QuizContent({ title }: { title: string }) {
  return (
    <div className={styles.quizPlaceholder}>
      <QuizIcon />
      <h3 className={styles.quizTitle}>{title}</h3>
      <p className={styles.quizText}>Interactive quiz — coming soon!</p>
      <p className={styles.quizHint}>
        Complete the quiz to test your understanding of this section.
      </p>
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

export function LessonContent({ lesson }: { lesson: Lesson }) {
  const content = lesson.content as unknown;

  if (isTextContent(content)) {
    return <TextContent body={content.body} />;
  }

  if (isVideoContent(content)) {
    return <VideoContent content={content} />;
  }

  if (isQuizContent(content)) {
    return <QuizContent title={content.title} />;
  }

  return (
    <div className={styles.unavailable}>
      <p>Lesson content unavailable.</p>
    </div>
  );
}
