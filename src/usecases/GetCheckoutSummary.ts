import type { Course } from "@/domain/entities/Course";
import { effectivePrice } from "@/domain/entities/PricingTier";
import type { Money } from "@/domain/values/Money";
import { Result } from "@/domain/shared/Result";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IPricingTierRepository } from "@/ports/repositories/IPricingTierRepository";

export interface CheckoutOfferInput {
  courseSlug?: string;
  pricingTierSlug?: string;
}

export type CheckoutOfferError =
  | { kind: "course_not_found" }
  | { kind: "course_not_published" }
  | { kind: "pricing_tier_not_found" }
  | { kind: "pricing_tier_unavailable" };

export interface ResolvedCheckoutOffer {
  course: Course;
  price: Money;
  offerName: string;
  pricingTierSlug: string | null;
}

export interface CheckoutOfferDeps {
  courseRepo: CourseRepository;
  pricingTierRepo: IPricingTierRepository;
}

export async function resolveCheckoutOffer(
  deps: CheckoutOfferDeps,
  input: CheckoutOfferInput,
): Promise<Result<ResolvedCheckoutOffer, CheckoutOfferError>> {
  let courseSlug = input.courseSlug?.trim() ?? "";
  let tierPrice: Money | null = null;
  let offerName: string | null = null;

  if (input.pricingTierSlug) {
    const tierResult = await deps.pricingTierRepo.findBySlug(input.pricingTierSlug);
    if (!tierResult.ok || !tierResult.value) {
      return Result.err({ kind: "pricing_tier_not_found" });
    }
    if (tierResult.value.status !== "ACTIVE") {
      return Result.err({ kind: "pricing_tier_unavailable" });
    }
    const linkResult = await deps.pricingTierRepo.findLinkedCourseSlug(tierResult.value.id);
    if (!linkResult.ok || !linkResult.value) {
      return Result.err({ kind: "pricing_tier_unavailable" });
    }
    courseSlug = linkResult.value;
    tierPrice = effectivePrice(tierResult.value);
    offerName = tierResult.value.name;
  }

  if (!courseSlug) return Result.err({ kind: "course_not_found" });
  const courseResult = await deps.courseRepo.findBySlug(courseSlug);
  if (!courseResult.ok) return Result.err({ kind: "course_not_found" });
  if (courseResult.value.status !== "PUBLISHED") {
    return Result.err({ kind: "course_not_published" });
  }

  return Result.ok({
    course: courseResult.value,
    price: tierPrice ?? courseResult.value.price,
    offerName: offerName ?? courseResult.value.title,
    pricingTierSlug: input.pricingTierSlug ?? null,
  });
}

export interface CheckoutSummary {
  courseSlug: string;
  courseTitle: string;
  offerName: string;
  amountMinor: number;
  currency: string;
  pricingTierSlug: string | null;
}

export class GetCheckoutSummary {
  constructor(private readonly deps: CheckoutOfferDeps) {}

  async execute(input: CheckoutOfferInput): Promise<Result<CheckoutSummary, CheckoutOfferError>> {
    const result = await resolveCheckoutOffer(this.deps, input);
    if (!result.ok) return result;
    return Result.ok({
      courseSlug: result.value.course.slug,
      courseTitle: result.value.course.title,
      offerName: result.value.offerName,
      amountMinor: result.value.price.minor,
      currency: result.value.price.currency,
      pricingTierSlug: result.value.pricingTierSlug,
    });
  }
}
