import { describe, expect, it } from "vitest";
import { createCourse } from "@/domain/entities/Course";
import { createPricingTier } from "@/domain/entities/PricingTier";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryPricingTierRepository } from "@/infra/repositories/InMemoryPricingTierRepository";
import { GetCheckoutSummary } from "@/usecases/GetCheckoutSummary";

function seedCourse(repo: InMemoryCourseRepository) {
  const course = createCourse({
    id: "course-1",
    slug: "ppc-mastery",
    title: "Accelerated Mastery",
    tagline: "Build PPC confidence",
    description: "A complete course",
    priceMinor: 599900,
    curriculum: {
      sections: [
        {
          id: "module-1",
          title: "Start",
          lessons: [{ id: "lesson-1", title: "Welcome", type: "TEXT", content: {} }],
        },
      ],
    },
    status: "PUBLISHED",
  });
  if (!course.ok) throw new Error("course seed failed");
  repo.seed([course.value]);
}

describe("GetCheckoutSummary", () => {
  it("returns the exact effective tier price and linked course", async () => {
    const courseRepo = new InMemoryCourseRepository();
    const pricingTierRepo = new InMemoryPricingTierRepository();
    seedCourse(courseRepo);
    const tier = createPricingTier({
      id: "tier-mastery",
      slug: "mastery",
      name: "Accelerated Mastery",
      priceMinor: 599900,
      earlyBirdPriceMinor: 499900,
      earlyBirdEndsAt: new Date(Date.now() + 60_000),
      status: "ACTIVE",
    });
    if (!tier.ok) throw new Error("tier seed failed");
    pricingTierRepo.seed(tier.value);
    pricingTierRepo.seedCourseLink(tier.value.id, "ppc-mastery");

    const result = await new GetCheckoutSummary({ courseRepo, pricingTierRepo }).execute({
      pricingTierSlug: "mastery",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        courseSlug: "ppc-mastery",
        courseTitle: "Accelerated Mastery",
        offerName: "Accelerated Mastery",
        amountMinor: 499900,
        currency: "PHP",
        pricingTierSlug: "mastery",
      },
    });
  });

  it("returns the course price for direct course checkout", async () => {
    const courseRepo = new InMemoryCourseRepository();
    const pricingTierRepo = new InMemoryPricingTierRepository();
    seedCourse(courseRepo);

    const result = await new GetCheckoutSummary({ courseRepo, pricingTierRepo }).execute({
      courseSlug: "ppc-mastery",
    });

    expect(result.ok && result.value.amountMinor).toBe(599900);
  });

  it("does not expose an unlinked tier for checkout", async () => {
    const courseRepo = new InMemoryCourseRepository();
    const pricingTierRepo = new InMemoryPricingTierRepository();
    const tier = createPricingTier({
      id: "all-access",
      slug: "all-access",
      name: "All Access",
      priceMinor: 1499900,
      status: "ACTIVE",
    });
    if (!tier.ok) throw new Error("tier seed failed");
    pricingTierRepo.seed(tier.value);

    const result = await new GetCheckoutSummary({ courseRepo, pricingTierRepo }).execute({
      pricingTierSlug: "all-access",
    });

    expect(result).toEqual({ ok: false, error: { kind: "pricing_tier_unavailable" } });
  });
});
