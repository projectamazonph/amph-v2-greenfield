# P4 PR-B — PayMongo installments (P0-01) + BIR invoicing (P0-02)

**Status:** Merged (`cd41fad`, PR #487, closes #486; follows #403 PR-A #485)
**Flags:** `INSTALLMENTS_ENABLED`, `INVOICING_ENABLED` (both default off)

## Scope

Backend + checkout UI behind flags. No admin UI in this slice.

### P0-01 — card installments

- `InstallmentPlan` value object: tenures 3/6/12, PHP 3,000 floor (PayMongo card-installment minimum), remainder on the first month.
- `IPaymentGateway.createCheckoutSession` accepts `installments: { terms }`. The adapter sends `payment_method_options.card.installments.enabled` so the hosted page offers the bank choice. Tenure validation stays in domain.
- `Order` persists the chosen plan (`installmentMonths`, `installmentMonthlyMinor`, nullable, pay-in-full when null). New migration, Prisma + InMemory mappers.
- `CreatePaymentIntent` accepts `installmentMonths`, gated by the flag. Pending-order reuse matches the installment choice.
- Checkout form shows a tenure selector (with monthly amounts) only when the flag is on and the total qualifies. Server action validates the choice and maps the new errors.

### P0-02 — BIR invoicing

- `Invoice` entity: DRAFT → ISSUED → PAID / VOIDED, totals derived from line items, taxpayer snapshot, `INV-YYYY-NNNNN` numbers.
- `IInvoiceRepository` + Prisma and InMemory adapters.
- `IssueInvoice`: paid-order only, idempotent per order, sequential numbering with one retry on conflict, renders the PDF (`InvoiceRenderer` / React PDF) and stores it via file storage. Tax stays 0 until finance confirms the VAT treatment. Buyer address defaults to null (address capture is a follow-up profile story).
- PayMongo webhook auto-issues best-effort when the flag is on. Failures log and record on the event log; the webhook still returns 200.

## Out of scope

- PR-C (prerequisites, assignments, resources polish, settings, email templates) and PR-D (OAuth) per #403.
- Admin invoice list/detail/download UI.
- Buyer-address capture on the profile.
- VAT rate confirmation.

## Verification

- `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` green.
- New suites: InstallmentPlan, Invoice, Order installments, CreatePaymentIntent installments, PayMongoAdapter installments, checkout action + form selector, IssueInvoice, InMemoryInvoiceRepository, webhook invoice auto-issue.
- Manual (flags on, PayMongo test mode): installment checkout creates an installment order; paid webhook issues `INV-YYYY-NNNNN` with a stored PDF.
