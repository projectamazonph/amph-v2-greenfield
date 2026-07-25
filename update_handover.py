"""Update SESSION-HANDOVER.md to reflect the merged PR #182 and closed PR #181 state."""
import re
from pathlib import Path

p = Path(r"D:\Web Project\amph-v2-greenfield\SESSION-HANDOVER.md")
text = p.read_text(encoding="utf-8")

# Update the top header line
old_header = "**Updated:** 2026-07-25 (Sprint 13 in progress — simulator rebuilds). `main` @ `9eb5f6b` (PR #179). STORY-067 merged (STR Triage rebuild). STORY-068 PR #180 open (Bid Elevator rebuild). Operator-owned items: PayMongo webhook, admin user, launch comms."
new_header = "**Updated:** 2026-07-25 (Sprint 13 in progress — simulator rebuilds). `main` @ `a0ce6c2` (PR #182 squash: auth cookie fix + Campaign Builder). STORY-067/068/069 merged. STORY-070 next. Operator-owned items: PayMongo webhook, admin user, launch comms."
text = text.replace(old_header, new_header)

# Update the Phase row
old_phase = "| Phase                    | **Sprint 13 in progress. STORY-067 merged (PR #179), STORY-068 PR #180 open (Bid Elevator rebuild). Remaining: Campaign Builder (STORY-069) and Listing Audit (STORY-070) simulator rebuilds.**"
new_phase = "| Phase                    | **Sprint 13 in progress. STORY-067/068/069 all merged. STORY-070 (Listing Audit rebuild) is next. Auth cookie session hotfix (PR #182) also merged — unblocks all simulator E2E tests.**"
text = text.replace(old_phase, new_phase)

# Update the main HEAD row
old_head = "| `main` HEAD              | `9eb5f6b` (PR #179 squash): `feat(simulator): STORY-067 STR Triage rebuild — scoring engine integration`"
new_head = "| `main` HEAD              | `a0ce6c2` (PR #182 squash): `fix(auth): plant session cookie on the redirect response (STORY-066 follow-up)` — also pulled in STORY-069 Campaign Builder + SESSION-HANDOVER update via squash from a diverged local main"
text = text.replace(old_head, new_head)

# Update test count to be roughly accurate
old_tests = "| Unit + integration tests | **2352 passing + 2 skipped, 0 TypeScript errors**"
new_tests = "| Unit + integration tests | **2827 passing + 2 skipped, 0 TypeScript errors** (2 pre-existing prisma-migration Windows failures unrelated to recent work)"
text = text.replace(old_tests, new_tests)

# Add a new entry for STORY-069 and the auth fix in the "What changed this session" section
old_section = "### STORY-068: Bid Elevator rebuild — PR #180 open"
new_section = """### STORY-069: Campaign Builder rebuild — merged (via PR #182 squash)

- `CampaignBuilderOutput` now has `ScoreDimensions` (structureQuality, budgetAllocation, keywordRelevance, explanation)
- `CampaignBuilderInput` now has `userAdjustedCampaigns` (student's submitted campaign structure for grading)
- `CampaignBuilderSimulator.run()` computes dimension scores when `userAdjustedCampaigns` provided
- `campaignBuilderAttempt()` server action wires full lifecycle
- Legacy `buildCampaign()` kept for backward compat
- `seed-simulator-policies.ts` fixed: campaign-builder policies now use correct dimension names
- 37 Campaign Builder tests pass; typecheck 0 errors; lint 0 errors
- Branch: `feat/STORY-069-campaign-builder-rebuild` (PR #181 opened but closed as redundant — Campaign Builder code was accidentally picked up by PR #182's squash-merge because that branch was based off a local main that already had this commit)

### Hotfix: Auth cookie on redirect (PR #182, merged)

- `/api/auth/{login,signup,logout}` route handlers were calling `setAuthCookie` via `cookies().set()` (which writes to the implicit response) and then returning `NextResponse.redirect()` — a fresh response that did not inherit the cookie. The session cookie was silently dropped.
- Fix has three pieces:
  1. `setAuthCookie` / `clearAuthCookie` now accept an optional `CookieTarget` so the cookie can be set on the response we actually return.
  2. `performSignUp` / `performLogin` now expose `sessionToken` / `expiresAt` in the success result so route handlers can plant the cookie on the redirect response.
  3. Cookie `Secure` flag AND cookie name (`amph_session` vs `__Secure-amph_session`) are now both derived from the request protocol (`isHttps`), not `NODE_ENV`. The `__Secure-` prefix requires `Secure: true` — browsers drop the cookie otherwise. Playwright's `next start` (NODE_ENV=production) runs over HTTP localhost, so the cookie must be the dev name with no Secure flag. Real production (Vercel) is always HTTPS so both stay on.
- New route tests in `src/app/api/auth/__tests__/{login,signup}.test.ts` assert `Set-Cookie: amph_session=...` is on the 303 response and that the Secure flag + name follow the request protocol.
- Typecheck clean, lint clean, 2827 tests pass. The signup E2E that was failing across every PR since #169 now passes.
- Branch: `fix/auth-cookie-on-redirect`; PR #182 merged as `a0ce6c2`.

### STORY-068: Bid Elevator rebuild — PR #180 open"""
text = text.replace(old_section, new_section)

# Update the Sprint 13 status table
old_table = """| Story     | Title                                 | Status                   |
| --------- | ------------------------------------- | ------------------------ |
| STORY-064 | Simulator attempt infrastructure      | merged (main)            |
| STORY-065 | Scoring engine + dimensional policies | merged (main)            |
| STORY-066 | Feedback composer + remediation       | merged (main, PR #173)   |
| STORY-067 | STR Triage rebuild                    | merged (PR #179)         |
| STORY-068 | Bid Elevator rebuild                  | PR #180 open, CI running |
| STORY-069 | Campaign Builder rebuild              | pending                  |
| STORY-070 | Listing Audit rebuild                 | pending                  |"""

new_table = """| Story     | Title                                 | Status                                       |
| --------- | ------------------------------------- | -------------------------------------------- |
| STORY-064 | Simulator attempt infrastructure      | merged (main)                                |
| STORY-065 | Scoring engine + dimensional policies | merged (main)                                |
| STORY-066 | Feedback composer + remediation       | merged (main, PR #173)                       |
| STORY-067 | STR Triage rebuild                    | merged (PR #179)                             |
| STORY-068 | Bid Elevator rebuild                  | merged (PR #180)                             |
| STORY-069 | Campaign Builder rebuild              | merged (PR #181 closed as redundant; code in main via PR #182 squash) |
| Hotfix    | Auth cookie on redirect               | merged (PR #182)                             |
| STORY-070 | Listing Audit rebuild                 | next                                         |"""
text = text.replace(old_table, new_table)

p.write_text(text, encoding="utf-8")
print("SESSION-HANDOVER.md updated successfully")
