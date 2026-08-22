# Student-facing experience audit

## Scope

This audit covers the student-facing shell, public course discovery, course detail, lesson navigation, quiz continuity, dashboard resume behavior, tools, resources, live classes, profile, and shared responsive/accessibility patterns.

## Current strengths

The platform already has a reusable authenticated `StudentShell`, a public optional-auth shell, route-aware sidebar active states, a mobile drawer with focus management, course and lesson breadcrumbs, server-side lesson access checks, progress persistence, and a growing suite of renderer and accessibility tests.

## Highest-impact findings

| Priority | Surface | Finding | Student impact | Proposed direction |
|---|---|---|---|---|
| P0 | Lesson navigation | `LessonSidebar` renders section headers as buttons but does not update state, so its advertised collapsible behavior is non-functional. | Students cannot control curriculum density or quickly scan sections. | Add client-side open-section state, preserve the current section open, and expose accurate `aria-expanded`/`aria-controls`. |
| P0 | Quiz route | The canonical course quiz route does not use `StudentShell`. | The learner leaves the main navigation context and loses consistent course orientation. | Wrap authorized quiz pages and quiz not-found/access states in the student shell where appropriate; add course/lesson return links. |
| P0 | Resume learning | Dashboard “Continue” links to the course root and uses enrollment creation time as a proxy for activity. | The primary CTA does not resume the next actionable lesson. | Resolve the first incomplete lesson from the enrolled curriculum and link directly to it; distinguish start, resume, and review states. |
| P1 | Course detail | Enrolled learners see the same catalog-style hero with no progress summary or next lesson cue. | Course page does not function as a useful launchpad after enrollment. | Add progress/readiness strip, next lesson CTA, completed count, and clear enrolled-state language. |
| P1 | Lesson flow | Previous/next controls contain only generic labels and IDs are not visible to the learner. | Movement between lessons lacks context and confidence. | Pass lesson titles and section labels into a richer navigation primitive with explicit accessible names. |
| P1 | Global navigation | Sidebar is useful but has no compact “current course” context and the public header is intentionally minimal. | Students must reconstruct where they are from page-local content. | Add contextual shell cues without duplicating page landmarks; preserve a simple public browse flow. |
| P2 | State handling | Empty, error, locked, and completed states are present but not consistently paired with a recommended next action. | Dead ends and uncertainty increase after failed loads or finished content. | Standardize action-oriented state copy and return paths across catalog, course, quiz, resources, and live classes. |
| P2 | Accessibility | Existing axe coverage is strong for lesson primitives but route-level navigation and mobile drawer regressions need broader assertions. | Component correctness does not guarantee complete student-flow accessibility. | Add route-level assertions for landmarks, current page state, drawer focus behavior, and keyboard-accessible curriculum navigation. |

## Implementation tranche

1. Fix lesson sidebar interaction and navigation semantics.
2. Improve dashboard resume logic and course-detail progress orientation.
3. Unify the quiz route with the student shell and return navigation.
4. Replace generic lesson prev/next controls with title-aware controls.
5. Add targeted route and component tests, then run the full project QA suite.

## Second-tranche status

The resources and live-class visual refinement tranche is now implemented on top of the shared shell. The download center has a stronger heading hierarchy, resource counts, file and lock cues, responsive rows, explicit download or upgrade actions, and action-oriented empty and error states. The live-class index now promotes the next session, uses semantic time metadata, makes UTC treatment explicit, improves session action labels, and switches to a responsive narrow-screen composition. The live-class detail view now provides status-aware learner guidance, semantic date and duration metadata, clearer access-required copy, and responsive action groups.

The remaining work is primarily breadth: render-level route tests for resources and live classes, deeper mobile interaction coverage, and similar visual refinement for profile, certificates, simulator index, and individual simulator surfaces. The current tranche intentionally avoids adding new persistence fields, search infrastructure, analytics, or external dependencies.

## Non-goals for the first tranche

This pass does not introduce a new data model, analytics system, search index, or external dependency. It uses the existing repository interfaces and design tokens, and it avoids changing business authorization rules.
