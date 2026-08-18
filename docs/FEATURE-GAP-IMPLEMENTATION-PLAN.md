# Feature Gap Implementation Plan

## VA Project PH → AMPH v2 Greenfield

**Status:** Proposed planning baseline  
**Date:** 2026-08-18  
**Owner:** Ryan Roland Dabao  
**Source audit:** `va-project-ph` documentation compared with the current `amph-v2-greenfield` route, action, use-case, port, and simulator inventories.

## 1. Purpose and outcome

This document turns the VA Project PH feature-gap audit into an executable product and engineering plan for AMPH v2 Greenfield.

The target outcome is a complete learning-operations loop:

```text
student onboarding → lessons/practice → submission → teacher review → intervention
       ↑                                                  ↓
   analytics ← notifications ← audited domain events ← admin operations
```

The plan deliberately separates three kinds of work:

1. **Student experience:** the pages and interactions learners use.
2. **Teacher/admin operations:** the review, publishing, support, and governance surfaces needed to operate the academy.
3. **Backend functions:** domain entities, ports, use cases, actions, persistence, events, authorization, and observability.

Simulator expansion follows only after the review loop and shared simulator contracts are strong enough to support it.

## 2. Scope decisions

### Included

- Student onboarding and learning shell improvements.
- Student dashboard, progress, activity, notifications, help, glossary, worksheets, and practice navigation.
- Teacher role, cohorts, student review, grading, assignments, notes, and intervention workflows.
- Admin content publishing controls, feature flags, health/operations, analytics, and support improvements.
- Learning events and product metrics separate from infrastructure logs.
- PH connectivity: data-saver, offline lesson reading, draft persistence, queued idempotent actions, and recovery states.
- Expansion of the simulator family from the current five tools toward report, pacing, bulk operations, audit, onboarding, and capstone workflows.

### Explicitly deferred or requiring a decision

- AI mentor or external AI APIs. The current product brief and ADR-003 prohibit them.
- Live Amazon Ads write access. Keep read-only/import work behind a future ADR, consent model, threat model, and rollback plan.
- Native mobile applications.
- Multi-tenant agency workspaces.
- Subscription billing and community-forum features.
- Full CMS replacement. The current product ships content with the application; the publishing workflow below improves governance without assuming a separate CMS.

## 3. Current baseline

### Already present and should be preserved

- Public catalog, pricing, signup/login, email verification, password reset, checkout, enrollment, and access control.
- Student dashboard, profiles, courses, lessons, quizzes, XP, badges, certificates, live classes, resources, and five practice tools.
- Admin users, courses/modules/lessons, quizzes, certificates, payments, refunds, simulators, live classes, resources, discount codes, badges, audit log, settings, 2FA, and email templates.
- Shared simulator attempt lifecycle: start, save decision, submit, grade, feedback, score policies, scenario administration, and Challenge-mode gating.
- Ports-and-adapters composition, `Result<T, E>` error flow, fake/in-memory test adapters, Prisma persistence, PayMongo, Resend, Sentry, health endpoints, and rate limiting.

### Gaps to close

| Area | Current gap | Desired state |
|---|---|---|
| Student shell | Navigation is organized around existing routes/tools rather than one explicit learning journey | A documented Learn/Practice/Progress/Support journey that works on mobile and desktop |
| Onboarding | No complete first-login welcome, safety orientation, skill check, and recommended path contract | First-login flow ending at a concrete first lesson or practice activity |
| Teacher operations | No teacher/cohort/grading route family in the runtime inventory | Teacher workspace with least-privilege access and auditable review actions |
| Worksheets | No student draft/submit/revise and teacher feedback lifecycle | Durable submissions with revision history and offline-safe drafts |
| Analytics | Infrastructure observability exists, but product learning events are not a single contract | Event taxonomy, KPI definitions, dashboards, and intervention signals |
| Notifications | Email/reminder pieces exist; in-app notification model is deferred | Durable, idempotent, preference-aware notifications with deep links |
| Content governance | Admin CRUD exists, but controlled review/preview/publish/rollback is not a unified contract | Versioned content release with validation gates and audit history |
| PH connectivity | Responsive UI exists; offline/data-light behavior is not a complete product contract | Cached lessons, resilient drafts, queued idempotent mutations, and clear status UI |
| Simulators | Five tools exist; the broader S1–S14 family is not represented | Shared rubric plus staged report, operations, field-skills, and capstone tools |

