# Safety — AMPH v2 Loop

## Path Denylist

The loop **must never** edit, create, or delete files in these paths:

| Path                 | Reason                      |
| -------------------- | --------------------------- |
| `.env`, `.env.*`     | Secrets, credentials        |
| `auth/`              | Auth configuration          |
| `payments/`          | Payment wiring              |
| `prisma/migrations/` | DB schema — requires review |
| `node_modules/`      | Dependency isolation        |
| `.husky/`            | Git hooks                   |

## Allowed Paths (L2+)

- `src/**/*.ts` — source code
- `tests/**` — test files
- `docs/**/*.md` — documentation
- `scripts/*.ts` — build scripts
- `skills/**` — loop skills only

## Auto-Merge Policy

- L1: No auto-merge. Human review required for all PRs.
- L2: Auto-merge allowed for: dependency updates, test-only changes, docs-only changes.
- L3: Auto-merge allowed for: lint fixes, formatting, non-breaking refactors — **only** if CI passes and coverage ≥ 80%.

## MCP Scopes

Until trusted, MCP connectors are read-only:

- GitHub MCP: read issues, PRs, CI status — no writes
- No filesystem MCP beyond the allowed paths above
- No database MCP

## Escalation

- Loop stalls or hits circuit breaker → post `loop-run-log.md` with evidence → ping human in `#amph-dev`
- Max 3 fix attempts per item in `STATE.md` → escalate
- Token spend hits 80% daily cap → switch to report-only immediately

## Incident Contacts

- Production incidents: `#amph-alerts` Slack channel
- Loop failures: `#amph-dev` Slack channel
