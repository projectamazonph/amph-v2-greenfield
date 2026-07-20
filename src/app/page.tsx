/**
 * Landing page — server component.
 * Renders all sections in order. No client JS for static content.
 * The FAQ uses native <details>/<summary>, so even that is server-rendered.
 */

import { Hero } from "@/components/landing/Hero";
import { Numbers } from "@/components/landing/Numbers";
import { Audience } from "@/components/landing/Audience";
import { Practice } from "@/components/landing/Practice";
import { Curriculum } from "@/components/landing/Curriculum";
import { Pricing } from "@/components/landing/Pricing";
import { FAQSection } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Numbers />
      <Audience />
      <Practice />
      <Curriculum />
      <Pricing />
      <FAQSection />
      <FinalCTA />
    </main>
  );
}
