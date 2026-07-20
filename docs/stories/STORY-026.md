# STORY-026 — Lesson Page (RSC + MDX Render)

## Status

- **Story**: STORY-026
- **Sprint**: 6 — Lesson Delivery + Progress
- **Points**: 1
**Status:** ✅ Done (PR #26, commit `9b0d0d6` — `feat(story-026): Lesson page (RSC + MDX render)`)

## Overview

Create a standalone lesson page that renders course content. This is the student's primary reading/watching experience. Includes a lesson sidebar for navigation between lessons in the same course.

## Routing

```
/courses/[courseSlug]/lessons/[lessonId]
```

Nested under the course detail page. Uses the course slug for SEO-friendly URLs.

## Lesson Page (RSC)

The lesson page is a React Server Component. It:
1. Fetches the course by slug
2. Finds the lesson by ID within the course's curriculum
3. Checks course access (reuses `CheckCourseAccess` — STORY-022)
4. Renders the lesson content by type
5. Renders a sidebar with lesson navigation

### Content Types

**TEXT lessons** (`content.type === "TEXT"`):
```typescript
interface TextLessonContent {
  type: "TEXT";
  body: string; // markdown string
}
```
Rendered using `react-markdown` + `remark-gfm` (GitHub-flavored markdown: tables, strikethrough, task lists, etc.)

**VIDEO lessons** (`content.type === "VIDEO"`):
```typescript
interface VideoLessonContent {
  type: "VIDEO";
  videoUrl: string;   // YouTube, Vimeo, or direct MP4 URL
  durationMinutes: number;
  transcript?: string; // optional markdown transcript
}
```
Rendered as an embedded video player. YouTube/Vimeo URLs are detected and rendered as `<iframe>`. Direct URLs render as `<video>`.

**QUIZ lessons** (`content.type === "QUIZ"`):
```typescript
interface QuizLessonContent {
  type: "QUIZ";
  title: string;
}
```
Rendered as a "Quiz coming soon" placeholder card. Quiz interaction is STORY-032.

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  AMPH Header                                          │
├──────────────┬────────────────────────────────────────┤
│              │  ← Back to Course                      │
│  Lesson      │  ────────────────────────────────────  │
│  Sidebar     │  Section 1: Getting Started             │
│              │    ✓ 1. Introduction                   │
│  Section 1   │    ▶ 2. What is Amazon FBA?  ← YOU   │
│  ✓ Lesson 1  │    ○ 3. Market Research Basics         │
│  ▶ Lesson 2  │  ────────────────────────────────────  │
│  ○ Lesson 3  │  Section 2: Product Sourcing          │
│              │    ○ 4. Finding Suppliers              │
│  Section 2   │    ○ 5. Negotiation Tips              │
│  ○ Lesson 4  │                                        │
│  ...         │  # What is Amazon FBA?                │
│              │                                        │
│              │  [VIDEO EMBED or MARKDOWN CONTENT]    │
│              │                                        │
│              │  ← Previous      Next →                │
└──────────────┴────────────────────────────────────────┘
```

### Sidebar

- Lists all sections and lessons in order
- Current lesson highlighted
- Completed lessons show ✓ (via `Enrollment.completedLessonIds`)
- Locked lessons show 🔒 if user has no access
- Sections are collapsible (default: open the current lesson's section)
- Scrollable independently from main content

### Navigation

- Previous / Next lesson buttons at the bottom of the content
- Breadcrumb: `Courses → [Course Title] → [Lesson Title]`
- "Back to Course" link at top

## Metadata

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  // Returns title: "[Lesson Title] — [Course Title] | AMPH Academy"
}
```

## Tests

### Unit

- `LessonPage` renders TEXT lesson with markdown body
- `LessonPage` renders VIDEO lesson with video embed
- `LessonPage` renders QUIZ lesson with placeholder
- `LessonPage` returns 404 for invalid course slug
- `LessonPage` returns 404 for invalid lesson ID
- `LessonPage` shows access denied for unenrolled user
- Lesson sidebar lists all lessons with correct current lesson highlighted
- Previous/Next navigation links are correct

### E2E

- Enrolled user can navigate to and view a lesson
- Unenrolled user sees access denied on lesson page
- Lesson navigation (prev/next) works
- Sidebar navigation works
