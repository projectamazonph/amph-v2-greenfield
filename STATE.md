# Current project state

**Project:** Project Amazon PH Academy v2
**Reviewed:** 2026-09-23
**Main:** `d9c3bd5`

## Active branches of interest

- `docs/audit-2026-09-23-lesson-arithmetic.md`: both read-only arithmetic passes recorded, plus the
  findings that came after them. Pass 1 covered the 19 lessons of Modules 0, 5, 6, 7, 8 and 10 that no
  earlier peso pass had checked, and fixed 7 errors including an unconverted `$500` client budget in
  onboarding and two lessons whose own answer key contradicted the lesson. Pass 2 covered the 26 lessons
  of Modules -1, 1, 2, 3, 4, 9 and 11 plus every quiz question for modules -1 to 4, and fixed 5 more in
  `1.5` and `3.1`. That is all 45 lessons with one independent numeric recompute each. The doc lists every
  finding left open and says which ones need a teaching decision rather than a correction.
- `feat/module-minus-one-quiz` merged as `PR #556`: the Module -1 knowledge check, four questions,
  so the primer's 150 XP is no longer uncheckable. Bank is 13 quizzes and 87 questions.
- The curriculum content chain #546 to #570 is in "Latest merged repairs"
  below; the earlier `PR #545` / STORY-146 note lives in the CHANGELOG.

## Current learning-experience priority

Wave 0 and Wave 1 of the zero-to-one student journey are closed. The next
investments are Wave 3 (LEARN-031 author scenario packs, LEARN-033 learner
artefact domain, LEARN-035 student portfolio page) and Wave 4 (LEARN-040 to
LEARN-045 assessment + capstone). The atomic backlog, dependencies, evidence
model, and release gates are in
[`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`](docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md).
Start with the truth-and-release contract before adding lessons or making new
job-readiness claims. Existing simulator scores remain formative.

## Production

- Canonical URL: <https://projectamazonph.vercel.app>
- Retired URL: `https://amph-v2-greenfield.vercel.app`
- Framework: Next.js 16, React 19, strict TypeScript, Prisma 7, PostgreSQL
- Database inventory: 36 models, 4 enums, 35 append-only migrations

## Latest merged repairs

