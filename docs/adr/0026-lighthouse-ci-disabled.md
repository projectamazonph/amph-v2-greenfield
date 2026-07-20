# ADR-0026: Disable Lighthouse CI; Diagnose Next.js 16 Artifact Transport (and Re-enable via `output: 'standalone'`)

**Status:** Accepted (workaround) — 2026-07-20
**Status:** Updated (fix landed) — 2026-07-20
**Context:** Lighthouse CI job was failing in the GitHub Actions runner.
**Decision:** Disable the Lighthouse CI job and document the root cause. Fix properly in a follow-up using Next.js's `output: 'standalone'` configuration.
**Supersedes:** None
**Superseded by:** None
**Fix:** PR #116 (`feat(ci): re-enable Lighthouse CI via output: 'standalone' (STORY-0026 fix)`) on 2026-07-20 added `output: 'standalone'` to `next.config.ts`, switched the build artifact to `.next/standalone`, and re-enabled the lighthouse job. Verified the standalone server boots cleanly with `node .next/standalone/server.js` and responds 200 on `/api/health`. The lighthouse job is currently a soft-pass (logs results, doesn't block); tighten the thresholds once a stable baseline exists.

---

## Context

Lighthouse CI was added in PR #100 (Sprint 11, observability/rate-limiting) to give us automated performance, accessibility, best-practices, and SEO checks on every PR. The job was failing on the first run with "Artifact not found for name: build" and the only fix attempted in subsequent PRs (PR #101, #102) used `actions/upload-artifact` + `actions/download-artifact` to ship the `.next/` build output between the build and lighthouse jobs.

That revealed a deeper issue: the Next.js 16 + Turbopack `.next/` artifact contains symlinks that point **outside** of `.next/` (specifically into the pnpm store at `node_modules/.pnpm/...`). When the build job uploads `.next/` to the artifact store, the symlinks are preserved but their targets (in the pnpm store) are not part of the artifact. When the lighthouse job downloads the artifact, the symlinks are broken, and the production server fails to start with errors like:

```
⨯ Error: Failed to load external module @prisma/client-<hash>:
  Cannot find module '.prisma/client/default'

⨯ Error: Failed to load external module @react-pdf/renderer-<hash>:
  Cannot find package '@react-pdf/primitives'
```

Multiple bundler-generated modules have this pattern, and patching each one individually (copy `.prisma/` to `.next/node_modules/.prisma/`, symlink `@react-pdf/primitives`, etc.) is a whack-a-mole game. The underlying problem is that `.next/` is not a self-contained production artifact when built without `output: 'standalone'`.

## Decision

Disable the Lighthouse CI job for now. PRs can merge without the Lighthouse check. The follow-up plan is:

1. **Switch `next.config.ts` to `output: 'standalone'`** — Next.js produces a self-contained `.next/standalone/` directory with all server dependencies bundled in. No symlinks to the pnpm store; everything is real files in the artifact.
2. **Update the build job to upload `.next/standalone/` instead of `.next/`** — this is the artifact the lighthouse job needs.
3. **Update the lighthouse job to start the server via `node .next/standalone/server.js`** (the standalone output includes a `server.js` entrypoint).
4. **Re-enable the original `lhci collect` invocation** which will then find a working server.

This is the standard Next.js production deployment pattern and is what Vercel itself uses internally. Once the build is configured for standalone, the Lighthouse CI job becomes trivial.

## Consequences

**Positive:**
- PR #101 (E2E fix) can merge cleanly. The handoff is unblocked.
- We stop thrashing on the bundler artifact issue. Eight failed fix attempts (commits 9dac705, 1e67282, 1164f6b, 78c694d, fe54fd3, 10abec4, 56825d7, ae5c467) didn't make progress.
- The Vercel deployment (https://amph-v2-greenfield.vercel.app) is unaffected — Vercel handles its own bundling for its runtime, separate from our CI artifact flow.

**Negative:**
- We lose automated Lighthouse checks on every PR until the standalone fix lands. Performance regressions and accessibility issues won't be caught at PR time.
- A real performance regression would only be caught by manual Lighthouse runs against the Vercel deployment.

**Mitigation:**
- The deployed app is on a public URL (https://amph-v2-greenfield.vercel.app) so anyone can run Lighthouse against it manually in devtools.
- The architecture tests + unit/integration tests still catch the SOLID compliance regressions.
- The follow-up is small (a few hours of work) and tracked in the handoff.

## Alternatives considered

**A. Patch each broken module individually** — what we tried. Rejected because it's brittle and doesn't scale; new dependencies will keep failing.

**B. Disable the lighthouse job and never re-enable it** — premature. Lighthouse is genuinely useful for catching a11y/perf regressions.

**C. Run Lighthouse against the Vercel deployment URL** — feasible but adds a dependency on Vercel preview URLs being stable, which they're not (every PR gets a new URL). LHCI can handle this with `serverBaseUrl`, but it's a non-trivial config change.

**D. Use `output: 'standalone'`** — chosen. Standard Next.js production pattern, makes the artifact self-contained, unblocks Lighthouse properly.

## Implementation notes (for the follow-up)

```ts
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone',  // <-- add this
  // ...existing config
};
```

```yaml
# .github/workflows/ci.yml — build job
- uses: actions/upload-artifact@v4
  with:
    name: build
    path: .next/standalone
    include-hidden-files: true

# .github/workflows/ci.yml — lighthouse job
- run: pnpm install --frozen-lockfile
  - run: cp -r .next/static .next/standalone/.next/static  # standalone needs static assets
  - uses: actions/download-artifact@v4
    with:
      name: build
      path: .next/standalone
  - name: Start standalone server
    run: |
      nohup node .next/standalone/server.js > /tmp/server.log 2>&1 &
      for i in {1..60}; do
        if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
          echo "Server ready after ${i}s"
          break
        fi
        sleep 1
      done
  - name: Run Lighthouse CI
    run: pnpm dlx @lhci/cli@0.14.x autorun
```

(The `.next/static` copy is needed because standalone only bundles the server-side code; static assets are still served from `.next/static/`.)

## References

- Next.js standalone output: https://nextjs.org/docs/pages/api-reference/next-config-js/output
- Sprint 11 PR that introduced Lighthouse: https://github.com/projectamazonph/amph-v2-greenfield/pull/100
- The 8 fix attempts are on branch `fix/ci-lighthouse-artifact` (commits `9af86e4` through `45c8f7f`)
- Deployed app: https://amph-v2-greenfield.vercel.app
