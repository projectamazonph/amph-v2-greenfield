---
name: Feature request
about: Suggest a new feature for amph-v2
title: "[FEAT] "
labels: enhancement
assignees: projectamazonph
---

## Problem

What user-facing problem does this solve? Reference a quote from a user if you have one.

## Proposed solution

A clear and concise description of what you want to happen.

## Alternatives considered

What other approaches were considered, and why is this one better?

## Architecture impact

<!-- Important: the greenfield has a five-layer SOLID architecture. New features MUST be added as domain + port + use case + adapter + page, not by editing the existing layers. ADR-013. -->

- [ ] This is a new simulator (one new module in `src/domain/simulators/` + one registry entry)
- [ ] This is a new payment flow (one new use case + adapter changes only)
- [ ] This is a new admin section (one server action + one page; use cases unchanged)
- [ ] This is a new tier / pricing change (settings + pricing service only)
- [ ] This is something else (describe below)

If "something else," describe which layer is affected and why.

## Out of scope

- AI features (ADR-003). Do not propose anything that requires an external LLM API.
- Multi-tenant (ADR-015). Do not propose `orgId` or per-org data isolation.
- Multi-currency (ADR-008). PHP only.
- Subscriptions (ADR-009). One-time payment per tier.
- Native mobile app (ADR-010). Web only, mobile-first responsive.

## Acceptance criteria

A short list of "this is done when..." items.

## Story link

<!-- If a story file has been written, link it. -->
