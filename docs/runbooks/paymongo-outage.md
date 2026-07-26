# PayMongo Outage / Payment Incident

**Severity:** P0
**Owner:** On-call engineer (escalate to operator for PayMongo support contact)
**Last reviewed:** 2026-07-26

## Symptoms

- Checkout page (`/enroll`, `/order`) shows a payment error, or `CreatePaymentIntent` returns a `db_error`/gateway error in logs.
- `/api/webhooks/paymongo` returns 401 (signature failures) or 500s in Vercel function logs.
- `webhook_events` rows accumulate with `processingError` set (see `docs/runbooks/webhook-replay.md` for how to query these) or `signatureValid: false`.
- Students report paying but not getting enrolled (`Order.status` stuck at `PENDING` past PayMongo's ~24h checkout session expiry).
- [PayMongo status page](https://status.paymongo.com) shows a declared incident.

## Diagnosis

1. Check PayMongo's own status page first — if PayMongo is down, this is their incident, not ours. Mitigation below still applies (protect the student experience) even if root cause is external.
2. Check Vercel function logs for `/api/webhooks/paymongo` (`[webhook] Invalid signature`, `[webhook] Order not found`, `[webhook] Failed to mark order ... as paid`, `[webhook] Enrollment error`) — these `console.error`/`console.warn` calls in `src/app/api/webhooks/paymongo/route.ts` pinpoint which stage is failing.
3. Query `webhook_events` for the affected window (see the webhook-replay runbook for the exact query) — `signatureValid: false` at scale means either PayMongo rotated the webhook signing secret or `PAYMONGO_WEBHOOK_SECRET` in Vercel env vars is stale/wrong, not a PayMongo-side outage.
4. Check `orders` for the affected window: `SELECT id, status, "paymongoStatus", "paymongoPaymentId", "createdAt" FROM orders WHERE status IN ('DRAFT','PENDING') AND "createdAt" > now() - interval '2 hours' ORDER BY "createdAt" DESC;` — a growing backlog of `PENDING` orders with no matching `PAID` transition confirms the webhook path (not checkout-session creation) is the broken stage.
5. Confirm which secret is live: `PAYMONGO_SECRET` (API calls, checkout session creation) vs `PAYMONGO_WEBHOOK_SECRET` (signature verification) are two different values — a mismatch on either breaks a different stage. Check Vercel → Settings → Environment Variables against the values in the PayMongo dashboard.

## Mitigation

Order matters — protect students from paying without getting access first, then chase the root cause.

1. **If checkout session creation is failing** (students can't even start paying): this is user-facing and immediate. If it's a PayMongo-side outage, there is no workaround — post a banner/notice on the pricing page if the outage is prolonged (>15 min). Do not attempt to bypass PayMongo.
2. **If the webhook is failing but checkout sessions still work** (students pay but don't get access — the worse failure mode, since money has already moved): this is the priority path.
   - If `PAYMONGO_WEBHOOK_SECRET` is wrong/stale: fix it in Vercel env vars and redeploy. This alone does not retroactively fix already-failed webhook deliveries — proceed to the replay runbook (`docs/runbooks/webhook-replay.md`) once the secret is corrected.
   - If the webhook route itself is 500ing for a code reason (check the specific `console.error` from step 2 above): this needs a code fix and deploy. In the meantime, manually reconcile: find affected orders (step 4 query), and check each `paymongoPaymentId` (checkout session id) in the PayMongo dashboard directly for its actual paid/unpaid status. For any confirmed-paid order, an admin can manually mark it paid — check `src/app/admin/payments/` for whether a manual-override action exists before writing raw SQL against production; if not, use `AdminProcessRefund`'s sibling patterns as the reference for what a safe manual state transition looks like, and always go through `recordAuditLog` so the override is traceable. **Never mark an order paid without independently confirming payment in the PayMongo dashboard first.**
3. Once the underlying cause (env var, PayMongo-side, or code) is fixed, replay any events with `processingError` set via `docs/runbooks/webhook-replay.md`.

## Resolution

1. If PayMongo-side: no code changes needed once they resolve; verify by watching new `webhook_events` rows return to `signatureValid: true` / `processingError: null`.
2. If our side: land a fix (Vercel env var correction and/or a code PR against `src/app/api/webhooks/paymongo/route.ts`), deploy, confirm the next real webhook (or a manually-triggered replay) processes cleanly.
3. Reconcile every order touched during the incident window against PayMongo's own transaction records — the `webhook_events.rawPayload` column (added specifically for this) is the source of truth for what PayMongo actually sent, independent of whatever our order-side state ended up as.

## Verification

- New checkout sessions complete end-to-end: pay in PayMongo sandbox/production → `Order.status` transitions to `PAID` → `Enrollment` row created → student can access the course.
- `webhook_events` for new events show `signatureValid: true`, `processingError: null`.
- No `orders` rows stuck in `PENDING` past their checkout session's expiry for the incident window (all resolved to `PAID`, `FAILED`, or `EXPIRED`).

## Postmortem

Required (P0). Within 48h, cover:

- Exact window of impact and count of affected orders/students.
- Whether any student paid without receiving access, and how/when they were made whole.
- Root cause (env var drift, PayMongo outage, code bug) and the specific fix.
- Whether `webhook_events` gave enough signal to diagnose quickly, or whether it needs an alert (e.g. on `processingError IS NOT NULL` count) — flag this as a follow-up story if not already covered by monitoring.
