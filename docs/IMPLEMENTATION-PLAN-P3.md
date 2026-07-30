# Implementation Plan — P3 Enhancement (27 fixes)

Continues from IMPLEMENTATION-PLAN.md (P0+P1) and IMPLEMENTATION-PLAN-P2.md (P2).

These are polish items — they separate "functional" from "delightful."

---

### P3-60. Add animated progress milestones to student dashboard

**Problem:** Course progress bars show a flat percentage with no milestone markers. No sense of achievement at 25%, 50%, 75%.

**File:** `src/app/dashboard/page.tsx` + `page.module.css`

**Fix:** Add milestone dots along the progress bar:
```tsx
<div className={styles.progressBar}>
  <div className={styles.progressFill} style={{ width: `${pct}%` }} />
  {[25, 50, 75, 100].map(m => (
    <div
      key={m}
      className={`${styles.milestone} ${pct >= m ? styles.milestoneReached : ''}`}
      style={{ left: `${m}%` }}
      title={`${m}% complete`}
    />
  ))}
</div>
```

```css
.milestone {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border);
  border: 2px solid var(--surface-0);
  transition: background 0.3s ease, transform 0.3s ease;
}

.milestoneReached {
  background: var(--accent);
  transform: translate(-50%, -50%) scale(1.2);
}
```

**Effort:** S

---

### P3-61. Add streak / motivational callout to student dashboard

**Problem:** No gamification or motivational element. The dashboard is purely informational.

**File:** `src/app/dashboard/page.tsx` + `page.module.css`

**Fix:** Add a streak banner above the course cards:
```tsx
<div className={styles.streakBanner}>
  <Flame size={20} className={styles.streakIcon} />
  <span className={styles.streakText}>
    You've been learning for <strong>3 days</strong> straight. Keep it up!
  </span>
</div>
```

```css
.streakBanner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background: var(--accent-soft);
  border: 1px solid var(--accent);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-6);
}

.streakIcon {
  color: var(--accent);
  flex-shrink: 0;
}

.streakText {
  font-size: var(--text-sm);
  color: var(--ink-700);
}
```

Requires a `loginStreak` field or computed value from the user's session history.

**Effort:** M (needs streak tracking logic)

---

### P3-62. Add recent activity feed to student dashboard

**Problem:** The student dashboard shows courses but no activity history. "What did I do last?" is a natural question.

**File:** `src/app/dashboard/page.tsx` + `page.module.css`

**Fix:** Add a "Recent Activity" section:
```tsx
<section className={styles.section}>
  <h2 className={styles.sectionTitle}>Recent Activity</h2>
  <ul className={styles.activityList}>
    {recentActivity.map(activity => (
      <li key={activity.id} className={styles.activityItem}>
        <div className={styles.activityIcon}>
          {activity.type === 'LESSON_COMPLETED' && <CheckCircle size={16} />}
          {activity.type === 'QUIZ_PASSED' && <Trophy size={16} />}
          {activity.type === 'ENROLLED' && <BookOpen size={16} />}
        </div>
        <div className={styles.activityContent}>
          <span className={styles.activityText}>{activity.description}</span>
          <span className={styles.activityTime}>{formatRelativeTime(activity.createdAt)}</span>
        </div>
      </li>
    ))}
  </ul>
</section>
```

**Effort:** M (needs activity logging + query)

---

### P3-63. Add quick action buttons to student dashboard

**Problem:** No shortcuts on the student dashboard. Users have to navigate through the sidebar for common actions.

**File:** `src/app/dashboard/page.tsx` + `page.module.css`

**Fix:**
```tsx
<div className={styles.quickActions}>
  <Link href="/courses" className="btn btn--ghost">
    <BookOpen size={16} /> Browse Catalog
  </Link>
  <Link href="/tools" className="btn btn--ghost">
    <Wrench size={16} /> Tools
  </Link>
  <Link href="/certificates" className="btn btn--ghost">
    <Certificate size={16} /> My Certificates
  </Link>
  <Link href="/profile" className="btn btn--ghost">
    <User size={16} /> Profile
  </Link>
</div>
```

**Effort:** XS

---

### P3-64. Add Phosphor icons to student course cards

**Problem:** Course cards on the dashboard are bare text cards with no visual differentiation. All courses look the same.

**File:** `src/app/dashboard/page.tsx`

