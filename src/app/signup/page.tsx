/**
 * /signup — server component shell.
 *
 * STORY-066 refactor: removed the Suspense boundary + useSearchParams
 * dance. The form is now a plain HTML POST to /api/auth/signup, and
 * errors come back as ?error=<kind> in the URL. The page just reads
 * searchParams (server-side) and passes `errorKind` to the form.
 *
 * No client component, no useEffect, no useRouter, no useActionState.
 * This is the most stable auth pattern on the web — the boring HTTP
 * one that has worked for 30 years.
 */

import { SignupForm } from "./SignupForm";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorKind = params.error ?? null;

  return <SignupForm errorKind={errorKind} />;
}