## 4. Delivery principles

1. **Close the feedback loop before adding breadth.** A new simulator without teacher review, analytics, and intervention support increases unfinished work.
2. **Use vertical slices.** Each phase must produce a usable student/admin capability with domain, persistence, authorization, UI, tests, and documentation together.
3. **Keep domain decisions provider-independent.** New features must enter through ports and use cases; pages must not call Prisma directly.
4. **Make every mutation safe to retry.** Completion, submissions, grading, notifications, sync, and XP must use idempotency keys or deterministic dedupe rules.
5. **Separate product analytics from infrastructure observability.** Sentry, logs, and Web Vitals answer “is the system healthy?” Learning events answer “is the learner progressing?”
6. **Design for Filipino connectivity and beginner confidence.** Plain language, low transfer sizes, safe-mode framing, “needs more data” states, and recoverable actions are acceptance criteria.
7. **Audit high-impact actions.** Role changes, grades, content publishing, impersonation, refunds, flags, data export/deletion, and simulator scenario changes must be attributable and reviewable.

## 5. Target architecture

### Domain entities and value objects

Add only when the behavior is required by a vertical slice:

- `OnboardingState`: welcome, skill assessment, safety orientation, path selected, completed.
- `LearningPath`: ordered course/module/lesson recommendations with rationale and version.
- `Worksheet`, `WorksheetAssignment`, `WorksheetSubmission`, `WorksheetRevision`, `TeacherFeedback`.
- `TeacherProfile`, `Cohort`, `CohortMembership`, `Assignment`.
- `LearningEvent`, `MetricDefinition`, `InterventionSignal`.
- `Notification`, `NotificationPreference`, `NotificationDelivery`.
- `ContentVersion`, `ContentReview`, `ContentPublication`.
- `FeatureFlag` and scoped evaluation result, if flags remain an admin requirement.
- `HelpArticle`, `HelpArticleFeedback`, and search metadata, if the help center becomes an owned product surface.
- `OfflineMutation` only if queue state must be server-visible; local queue records should otherwise remain client-side.

### Ports

Introduce narrow ports beside the relevant use cases:

- `IOnboardingRepository`, `ILearningPathRepository`.
- `IWorksheetRepository`, `IWorksheetSubmissionRepository`, `ITeacherFeedbackRepository`.
- `ICohortRepository`, `IAssignmentRepository`.
- `ILearningEventRepository`, `IAnalyticsReader`.
- `INotificationRepository`, `INotificationDelivery`.
- `IContentVersionRepository`, `IContentPublicationRepository`.
- `IFeatureFlagRepository` and `IFeatureFlagEvaluator`.
- `IHelpArticleRepository` and `IHelpSearch`.
- `IIdempotencyStore` for sync, webhook, notification, and other retry-sensitive boundaries.

Every new port requires an in-memory/fake adapter and contract tests against the Prisma adapter where persistence is involved.

### Authorization model

Define permissions, not only roles:

| Permission | Student | Teacher | Admin |
|---|---:|---:|---:|
| Read own learning data | yes | own data | yes |
| Read assigned student data | no | yes | yes |
| Create/edit own draft | yes | yes | yes |
| Grade/review assigned work | no | yes | yes |
| Assign learning work | no | yes | yes |
| Manage cohort membership | no | scoped | yes |
| Publish curriculum | no | review only | yes / designated approver |
| Manage users/roles | no | no | yes |
| Manage flags/operations | no | no | yes |
| Impersonate | no | no | admin-only, non-admin target, time-boxed |
| Export sensitive data | own request | assigned scope if approved | dual approval |

The current `INSTRUCTOR` role should not automatically gain access until these permissions and row-level scope rules are implemented and tested.

## 6. Phased delivery plan

### Phase 0 — Contract and architecture preparation

**Goal:** remove ambiguity before schema work.

Deliverables:

- Approve role/permission matrix and teacher scope rules.
- Confirm whether “Coach” is rule-based, removed, or a future product surface.
- Define canonical student IA and route naming.
- Define event naming, IDs, timestamps, actor/viewer fields, and privacy classification.
- Define content lifecycle: draft, preview, published, archived, rollback.
- Define offline consistency rules: server wins for grades/XP; append-only attempts; last-write or merge policy for notes/drafts.
- Add ADRs for teacher roles, learning analytics, notifications, offline sync, and content publishing.

