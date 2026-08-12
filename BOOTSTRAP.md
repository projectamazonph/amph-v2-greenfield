# Session bootstrap

## Repository baseline

- Repository: <https://github.com/projectamazonph/amph-v2-greenfield>
- Production: <https://projectamazonph.vercel.app>
- Reviewed main: `ee1737a` on 2026-08-12
- Stack: Next.js 16, React 19, strict TypeScript, Prisma 7, PostgreSQL, Vitest, Playwright
- Architecture: domain, ports, use cases, infrastructure, composition, app

Read [`AGENTS.md`](AGENTS.md), [`docs/README.md`](docs/README.md), [`STATE.md`](STATE.md), and [`OPERATING_GUIDELINES.md`](OPERATING_GUIDELINES.md) before editing.

## Current status

The student-facing repair and its three follow-ups are merged in PRs #305-#308. This includes course and lesson visibility for manually granted students, correct admin-login cookie propagation, and canonical forgot-password links.

Last verified gate: 3,816 Vitest passed, 2 skipped; 665 architecture checks; TypeScript, ESLint, production build, Playwright, and Lighthouse passed.

## Start work

```bash
git switch main
git pull --ff-only origin main
git switch -c <type>/<short-description>
pnpm install
pnpm prisma:generate
```

Use one concern per branch. Open a PR to `main`, wait for every required check, then squash merge.
