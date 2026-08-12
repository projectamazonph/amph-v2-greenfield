# Webhook Replay

**Severity:** P1
**Owner:** On-call engineer
**Last reviewed:** 2026-08-12

**Canonical production origin:** `https://projectamazonph.vercel.app`

Replay does not repair every partial state. If the original delivery persisted the order as PAID and enrollment then failed, the handler returns early on replay. Confirm the payment and repair access through the audited admin tier-grant flow.

## Symptoms

- A `webhook_events` row has `processingError` set (order not found, enrollment failed, order-update failure) and the underlying cause has since been fixed — the event just needs to run again.
- A student paid, but the order never transitioned to `PAID` (`webhook_events` shows no matching row at all — see "If no `webhook_events` row exists" below).
- Support/an admin needs to re-run a specific PayMongo event without waiting for PayMongo to naturally retry it (PayMongo does retry failed webhook deliveries automatically for a period, but not indefinitely, and not on our schedule).

## Background: why replay isn't a simple re-POST

`src/app/api/webhooks/paymongo/route.ts` verifies `paymongo-signature` via `PayMongoAdapter.verifyWebhookSignature()` (`src/infra/payment/PayMongoAdapter.ts:150`), which:

1. Parses `t=<timestamp>,v1=<hmac>` from the header.
2. **Rejects any signature older than 300 seconds** (`ageSeconds > 300` check).
3. Recomputes the HMAC as `HMAC-SHA256(PAYMONGO_WEBHOOK_SECRET, "${timestamp}.${rawBody}")` and compares.

This means a stored `rawPayload` cannot be replayed with its **original** signature once 5 minutes have passed — which is always, since you're reading it out of the database after the fact. The fix: since we hold `PAYMONGO_WEBHOOK_SECRET` ourselves, **generate a fresh signature for the stored payload** using the same algorithm, with a current timestamp. The route only checks that the signature is valid and recent — it doesn't care that it wasn't the literal one PayMongo originally sent.

## Diagnosis

1. Find the event to replay. Every inbound webhook (including ones that failed signature verification) is persisted — see `docs/audit-2026-07-26-hardening-review.md` and the `WebhookEvent` Prisma model:
   ```sql
   SELECT id, provider, "eventType", "providerEventId", "signatureValid",
          "processedAt", "processingError", "createdAt"
   FROM webhook_events
   WHERE provider = 'paymongo'
   ORDER BY "createdAt" DESC
   LIMIT 20;
   ```
   Narrow by `"providerEventId" = '<paymongo checkout session id>'` if you know it (it's `Order.paymongoPaymentId`).
2. **If no `webhook_events` row exists for the payment at all**: PayMongo never delivered it (network issue, endpoint was down, etc.), not a processing failure on our end. Confirm the payment's actual status in the PayMongo dashboard first — do not fabricate a payload. If confirmed paid, either wait for PayMongo's own retry, or manually construct the minimal event shape PayMongo sends (`{"type":"checkout_session.completed","data":{"id":"<checkout session id>","attributes":{}}}`) and follow the replay steps below with that JSON.
3. **If a row exists with `processingError` set**: pull its `rawPayload` — that's the exact payload PayMongo sent, safe to reuse as-is:
   ```sql
   SELECT "rawPayload" FROM webhook_events WHERE id = '<webhook_event id>';
   ```
4. Confirm the underlying cause is actually fixed before replaying (e.g. if `processingError` was `order_not_found`, confirm the order now exists; if it was a code bug, confirm the fix is deployed) — replaying into the same broken state just adds another failed row.

## Mitigation / Resolution

1. Save the payload to a local file, e.g. `payload.json` (from the `rawPayload` column, or hand-constructed per step 2 above).
2. Generate a fresh signature using the production `PAYMONGO_WEBHOOK_SECRET` (pull it from Vercel env vars — do not hardcode it in a script that gets committed):
   ```bash
   PAYMONGO_WEBHOOK_SECRET="<value from Vercel>" node -e '
     const crypto = require("crypto");
     const fs = require("fs");
     const payload = fs.readFileSync("payload.json", "utf8");
     const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
     const timestamp = Math.floor(Date.now() / 1000);
     const hmac = crypto
       .createHmac("sha256", secret)
       .update(`${timestamp}.${payload}`)
       .digest("hex");
     console.log(`t=${timestamp},v1=${hmac}`);
   '
   ```
3. POST it to the live endpoint immediately (the signature is only valid for 5 minutes from the timestamp generated above):
   ```bash
   curl -i -X POST https://projectamazonph.vercel.app/api/webhooks/paymongo \
     -H "paymongo-signature: <output from step 2>" \
     -H "Content-Type: application/json" \
     --data-binary @payload.json
   ```
4. This creates a **new** `webhook_events` row (the route records every inbound request unconditionally) — the original failed row is left as historical record, not overwritten. That's intentional; don't delete it.
5. **Idempotency is safe by design**: the route's order-lookup + `order.isPaid()` check means replaying an event whose order is already `PAID` is a no-op (`200 { received: true }`, no double-enrollment). Replaying is always safe to retry if you're unsure whether a previous attempt landed.

## Verification

- The new `webhook_events` row for this replay shows `processedAt` set and `processingError: null`.
- The affected `Order.status` is `PAID` and the matching `Enrollment` row exists:
  ```sql
  SELECT o.id, o.status, o."paymongoPaymentId", e.id AS enrollment_id, e.status AS enrollment_status
  FROM orders o
  LEFT JOIN enrollments e ON e."userId" = o."userId" AND e."courseId" = o."courseId"
  WHERE o."paymongoPaymentId" = '<checkout session id>';
  ```
- Student confirms they can access the course.

## Postmortem

Required if this replay was needed because of a code defect (not required for a one-off delivery failure on PayMongo's side). Cover: why the original webhook failed, why it wasn't automatically retried successfully, and whether the failure mode should trigger an alert next time (see the open follow-up in `paymongo-outage.md`'s postmortem section).
