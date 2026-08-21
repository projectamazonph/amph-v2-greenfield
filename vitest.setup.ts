/**
 * vitest.setup.ts — global test setup.
 *
 * Sets dummy env vars for tests that import the production container
 * transitively (via action files importing `buildContainer`). The tests
 * that need a real DB use `buildTestContainer` and never touch `prisma`.
 * The dummy URL just needs to be syntactically valid so module-level
 * `createPrismaClient()` doesn't throw at import time.
 *
 * Also provides global mocks for:
 * - next/headers (cookies, headers) — used by server components via @/lib/auth
 * - Client Components embedded in Server Component page trees — these are
 *   not available in Node.js test environment and must be stubbed so that
 *   tests using `prerender` (React 19) can run without browser APIs.
 */

import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import "vitest-axe/extend-expect";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET ??= "test-secret-at-least-32-bytes-long-please";
process.env.PAYMONGO_SECRET ??= "sk_test_dummy";
process.env.PAYMONGO_WEBHOOK_SECRET ??= "whsec_test_dummy";
process.env.RESEND_API_KEY ??= "re_test_dummy";
process.env.EMAIL_VERIFICATION_SECRET ??= "test-verification-secret";

// ── Next.js server modules ────────────────────────────────────────────────

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => ({ value: "test-session-token" })),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
    has: vi.fn(() => false),
  })),
  headers: vi.fn(() => ({
    get: vi.fn(() => null),
    has: vi.fn(() => false),
    entries: vi.fn(() => []),
    keys: vi.fn(() => []),
    values: vi.fn(() => []),
    forEach: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url) => {
    throw Object.assign(new Error(`NEXT_REDIRECT: ${url}`), { digest: "NEXT_REDIRECT" });
  }),
  redirectTo: vi.fn((url) => {
    throw Object.assign(new Error(`NEXT_REDIRECT: ${url}`), { digest: "NEXT_REDIRECT" });
  }),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  Link: vi.fn(({ children }) => children),
}));

// ── Client Components ─────────────────────────────────────────────────────
// These are imported by Server Component page trees (StudentShell, tool forms).
// They use browser APIs (navigator, window) or React hooks and cannot render in
// a Node.js test environment. Stub them so the server component tree can be
// exercised by tests that use `prerender` from react-dom/static.

vi.mock("@/components/student/StudentShell", () => ({
  StudentShell: vi.fn(({ children }) => children),
}));

vi.mock("@/components/ui/CommandPalette", () => ({
  CommandPalette: vi.fn(() => null),
}));

vi.mock("@/components/student/StudentSidebar", () => ({
  StudentSidebar: vi.fn(() => null),
}));

vi.mock("@/components/ui/MobileNavToggle", () => ({
  MobileNavToggle: vi.fn(() => null),
}));

// ── Tool form components (Client Components) ─────────────────────────────

vi.mock("@/components/tools/BidElevatorForm", () => ({
  BidElevatorForm: vi.fn(() => null),
}));

// Note: @/components/ui/Button and @/components/tools/CampaignBuilderForm
// are NOT mocked globally. Tests that exercise their real rendering
// (Button.test.tsx, CampaignBuilderForm.test.tsx, EnrollButton.test.tsx,
// LiveClassRecordingButton.test.tsx, etc.) need the real components.
// Tests that render Server Component page trees and only care about the
// page shape should mock these per-file using `vi.mock("@/components/ui/Button", …)`
// before importing the page.

vi.mock("@/components/ui/BadgeDisplay", () => ({
  BadgeDisplay: vi.fn(() => null),
}));

vi.mock("@/components/profile/ProfileBadgeGrid", () => ({
  ProfileBadgeGrid: vi.fn(() => null),
}));

vi.mock("@/components/ui/ToastProvider", () => ({
  ToastProvider: vi.fn(({ children }) => children),
}));
