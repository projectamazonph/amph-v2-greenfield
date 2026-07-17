# STORY-030 — Module Progress + Next-Lesson Navigation + Course Completion View

## Status

- **Story**: STORY-030
- **Sprint**: 6 — Lesson Delivery + Progress
- **Points**: 1
- **Status**: In Progress

## Overview

Complete the lesson delivery experience:
1. **Module progress** — sidebar shows "X/Y lessons" per module
2. **Next-lesson navigation** — "Next Lesson" button in `LessonNavButtons` navigates to next incomplete lesson
3. **Course completion view** — full-screen celebration when all lessons are done

## 1. Module Progress in Sidebar

```typescript
// In LessonSidebar: for each module, show completion ratio
function moduleProgress(module: Module, completedLessonIds: string[]): { completed: number; total: number } {
  const total = module.lessons.length;
  const completed = module.lessons.filter(l => completedLessonIds.includes(l.id)).length;
  return { completed, total };
}
```

Display in sidebar: `"3 / 5 lessons"`

## 2. Next-Lesson Navigation

The `LessonNavButtons` component (from STORY-026) needs to navigate to the next **incomplete** lesson, not just the next in curriculum order.

```typescript
// src/app/courses/[slug]/lessons/LessonNavButtons.tsx
function nextIncompleteLesson(
  curriculum: Curriculum,
  completedLessonIds: string[],
  currentLessonId: string,
): Lesson | null {
  const allLessons = curriculum.sections.flatMap(s => s.lessons);
  const idx = allLessons.findIndex(l => l.id === currentLessonId);
  // Find next lesson after current that's NOT in completedLessonIds
  for (let i = idx + 1; i < allLessons.length; i++) {
    if (!completedLessonIds.includes(allLessons[i]!.id)) return allLessons[i]!;
  }
  return null;
}
```

"Next Lesson" button → navigate to next incomplete lesson. If no incomplete lessons remain, show "Course Complete" button.

## 3. Course Completion View

```typescript
// src/app/courses/[slug]/lessons/CourseCompleteView.tsx
// Full-screen celebration component shown when progressPercent === 100
// Shows: trophy icon, "Course Complete!", XP earned, certificate CTA
```

## Code Shape

### New/Modified files
- `src/app/courses/[slug]/lessons/LessonNavButtons.tsx` — update to find next incomplete lesson
- `src/app/courses/[slug]/lessons/LessonSidebar.tsx` — add module progress per module
- `src/app/courses/[slug]/lessons/CourseCompleteView.tsx` — new celebration component
- `tests/unit/app/courses/[slug]/lessons/LessonNavButtons.test.tsx` — update for next-incomplete logic
- `tests/unit/app/courses/[slug]/lessons/LessonSidebar.test.tsx` — update for module progress

## Tests

1. `nextIncompleteLesson`: finds next incomplete, skips completed, returns null when all done
2. `LessonNavButtons`: renders "Next Lesson" with correct href, "Course Complete" when done
3. `LessonSidebar`: shows module progress (e.g. "3/5")
4. `CourseCompleteView`: renders celebration UI

## Acceptance Criteria

- [ ] Sidebar shows per-module progress (e.g. "3 / 5 lessons")
- [ ] "Next Lesson" navigates to next incomplete lesson
- [ ] "Course Complete" button appears when all lessons done
- [ ] Course completion celebration view renders
- [ ] Tests updated/pass