| PR | Commit | Result |
| --- | --- | --- |
| #570 | `ff4226a` | fix(lesson): the `3.3` ACoS table header named the ₱38 CPC but not the price, so a copied row or a cropped screenshot read as if 58% held at any price. Both inputs now sit in the header. No figure changed |
| #568 | `8867390` | fix(curriculum): three abbreviations reached learners before any lesson spelled them out. `SOP` in the Module 0 course table, eleven modules before `11.3` calls it a standard operating procedure; `STR` as the name of the required Module 7 artifact while `7.1` only ever wrote "search term report" in full; `AOV` in the maximum-CPC decision-flow steps of `1.2` and `1.5`. First use now carries the expansion. A token-frequency scan against `glossary.json` flagged far more, but reading first-use context showed the lessons already expand `CVR`, `SOV`, `SP`, `SD`, `SB`, `PAT` and `ABA` inline, so only these three were real |
| #566 | `e524166` | fix(curriculum): cross-checked all 38 quiz questions of Modules 5 to 10 against the lessons that claim to justify them. Module 7 Q2 keyed a negative exact as correct while `7.2` teaches you to lower the bid rather than negate, so it is rekeyed to the bid answer with its explanation rewritten. Module 7 Q4 was unanswerable as written: 500 impressions and 2 clicks put its own CTR under the low-CTR line and under both click floors the module cites, so the stem is now 6,000 impressions, 12 clicks and ₱600 spend, clearing both floors and leaving no open question about the answer. Module 6 Q4's correct option was taught nowhere in Module 6, so `6.3` gained the bullet |
| #565 | `0e5d4de` | fix(lesson): the `9.3` evidence ladder printed overlapping ranges, "10 to 20" and "20 to 40", so a term with exactly 20 clicks fell on two rungs at once. Now exclusive at both ends: 10 to 19 and 20 to 39 |
| #563 | `50b34e9` | fix(lesson): `3.3`'s CVR table carried no unit price, so its break-even row claimed a 36% CVR loses money and two of three cells missed the lesson's own formula. The table now runs on the ₱1,100 the same lesson's case study uses, so it is reproducible from figures printed inside the lesson, and the headline "20 percentage points" became the 23 it actually is. An independent recomputation confirmed all three cells and found no other file, quiz or snapshot quoting the old figures |
| #562 | `08625bf` | fix(lesson): `2.2` billed a two-week, ₱500-a-day research campaign as "₱14,000 over 4 weeks" in both the prose and the takeaway. The two-week window is what the same section instructs and what the order estimate assumes, so it stays and the cost becomes ₱7,000 |
| #560 | `a5fa9c4` | fix(lesson): the `4.3` bid ladder printed a ₱40 bid whose label crossed the line it was annotating. The worked example computes ₱30, which is where its own arithmetic had always landed |
| #558 | `60bb1e1` | STORY-154 second arithmetic recompute, covering the 26 lessons of Modules -1, 1, 2, 3, 4, 9 and 11 plus every quiz question for modules -1 to 4 against its source lesson. Five confirmed errors fixed, including `1.5` teaching that a launch week can show TACoS 40% while ACoS is 50% with no organic sales (the two ratios must be equal, and the Week 3 delta inherited it) and rounding a max-CPC ceiling up past break-even. Modules -1, 9 and 11 and the converted quiz bank recomputed clean. Seven findings recorded open in `docs/audit-2026-09-23-lesson-arithmetic.md` rather than edited, because they need a teaching decision or a longer pass |
| #557 | `d6673d5` | STORY-153 recomputed every printed ratio and sum in the 19 lessons of Modules 0, 5, 6, 7, 8 and 10, which no earlier peso pass had ever checked. Seven confirmed errors fixed, including an unconverted ₱500-a-month client budget in onboarding (₱17 a day, below one click at any CPC the course teaches), a `6.3` example claiming two products have different max CPCs when the lesson's own formula makes them identical, and an `8.2` worked answer instructing the learner to pull a report the same lesson spends two sections saying does not exist. Four further findings reported rather than edited, because they are teaching-policy contradictions |
| #556 | `cdc610c` | STORY-152 Module -1 knowledge check. The Amazon primer awarded 150 XP with nothing checkable behind it, so it is now four questions restating each lesson's Quick Check at module level: which level holds the daily budget, which surface a VA works in, where a clicked shopper lands and when the seller pays, and which two fees come off a 3P FBA sale. No code changed, because the seeder already maps `moduleNumber: -1` to Foundations and the course page maps whatever quizzes exist. Bank goes 12 to 13 quizzes, 83 to 87 questions, and the module and lesson counts #549 left stale in five more documents are corrected in the same commit |
| #555 | `daeae42` | STORY-151 curriculum doc drift. Both human-facing curriculum maps still described the pre-#549 course (no Module -1, 12 modules, 42 lessons, 443 minutes, 3,580 XP, an 8-minute `0.1`). They now carry Module -1 and the real aggregates, `-1.3`'s objective says five levels instead of four, `4.3`'s diagram draws the three levels it names, and `CurriculumDocCounts.test.ts` pins both documents to the 45 lesson frontmatters row by row |
| #554 | `506c25f` | STORY-150 peso conversion for the assessment layer. The module quiz bank (52 dollar amounts across 32 fields in 11 questions) and the four literal-`$` figures `PR #553`'s peso-only scan could not see are now in pesos, and lesson 1.4 is titled "Every Peso In, How Many Pesos Back? ROAS" in all seven places instead of contradicting its own body. New `CurriculumCurrency.test.ts` fails on a dollar sign in front of a digit in any lesson body or the quiz, diagnostic, glossary and capstone data, and is chained into `pnpm validate:learning-release` |
| #553 | `1f8c988` | STORY-149 peso magnitude repair. Three of #549's conversions had divided correct peso answers by about 50 to meet stale dollar inputs. Whole examples scaled by 50 and every printed ratio re-derived across `1.1` to `1.5`, `2.1` to `2.4`, `3.3`, `4.3`, `9.2`, `11.4` and `-1.1` (18 files). `2.3`'s search-term rows now sum to the totals that were already scaled |
| #552 | `a48bca8` | STORY-148 retrieval checks. Nine `<SelfCheck>` blocks (`sc-6-1` to `sc-8-3`) added to Modules 6 to 8 on the tracked-attempt path, so answers persist instead of being throwaway; build-plan wave reconciliation |
| #551 | `e338294` | STORY-147 source checker. `scripts/check-curriculum-sources.mjs` plus `pnpm check:curriculum-sources` reports fact cards missing an `Author`, a source link or a `Last verified` date, and lessons with no fact card at all. Eight-marker fact cards on `0.1`, `0.2`, `3.3`, `8.3`; Module 0 quiz wiring and 4 diagnostic `remediationRefs` closed. Left out of CI on purpose: Amazon's public pages are bot-gated, so a link check would flake |
| #550 | `efee2d0` | Glossary: "auto campaign" defined and inlined at its first Module 2.2 use |
| #549 | `8f09801` | Zero-knowledge foundations. Module -1 (3 lessons: what Amazon is, where ads appear, the ad object model) for learners with no marketplace background, 23 new glossary terms, Foundations peso conversion (magnitudes repaired later by #553), and arithmetic fixes across Module 1 |
| #546 | `77c89bb` | Docs: post-merge cleanups for STORY-146 and a refreshed README |
| #537 | `aea7e2a` | LEARN-042 capstone brief and rubric (STORY-142). Six deliverables mapped to artefact kinds; six-criterion 0–2 rubric passing at 9 of 12; pure readiness checker
| #536 | `7c0c73b` | LEARN-041 targeted quiz remediation (STORY-141). remediationRefs tags on questions; pure plan builder; QuizPlayer renders What to revisit list
| #534 | `fcfb1c1` | LEARN-034 save-from-debrief wiring (STORY-140). ToolDebrief gains optional saveAction bindings; Bid Elevator passes scenarioName + decision-log kind. Failed saves keep typed text; component tests cover disabled/success/error paths
| #532 | `5026313` | P3-87 in-app notifications (STORY-139). Bell with unread count in the student sidebar, 30s polling, dropdown with mark-read. Four use cases on both containers. Course-complete emit at 100% progress. Last deferred P3 feature ships
| #531 | `da86110` | LEARN-040 tracked retrieval check (STORY-138). SelfCheck fires best-effort record on submit; LessonContent injects lesson id; attempts in account-data export
| #530 | `dd44fc5` | LEARN-035 student portfolio page (STORY-137). Owner-scoped list/detail/JSON export; dashboard link
| #529 | `7b3beff` | LEARN-032 tool debrief pattern (STORY-136). Five-section debrief on the Bid Elevator result view
| #528 | `f1deab8` | LEARN-033 learner artefact domain (STORY-135). Six kinds, DRAFT/SUBMITTED lifecycle, three use cases, export coverage
| #526 | `63cd8ea` | Docs: log LEARN-010/013/014/015/030 + P3-83 in CHANGELOG, FEATURES, and learning-release-gate runbook
| #525 | `d2b860a` | LEARN-030 tool-bridge validator (STORY-134). `pnpm validate:learning-release` now fails the release gate when a lesson points at an unregistered simulator, when a bridge target is not in any tier, or when a registered simulator is not unlocked by any tier. Five Vitest tests cover the validator.
| #524 | `ff0b021` | LEARN-015 onboarding completion view (STORY-133). `/dashboard/onboarding-complete` renders the four-section summary when Module 0 is done; redirects back to the dashboard with a plain-language query string when it is not
| #523 | `a3f15ed` | LEARN-014 guided first-decision route (STORY-132). `/dashboard/first-decision` walks a learner through one constrained Bid Elevator decision and shows the result interpretation. The Bid Elevator tool renders a `FirstDecisionResultNotice` reminder when the `?from=first-decision` query is set
| #522 | `5163f0f` | LEARN-013 glossary data + inline term button (STORY-131). `content/curriculum/glossary.json` covers the seven Module 0 terms; `src/components/lesson/GlossaryTerm.tsx` opens a focus-and-click popover with Escape-to-close. Plain MDX remains readable without JavaScript
| #521 | `7d419a1` | LEARN-010 optional pre-course diagnostic (STORY-130). `/dashboard/diagnostic` returns one of three fixed outcomes (new, familiar, experienced) with a fallback rubric. Recommendation-only; never changes entitlement or gates paid content
| #520 | `4943958` | Docs: link LEARN-001 to STORY-111 inventory work (STORY-129). No code change
| #519 | `8c557a7` | P3-83 drag-and-drop module reorder. `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` replace the up/down buttons in `/admin/courses/[id]`. Reorder persists through the existing `reorderModulesAction` server action
| #487 | `cd41fad` | P4 PR-B: PayMongo installments (P0-01) + BIR invoicing (P0-02) behind flags. 3/6/12-month card installments with PHP 3,000 floor, persisted on the order, offered in checkout when `INSTALLMENTS_ENABLED` is on. BIR sales invoices (`INV-YYYY-NNNNN`) issued idempotently for paid orders with PDF render + file storage, auto-issued best-effort by the PayMongo webhook when `INVOICING_ENABLED` is on. No admin UI in this slice (PR-C scope). Closes #486, follows #403 PR-A #485 |
| #485 | `9d0e48e` | P4 PR-A: schema (W0-01) + maintenance mode (P1-08) + announcements (P1-07). Closes #403 | |
| ---- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #466 | `89909c7` | Repair deployment broken by #453 throw-elimination conversion. Restores 5 tools/* simulator pages, fixes malformed fallback blocks in 4 page.tsx files, wires `logger` into 7 use cases that added the dep, replaces broken `as unknown as` error casts with direct `Result.err(originalError)`, adds `notFound` import to quiz page, null-checks `Resource` in `UpdateResource`, wires `logger` into 50 test files, replaces `console.error` spy with `TestLogger` entry assertion in `RecordAuditLog.test.ts`, switches dashboard's "throw on repo error" pin to a "graceful empty list" pin, fixes `card-no-event-handler-props` programmatic tsc spawn (was swallowing stderr on Windows), enables `twoFactorEnabled` on E2E-seeded admin so the pre-existing journey 3 reaches the discount-codes form |
| #427 | `1baf988` | LEARN-025 Module 4 campaign pre-flight maps (STORY-127). Re-cuts the closed PR #395 work with PHP-aligned rationale examples that match the post-PR-417 currency state |
| #398 | `8988ac1` | Round 33 audit closure: replace 2 raw `<a>` route changes with `<Link>` and pin H-09/H-11/H-12 contracts (rebased; `.commit-msg-r33.txt` dropped) |
| #396 | `41cb4c3` | Round 32 audit closure: pin C-02 / C-05 / C-06 / C-07 contracts and update audit doc (rebased) |
| #424 | `54b5a18` | S-1 QuizEditor owns its hidden input via `useRef`; rewrites H-16 pin test; closes `.audit-2026-08-20/UMBRELLA.md` S-1 |
| #417 | `e278e22` | Voice stabilization Phase 3 second half (Modules 4-8). Closes STORY-107 last leg |
| #418 | `79befba` | S-2 `displayName` on 14 UI primitives + S-3 shadow-scale unification (audit 2026-08-20 follow-up) |
| #420 | `9e7e6ea` | Active lesson primitives (`SelfCheck`, `TradeOffTable`, `ProcessDiagram`, `PitfallCallout`) + directive plugin + Section 5.3 validator (STORY-122, STORY-123) |
| #419 | `9cc5db3` | L-03 server-safe `CardProps` subset that rejects event handlers at compile time |
| #404 | `88760ed` | 2026-08-20 audit follow-up umbrella. Closes the still-open audit items (S-1, S-2, S-3, L-03, voice 4-8) |
| #305 | `9096cf4` | Repaired the student journey, route states, navigation, data export, and accessibility coverage |
| #306 | `9d80c77` | Manual paid-tier grants now create the eligible published-course enrollments students need to see courses and lessons |
| #307 | `88d83d9` | Admin login plants the session cookie on the redirect response |
| #308 | `ee1737a` | Password-reset emails normalize the retired deployment origin to the canonical production URL |
| #402 | `1491e4b` | Field Manual round 35: align admin tables, hero, and nav z-index with the design system |

