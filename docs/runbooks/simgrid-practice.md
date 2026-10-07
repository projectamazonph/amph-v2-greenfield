# SimGrid practice smoke test

**Severity:** P2
**Owner:** On-call engineer
**Last reviewed:** 2026-09-30

ADR-026 established this as the manual smoke recipe for SimGrid progress sync. The automated E2E at `tests/e2e/simgrid-practice.spec.ts` covers the auth gate and the card-grid render; this runbook covers the iframe round-trip end-to-end because the iframe event flow needs a human eye.

## Pre-requisites

- Local Postgres running.
- `DATABASE_URL` set.
- A seeded student in the DB. Run `pnpm import:content` first so the course catalog and student onboarding flows are present, then create a student via `/signup` or the admin UI.
- `pnpm dev` running on `http://localhost:3000`.
- A modern browser (Chromium, Firefox, or Safari with same-origin iframe support). The vendored site uses `window.parent.postMessage` which all three handle identically.

## Steps

1. Sign in as the seeded student at `http://localhost:3000/login`.
2. Visit `http://localhost:3000/practice/simgrid`. Confirm the 12 cards render with their simulator titles (AdConsole Pro, Bid Decisions, Search Term Triage, Keyword Lab, etc.). Each card links to `/practice/simgrid/<file>.html`.
3. Click "Bid Decisions". Confirm the iframe loads and renders the SimGrid UI inside the AMPH-branded wrapper. The wrapper sets the `simhubBridgeToken` and `simhubReturnOrigin` query parameters so the bridge inside the iframe can post round completions back. A redirect to `/login` or a 404 here means the auth gate or the manifest lookup is broken.
4. Complete one round inside the iframe. The vendored `assets/student-progress.js` will call `publishToSimHub`, which `postMessage`s a `simulator_attempt` message to `window.parent` (the patched target; see `public/simgrid-v1/PATCHES.md`). The AMPH wrapper (`src/components/simgrid/SimgridFrame.tsx`) listens for that message, validates the token and origin, and calls `recordSimgridProgressAction` to persist it.
5. Wait ~3 seconds, then visit `http://localhost:3000/dashboard`. Confirm the SimGrid practice card shows "Best <score>" for Bid Decisions (or "Last <score>" depending on the dashboard layout). A "Not started" state means the server action never persisted the attempt.

## Expected outcomes

- All 12 simulators load at `/practice/simgrid/<file>.html` when signed in. Anonymous visitors are redirected to `/login?redirect=...` (verified by the first test in `tests/e2e/simgrid-practice.spec.ts`).
- Progress events from the iframe appear on the AMPH dashboard within 5 seconds of round completion.
- The `recordSimgridProgressAction` server action returns `{ ok: true, value: { id, recordedAt } }` in the Network tab of the browser DevTools.
- No console errors in the AMPH host page (parent). The vendored iframe prints its own logs to its own console. Those are normal SimGrid output, not AMPH errors.

## Troubleshooting

- **Iframe never posts a round completion.** Open the iframe's console; the vendored `assets/student-progress.js` requires `simhubBridgeToken` and `simhubReturnOrigin` in the URL query string. The wrapper at `src/app/practice/simgrid/[...slug]/page.tsx` sets both. If either is missing, `publishToSimHub` early-returns. Confirm the query string by inspecting the iframe `src` attribute in DevTools.
- **Server action returns `unauthenticated`.** Confirm the seed student's session cookie is being sent with the action call. Same-origin iframes inherit cookies from the parent page; cross-origin iframes would not. The vendored site is served from `/simgrid-v1/` on the AMPH origin, so it inherits cookies normally.
- **Score not appearing on dashboard.** Open the Network tab and find the `recordSimgridProgressAction` POST. Verify it returned HTTP 200 with `{ ok: true, value: ... }`. A 4xx response means the action rejected the payload; check the AMPH server logs for the corresponding stack trace. A 200 response with the row in the DB but the dashboard still shows "Not started" means the dashboard component is reading from a stale query (refresh once; if it persists, the cache invalidation on `SimgridProgressCard.tsx` needs review).
- **Iframe loads but renders blank or errors.** The vendored site may have shipped a regression. Check `public/simgrid-v1/VERSION.txt` against the last-known-good sha recorded in `PATCHES.md`. If they differ, run `scripts/vendor-simgrid.sh <expected-sha>` to roll back the vendored copy and re-apply the patches.
- **postMessage events fire but the listener rejects them.** Open the AMPH host page's console. `SimgridFrame.tsx` logs (via the listener's silent path) when a message fails one of the four defence-in-depth checks (origin, structural shape, token, simulatorId match). The most common cause is a stale `SIMGRID_BRIDGE_TOKEN` env var. Confirm the constant exported from `src/lib/simgrid/protocol.ts` matches what the wrapper embeds in the iframe URL.
