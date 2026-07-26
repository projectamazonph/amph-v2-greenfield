/**
 * Landing page: server component (per PRODUCT.md, the one documented
 * brand-register exception on this site). Only the top bar and the Bid
 * Elevator preview widget need client JS; every other section renders on
 * the server.
 */

import { PageTexture } from "@/components/landing/PageTexture";
import shared from "@/components/landing/shared.module.css";
import { TopBar } from "@/components/landing/TopBar";
import { Ticker } from "@/components/landing/Ticker";
import { Hero } from "@/components/landing/Hero";
import { StatsStrip } from "@/components/landing/StatsStrip";
import { Method } from "@/components/landing/Method";
import { SimulatorSection } from "@/components/landing/SimulatorSection";
import { Curriculum } from "@/components/landing/Curriculum";
import { WhoFor } from "@/components/landing/WhoFor";
import { Pricing } from "@/components/landing/Pricing";
import { Mentor } from "@/components/landing/Mentor";
import { Proof } from "@/components/landing/Proof";
import { FAQSection } from "@/components/landing/FAQSection";
import { DarkCTA } from "@/components/landing/DarkCTA";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <>
      <PageTexture />
      <div className={shared.contentLayer}>
        <TopBar />
        <Ticker />
        <main>
          <Hero />
          <StatsStrip />
          <Method />
          <SimulatorSection />
          <Curriculum />
          <WhoFor />
          <Pricing />
          <Mentor />
          <Proof />
          <FAQSection />
          <DarkCTA />
        </main>
        <Footer />
      </div>
    </>
  );
}