**Exit gate:** no new feature begins until its actor, authorization, persistence, event, and retry behavior are documented.

### Phase 1 — Student shell and onboarding

**Student pages:**

- `/welcome`
- `/onboarding/assessment`
- `/onboarding/safety`
- `/onboarding/path`
- `/dashboard` improvements: continue learning, next step, quick practice, recent activity, milestones.
- Responsive shell update: desktop sidebar plus mobile bottom navigation with a documented information hierarchy.

**Functions/use cases:**

- `GetOnboardingState`
- `SaveSkillAssessment`
- `CompleteSafetyOrientation`
- `BuildLearningPath`
- `GetStudentDashboard`
- `RecordLastAccessedLearningItem`

**Acceptance criteria:**

- A new student can reach a first recommended lesson without guessing where to go.
- Refreshing/retrying onboarding does not duplicate state or rewards.
- Dashboard exposes next action, progress, recent activity, and a practice shortcut.
- All pages work at 320px width and on slow 4G without blocking the first value moment.

### Phase 2 — Teacher foundation: roles, cohorts, and student review

**Teacher pages:**

- `/teacher`
- `/teacher/students`
- `/teacher/students/[id]`
- `/teacher/cohorts`
- `/teacher/cohorts/[id]`

**Functions/use cases:**

- `ListTeacherStudents`
- `GetTeacherStudentDetail`
- `CreateCohort`, `UpdateCohort`, `ArchiveCohort`
- `AddCohortMember`, `RemoveCohortMember`, `ReassignCohortTeacher`
- `GetCohortDashboard`
- `ListStudentProgressSignals`

**Security requirements:**

- Teachers see only assigned students/cohorts.
- Admins can inspect all scopes.
- Every scope violation returns the same safe denial shape and creates a security audit event.
- Role changes invalidate/re-evaluate sessions on the next guarded request.

**Acceptance criteria:**

- Teacher dashboard shows progress, at-risk count, and assigned workload.
- Student detail shows lessons, quizzes, simulator attempts, resources, live classes, and open feedback without exposing unrelated billing/security data.
- Cohort reassignments preserve history and are auditable.

### Phase 3 — Worksheets, assignments, and grading loop

**Student pages:**

- `/worksheets`
- `/worksheets/[id]`
- `/worksheets/[id]/feedback`

**Teacher pages:**

- `/teacher/assignments`
- `/teacher/grading`
- `/teacher/grading/[submissionId]`

**Functions/use cases:**

- `CreateAssignment`, `ListAssignments`, `CloseAssignment`
- `StartWorksheetDraft`, `SaveWorksheetDraft`, `SubmitWorksheet`
- `ListGradingQueue`, `GetSubmissionForReview`
- `SaveTeacherFeedback`, `RequestRevision`, `ApproveSubmission`
- `ListSubmissionRevisions`

**State machine:**

```text
draft → submitted → in_review → approved
                    └─────────→ revision_requested → draft
```

**Acceptance criteria:**

- Draft saves are idempotent and recoverable after refresh/offline periods.
- A submission is immutable; revisions create new records.
- Teacher feedback is attributed, timestamped, and visible to the student.
- Stale-review detection prevents overwriting a newer submission or grade.
- Assignment due dates, status, and revision counts are visible to the correct actor.

### Phase 4 — Learning events, notifications, and intervention signals

**Student/admin pages:**

- Notification bell and `/notifications` or an equivalent drawer.
- `/admin/analytics`
- `/admin/notifications` or notification rules within settings.
- Teacher “needs attention” view.

**Core event taxonomy:**

- `student.onboarding_started`, `student.onboarding_completed`
- `lesson.started`, `lesson.completed`
- `quiz.started`, `quiz.submitted`, `quiz.passed`
- `simulator.started`, `simulator.submitted`, `simulator.passed`
- `worksheet.assigned`, `worksheet.submitted`, `worksheet.feedback_added`, `worksheet.approved`
- `live_class.rsvped`, `live_class.watched`
- `resource.viewed`, `resource.downloaded`
- `certificate.issued`, `certificate.revoked`
- `help.article_viewed`, `help.article_helpful`, `help.search_zero_result`

**Functions/use cases:**

- `RecordLearningEvent`
- `GetStudentProgressSummary`
- `GetCohortProgressSummary`
- `DetectInterventionSignals`
- `CreateNotification`, `ListNotifications`, `MarkNotificationRead`
- `EvaluateNotificationPreferences`
- `SendNotificationDelivery`