**Fix:** Add a course icon mapping:
```tsx
const courseIcons: Record<string, React.ReactNode> = {
  'ppc-fundamentals': <Target size={24} />,
  'keyword-research': <MagnifyingGlass size={24} />,
  'listing-optimization': <ListChecks size={24} />,
  'analytics': <ChartLineUp size={24} />,
  default: <BookOpen size={24} />,
};
```

Render the icon in each course card's left accent area.

**Effort:** S

---

### P3-65. Add "Continue Learning" prominent CTA for last-accessed course

**Problem:** The dashboard shows all enrolled courses equally. There's no prominent "pick up where you left off" experience.

**File:** `src/app/dashboard/page.tsx` + `page.module.css`

**Fix:** Add a hero CTA card for the last-accessed course:
```tsx
{lastCourse && (
  <div className={styles.continueCard}>
    <div className={styles.continueContent}>
      <span className={styles.continueLabel}>Continue Learning</span>
      <h3 className={styles.continueTitle}>{lastCourse.title}</h3>
      <div className={styles.continueProgress}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${lastCourse.progress}%` }} />
        </div>
        <span className={styles.progressText}>{lastCourse.progress}% complete</span>
      </div>
    </div>
    <Link href={`/courses/${lastCourse.slug}/lessons/${lastCourse.nextLessonId}`} className="btn btn--primary">
      Resume →
    </Link>
  </div>
)}
```

**Effort:** M

---

### P3-66. Add hover micro-interaction to student course cards

**Problem:** Course cards have border-color hover but no spatial movement. Feels flat.

**File:** `src/app/dashboard/page.module.css`

**Fix:**
```css
.courseCard {
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.courseCard:hover {
  border-color: var(--accent);
  box-shadow: var(--shadow-1);
  transform: translateY(-2px);
}
```

**Effort:** XS

---

### P3-67. Add course thumbnail/card header illustration

**Problem:** Course cards are text-only. No visual hook to differentiate courses in the catalog.

**File:** `src/app/courses/page.tsx` + `page.module.css`

**Fix:** Add a colored accent header bar to each card (using the course category to pick a color):
```css
.cardHeader {
  height: 6px;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  background: var(--accent);
}
```

Or use abstract geometric patterns generated from the course slug (hash-based color).

**Effort:** S

---

### P3-68. Add "Estimated reading time" to lesson content

**Problem:** Lessons show content length but no time estimate. Users don't know if they're signing up for a 5-minute read or a 30-minute deep dive.

**File:** `src/app/courses/[slug]/lessons/[lessonId]/page.tsx`

**Fix:**
```tsx
const wordCount = lesson.content.split(/\s+/).length;
const readingTime = Math.max(1, Math.ceil(wordCount / 200)); // 200 WPM average

<span className={styles.readingTime}>
  <Clock size={14} /> {readingTime} min read
</span>
```

**Effort:** XS

---

### P3-69. Add smooth scroll-to-top on page navigation

**Problem:** When navigating between pages, the scroll position sometimes persists. The user lands mid-page.

**File:** `src/app/layout.tsx` (root layout)

**Fix:** Add a client component that scrolls to top on route change:
```tsx
"use client";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
```

**Effort:** XS

---

### P3-70. Add animated counter to admin stat tiles

**Problem:** Stat values appear instantly. A subtle count-up animation would add polish.

**File:** `src/app/admin/page.tsx` + `page.module.css`

**Fix:** Create a `<AnimatedCounter>` client component:
```tsx
"use client";
import { useEffect, useState } from 'react';

export function AnimatedCounter({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = 0;
    const end = value;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{display.toLocaleString()}</span>;
}
```

**Effort:** S

---

### P3-71. Add skeleton shimmer animation to loading states

**Problem:** (After P0-01) The skeleton blocks should have a shimmer animation, not just a static gray box.

**File:** `src/components/ui/Skeleton.module.css`

**Fix:**
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.block {
  background: linear-gradient(
    90deg,
    var(--surface-1) 25%,
    var(--surface-2, #f0f0eb) 37%,
    var(--surface-1) 63%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-sm);
}
```

**Effort:** XS

---

### P3-72. Add "Last updated" timestamp to admin dashboard

**Problem:** Admin dashboard shows stats but no indication of when they were last refreshed. Is this data from 5 minutes ago or 5 hours ago?

**File:** `src/app/admin/page.tsx`

**Fix:**
```tsx
<p className={styles.lastUpdated}>
  Last updated: {formatRelativeTime(new Date())}
</p>
```

**Effort:** XS

---

### P3-73. Add admin sidebar recent pages section

**Problem:** After P0-05 (sectioned sidebar), admins still have no quick access to pages they visited recently.

**File:** `src/components/admin/NavSidebar.tsx` + `NavSidebar.module.css`

**Fix:** Track last 3 visited admin pages in `localStorage` and show them below the main nav:
```tsx
const [recentPages, setRecentPages] = useState<{path: string, label: string}[]>([]);

useEffect(() => {
  const stored = localStorage.getItem('adminRecentPages');
  if (stored) setRecentPages(JSON.parse(stored));
}, []);
```

Update on route change:
```tsx
useEffect(() => {
  const current = { path: pathname, label: getLabelForPath(pathname) };
  setRecentPages(prev => {
    const filtered = prev.filter(p => p.path !== current.path);
    const updated = [current, ...filtered].slice(0, 3);
    localStorage.setItem('adminRecentPages', JSON.stringify(updated));
    return updated;
  });
}, [pathname]);
```

**Effort:** M

---

### P3-74. Add admin sidebar collapse toggle

**Problem:** The admin sidebar is always 240px. On smaller screens or when working with wide tables, admins might want to collapse it.

**File:** `src/components/admin/NavSidebar.tsx` + `NavSidebar.module.css`

**Fix:** Add a collapse button at the bottom of the sidebar:
```tsx
<button className={styles.collapseBtn} onClick={() => setCollapsed(!collapsed)}>
  {collapsed ? <Sidebar size={16} /> : <SidebarSimple size={16} />}
</button>
```

Collapsed state: 64px width, icons only, tooltips on hover.

**Effort:** M

---

### P3-75. Add keyboard navigation to quiz page

**Problem:** Quiz page requires mouse clicks to select answers. No keyboard shortcuts.

**File:** `src/app/courses/[slug]/lessons/[lessonId]/quiz/page.tsx`

**Fix:** Add number key shortcuts (1-4) to select options, Enter to submit:
```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key >= '1' && e.key <= '4') {
      const idx = parseInt(e.key) - 1;
      if (options[idx]) selectOption(options[idx].id);
    }
    if (e.key === 'Enter' && selectedOption) submitAnswer();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [selectedOption, options]);
```

Show keyboard hints in the UI:
```tsx
<span className={styles.keyHint}>Press {idx + 1}</span>
```

**Effort:** S

---

### P3-76. Add confetti animation on quiz completion

**Problem:** Quiz completion shows a plain score card. No celebration moment.

**File:** `src/app/courses/[slug]/lessons/[lessonId]/quiz/page.tsx`

**Fix:** Add a lightweight confetti effect (CSS-only, no library):
```css
@keyframes confetti-fall {
  0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

.confetti {
  position: fixed;
  top: 0;
  left: 50%;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  animation: confetti-fall 2s ease-in forwards;
  pointer-events: none;
  z-index: 1000;
}
```

Generate 20 confetti pieces with random colors from the accent palette and random horizontal positions.

**Effort:** S

---

### P3-77. Add certificate download as PNG

**Problem:** The certificate page shows a certificate but has no download option.

**File:** `src/app/certificates/[hash]/page.tsx`

**Fix:** Add a "Download as PNG" button that uses `html2canvas` or a server-side image generation endpoint:
```tsx
<Link href={`/api/certificates/${hash}/image`} className="btn btn--primary">
  <Download size={16} /> Download Certificate
</Link>
```

Create an API route that renders the certificate as an image.

**Effort:** L

---

### P3-78. Add share button to certificate page

**Problem:** Certificates are shareable URLs but there's no native share button.

**File:** `src/app/certificates/[hash]/page.tsx`

**Fix:**
```tsx
<button
  className="btn btn--ghost"
  onClick={() => {
    if (navigator.share) {
      navigator.share({
        title: `Certificate: ${cert.course.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // show "Copied!" toast
    }
  }}
