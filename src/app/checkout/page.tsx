import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import CheckoutForm from "./CheckoutForm";

interface Props {
  searchParams: Promise<{
    course?: string;
    courseSlug?: string;
    pricingTier?: string;
  }>;
}

export default async function CheckoutPage({ searchParams }: Props) {
  const params = await searchParams;
  if (params.course) {
    redirect(`/checkout?courseSlug=${encodeURIComponent(params.course)}`);
  }

  const courseSlug = params.courseSlug?.trim() || null;
  const pricingTierSlug = params.pricingTier?.trim() || null;
  if (!courseSlug && !pricingTierSlug) {
    return <CheckoutForm offer={null} summary={null} loadError="missing_offer" />;
  }

  const offer = pricingTierSlug ? { pricingTierSlug } : { courseSlug: courseSlug! };
  const result = await buildContainer().getCheckoutSummary.execute(offer);

  return (
    <CheckoutForm
      offer={offer}
      summary={result.ok ? result.value : null}
      loadError={result.ok ? null : result.error.kind}
    />
  );
}
