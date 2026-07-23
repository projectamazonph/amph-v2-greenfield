# Loop State — AMPH v2

**Project:** Amazon PH Academy v2
**Last updated:** 2026-07-22
**Last loop run:** never

## Sprint Focus (current)

Shipping the core AMPH v2 features to production:

1. Course + Enrollment + Payment flows (PayMongo)
2. Five PPC simulators wiring
3. Gamification (XP, badges, certificates)
4. Production deploy on Vercel

## High Priority (loop is acting or waiting on human)

_(empty — start of loop)_

## Watch List

| Item             | Status      | Notes                                                               |
| ---------------- | ----------- | ------------------------------------------------------------------- |
| DB provisioning  | pending     | Postgres not yet provisioned per SESSION-HANDOVER.md                |
| Prisma wiring    | partial     | courseRepo + orderRepo still InMemory in production container       |
| PayMongo webhook | broken      | Webhook handler uses InMemory repos per-request — needs real wiring |
| Admin panel      | not started | No `src/app/admin` yet                                              |

## Recent Noise (ignored this run)

_(none)_

## Loop Run Log

| Date                  | Level | Findings | Actions Taken |
| --------------------- | ----- | -------- | ------------- |
| _(first run pending)_ |       |          |               |

## Token Budget (this week)

| Day | Spend | Cap  | Notes |
| --- | ----- | ---- | ----- |
| Mon | —     | 300k |       |
| Tue | —     | 300k |       |
| Wed | —     | 300k |       |
| Thu | —     | 300k |       |
| Fri | —     | 300k |       |
| Sat | —     | 300k |       |
| Sun | —     | 300k |       |