## Audit-driven triage (2026-08-14)

Cross-referenced `docs/ULTRA-REVIEW-2026-08-14.md` (75 catalogued findings: 6 CRITICAL, 17 HIGH, 24 MEDIUM, 21 LOW, 7 informational) against the current worktree. Status by finding:

**All 6 CRITICAL items addressed:**

- **C1** (`proxy.ts` JWT-only auth): `proxy.ts` now calls `sessionRepo.findById(sessionId)` and rejects revoked sessions. ✓
- **C2** (cookie `secure`/`__Secure-` prefix fork): `setAuthCookie` derives both from a single `isHttps` signal. ✓
- **C3** (`/admin/payments` no pagination): use case now accepts `page`/`pageSize`, capped at 50 server-side. ✓
- **C4** (em-dash in PayMongo receipt subject): replaced with `:` in `route.ts:201`. ✓
- **C5** (no skip link): `<a href="#main-content">` in `layout.tsx:55`; `<main id="main-content">` present on student shell. ✓
- **C6** (lesson-hours fake estimate): removed from `courses/[slug]/page.tsx`; now uses `totalEstimatedMinutes`. ✓

**HIGH items addressed:** H1, H2, H3 (`findByIds` port), H4 (table caption + th scope), H5 (no `ConfirmSubmitButton` / `window.confirm` remains), H6/H7 (`Money.valueObject.format` in CheckoutForm and CourseDetail), H11 (`<Link prefetch>` on `/tools`).

