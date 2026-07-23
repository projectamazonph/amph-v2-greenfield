# Loop Budget — AMPH v2

> Primary loop: **Daily Triage** (daily-triage)
> Cost estimate: `pnpm exec loop-cost --pattern daily-triage --level L1`

## Daily limits

| Loop              | Cadence | Max runs/day | Max tokens/day | Max sub-agent spawns/run |
| ----------------- | ------- | ------------ | -------------- | ------------------------ |
| Daily Triage      | 1d      | 1            | 300k           | 0 (L1)                   |
| CI Sweeper        | 15m     | 16           | 200k           | 0 (L2)                   |
| Changelog Drafter | on-tag  | 1            | 50k            | 0 (L1)                   |

> AMPH v2 is a substantial Next.js project — 300k daily cap raised from default 100k.
> Realistic blend (60% no-op, 40% full triage) ≈ 276k/day.

## Budget tiers

| Tier | Condition                            | Action                               |
| ---- | ------------------------------------ | ------------------------------------ |
| OK   | spend < 80% daily cap                | Normal operation                     |
| Warn | spend ≥ 80% daily cap                | Switch to report-only, no sub-agents |
| Kill | spend ≥ 100% OR `loop-pause-all` set | Exit immediately                     |

## Alerts This Period

_(empty)_

## Kill switch

- Flag: `loop-pause-all` in `STATE.md`
- Resume: human clears the flag in `STATE.md`

## On budget exceed

1. Pause GitHub Actions scheduler (`daily-triage.yml`)
2. Append event to `loop-run-log.md`
3. Post issue to `#amph-dev` with spend evidence
4. Update `STATE.md` → High Priority
