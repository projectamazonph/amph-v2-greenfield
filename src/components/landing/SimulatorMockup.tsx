/**
 * SimulatorMockup — inline SVG mockup of one simulator's UI.
 * Used on the landing page to give the audience a feel for what
 * the actual tool looks like. Static, no JS, no animations.
 *
 * Variants: campaign-builder | bid-elevator | str-triage |
 *           listing-audit | keyword-research
 *
 * Each mockup is a hand-drawn SVG that looks like the actual
 * page (table, sliders, badges). Rendered inline so the page
 * has zero image weight and works on any connection.
 */

import type { ReactElement } from "react";

export type SimulatorMockupVariant =
  | "campaign-builder"
  | "bid-elevator"
  | "str-triage"
  | "listing-audit"
  | "keyword-research";

interface SimulatorMockupProps {
  variant: SimulatorMockupVariant;
  label: string;
}

const FRAME = {
  fill: "#FFFFFF",
  stroke: "#E5E5E0",
};

const INK = {
  900: "#171717",
  700: "#404040",
  500: "#737373",
  300: "#D4D4D4",
};

const ACCENT = "#FF6B35";
const SUCCESS = "#0E7C3A";
const WARNING = "#B45309";
const DANGER = "#B91C1C";

/** Header bar with the simulator's name in the corner. */
function Frame({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}): ReactElement {
  return (
    <svg
      viewBox="0 0 360 220"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${title} simulator screenshot`}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <rect x="0" y="0" width="360" height="220" fill={FRAME.fill} stroke={FRAME.stroke} />
      {/* Top bar */}
      <rect x="0" y="0" width="360" height="28" fill="#F4F3EE" />
      <line x1="0" y1="28" x2="360" y2="28" stroke={FRAME.stroke} />
      <text x="12" y="18" fontFamily="JetBrains Mono, monospace" fontSize="10" fill={INK[700]}>
        {title}
      </text>
      <circle cx="340" cy="14" r="3" fill={INK[300]} />
      <circle cx="328" cy="14" r="3" fill={INK[300]} />
      <circle cx="316" cy="14" r="3" fill={INK[300]} />
      {children}
    </svg>
  );
}

function CampaignBuilderMockup(): ReactElement {
  return (
    <Frame title="Campaign Builder">
      {/* Form fields */}
      <text x="14" y="50" fontFamily="Space Grotesk" fontSize="9" fill={INK[500]}>
        Campaign name
      </text>
      <rect x="14" y="56" width="160" height="20" fill="#FFFFFF" stroke={FRAME.stroke} />
      <text x="20" y="70" fontFamily="Space Grotesk" fontSize="9" fill={INK[900]}>
        SP — Running Shoes
      </text>
      <text x="14" y="92" fontFamily="Space Grotesk" fontSize="9" fill={INK[500]}>
        Daily budget
      </text>
      <rect x="14" y="98" width="80" height="20" fill="#FFFFFF" stroke={FRAME.stroke} />
      <text x="20" y="112" fontFamily="JetBrains Mono" fontSize="9" fill={INK[900]}>
        ₱1,500
      </text>
      <text x="106" y="92" fontFamily="Space Grotesk" fontSize="9" fill={INK[500]}>
        Bid
      </text>
      <rect x="106" y="98" width="80" height="20" fill="#FFFFFF" stroke={FRAME.stroke} />
      <text x="112" y="112" fontFamily="JetBrains Mono" fontSize="9" fill={INK[900]}>
        ₱0.85
      </text>
      {/* Ad group table */}
      <text x="14" y="140" fontFamily="Space Grotesk" fontSize="9" fill={INK[500]} fontWeight="600">
        AD GROUPS
      </text>
      <line x1="14" y1="146" x2="346" y2="146" stroke={FRAME.stroke} />
      <text x="14" y="160" fontFamily="Space Grotesk" fontSize="9" fill={INK[900]}>
        Brand defense
      </text>
      <text x="120" y="160" fontFamily="JetBrains Mono" fontSize="9" fill={INK[500]}>
        12 kw
      </text>
      <text x="180" y="160" fontFamily="JetBrains Mono" fontSize="9" fill={INK[500]}>
        ₱0.95
      </text>
      <rect x="280" y="152" width="60" height="14" fill="#DCFCE7" />
      <text x="287" y="162" fontFamily="Space Grotesk" fontSize="8" fill={SUCCESS} fontWeight="600">
        HEALTHY
      </text>
      <line x1="14" y1="172" x2="346" y2="172" stroke={FRAME.stroke} />
      <text x="14" y="186" fontFamily="Space Grotesk" fontSize="9" fill={INK[900]}>
        Category
      </text>
      <text x="120" y="186" fontFamily="JetBrains Mono" fontSize="9" fill={INK[500]}>
        24 kw
      </text>
      <text x="180" y="186" fontFamily="JetBrains Mono" fontSize="9" fill={INK[500]}>
        ₱0.70
      </text>
      <rect x="280" y="178" width="60" height="14" fill="#FEF3C7" />
      <text x="287" y="188" fontFamily="Space Grotesk" fontSize="8" fill={WARNING} fontWeight="600">
        REVIEW
      </text>
      <line x1="14" y1="198" x2="346" y2="198" stroke={FRAME.stroke} />
      <text x="14" y="212" fontFamily="Space Grotesk" fontSize="9" fill={INK[900]}>
        Competitor
      </text>
      <text x="120" y="212" fontFamily="JetBrains Mono" fontSize="9" fill={INK[500]}>
        8 kw
      </text>
      <text x="180" y="212" fontFamily="JetBrains Mono" fontSize="9" fill={INK[500]}>
        ₱1.10
      </text>
      <rect x="280" y="204" width="60" height="14" fill="#FEE2E2" />
      <text x="287" y="214" fontFamily="Space Grotesk" fontSize="8" fill={DANGER} fontWeight="600">
        OVERBID
      </text>
    </Frame>
  );
}

function BidElevatorMockup(): ReactElement {
  return (
    <Frame title="Bid Elevator">
      {/* Slider */}
      <text x="14" y="50" fontFamily="Space Grotesk" fontSize="9" fill={INK[500]}>
        Target ACoS
      </text>
      <text x="330" y="50" fontFamily="JetBrains Mono" fontSize="9" fill={INK[900]} textAnchor="end">
        25%
      </text>
      <line x1="14" y1="68" x2="346" y2="68" stroke={INK[300]} />
      <circle cx="100" cy="68" r="5" fill={ACCENT} />
      <text x="14" y="86" fontFamily="Space Grotesk" fontSize="8" fill={INK[500]}>
        Lower
      </text>
      <text x="332" y="86" fontFamily="Space Grotesk" fontSize="8" fill={INK[500]} textAnchor="end">
        Higher
      </text>
      {/* Outcome panel */}
      <rect x="14" y="100" width="332" height="48" fill="#F4F3EE" />
      <text x="22" y="116" fontFamily="Space Grotesk" fontSize="9" fill={INK[500]}>
        Projected ACoS
      </text>
      <text x="22" y="138" fontFamily="JetBrains Mono" fontSize="16" fill={INK[900]} fontWeight="600">
        24.3%
      </text>
      <text x="180" y="116" fontFamily="Space Grotesk" fontSize="9" fill={INK[500]}>
        Daily spend
      </text>
      <text x="180" y="138" fontFamily="JetBrains Mono" fontSize="16" fill={INK[900]} fontWeight="600">
        ₱1,420
      </text>
      <text x="280" y="116" fontFamily="Space Grotesk" fontSize="9" fill={INK[500]}>
        Sales/day
      </text>
      <text x="280" y="138" fontFamily="JetBrains Mono" fontSize="16" fill={INK[900]} fontWeight="600">
        ₱5,840
      </text>
      {/* CTA */}
      <rect x="14" y="162" width="332" height="32" fill={ACCENT} />
      <text x="180" y="183" fontFamily="Space Grotesk" fontSize="11" fill="#FFFFFF" textAnchor="middle" fontWeight="600">
        Apply bid change
      </text>
      <text x="14" y="210" fontFamily="Space Grotesk" fontSize="8" fill={INK[500]}>
        Recommendation: lower 3 keywords by ₱0.10
      </text>
    </Frame>
  );
}

function StrTriageMockup(): ReactElement {
  const rows = [
    { kw: "nike running shoes", clicks: "184", acos: "12%", state: "EXACT", color: SUCCESS },
    { kw: "cheap sneakers", clicks: "92", acos: "47%", state: "NEGATE", color: DANGER },
    { kw: "athletic shoes men", clicks: "61", acos: "31%", state: "EXACT", color: SUCCESS },
    { kw: "best jogging shoes", clicks: "44", acos: "28%", state: "REVIEW", color: WARNING },
  ];
  return (
    <Frame title="STR Triage">
      <text x="14" y="50" fontFamily="Space Grotesk" fontSize="9" fill={INK[500]} fontWeight="600">
        SEARCH TERM REPORT
      </text>
      <line x1="14" y1="56" x2="346" y2="56" stroke={FRAME.stroke} />
      {rows.map((r, i) => {
        const y = 70 + i * 32;
        return (
          <g key={r.kw}>
            <text x="14" y={y} fontFamily="Space Grotesk" fontSize="9" fill={INK[900]}>
              {r.kw}
            </text>
            <text x="180" y={y} fontFamily="JetBrains Mono" fontSize="9" fill={INK[500]}>
              {r.clicks}
            </text>
            <text x="230" y={y} fontFamily="JetBrains Mono" fontSize="9" fill={INK[900]}>
              {r.acos}
            </text>
            <rect x="270" y={y - 9} width="68" height="14" fill={`${r.color}22`} />
            <text x="277" y={y + 1} fontFamily="Space Grotesk" fontSize="8" fill={r.color} fontWeight="600">
              {r.state}
            </text>
            <line x1="14" y1={y + 8} x2="346" y2={y + 8} stroke={FRAME.stroke} />
          </g>
        );
      })}
      <text x="14" y="208" fontFamily="Space Grotesk" fontSize="8" fill={INK[500]}>
        4 of 28 search terms shown
      </text>
    </Frame>
  );
}

function ListingAuditMockup(): ReactElement {
  const items = [
    { label: "Title", score: 8, max: 10, color: SUCCESS },
    { label: "Bullet points", score: 6, max: 10, color: WARNING },
    { label: "Backend keywords", score: 3, max: 10, color: DANGER },
    { label: "Images (≥7)", score: 7, max: 10, color: WARNING },
    { label: "A+ content", score: 10, max: 10, color: SUCCESS },
  ];
  return (
    <Frame title="Listing Audit">
      <text x="14" y="50" fontFamily="Space Grotesk" fontSize="9" fill={INK[500]}>
        OVERALL
      </text>
      <text x="14" y="76" fontFamily="JetBrains Mono" fontSize="22" fill={INK[900]} fontWeight="600">
        68/100
      </text>
      <rect x="14" y="86" width="332" height="4" fill={INK[300]} />
      <rect x="14" y="86" width="225" height="4" fill={ACCENT} />
      {items.map((it, i) => {
        const y = 110 + i * 18;
        const w = (it.score / it.max) * 200;
        return (
          <g key={it.label}>
            <text x="14" y={y} fontFamily="Space Grotesk" fontSize="8" fill={INK[700]}>
              {it.label}
            </text>
            <rect x="120" y={y - 7} width="200" height="6" fill={INK[300]} />
            <rect x="120" y={y - 7} width={w} height="6" fill={it.color} />
            <text x="334" y={y} fontFamily="JetBrains Mono" fontSize="8" fill={INK[900]} textAnchor="end">
              {it.score}/{it.max}
            </text>
          </g>
        );
      })}
    </Frame>
  );
}

function KeywordResearchMockup(): ReactElement {
  const seed = "running shoes";
  const expanded = [
    { kw: "running shoes for men", vol: "48k", cpc: "₱8.40" },
    { kw: "lightweight running shoes", vol: "12k", cpc: "₱6.20" },
    { kw: "running shoes wide feet", vol: "8k", cpc: "₱5.10" },
    { kw: "trail running shoes", vol: "22k", cpc: "₱7.80" },
  ];
  return (
    <Frame title="Keyword Research">
      <text x="14" y="50" fontFamily="Space Grotesk" fontSize="9" fill={INK[500]}>
        Seed
      </text>
      <rect x="14" y="56" width="120" height="20" fill="#FFFFFF" stroke={FRAME.stroke} />
      <text x="20" y="70" fontFamily="Space Grotesk" fontSize="9" fill={INK[900]}>
        {seed}
      </text>
      <rect x="140" y="56" width="60" height="20" fill={ACCENT} />
      <text x="170" y="70" fontFamily="Space Grotesk" fontSize="9" fill="#FFFFFF" textAnchor="middle" fontWeight="600">
        Expand
      </text>
      <text x="14" y="98" fontFamily="Space Grotesk" fontSize="9" fill={INK[500]} fontWeight="600">
        EXPANDED TERMS
      </text>
      <line x1="14" y1="104" x2="346" y2="104" stroke={FRAME.stroke} />
      {expanded.map((r, i) => {
        const y = 120 + i * 22;
        return (
          <g key={r.kw}>
            <text x="14" y={y} fontFamily="Space Grotesk" fontSize="9" fill={INK[900]}>
              {r.kw}
            </text>
            <text x="240" y={y} fontFamily="JetBrains Mono" fontSize="9" fill={INK[700]}>
              {r.vol}
            </text>
            <text x="296" y={y} fontFamily="JetBrains Mono" fontSize="9" fill={INK[700]}>
              {r.cpc}
            </text>
            <line x1="14" y1={y + 6} x2="346" y2={y + 6} stroke={FRAME.stroke} />
          </g>
        );
      })}
    </Frame>
  );
}

export function SimulatorMockup({
  variant,
  label,
}: SimulatorMockupProps): ReactElement {
  const mockup = (() => {
    switch (variant) {
      case "campaign-builder":
        return <CampaignBuilderMockup />;
      case "bid-elevator":
        return <BidElevatorMockup />;
      case "str-triage":
        return <StrTriageMockup />;
      case "listing-audit":
        return <ListingAuditMockup />;
      case "keyword-research":
        return <KeywordResearchMockup />;
    }
  })();
  return <>{mockup}</>;
}
