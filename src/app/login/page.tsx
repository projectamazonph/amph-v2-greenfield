/**
 * /login — server component shell.
 *
 * STORY-066 refactor: removed the Suspense boundary + useSearchParams
 * dance. The form is now a plain HTML POST to /api/auth/login, and
 * errors come back as ?error=<kind> in the URL. The page just reads
 * searchParams (server-side) and passes the relevant bits to the
 * form as props. No client component, no useEffect, no useRouter.
 *
 * Per Next.js 15+, the `searchParams` prop is a Promise that must be
 * awaited. In Next 16 with React 19, the page is async by default.
 */

import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const params = await searchParams;
  const redirectTo =
    params.redirect && params.redirect.startsWith("/") && !params.redirect.startsWith("//")
      ? params.redirect
      : "/courses";
  const errorKind = params.error ?? null;

  return <LoginForm redirectTo={redirectTo} errorKind={errorKind} />;
}
