/**
 * Checkout server action — STORY-021.
 *
 * Receives a course slug from the /checkout page form, validates
 * the user has a session, calls CreatePaymentIntent through the
 * container, and returns the hosted-checkout URL.
 *
 * The action NEVER trusts the client:
 *  - The session is read server-side via getSessionUserId().
 *  - The course is fetched server-side via container.courseRepo.
 *  - The order is created server-side via container.orderRepo.
 *  - The PayMongo call is server-side via container.paymentGateway.
 *
 * Errors are returned as a tagged union; the page renders them
 * without redirecting (so the user can recover — e.g. by signing
 * in if not authenticated).
 *
 * SOLID notes:
 *  - One responsibility: turn a course-slug into a checkout URL.
 *  - The action goes through buildContainer() (composition root).
 *  - No direct I/O outside the container.
 *
 * "use server" so this can be called from a client form.
 */

"use server";

import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { CreatePaymentIntentError } from "@/usecases/CreatePaymentIntent";
import { rateLimitKey } from "@/ports/security/rateLimitKey";

export type CheckoutActionState =
  | { kind: "idle" }
  | { kind: "unauthorized" }
  | { kind: "invalid_input"; message: string }
  | { kind: "course_not_found" }
  | { kind: "course_not_published" }
  | { kind: "pricing_tier_not_found" }
  | { kind: "pricing_tier_unavailable" }
  | { kind: "already_enrolled" }
  | { kind: "payment_error"; message: string }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "rate_limiter_unavailable" }
  | { kind: "redirect"; checkoutUrl: string; orderId: string };

const INITIAL: CheckoutActionState = { kind: "idle" };
export const CHECKOUT_INITIAL_STATE = INITIAL;

/**
 * Main entrypoint. Receives FormData from the /checkout form.
 * Validates input, calls CreatePaymentIntent, returns the result.
 */
export async function startCheckout(
  _prev: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const slug = String(formData.get("courseSlug") ?? "").trim();
  const pricingTierSlug = String(formData.get("pricingTierSlug") ?? "").trim();
  const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (
    (!slug && !pricingTierSlug) ||
    (slug && !validSlug.test(slug)) ||
    (pricingTierSlug && !validSlug.test(pricingTierSlug))
  ) {
    return { kind: "invalid_input", message: "Missing course" };
  }

  // Fail fast: not signed in → return unauthorized state. The page
  // renders a "please sign in" prompt with a link to /login.
  const userId = await getSessionUserId();
  if (!userId) {
    return { kind: "unauthorized" };
  }

  const container = buildContainer();

  // Rate limit checkout attempts per authenticated user
  const limitResult = await container.rateLimiter.check({
    key: rateLimitKey("checkout:user", userId),
    policy: "checkout_user",
  });
  if (limitResult.ok && !limitResult.value.allowed) {
    return { kind: "rate_limited", retryAfterSeconds: limitResult.value.resetSeconds };
  }
  if (!limitResult.ok) {
    console.error("[startCheckout] rate limiter error:", {
      kind: limitResult.error.kind,
      message: limitResult.error.message,
    });
    return { kind: "rate_limiter_unavailable" };
  }
  const result = await container.createPaymentIntent.execute({
    userId,
    ...(pricingTierSlug ? { pricingTierSlug } : { courseSlug: slug }),
  });

  if (result.ok) {
    return {
      kind: "redirect",
      checkoutUrl: result.checkoutUrl,
      orderId: result.orderId,
    };
  }

  return mapPaymentError(result.error);
}

function mapPaymentError(err: CreatePaymentIntentError): CheckoutActionState {
  switch (err.kind) {
    case "course_not_found":
      return { kind: "course_not_found" };
    case "course_not_published":
      return { kind: "course_not_published" };
    case "pricing_tier_not_found":
      return { kind: "pricing_tier_not_found" };
    case "pricing_tier_unavailable":
      return { kind: "pricing_tier_unavailable" };
    case "already_enrolled":
      return { kind: "already_enrolled" };
    case "payment_error":
      return { kind: "payment_error", message: err.message };
    default:
      return { kind: "payment_error", message: "An unexpected error occurred" };
  }
}