**Supplementary findings addressed:** S1, S2 (Astryx Dialog replaces native confirm), S3 (admin backup cookie name/Secure flag derived from request protocol, mirroring C2), S10 (auto-ULID on `/admin/courses/new`), S11 (AbortController prevents double-bind), S18 (no email in signup redirect URL).

**This session also fixed:**

- 7 user-facing em-dashes in metadata titles, subtitles, error copy, placeholder text, ad-console body copy (replaced with `|`, `.`, `,`).
- 1 Unicode `→` arrow in admin refunds → `ArrowRight` icon.
- 1 Unicode `↗` arrow in ad-console → `ArrowUpRight` icon.
- 8 `var(--font-family-code)` references in 4 admin tables → `var(--font-mono)`.
- **S3** (cookie secure/name fork in impersonation flow): new `setAdminSessionCookie` helper in `src/lib/auth.ts` derives both the cookie name and the `Secure` flag from the request protocol's `isHttps` signal. `impersonateUserAction` reads `x-forwarded-proto` (with vercel.app host fallback) and passes the value through. The helper exposes NO `secure` override, so cookie name and Secure flag cannot drift. 4 new unit tests assert the lock-step invariant across both branches.

**Remaining LOW-priority polish:** All LOW items verified by code grep on 2026-08-14:

- **L1** (`←` Back arrows in user-facing copy): 0 occurrences in user-facing JSX. Only 1 match in a comment in `PrismaCourseRepository.ts:15` documenting a DB-level constraint — not user-facing. ✓
- **L2** (legacy `btn btn-*` classes): All 16 files swept clean in S4. Remaining `btn btn-primary` matches live only in `eslint-rules/no-tailwind-classes.test.js` as test fixtures for the ESLint rule itself. ✓
- **L3** (inline styles): `CheckoutForm.tsx` uses an intentional `PAGE_STYLES: Record<string, React.CSSProperties>` module pattern for a checkout card. The audit context (admin pages using inline margins) no longer applies to that file. Not a regression. ✓
- **L4** (raw hex tokens): `CheckoutForm.tsx` now exclusively uses `var(--danger)`, `var(--accent)` etc. — no raw hex. ✓
- **L5** (`TopBar` wrapper): `<AdminSubPageHeader>` component already exists and is imported by every admin sub-page (verified e.g. in `admin/courses/new/page.tsx`). ✓
- **L6** (AI-slop "Coming soon" placeholders): 0 occurrences in student-facing copy. Other matches are comments, test descriptions, and legitimate first-person-plural ("we'll send a reset link", "Hold on a second. We'll redirect"). ✓
- **L7** (Card shadow): Astryx `<Card>` is flat per design spec; `box-shadow` only remains for input focus rings (4 admin forms, all use the same rgba(59,130,246,0.15) focus ring) and a `[class*="card"]:hover` lift in globals.css. Consistent with WCAG focus indication. ✓
- **L8** (`var(--font-family-code)`): All 8 occurrences across 4 admin tables replaced with `var(--font-mono)`. ✓
- **L9** (`var(--brand)` non-existent token): 0 occurrences. ✓
- **L10** (Skeleton `aria-busy`): All 25 `loading.tsx` files set `aria-busy="true"` on their `<main>` (8 in `/app/`, 8 in `/profile/`, 4 in `/tools/`, etc.). ✓
- **L11** (tables without `<caption>`/`<th scope>`): Both remaining `<table>` uses (`/admin/email-templates/page.tsx`, `/admin/settings/page.tsx`) have `<caption className="sr-only">…</caption>` and `<th scope="col">`. ✓