**Rules:**

- Event recording must not block the primary student action unless required for correctness.
- Notification creation must be idempotent by event ID and notification rule.
- Analytics queries must use privacy-minimized fields and explicit retention.
- XP, badges, and certificates remain authoritative domain decisions; analytics cannot award them independently.

**Acceptance criteria:**

- A student sees actionable deep-linked notifications.
- Teachers see intervention signals with evidence, not unexplained labels.
- Admin can measure enrollment, completion, simulator engagement, grading backlog, and refund outcomes.

### Phase 5 — Content governance, help, and admin operations

**Admin pages:**

- `/admin/content/[type]/[id]/versions`
- `/admin/content/[type]/[id]/preview`
- `/admin/help-center`
- `/admin/feature-flags`
- `/admin/health`

**Functions/use cases:**

- `CreateContentDraft`, `CreateContentVersion`
- `ValidateContentVersion`
- `SubmitContentForReview`, `ApproveContentVersion`, `PublishContentVersion`
- `RollbackContentVersion`
- `ListHelpArticles`, `PublishHelpArticle`, `RecordArticleFeedback`
- `GetFeatureFlag`, `SetFeatureFlag`, `EvaluateFeatureFlag`
- `GetOperationalHealthSnapshot`

**Validation gates:**

- Readability threshold.
- Glossary-link integrity.
- Quiz answer correctness.
- Simulator rubric completeness.
- Required owner/approver.
- No direct edits to published content; publish creates a version.

**Acceptance criteria:**

- Admin can preview exactly what a student will see.
- Publishing and rollback are atomic, audited, and reversible.
- Feature flags have environment scope, default value, kill-switch styling, and change audit.
- Health page links to runbooks and never exposes secrets.

### Phase 6 — PH connectivity and offline resilience

**Student behavior:**

- Cache lessons on first open and expose an “Available offline” state.
- Autosave worksheet and simulator drafts locally with a visible last-saved time.
- Queue safe mutations: lesson completion, quiz submission where supported, and simulator submission where supported.
- Sync on reconnect using idempotency keys.
- Show a persistent offline banner without blocking reading.

**Backend functions:**

- `AcceptIdempotentMutation`
- `ReplayQueuedMutation`
- `GetSyncStatus`
- `ResolveSyncConflict`

**Safety rules:**

- Server wins for grades, XP, certificates, and published content.
- Attempts are append-only; replay returns the original result.
- User-authored notes/drafts use the documented merge policy.
- No offline path can bypass enrollment, tier, or role authorization.

**Acceptance criteria:**

- Lesson reading works after the initial cache on a simulated offline device.
- Refreshing during a quiz or simulator does not lose recoverable work.
- Duplicate replay does not duplicate XP, grades, notifications, or audit entries.
- CI measures route transfer budgets and mobile overflow at the agreed widths.

### Phase 7 — Simulator family expansion

Implement in this order:

1. Normalize the five existing tools against shared rubrics and feedback states.
2. Report Builder: wins, problems, next steps, preview, client-safe language.
3. Budget/Pacing: budget-vs-actual, pacing, dayparting, insufficient-data handling.
4. Bulk Operations: affected-row preview, scope, validation, reversible actions.
5. Campaign Architect: account structure, naming, targeting, placements, review.
6. Account Audit: evidence, severity, prioritization, action plan.
7. Client Onboarding: access boundaries, goals, intake, audit handoff, communication.
8. Capstone: cross-tool practice account, teacher review, portfolio evidence, correction drill.

Every simulator must supply:

- stable slug and immutable version;
- synthetic dataset and stated data limitations;
- ordered tasks and allowed inputs;
- rubric dimensions and rationale rules;
- safe/risky/incomplete feedback;
- access tier and curriculum mapping;
- attempt idempotency and historical readability;
- student page, admin scenario/version page, actions, use case, ports, adapters, and tests;
- analytics events and teacher-review path where applicable.

## 7. Database and migration strategy

1. Add tables in dependency order: onboarding/path → teacher/cohort → assignments/worksheets → events/notifications → content versions/help/flags → sync metadata.
2. Add nullable columns or new tables first; deploy code that can read both old and new shapes.
3. Backfill derived data asynchronously and idempotently.
4. Add unique constraints only after duplicate analysis.
5. Keep audit records append-only; never rewrite historical grades, submissions, events, or published versions.
6. Use feature flags to dark-launch new student/teacher pages.
7. Remove compatibility paths only after production verification and a documented rollback window.

