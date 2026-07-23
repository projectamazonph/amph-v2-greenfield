# Loop State — AMPH v2

**Project:** Amazon PH Academy v2
**Last updated:** 2026-07-23
**Last loop run:** 2026-07-23

## Sprint Focus (current)

Shipping the core AMPH v2 features to production:

1. Course + Enrollment + Payment flows (PayMongo)
2. Five PPC simulators wiring
3. Gamification (XP, badges, certificates)
4. Production deploy on Vercel

## High Priority (loop is acting or waiting on human)

_(empty)_

## Watch List

| Item             | Status      | Notes                                                               |
| ---------------- | ----------- | ------------------------------------------------------------------- |
| DB provisioning  | pending     | Postgres not yet provisioned per SESSION-HANDOVER.md                |
| Prisma wiring    | partial     | courseRepo + orderRepo still InMemory in production container       |
| PayMongo webhook | broken      | Webhook handler uses InMemory repos per-request — needs real wiring |
| Admin panel      | not started | No `src/app/admin` yet                                              |
| harness-foundry  | planned     | L2+ milestone — version loop as composable runtime                  |

## Recent Noise (ignored this run)

- Loop-sync structural mismatch between STATE.md and LOOP.md — expected, different doc types

## Loop Run Log

| Date       | Level | Score   | Findings                                                    | Actions Taken           |
| ---------- | ----- | ------- | ----------------------------------------------------------- | ----------------------- |
| 2026-07-23 | L1    | 100/100 | 3 watch items flagged (DB, Prisma wiring, PayMongo webhook) | First run — report only |

## Token Budget (this week)

| Day      | Spend | Cap  | Notes           |
| -------- | ----- | ---- | --------------- |
| Mon 7/20 | —     | 300k |                 |
| Tue 7/21 | —     | 300k |                 |
| Wed 7/22 | —     | 300k |                 |
| Thu 7/23 | ~5k   | 300k | First audit run |
| Fri 7/24 | —     | 300k |                 |
| Sat 7/25 | —     | 300k |                 |
| Sun 7/26 | —     | 300k |                 |
