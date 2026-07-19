/**
 * Landing page — server component.
 * Renders all 8 sections in order. No client JS for static content.
 * The FAQ uses native <details>/<summary>, so even that is server-rendered.
 */

import { Hero } from "@/components/landing/Hero";
import { Numbers } from "@/components/landing/Numbers";
import { Audience } from "@/components/landing/Audience";
import { Pricing } from "@/components/landing/Pricing";
import { Simulators } from "@/components/landing/Simulators";
import { Curriculum } from "@/components/landing/Curriculum";
import { FAQSection } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Numbers />
      <Audience />
      <Simulators />
      <Curriculum />
      <Pricing />
      <FAQSection />
      <FinalCTA />
    </main>
  );
}