>
  <ShareNetwork size={16} /> Share
</button>
```

**Effort:** XS

---

### P3-79. Add print styles to certificate page

**Problem:** Printing the certificate page produces a poorly formatted result — sidebar, nav, and other chrome get printed too.

**File:** `src/app/certificates/[hash]/page.module.css`

**Fix:**
```css
@media print {
  .wrapper {
    padding: 0;
    background: white;
  }
  .card {
    box-shadow: none;
    border: 2px solid #000;
    page-break-inside: avoid;
  }
  .actions {
    display: none;
  }
}
```

**Effort:** XS

---

### P3-80. Add course completion certificate auto-generation

**Problem:** When a student completes all lessons in a course, there's no automatic certificate generation or prompt.

**File:** `src/app/courses/[slug]/lessons/[lessonId]/page.tsx` (in the mark-complete action)

**Fix:** After marking the last lesson complete, check if all lessons are done. If so:
1. Generate a certificate record in the database
2. Show a celebration modal: "Congratulations! You've completed [Course Name]!"
3. Include a link to the certificate

**Effort:** M

---

### P3-81. Add admin impersonation return button styling

**Problem:** The `ImpersonationBanner` component exists but its styling may be minimal. When an admin impersonates a user, the banner should be highly visible.

**File:** `src/components/admin/ImpersonationBanner.tsx` + `ImpersonationBanner.module.css`

**Fix:** Ensure the banner uses `var(--warning)` background, is sticky at the top, and has a clear "Return to Admin" button:
```css
.banner {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: var(--warning);
  color: var(--ink-900);
  padding: var(--space-2) var(--space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  font-size: var(--text-sm);
  font-weight: 600;
}
```

**Effort:** XS

---

### P3-82. Add course progress percentage to admin course detail

**Problem:** Admin course detail shows enrollment count but not average completion percentage.

**File:** `src/app/admin/courses/[id]/page.tsx`

**Fix:** Add a stat:
```tsx
<div className={styles.stat}>
  <span className={styles.statLabel}>Avg. Completion</span>
  <span className={styles.statValue}>{avgCompletion}%</span>
</div>
```

**Effort:** S

---

### P3-83. Add "Bulk Actions" to admin user list

**Problem:** No way to select multiple users and perform bulk operations (export, deactivate, assign badge).

**File:** `src/app/admin/users/page.tsx` + `page.module.css`

**Fix:** Add checkboxes to each row, a "Select All" checkbox in the header, and a bulk action bar that appears when items are selected:
```tsx
{selectedUsers.length > 0 && (
  <div className={styles.bulkBar}>
    <span>{selectedUsers.length} selected</span>
    <button className="btn btn--ghost btn--sm">Export</button>
    <button className="btn btn--ghost btn--sm">Assign Badge</button>
    <button className="btn btn--danger btn--sm">Deactivate</button>
  </div>
)}
```

**Effort:** L

---

### P3-84. Add admin course drag-and-drop lesson reordering

**Problem:** Lessons within a module are ordered by creation date. No way to reorder them.

**File:** `src/app/admin/courses/[id]/modules/[moduleId]/page.tsx`

**Fix:** Add drag handles to each lesson row and a server action to update the `order` field:
```tsx
<div draggable onDragStart={() => setDragging(lesson.id)} onDragOver={...} onDrop={...}>
  <GripVertical size={16} className={styles.dragHandle} />
  <span>{lesson.title}</span>
</div>
```

**Effort:** L

---

### P3-85. Add "Duplicate Course" button to admin course detail

**Problem:** Creating a similar course requires starting from scratch. No duplicate/copy feature.

**File:** `src/app/admin/courses/[id]/page.tsx`

**Fix:**
```tsx
<form action={duplicateCourseAction}>
  <button type="submit" className="btn btn--ghost">
    <Copy size={16} /> Duplicate Course
  </button>
</form>
```

The server action deep-copies the course, all modules, all lessons, and all quizzes with "(Copy)" appended to titles.

**Effort:** M

---

### P3-86. Add admin revenue chart to dashboard

**Problem:** The revenue stat tile shows a single number. No trend visualization.

**File:** `src/app/admin/page.tsx` + `page.module.css`

**Fix:** Add a mini sparkline (SVG) showing 30-day revenue trend:
```tsx
<svg className={styles.sparkline} viewBox="0 0 120 30" preserveAspectRatio="none">
  <polyline
    fill="none"
    stroke="var(--accent)"
    strokeWidth="1.5"
    points={revenueTrend.map((val, i) =>
      `${i * (120 / (revenueTrend.length - 1))},${30 - (val / maxVal) * 30}`
    ).join(' ')}
  />
</svg>
```

```css
.sparkline {
  width: 100%;
  height: 30px;
  margin-top: var(--space-2);
  opacity: 0.6;
}
```

**Effort:** M

---

### P3-87. Add dark mode support

**Problem:** The entire app is light-mode only. No dark mode toggle.

**Files:** `globals.css`, root layout, all `.module.css` files

**Fix:** Define dark-mode token overrides in `globals.css`:
```css
[data-theme="dark"] {
  --surface-0: #1A1A1A;
  --surface-1: #242424;
  --ink-900: #FAFAF7;
  --ink-700: #D4D4D4;
  --ink-500: #A3A3A3;
  --border: #333333;
  /* ... all tokens */
}
```

Add a theme toggle in the sidebar (both student and admin). Store preference in `localStorage` + `data-theme` attribute on `<html>`.

**Effort:** XL

---

### P3-88. Add keyboard shortcut hints to admin command palette

**Problem:** (After P2-25) The command palette works but users don't know it exists.

**Fix:** Add a subtle "⌘K" hint in the admin sidebar:
```tsx
<div className={styles.shortcutHint}>
  <MagnifyingGlass size={14} />
  <kbd>⌘K</kbd>
</div>
```

**Effort:** XS

---

### P3-89. Add "Export CSV" to admin payments list

**Problem:** No way to export payment data for accounting.

**File:** `src/app/admin/payments/page.tsx`

**Fix:** Add an "Export CSV" button that triggers a server action:
```tsx
<Link href="/admin/payments/export" className="btn btn--ghost">
  <Download size={16} /> Export CSV
</Link>
```

Create an API route that generates a CSV with all payment records.

**Effort:** S

---

### P3-90. Add "Export CSV" to admin user list

**Problem:** Same as P3-89 but for users.

**File:** `src/app/admin/users/page.tsx`

**Fix:** Same pattern — export button + API route.

**Effort:** S

---

### P3-91. Add course category tags to course cards

**Problem:** Course cards in the catalog show title and description but no category tag. "PPC", "Analytics", "SEO" — no visual categorization.

**File:** `src/app/courses/page.tsx` + `page.module.css`

**Fix:**
```tsx
<span className={styles.categoryTag}>{course.category}</span>
```

```css
.categoryTag {
  display: inline-block;
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent);
  background: var(--accent-soft);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-2);
}
```

**Effort:** XS

---

### P3-92. Add "Difficulty" indicator to course cards

**Problem:** No indication of course difficulty level. Beginners and advanced users see the same catalog.

**File:** `src/app/courses/page.tsx` + `src/app/courses/[slug]/page.tsx`

**Fix:** Add a difficulty badge:
```tsx
<span className={`${styles.difficulty} ${styles[course.difficulty]}`}>
  {course.difficulty}
