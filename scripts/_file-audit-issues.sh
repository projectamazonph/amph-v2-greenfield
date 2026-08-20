#!/bin/bash
# Files the child audit follow-up issues against the umbrella #404.
set -euo pipefail

TOKEN="${GITHUB_TOKEN:-}"
if [ -z "$TOKEN" ]; then echo "Set GITHUB_TOKEN env var first." >&2; exit 1; fi
REPO="projectamazonph/amph-v2-greenfield"
API="https://api.github.com/repos/$REPO/issues"

post_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  curl -s -X POST -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github+json" \
    "$API" -d "$(jq -n --arg t "$title" --arg b "$body" --arg l "$labels" \
    '{title:$t, body:$b, labels: ($l | split(",") | map(select(. != ""))) }')" \
    | jq -r '"#\(.number) \(.html_url) — \(.title)"'
}

UMBRELLA="404"

post_issue "[S-1] QuizEditor: replace document.querySelector in update() with useRef" \
"Part of umbrella #$UMBRELLA.

## Problem
\`src/components/admin/QuizEditor.tsx:55-58\` — the \`update()\` function does a synchronous \`document.querySelector\` on every state change to mirror the editor state into a hidden form input:

\`\`\`ts
function update(next: EditorQuestion[]) {
  setQuestions(next);
  if (typeof document !== \"undefined\") {
    const input = document.querySelector<HTMLInputElement>(\`input[name=\"\${name}\"]\`);
    if (input) input.value = JSON.stringify(next);
  }
}
\`\`\`

The mount-time seed (line 128) already uses \`useEffect\` correctly. The per-update path does not, and it is invoked on every keystroke. This is fragile in two ways:
- It depends on a globally-unique hidden input \`name\`, which is enforced only by convention.
- Under React 19 concurrent rendering, calling into the DOM during a state updater is not safe (the call here is on a user event so it is currently fine, but it is one refactor away from a regression).

## Fix sketch
1. In \`QuizEditor\`, accept a \`hiddenInputRef\` prop OR add an internal \`const ref = useRef<HTMLInputElement>(null)\` and render a hidden \`<input ref={ref} name={name} value={JSON.stringify(questions)} readOnly type=\"hidden\" />\` as part of the component tree instead of relying on the parent to render it.
2. Remove the \`if (typeof document !== \"undefined\")\` block in \`update()\`. The hidden input is now a controlled, ref-attached sibling of the editor.
3. Drop the mount-time \`useEffect\` seed in favour of an initial-value render.

## Acceptance
- No \`document.\` reference remains in \`src/components/admin/QuizEditor.tsx\`.
- Hidden input is rendered by \`QuizEditor\` itself, not assumed to exist in the DOM.
- Existing \`__tests__\` still pass; add a regression test that mounts the component, types into a question field, and asserts the hidden input is in sync.

## Out of scope
Do not change the public server-action contract (\`questionsJson\` hidden field name)." \
"audit,area:admin,code-quality,story:S-1"

post_issue "[S-2] UI primitives: add displayName to every component in src/components/ui/" \
"Part of umbrella #$UMBRELLA.

## Problem
\`src/components/ui/\` primitives (Button, Card, Toast, Input, Dialog, etc.) do not consistently set \`displayName\`. \`Input\` uses \`forwardRef(function Input(...))\` so its name is correct, but other primitives show up in React DevTools as \`Anonymous\` or simply \`ForwardRef\`, which:
- Hurts debugging and React DevTools workflow.
- Makes screen-reader / a11y audits harder (the component name is what shows up in the component tree view of the audit report).
- The audit's \`docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md\` references \`displayName\` as a M-fair / L-fair finding.

## Fix sketch
For every exported primitive in \`src/components/ui/\`:
- If it uses \`forwardRef\`, set \`Component.displayName = \"ComponentName\"\` (or pass a named function to \`forwardRef\`).
- If it is a plain function component, ensure the declaration is \`export function ComponentName(...)\` so the inferred name is correct.

## Acceptance
- \`grep -rn \"displayName\" src/components/ui/\` returns at least one match per exported primitive.
- React DevTools shows every UI primitive by its proper name.
- No behavioural changes; no test changes required." \
"audit,area:platform,code-quality,story:S-2"

post_issue "[S-3] Shadow token naming inconsistency: unify to one canonical scale" \
"Part of umbrella #$UMBRELLA.

## Problem
Two parallel shadow scales coexist:
- \`src/themes/amph-theme.ts\` uses \`--shadow-low / --shadow-med / --shadow-high\`.
- \`src/app/globals.css\` uses \`--shadow-sm / --shadow-md / --shadow-lg\`.

A component reading \`var(--shadow-md)\` from \`globals.css\` gets the global value, while a component reading \`var(--shadow-med)\` from the theme gets the Astryx value. The two scales are not necessarily identical. This is a token drift hazard — exactly the kind of thing the round-34 test was added to prevent for other tokens.

## Fix sketch
1. Pick one canonical scale (\`sm/md/lg\` matches Bootstrap / Tailwind / most design systems; \`low/med/high\` matches Astryx). My recommendation: \`sm/md/lg\` for consistency with the rest of the token names in the project.
2. Update \`src/themes/amph-theme.ts\` to use the canonical names.
3. Add a round-34-style test that greps for \`--shadow-\` usage and fails the build if both scales appear.

## Acceptance
- Only one shadow scale is referenced across \`src/\`.
- A CI test enforces the invariant." \
"audit,area:platform,design-system,story:S-3"

post_issue "[STORY-107] Voice Stabilization Phase 3 second half: Modules 4-8" \
"Part of umbrella #$UMBRELLA. Picks up where PR #397 (Modules 2-3) left off.

## Problem
Modules 4-8 still violate \`docs/voice-guide.md\`. Confirmed open:

| Violation | Count | Notes |
|---|---|---|
| \`\\\$[0-9]+\` USD pricing | 62 | Voice guide requires conversion to PHP (₱) at roughly 56:1 for round-trip mental math. |
| Em-dashes / double-hyphens | 69 (modules 4-6) | Em-dashes banned. Replace with periods or parentheses. |
| \`> **Analogy**\` blockquote headers | 5+ in 4.1/4.2/4.3 | Pattern was removed in Modules 2-3. Apply the same transformation. |

Files to touch (representative):
- \`content/curriculum/modules/4-campaign-architecture/4.1-sponsored-products.mdx\`
- \`content/curriculum/modules/4-campaign-architecture/4.2-sponsored-brands-display.mdx\`
- \`content/curriculum/modules/4-campaign-architecture/4.3-campaign-structure.mdx\`
- Modules 5-8 will need the same treatment.

## Fix sketch
1. Re-run \`scripts/_audit-sentence-length.cjs\` against modules 4-8 to enumerate the work.
2. Apply the same three transforms as PR #397:
   - USD → PHP using the established conversion key.
   - Em-dash removal.
   - \`> **Analogy**\` → inline sentence.
3. Run the voice test suite (\`pnpm test:voice\`) until clean.
4. Update \`docs/CHANGELOG.md\` and \`docs/voice-guide.md\` examples if the convention drifts.

## Acceptance
- \`grep -rEn '\\\\\\\$[0-9]+' content/curriculum/modules/{4,5,6,7,8}-\` returns zero.
- \`grep -rEn ' — | -- ' content/curriculum/modules/{4,5,6,7,8}-\` returns zero.
- \`grep -rEn '> \\\\*\\\\*Analogy' content/curriculum/modules/{4,5,6,7,8}-\` returns zero.
- \`pnpm test:voice\` and \`pnpm test:arch\` pass." \
"audit,area:content,story:STORY-107,phase-3"

post_issue "[STORY-086] Simulator: instructor calibration for acceptable answer ranges" "BODY_PLACEHOLDER" "LABEL_PLACEHOLDER"
"Part of umbrella #$UMBRELLA.

## Problem
The audit (section 2) flags that simulator scores are formative-only and cannot yet be used for certification or hiring signals because there is no mechanism to set \"acceptable answer ranges\" or calibrate simulator grading against real human instructor baselines. The \`STORY-078\` Formative Score notice is in place, but the underlying scoring engine has no instructor-facing knobs.

## Scope (sketch)
1. New domain entity: \`SimulatorCalibration { simulatorId, scenarioId, instructorId, acceptableRange: { min, max }, rationale, updatedAt }\`.
2. New admin surface: \`/admin/simulators/[id]/calibrate\` with a range editor and audit log.
3. \`ScoreAttempt\` use case consults the calibration row before applying the formative score. If the calibration is missing for a scenario, fall back to current behaviour and emit a metric.
4. Wire up via the existing DI container; honour the 5-layer SOLID rule (no Next/Prisma imports in Domain or UseCases).
5. New architecture test: ports that must be wired are wired.

## Acceptance
- An instructor can set and edit a calibration for any scenario.
- A simulator attempt log shows whether the calibration was applied.
- The architecture test suite still passes." \
"audit,area:simulators,story:STORY-086,area:admin"

post_issue "[STORY-083] Listing Audit: non-binary, context-aware ground truth" \
"Part of umbrella #$UMBUILLA.

## Problem
Listing Audit currently grades with a binary rule:
\`\`\`ts
severity === \"info\" ? \"skip\" : \"fix\"
\`\`\`
This forces students to blindly fix every non-info finding, which contradicts the lesson content (some findings are conditionally optional depending on category, price point, or seasonal context). The result is a student experience where the simulator's \"correct\" answer disagrees with what the lesson just taught.

## Scope (sketch)
1. Replace the binary ground truth with a per-finding rule tree: \`if (finding.category === 'image' && listing.images.length >= 5) skip\`, etc.
2. Persist the rule set in a new \`ListingAuditRule\` table so instructors can author and version them.
3. Admin UI: \`/admin/simulators/listing-audit/rules\`.
4. Surface a \"Why this finding was scored the way it was\" explanation on the result page using the matching rule's rationale.

## Acceptance
- A unit-test suite enumerates categories and confirms the new rule set produces non-binary outcomes.
- A regression test asserts that the lesson content for module 3 is consistent with at least one non-binary outcome." \
"audit,area:simulators,story:STORY-083,area:admin"

post_issue "[STORY-081b] Keyword Research: real seller-export datasets for credential mode" \
"Part of umbrella #$UMBRELLA.

## Problem
Per the audit, the Keyword Research simulator:
- Covers only **4 of 12** launch niches.
- All datasets are marked \`synthetic_calibrated\`.
- Credential-mode attempts are **rejected** because no real seller-export data is ingested.

This blocks the platform's certification goals.

## Scope (sketch)
1. Define an ingestion contract for anonymised Amazon Seller Central search-term reports (CSV / XLSX).
2. Build a one-shot CLI / cron job that imports reports into a new \`KeywordDataset\` table, scrubbing PII.
3. Switch the simulator dataset picker to prefer real data when the niche is covered, fall back to synthetic otherwise.
4. Enable credential mode for the real-data niches only.
5. Update \`docs/FEATURES.md\` and \`docs/STUDENT-FEATURE-GAP-ANALYSIS.md\`.

## Acceptance
- Niche coverage increases from 4 to ≥8 with the real-data pipeline in place.
- A documented runbook for ingesting a new seller's report exists.
- Credential mode is enabled for at least one niche end-to-end." \
"audit,area:simulators,story:STORY-081b,area:admin" \
2>/dev/null

post_issue "[STORY-089] Connected-Account Simulator (variant)" \
"Part of umbrella #$UMBRELLA.

## Problem
Documented in the audit as a planned simulator variant where students connect to a real, safe Amazon environment, but **no story doc, no code, and no test scaffolding** exist on \`main\`.

## Scope (sketch)
1. Author a STORY-089 doc in \`docs/stories/\` (look at the existing \`docs/stories/\` shape) that defines:
   - Threat model: how do we keep the safe Amazon sandbox isolated from production credentials?
   - Required Amazon Ads API capabilities and rate limits.
   - Fallback behaviour if the sandbox is unavailable.
2. Spike: a minimal end-to-end \"hello world\" simulator that authenticates against a sandbox account and lists one campaign.
3. ADR (\`docs/adr/\`) for the choice of safe environment.

## Acceptance
- \`docs/stories/STORY-089.md\` exists and is reviewable.
- An ADR exists for the safe-environment choice.
- The spike lives behind a feature flag so it cannot ship by accident." \
"audit,area:simulators,story:STORY-089,area:admin" \
2>/dev/null

post_issue "[ops] Admin 2FA: enforce TOTP for admin accounts" \
"Part of umbrella #$UMBRELLA.

## Problem
TOTP 2FA is fully built and opt-in, but no policy requires admins to use it. Combined with the impersonation banner (\`src/components/admin/ImpersonationBanner.tsx\`) and the audit log surface, this is a meaningful risk: an admin account takeover silently escalates to impersonation.

## Scope (sketch)
1. Add a \`requires2FA\` policy row in \`AdminSettings\` (or equivalent), default true for any new admin.
2. In the admin auth middleware, redirect admins without an enrolled TOTP secret to the 2FA enrollment flow.
3. Add a CLI / one-off script to re-enroll admins who were onboarded before the policy took effect.
4. Update the admin user-card to show a \"2FA enrolled\" badge.

## Acceptance
- A new admin cannot perform any admin action without an enrolled TOTP secret.
- A documented runbook exists for re-enrolling locked-out admins.
- A test asserts the middleware redirects." \
"audit,area:admin,area:security,story:ops-2fa-enforce"

post_issue "[ops] Drill the database backup & restore runbook against live Neon" \
"Part of umbrella #$UMBRELLA.

## Problem
\`docs/DISASTER-RECOVERY-RUNBOOK.md\` exists but has never been exercised against the actual Neon Postgres project. Runbooks that have never been drilled are fiction.

## Scope
1. Schedule a maintenance window with stakeholders.
2. Execute the runbook end-to-end on a Neon branch (not production).
3. Time the RPO/RTO and document any deviation from the runbook.
4. File a follow-up issue for any gap discovered during the drill.

## Acceptance
- A drill report is committed to \`docs/runbooks/\` (or appended to the existing runbook).
- RPO and RTO are measured and recorded.
- At least one actionable improvement is filed." \
"audit,area:ops,story:ops-backup-drill"

echo "All child issues filed."
