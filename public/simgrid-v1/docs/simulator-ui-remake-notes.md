# Simulator UI remake notes

**Branch:** `redesign/distinct-simulator-layouts`
**Baseline:** 91 passing tests on `master` after PR #27 (`3f844bea`) plus the shell and replayability contracts

## Delivered layout genomes

| Simulator          | Layout genome    | Primary view mechanic                                                                 |
| ------------------ | ---------------- | ------------------------------------------------------------------------------------- |
| Bid Decisions      | Decision cockpit | One keyword, instrument readouts, evidence meter, separated action controls           |
| Campaign Architect | Blueprint canvas | Persistent hierarchy, selectable nodes, block palette, negatives tray, rule inspector |
| Account Audit      | Diagnostic sweep | Inspectable zones, five finding buckets, accumulating clipboard                       |
| SQP Studio         | Signal lab       | Query queue, three signal meters, evidence stance, classification bench               |
| Client Onboarding  | Intake interview | Sequential confirmation, six-topic spine, filling client brief                        |
| Capstone Sequence  | Journey map      | Five-stage route, gated decisions, carried artifact chain                             |

The views consume current scenario/core data and keep all existing grading exports,
scenario selectors, versioned attempt records, and student-progress events intact.
The Client Onboarding and Capstone cores currently expose four scored rows. Their
views show the requested six-topic/five-stage operating model, while the extra
reporting/communication nodes remain presentational until scenario expansion adds
versioned scored content.

## Explicitly out of scope

These pre-existing engine or product-copy issues were intentionally recorded rather
than changed during the UI pass:

- Search Term Triage now documents its supported 8/12/16-term rounds consistently.
- Pacing Deck now labels its demand profile `PH STANDARD`; the curve remains a teaching approximation.
- Ad Console now scales capped search-term attribution with campaign totals.
- BuyBox Dojo now uses Amazon PH fulfillment copy and applies a daily cap per simulated day.
- Bulk File validation now rolls back state mutations for rows with blocking validation errors.
- Keyword Lab shows a `v1.0` badge while the hub lists `v2.2`.

## Verification requirements

- `node --test tests/*.test.cjs`
- Parse every external and inline JavaScript block.
- Resolve every local static asset reference.
- Check each simulator at desktop and approximately 380px.
- Walk all controls by keyboard and confirm live-result announcements.