</span>
```

```css
.difficulty {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
}

.beginner { color: var(--success); background: var(--success-soft, #F0FFF4); }
.intermediate { color: var(--warning); background: var(--warning-soft, #FFFBEB); }
.advanced { color: var(--danger); background: var(--danger-soft, #FFF5F5); }
```

**Effort:** S

---

### P3-93. Add "New" badge to recently published courses

**Problem:** No visual indicator when new courses are added to the catalog.

**File:** `src/app/courses/page.tsx`

**Fix:** Show a "NEW" badge on courses published within the last 14 days:
```tsx
const isNew = (Date.now() - new Date(course.publishedAt).getTime()) < 14 * 24 * 60 * 60 * 1000;

{isNew && <span className={styles.newBadge}>NEW</span>}
```

**Effort:** XS

---

### P3-94. Add course rating/review display

**Problem:** No social proof. Students can't see how others rated a course.

**File:** `src/app/courses/[slug]/page.tsx`

**Fix:** Add a star rating display (requires a `CourseReview` model):
```tsx
<div className={styles.rating}>
  {[1, 2, 3, 4, 5].map(star => (
    <Star
      key={star}
      size={16}
      weight={star <= avgRating ? 'fill' : 'regular'}
      className={star <= avgRating ? styles.starFilled : styles.starEmpty}
    />
  ))}
  <span className={styles.ratingText}>{avgRating.toFixed(1)} ({reviewCount} reviews)</span>
</div>
```

**Effort:** L (needs schema + API + UI)

---

### P3-95. Add "What you'll learn" checklist to course detail

**Problem:** Course detail page shows description and curriculum but no "What you'll learn" checklist. This is standard on every LMS.

**File:** `src/app/courses/[slug]/page.tsx` + `page.module.css`

**Fix:**
```tsx
<section className={styles.section}>
  <h2 className={styles.sectionTitle}>What You'll Learn</h2>
  <ul className={styles.learningPoints}>
    {course.learningPoints.map((point, i) => (
      <li key={i} className={styles.learningPoint}>
        <Check size={16} className={styles.checkIcon} />
        {point}
      </li>
    ))}
  </ul>
</section>
```

**Effort:** S (if field exists) or M (needs schema addition)

---

### P3-96. Add "Prerequisites" section to course detail

**Problem:** No indication of what knowledge is required before taking a course.

**File:** `src/app/courses/[slug]/page.tsx`

**Fix:** Similar to P3-95 but for prerequisites. Show as a list of linked courses:
```tsx
{course.prerequisites.length > 0 && (
  <section className={styles.section}>
    <h2 className={styles.sectionTitle}>Prerequisites</h2>
    <ul className={styles.prereqList}>
      {course.prerequisites.map(prereq => (
        <li key={prereq.id}>
          <Link href={`/courses/${prereq.slug}`}>{prereq.title}</Link>
        </li>
      ))}
    </ul>
  </section>
)}
```

**Effort:** M

---

### P3-97. Add instructor profile section to course detail

**Problem:** No instructor information. Students want to know who's teaching.

**File:** `src/app/courses/[slug]/page.tsx`

**Fix:**
```tsx
<section className={styles.instructorSection}>
  <div className={styles.instructorAvatar}>
    <User size={32} />
  </div>
  <div className={styles.instructorInfo}>
    <h3 className={styles.instructorName}>{course.instructor.name}</h3>
    <p className={styles.instructorBio}>{course.instructor.bio}</p>
  </div>
</section>
```

**Effort:** M (needs instructor data)

---

### P3-98. Add admin notification bell

**Problem:** No notification system for admins. They have to manually check for pending refunds, new signups, etc.

**File:** `src/components/admin/NavSidebar.tsx` or `TopBar.tsx`

**Fix:** Add a bell icon with a count badge:
```tsx
<button className={styles.bellButton} aria-label="Notifications">
  <Bell size={20} />
  {unreadCount > 0 && <span className={styles.bellBadge}>{unreadCount}</span>}
</button>
```

**Effort:** L (needs notification model + real-time updates)

---

### P3-99. Add "Fullscreen" mode for lesson content

**Problem:** Lesson content competes with the sidebar for attention. A fullscreen/distraction-free reading mode would help focus.

**File:** `src/app/courses/[slug]/lessons/[lessonId]/page.tsx`

**Fix:** Add a fullscreen toggle button:
```tsx
<button className="btn btn--ghost btn--sm" onClick={() => setFullscreen(!fullscreen)}>
  {fullscreen ? <X size={16} /> : <ArrowsOut size={16} />}
  {fullscreen ? 'Exit Focus' : 'Focus Mode'}
</button>
```

When fullscreen, hide the sidebar and expand the content to full width with a max-width of 720px centered.

**Effort:** S

---

# Summary

| Priority | Count | Effort Distribution |
|----------|-------|---------------------|
| **P0 Critical** | 6 | 2×M, 2×S, 1×L, 1×XS |
| **P1 High** | 14 | 3×M, 4×S, 6×XS, 1×L |
| **P2 Medium** | 39 | 8×M, 12×S, 16×XS, 3×L |
| **P3 Enhancement** | 40 | 8×M, 10×S, 14×XS, 4×L, 1×XL, 3×remaining |
| **Total** | **99** | |

## Recommended Implementation Order

1. **Sprint 1 (P0):** loading.tsx skeleton component → student nav shell → checkout CSS fix → completedLessonIds → admin sidebar sections → table hover
2. **Sprint 2 (P1):** Link fixes → breadcrumbs → card hovers → clickable tiles → empty states → mark-as-complete → auth shell → 404 pages
3. **Sprint 3 (P2):** Mobile responsive → search/filter → pagination → form improvements → toast system → consistency fixes
4. **Sprint 4 (P3):** Animations → gamification → dark mode → export features → instructor profiles → reviews

---

**Total files to create:** ~55 (loading.tsx files, shared components, new pages)
**Total files to modify:** ~45 (existing CSS modules, page components, layouts)
**Estimated total effort:** ~3-4 weeks for one developer
