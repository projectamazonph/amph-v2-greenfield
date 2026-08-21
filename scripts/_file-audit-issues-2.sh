#!/bin/bash
# Files the remaining child audit follow-up issues (those after #409).
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

post_issue "[STORY-083] Listing Audit: non-binary, context-aware ground truth" \
"Part of umbrella #$UMBRELLA.

## Problem
Listing Audit currently grades with a binary rule:
\`severity === \"info\" ? \"skip\" : \"fix\"\`
This forces students to blindly fix every non-info finding, which contradicts the lesson content (some findings are conditionally optional depending on category, price point, or seasonal context). The result is a student experience where the simulator's correct answer disagrees with what the lesson just taught.

## Scope (sketch)
1. Replace the binary ground truth with a per-finding rule tree: \`if (finding.category === 'image' && listing.images.length >= 5) skip\`, etc.
2. Persist the rule set in a new \`ListingAuditRule\` table so instructors can author and version them.
3. Admin UI: \`/admin/simulators/listing-audit/rules\`.
4. Surface a Why this finding was scored the way it was explanation on the result page using the matching rule's rationale.

## Acceptance
- A unit-test suite enumerates categories and confirms the new rule set produces non-binary outcomes.
- A regression test asserts that the lesson content for module 3 is consistent with at least one non-binary outcome." \
"audit,area:simulators,story:STORY-083,area:admin"

post_issue "[STORY-081b] Keyword Research: real seller-export datasets for credential mode" \
"Part of umbrella #$UMBRELLA.

## Problem
Per the audit, the Keyword Research simulator:
- Covers only 4 of 12 launch niches.
- All datasets are marked \`synthetic_calibrated\`.
- Credential-mode attempts are rejected because no real seller-export data is ingested.

This blocks the platform's certification goals.

## Scope (sketch)
1. Define an ingestion contract for anonymised Amazon Seller Central search-term reports (CSV / XLSX).
2. Build a one-shot CLI / cron job that imports reports into a new \`KeywordDataset\` table, scrubbing PII.
3. Switch the simulator dataset picker to prefer real data when the niche is covered, fall back to synthetic otherwise.
4. Enable credential mode for the real-data niches only.
5. Update \`docs/FEATURES.md\` and \`docs/STUDENT-FEATURE-GAP-ANALYSIS.md\`.

## Acceptance
- Niche coverage increases from 4 to >=8 with the real-data pipeline in place.
- A documented runbook for ingesting a new seller's report exists.
- Credential mode is enabled for at least one niche end-to-end." \
"audit,area:simulators,story:STORY-081b,area:admin"

post_issue "[STORY-089] Connected-Account Simulator (variant)" \
"Part of umbrella #$UMBRELLA.

## Problem
Documented in the audit as a planned simulator variant where students connect to a real, safe Amazon environment, but no story doc, no code, and no test scaffolding exist on \`main\`.

## Scope (sketch)
1. Author a STORY-089 doc in \`docs/stories/\` that defines:
   - Threat model: how do we keep the safe Amazon sandbox isolated from production credentials?
   - Required Amazon Ads API capabilities and rate limits.
   - Fallback behaviour if the sandbox is unavailable.
2. Spike: a minimal end-to-end hello world simulator that authenticates against a sandbox account and lists one campaign.
3. ADR (\`docs/adr/\`) for the choice of safe environment.

## Acceptance
- \`docs/stories/STORY-089.md\` exists and is reviewable.
- An ADR exists for the safe-environment choice.
- The spike lives behind a feature flag so it cannot ship by accident." \
"audit,area:simulators,story:STORY-089,area:admin"

post_issue "[ops] Admin 2FA: enforce TOTP for admin accounts" \
"Part of umbrella #$UMBRELLA.

## Problem
TOTP 2FA is fully built and opt-in, but no policy requires admins to use it. Combined with the impersonation banner (\`src/components/admin/ImpersonationBanner.tsx\`) and the audit log surface, this is a meaningful risk: an admin account takeover silently escalates to impersonation.

## Scope (sketch)
1. Add a \`requires2FA\` policy row in \`AdminSettings\` (or equivalent), default true for any new admin.
2. In the admin auth middleware, redirect admins without an enrolled TOTP secret to the 2FA enrollment flow.
3. Add a CLI / one-off script to re-enroll admins who were onboarded before the policy took effect.
4. Update the admin user-card to show a 2FA enrolled badge.

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

echo "Remaining child issues filed."
