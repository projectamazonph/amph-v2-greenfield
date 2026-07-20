/**
 * /checkout — server component wrapper.
 *
 * The actual UI is a client component (CheckoutForm) because it
 * uses useSearchParams to read the ?courseSlug=... query and
 * useActionState for the form. Next.js requires any client
 * component that calls useSearchParams to be wrapped in a
 * Suspense boundary so it can bail out of static prerendering.
 *
 * Mirrors the structure of /login (server wrapper + Suspense
 * + client form) — see that page for the same rationale.
 */

import { Suspense } from "react";
import CheckoutForm from "./CheckoutForm";

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutForm />
    </Suspense>
  );
}
