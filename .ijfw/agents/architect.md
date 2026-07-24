---
name: architect
model: opus
effort: high
description: Diagnose the signup redirect crash + fix pattern (one-shot, for STORY-046 follow-up)
---

# architect

Decides the implementation shape for fixing the broken signup redirect flow
left over from PR #163. Outputs a one-line decision + the reason.

Rules:

- Mirror existing repo patterns (loginAndRedirect in src/app/actions/login.action.ts)
  over introducing new patterns.
- Prefer the standard Next.js 16 / React 19 pattern (server action calls
  redirect() directly, errors via ?error= query) over fighting useActionState.
- The page must be SSR-renderable (useEffect/useRouter at the page level is
  forbidden because the unit test uses renderToString).