## 8. Testing and verification matrix

### Domain/use-case tests

- State transitions and invalid transitions.
- Authorization scope and denial behavior.
- Idempotency and replay.
- XP/badge/certificate non-duplication.
- Notification dedupe and preference suppression.
- Content validation and rollback.
- Offline conflict policy.
- Simulator rubric and score-policy alignment.

### Integration tests

- Prisma repositories and migrations.
- Event persistence and notification outbox/delivery.
- Teacher-to-student row-level scope.
- Admin publishing and audit records.
- File/resource access gates.

### E2E journeys

1. New student signs up, completes onboarding, opens first lesson, and resumes it.
2. Student completes a lesson, earns XP once, and sees the activity/notification result.
3. Teacher sees an assigned student but cannot see another cohort.
4. Student saves, submits, receives revision feedback, revises, and gets approved.
5. Admin previews, publishes, rolls back, and audits a content version.
6. Student loses connectivity during a draft/attempt and syncs safely after reconnect.
7. Student completes an existing simulator and a new Report Builder case through grading.
8. Admin changes a flag, observes the health/audit record, and rolls it back.

### Performance/accessibility gates

- LCP ≤ 2.5s on throttled 4G.
- Lesson transfer ≤ 150KB where practical; simulator code split and lazy loaded.
- No horizontal overflow at 320, 360, 390, 768, 1280, and 1920px.
- Keyboard navigation, focus management, aria-invalid, reduced motion, and screen-reader labels.
- Offline/online state announced accessibly.

## 9. Release and rollout strategy

### Release slices

- **Slice A:** Phase 0 + Phase 1 behind no-risk student-only routes.
- **Slice B:** Phase 2 teacher role and read-only dashboard.
- **Slice C:** Phase 3 worksheets/grading with one pilot cohort.
- **Slice D:** Phase 4 analytics/notifications with shadow events first.
- **Slice E:** Phase 5 content/help/admin operations.
- **Slice F:** Phase 6 offline for lessons/drafts before queued submissions.
- **Slice G:** Phase 7 one simulator at a time, starting with Report Builder.

### Operational rollout

- Use a closed teacher pilot before broad role activation.
- Keep new routes behind environment/tenant/user-scoped flags where possible.
- Capture baseline metrics before enabling each slice.
- Define rollback for schema, route, flag, notification, and event changes.
- Review support tickets and zero-result help searches weekly during pilot.

## 10. Definition of done for each feature

A feature is not complete when its page renders. It is complete only when:

- the user journey and copy are documented;
- the actor/permission matrix is updated;
- domain invariants and failure states are defined;
- use case, action, repository/service ports, and production/test adapters exist;
- migrations are reversible or safely additive;
- mutations are idempotent where retry is possible;
- audit and analytics events are specified;
- loading, empty, error, offline, and success states exist;
- unit, integration, architecture, E2E, accessibility, and performance checks are appropriate and green;
- runbooks, help links, and rollback instructions are updated.

## 11. Decisions required before implementation starts

1. Should AMPH add a real teacher role now, or remain admin-operated until a cohort pilot is approved?
2. Is the Coach a rule-based learning aid, a future feature, or permanently out of scope?
3. Should content remain app-shipped, or should admin publishing/versioning become a supported production workflow?
4. Which student mutations are safe to queue offline in the first release?
5. Which product analytics provider/storage is approved, and what is the PH privacy retention policy?
6. Should worksheets be generic lesson submissions or only attached to specific courses/modules?
7. Is the capstone required for certificate eligibility, or only for the Ultimate tier?
8. Which simulator should be the first teacher-reviewed pilot: Report Builder, Budget/Pacing, or the current STR Triage tool?

## 12. Recommended first implementation tranche

Start with **Phase 0 + Phase 1 + the read-only portion of Phase 2**:

- approve the permission/event/IA contracts;
- build onboarding and dashboard next-step behavior;
- add the teacher role and scoped student/cohort read model;
- instrument the core learning events;
- defer write-heavy grading and offline replay until the contracts are exercised.

This tranche gives the academy a clearer student journey and validates teacher scope without introducing the largest migration and synchronization risks too early.

