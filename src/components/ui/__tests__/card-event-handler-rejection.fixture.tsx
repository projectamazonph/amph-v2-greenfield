/**
 * Compile-time fixture for L-03 (audit 2026-08-20, umbrella #404).
 *
 * This file is a deliberately broken Card usage. It exists so that
 * `pnpm tsc --noEmit` (or `pnpm typecheck`) produces a type error
 * here. The matching pin test
 * `card-no-event-handler-props.test.ts` asserts this file exists and
 * tries the bad prop; the project's normal tsc command is the
 * actual gate.
 *
 * If someone re-broadens `CardProps` to extend
 * `HTMLAttributes<HTMLDivElement>`, this file compiles cleanly and
 * the build pipeline catches it via the source-string pin test
 * (which asserts `extends HTMLAttributes<HTMLDivElement>` is absent)
 * and via the tsc error count for this fixture.
 *
 * The file is named `*.fixture.tsx` (not `*.test.tsx`) so Vitest's
 * include glob does not try to execute it. Vitest would not be able
 * to import this file: it would fail the type-check at parse time.
 */

import { Card } from "../Card";

// This assignment must produce a tsc error. The point is to pin the
// rejection so a future regression in Card.tsx that re-broadens
// `CardProps` is caught by the normal typecheck pipeline.
const _broken = (
  <Card padding="default" onClick={() => undefined}>
    Clickable card
  </Card>
);

// Touch the value so the unused-binding lint doesn't strip the line.
export const __cardFixtureEvidence: unknown = _broken;