No unresolved LOW items remain.

Manual grants are idempotent. STARTER grants published STARTER and PREVIEW courses; PRO grants all eligible published courses; FREE creates no enrollment. A new manually granted account receives a password-reset link. The grant does not create an Order row.

## Verified gate

- Vitest: 3,901 passed, 3 skipped (377 test files; 4 new tests for S3 lock-step)
- Architecture: 669 passed (16 test files)
- TypeScript: passed (0 errors)
- ESLint: passed (0 errors, 0 warnings)
- Production build: passed (52 routes)
- Coverage: 80.42% statements / 74.19% branches / 80.71% functions / 81.80% lines

## Remaining known limitations

- **Curriculum content does not publish on deploy, and the documented publish command is broken.** `pnpm import:content` has failed at module resolution since `915c7ca` (2026-07-31), when `src/usecases/ImportAmphContent.ts` was deleted out from under the script that imports it; `src/__tests__/scriptImportsResolve.test.ts` now pins it. `node scripts/seed-all-content.mjs` is the only script that writes lesson bodies and the quiz bank, and it is wired into neither `package.json` nor `vercel.json` (production deploy runs `prisma:deploy` and `db:seed:scenarios` only). So a merged lesson or quiz change reaches no learner until someone runs that seeder, and this repo keeps no record of when it last ran. Two consequences if you run it: it deletes and recreates each quiz's question rows, which can detach historical attempts from the questions they were graded against, and the lesson side is safe because lesson ids derive from module plus slug, not from content. Full table in `content/README.md`.
- **The glossary term popover is not wired into the lesson renderer.** `content/curriculum/glossary.json`, `src/lib/glossary.ts`, and `src/components/lesson/GlossaryTerm.tsx` all exist, but no file under `src/app/` renders them. `GlossaryTermButton` is imported by nothing outside its own module, `loadGlossaryManifest` and `lookupGlossaryTerm` are called only from `src/lib/__tests__/glossary.test.ts`, and the `data-amph-term` hook that `docs/stories/STORY-131.md` says the directive plugin emits appears nowhere in the code except that story file. So the popover never reaches a learner and the dead code is not a broken surface: learners read the inline parenthetical the author wrote, which is exactly the no-JavaScript fallback `STORY-131` describes. Two corrections to the record: the `#522` row above and `CHANGELOG.md:32` both describe the feature as shipped, and both say the manifest covers seven Module 0 terms when it now holds 31. Wiring it for real needs a term directive in the content plus an a11y pass over 31 new interactive controls, which is a product call rather than an incidental fix.
- Simulator scores are formative, not certification or hiring evidence.
- Admin 2FA is opt-in.
- Live backup/restore, payment-webhook rotation, and external uptime checks require operator execution.
- A PayMongo event can be stored as PAID before enrollment fails. Because replay exits early for an already-paid order, use the audited admin tier-grant flow to repair a confirmed-paid partial state.
- `tests/e2e/**` is excluded from Vitest coverage (Playwright-only Prisma helpers); coverage report is unit-test focused.

## Next action

P4 PR-A (#485) and PR-B (#487) are merged on `main` (`cd41fad`). Close #486 once the PR-B close-out lands. Next is PR-C (prerequisites, assignments, resources polish, settings, email templates) then PR-D (OAuth) per #403. Operate from the canonical production URL, keep runbooks current after operator drills, and verify the relevant quality gates before every merge.
