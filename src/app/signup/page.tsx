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

export const metadata = { title: "Sign Up | AMPH Academy" };

import { SignupForm } from "./SignupForm";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tier?: string }>;
}) {
  const params = await searchParams;
  const errorKind = params.error ?? null;
  const tierSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.tier ?? "")
    ? (params.tier ?? null)
    : null;

  return <SignupForm errorKind={errorKind} tierSlug={tierSlug} />;
}
