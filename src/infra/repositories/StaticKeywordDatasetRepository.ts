/**
 * StaticKeywordDatasetRepository — in-code KeywordDatasetRepository adapter.
 *
 * STORY-081. Ships 4 starter niches across 4 category archetypes
 * (general_home, beauty, electronics, apparel), each hand-authored at
 * ~18 keywords. This is a deliberate scope-down from the story's launch
 * target of 12 curated niches at 150-250 keywords each (1,800-3,000 rows) —
 * see docs/stories/STORY-081.md "Suggested split", STORY-081b. All four
 * starter datasets are honestly labeled `sourceType: "synthetic_calibrated"`:
 * none of them come from a real seller-export (Helium 10, Data Dive, Brand
 * Analytics, Search Query Performance), so none may claim `curated_export`.
 * The bid/volume/competition numbers are illustrative placeholders, not
 * calibrated against a real market distribution — that calibration work
 * is also follow-up content work, not invented here.
 *
 * Any niche outside the 4 starters resolves to a deterministic synthetic
 * fallback dataset, seeded from the niche string so the same niche always
 * produces the same rows (no wall-clock or crypto randomness). This is a
 * plain in-code repository, not Prisma-backed — there is no admin CRUD or
 * DB table for keyword datasets yet. That persistence/authoring-tooling
 * work is also follow-up (STORY-081b/c content tooling).
 */

import { Result } from "@/domain/shared/Result";
import type {
  KeywordDataset,
  KeywordDatasetKeyword,
  KeywordBrandClass,
  KeywordIntent,
} from "@/domain/entities/KeywordDataset";
import type {
  KeywordDatasetRepository,
  KeywordDatasetRepositoryError,
} from "@/ports/repositories/KeywordDatasetRepository";

// ── Row builder ──────────────────────────────────────────────────────────

function row(
  term: string,
  intent: KeywordIntent,
  params: {
    volume: number;
    competition: number;
    bidMedian: number;
    relevance: number;
    seasonality?: number;
    confidence?: number;
  },
): KeywordDatasetKeyword {
  const brandClass: KeywordBrandClass =
    intent === "competitor" ? "competitorBrand" : intent === "ownBrand" ? "ownBrand" : "generic";
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    term,
    normalizedTerm: term,
    monthlySearchVolume: params.volume,
    competitionIndex: params.competition,
    suggestedBidLow: round2(params.bidMedian * 0.7),
    suggestedBidMedian: params.bidMedian,
    suggestedBidHigh: round2(params.bidMedian * 1.4),
    relevanceScore: params.relevance,
    intent,
    brandClass,
    seasonalityIndex: params.seasonality ?? 1.0,
    sourceConfidence: params.confidence ?? 0.75,
  };
}

// ── Starter datasets (4 niches x ~18 keywords) ──────────────────────────

const BAMBOO_CUTTING_BOARD: KeywordDataset = {
  datasetId: "kwds-bamboo-cutting-board",
  version: "2026-07-29-v1",
  marketplace: "US",
  currencyCode: "USD",
  categoryId: "general_home",
  nicheId: "bamboo-cutting-board",
  sourceType: "synthetic_calibrated",
  generatedAt: "2026-07-29T00:00:00.000Z",
  keywords: [
    row("bamboo cutting board", "core", {
      volume: 8500,
      competition: 0.74,
      bidMedian: 0.85,
      relevance: 1.0,
    }),
    row("cutting board", "core", {
      volume: 22000,
      competition: 0.88,
      bidMedian: 0.95,
      relevance: 0.7,
    }),
    row("wood cutting board", "core", {
      volume: 6800,
      competition: 0.7,
      bidMedian: 0.8,
      relevance: 0.85,
    }),
    row("bamboo chopping board", "core", {
      volume: 2200,
      competition: 0.55,
      bidMedian: 0.6,
      relevance: 0.95,
    }),
    row("kitchen cutting board", "core", {
      volume: 5400,
      competition: 0.65,
      bidMedian: 0.7,
      relevance: 0.8,
    }),
    row("bamboo cutting board with juice groove", "feature", {
      volume: 1800,
      competition: 0.5,
      bidMedian: 0.55,
      relevance: 0.9,
    }),
    row("extra large bamboo cutting board", "feature", {
      volume: 1200,
      competition: 0.45,
      bidMedian: 0.5,
      relevance: 0.9,
    }),
    row("bamboo cutting board with handle", "feature", {
      volume: 900,
      competition: 0.4,
      bidMedian: 0.45,
      relevance: 0.88,
    }),
    row("cutting board that doesn't dull knives", "problem", {
      volume: 700,
      competition: 0.35,
      bidMedian: 0.4,
      relevance: 0.75,
      confidence: 0.6,
    }),
    row("cutting board that doesn't warp", "problem", {
      volume: 500,
      competition: 0.3,
      bidMedian: 0.35,
      relevance: 0.75,
      confidence: 0.6,
    }),
    row("cutting board for meal prep", "useCase", {
      volume: 1100,
      competition: 0.4,
      bidMedian: 0.45,
      relevance: 0.8,
    }),
    row("cutting board gift set", "useCase", {
      volume: 600,
      competition: 0.35,
      bidMedian: 0.4,
      relevance: 0.7,
      seasonality: 1.6,
    }),
    row("cutting board alternative to top rated brand", "competitor", {
      volume: 400,
      competition: 0.6,
      bidMedian: 0.75,
      relevance: 0.65,
      confidence: 0.55,
    }),
    row("premium cutting board brand comparison", "competitor", {
      volume: 250,
      competition: 0.55,
      bidMedian: 0.7,
      relevance: 0.6,
      confidence: 0.5,
    }),
    row("amph kitchen bamboo board", "ownBrand", {
      volume: 50,
      competition: 0.1,
      bidMedian: 0.3,
      relevance: 1.0,
      confidence: 0.9,
    }),
    row("plastic cutting board", "irrelevant", {
      volume: 4200,
      competition: 0.6,
      bidMedian: 0.5,
      relevance: 0.1,
    }),
    row("acrylic cutting board", "irrelevant", {
      volume: 900,
      competition: 0.4,
      bidMedian: 0.4,
      relevance: 0.1,
    }),
    row("glass cutting board", "irrelevant", {
      volume: 1500,
      competition: 0.45,
      bidMedian: 0.45,
      relevance: 0.1,
    }),
  ],
};

const VITAMIN_C_SERUM: KeywordDataset = {
  datasetId: "kwds-vitamin-c-serum",
  version: "2026-07-29-v1",
  marketplace: "US",
  currencyCode: "USD",
  categoryId: "beauty",
  nicheId: "vitamin-c-serum",
  sourceType: "synthetic_calibrated",
  generatedAt: "2026-07-29T00:00:00.000Z",
  keywords: [
    row("vitamin c serum", "core", {
      volume: 33000,
      competition: 0.9,
      bidMedian: 1.1,
      relevance: 1.0,
    }),
    row("vitamin c serum for face", "core", {
      volume: 9000,
      competition: 0.8,
      bidMedian: 1.0,
      relevance: 0.95,
    }),
    row("brightening serum", "core", {
      volume: 7200,
      competition: 0.75,
      bidMedian: 0.9,
      relevance: 0.7,
    }),
    row("vitamin c face serum", "core", {
      volume: 5100,
      competition: 0.72,
      bidMedian: 0.9,
      relevance: 0.95,
    }),
    row("antioxidant serum", "core", {
      volume: 2400,
      competition: 0.6,
      bidMedian: 0.7,
      relevance: 0.65,
    }),
    row("vitamin c serum with hyaluronic acid", "feature", {
      volume: 2800,
      competition: 0.65,
      bidMedian: 0.85,
      relevance: 0.9,
    }),
    row("vitamin c serum with vitamin e", "feature", {
      volume: 1400,
      competition: 0.55,
      bidMedian: 0.75,
      relevance: 0.88,
    }),
    row("20 percent vitamin c serum", "feature", {
      volume: 1900,
      competition: 0.6,
      bidMedian: 0.8,
      relevance: 0.85,
    }),
    row("serum for dark spots", "problem", {
      volume: 3600,
      competition: 0.68,
      bidMedian: 0.85,
      relevance: 0.7,
      confidence: 0.6,
    }),
    row("serum for dull skin", "problem", {
      volume: 1200,
      competition: 0.5,
      bidMedian: 0.6,
      relevance: 0.65,
      confidence: 0.6,
    }),
    row("vitamin c serum for morning routine", "useCase", {
      volume: 800,
      competition: 0.4,
      bidMedian: 0.55,
      relevance: 0.75,
    }),
    row("vitamin c serum gift set", "useCase", {
      volume: 500,
      competition: 0.35,
      bidMedian: 0.45,
      relevance: 0.6,
      seasonality: 1.7,
    }),
    row("vitamin c serum like top rated brand", "competitor", {
      volume: 900,
      competition: 0.7,
      bidMedian: 0.95,
      relevance: 0.6,
      confidence: 0.55,
    }),
    row("affordable vitamin c serum alternative", "competitor", {
      volume: 600,
      competition: 0.6,
      bidMedian: 0.8,
      relevance: 0.6,
      confidence: 0.55,
    }),
    row("amph skincare vitamin c serum", "ownBrand", {
      volume: 40,
      competition: 0.1,
      bidMedian: 0.35,
      relevance: 1.0,
      confidence: 0.9,
    }),
    row("vitamin c supplement tablets", "irrelevant", {
      volume: 8800,
      competition: 0.55,
      bidMedian: 0.4,
      relevance: 0.05,
    }),
    row("vitamin c powder", "irrelevant", {
      volume: 3300,
      competition: 0.5,
      bidMedian: 0.4,
      relevance: 0.05,
    }),
    row("retinol serum", "irrelevant", {
      volume: 6600,
      competition: 0.7,
      bidMedian: 0.85,
      relevance: 0.15,
    }),
  ],
};

const WIRELESS_EARBUDS_CASE: KeywordDataset = {
  datasetId: "kwds-wireless-earbuds-case",
  version: "2026-07-29-v1",
  marketplace: "US",
  currencyCode: "USD",
  categoryId: "electronics",
  nicheId: "wireless-earbuds-case",
  sourceType: "synthetic_calibrated",
  generatedAt: "2026-07-29T00:00:00.000Z",
  keywords: [
    row("wireless earbuds case", "core", {
      volume: 9800,
      competition: 0.78,
      bidMedian: 0.65,
      relevance: 1.0,
    }),
    row("earbud charging case", "core", {
      volume: 4200,
      competition: 0.68,
      bidMedian: 0.55,
      relevance: 0.9,
    }),
    row("bluetooth earbuds case", "core", {
      volume: 3100,
      competition: 0.65,
      bidMedian: 0.55,
      relevance: 0.85,
    }),
    row("earbuds case cover", "core", {
      volume: 5600,
      competition: 0.7,
      bidMedian: 0.5,
      relevance: 0.8,
    }),
    row("silicone earbuds case", "core", {
      volume: 2600,
      competition: 0.6,
      bidMedian: 0.45,
      relevance: 0.85,
    }),
    row("wireless earbuds case with carabiner", "feature", {
      volume: 900,
      competition: 0.4,
      bidMedian: 0.4,
      relevance: 0.85,
    }),
    row("shockproof earbuds case", "feature", {
      volume: 1300,
      competition: 0.5,
      bidMedian: 0.45,
      relevance: 0.85,
    }),
    row("earbuds case with keychain", "feature", {
      volume: 700,
      competition: 0.35,
      bidMedian: 0.35,
      relevance: 0.8,
    }),
    row("earbuds case that doesn't scratch", "problem", {
      volume: 400,
      competition: 0.3,
      bidMedian: 0.3,
      relevance: 0.7,
      confidence: 0.55,
    }),
    row("earbuds case that blocks dust", "problem", {
      volume: 350,
      competition: 0.28,
      bidMedian: 0.3,
      relevance: 0.7,
      confidence: 0.55,
    }),
    row("earbuds case for gym", "useCase", {
      volume: 600,
      competition: 0.35,
      bidMedian: 0.35,
      relevance: 0.75,
    }),
    row("earbuds case for travel", "useCase", {
      volume: 550,
      competition: 0.35,
      bidMedian: 0.35,
      relevance: 0.75,
    }),
    row("earbuds case like leading brand", "competitor", {
      volume: 800,
      competition: 0.6,
      bidMedian: 0.55,
      relevance: 0.6,
      confidence: 0.5,
    }),
    row("earbuds case alternative to premium brand", "competitor", {
      volume: 500,
      competition: 0.55,
      bidMedian: 0.5,
      relevance: 0.6,
      confidence: 0.5,
    }),
    row("amph audio earbuds case", "ownBrand", {
      volume: 30,
      competition: 0.1,
      bidMedian: 0.25,
      relevance: 1.0,
      confidence: 0.9,
    }),
    row("wireless earbuds charger cable", "irrelevant", {
      volume: 2100,
      competition: 0.5,
      bidMedian: 0.4,
      relevance: 0.15,
    }),
    row("phone case", "irrelevant", {
      volume: 40000,
      competition: 0.85,
      bidMedian: 0.6,
      relevance: 0.02,
    }),
    row("earbuds cleaning kit", "irrelevant", {
      volume: 1600,
      competition: 0.45,
      bidMedian: 0.35,
      relevance: 0.2,
    }),
  ],
};

const RUNNING_HOODIE: KeywordDataset = {
  datasetId: "kwds-running-hoodie",
  version: "2026-07-29-v1",
  marketplace: "US",
  currencyCode: "USD",
  categoryId: "apparel",
  nicheId: "running-hoodie",
  sourceType: "synthetic_calibrated",
  generatedAt: "2026-07-29T00:00:00.000Z",
  keywords: [
    row("running hoodie", "core", {
      volume: 7400,
      competition: 0.7,
      bidMedian: 0.6,
      relevance: 1.0,
    }),
    row("men's running hoodie", "core", {
      volume: 4100,
      competition: 0.65,
      bidMedian: 0.55,
      relevance: 0.9,
    }),
    row("women's running hoodie", "core", {
      volume: 3800,
      competition: 0.65,
      bidMedian: 0.55,
      relevance: 0.9,
    }),
    row("lightweight running hoodie", "core", {
      volume: 2200,
      competition: 0.55,
      bidMedian: 0.5,
      relevance: 0.9,
    }),
    row("athletic hoodie", "core", {
      volume: 5200,
      competition: 0.6,
      bidMedian: 0.5,
      relevance: 0.7,
    }),
    row("running hoodie with thumbholes", "feature", {
      volume: 700,
      competition: 0.35,
      bidMedian: 0.35,
      relevance: 0.85,
    }),
    row("moisture wicking running hoodie", "feature", {
      volume: 1100,
      competition: 0.45,
      bidMedian: 0.45,
      relevance: 0.88,
    }),
    row("running hoodie with zip pocket", "feature", {
      volume: 600,
      competition: 0.35,
      bidMedian: 0.35,
      relevance: 0.85,
    }),
    row("hoodie that doesn't overheat", "problem", {
      volume: 350,
      competition: 0.25,
      bidMedian: 0.3,
      relevance: 0.7,
      confidence: 0.55,
    }),
    row("hoodie that doesn't chafe", "problem", {
      volume: 250,
      competition: 0.2,
      bidMedian: 0.25,
      relevance: 0.65,
      confidence: 0.5,
    }),
    row("running hoodie for cold weather", "useCase", {
      volume: 900,
      competition: 0.4,
      bidMedian: 0.4,
      relevance: 0.8,
      seasonality: 1.4,
    }),
    row("running hoodie for gym", "useCase", {
      volume: 800,
      competition: 0.4,
      bidMedian: 0.4,
      relevance: 0.78,
    }),
    row("running hoodie like top athletic brand", "competitor", {
      volume: 950,
      competition: 0.65,
      bidMedian: 0.6,
      relevance: 0.6,
      confidence: 0.5,
    }),
    row("affordable running hoodie alternative", "competitor", {
      volume: 500,
      competition: 0.55,
      bidMedian: 0.5,
      relevance: 0.6,
      confidence: 0.5,
    }),
    row("amph active running hoodie", "ownBrand", {
      volume: 25,
      competition: 0.1,
      bidMedian: 0.25,
      relevance: 1.0,
      confidence: 0.9,
    }),
    row("running shoes", "irrelevant", {
      volume: 60000,
      competition: 0.9,
      bidMedian: 0.7,
      relevance: 0.03,
    }),
    row("hoodie for casual wear", "irrelevant", {
      volume: 8200,
      competition: 0.6,
      bidMedian: 0.45,
      relevance: 0.2,
    }),
    row("sweatpants", "irrelevant", {
      volume: 22000,
      competition: 0.75,
      bidMedian: 0.5,
      relevance: 0.05,
    }),
  ],
};

const STARTER_DATASETS: Readonly<Record<string, KeywordDataset>> = {
  "bamboo-cutting-board": BAMBOO_CUTTING_BOARD,
  "vitamin-c-serum": VITAMIN_C_SERUM,
  "wireless-earbuds-case": WIRELESS_EARBUDS_CASE,
  "running-hoodie": RUNNING_HOODIE,
};

// ── Synthetic fallback for any other niche ──────────────────────────────

function normalizeNicheId(nicheId: string): string {
  return nicheId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function guessCategoryId(normalizedNiche: string): string {
  if (/beauty|cosmetic|skincare|makeup|serum|lotion/.test(normalizedNiche)) return "beauty";
  if (/food|supplement|vitamin|nutrition|grocery|snack/.test(normalizedNiche))
    return "food_supplements";
  if (/electronic|gadget|device|charger|cable|earbud|headphone|speaker/.test(normalizedNiche))
    return "electronics";
  if (/apparel|clothing|shoe|shirt|dress|jacket|jean|hoodie/.test(normalizedNiche))
    return "apparel";
  return "general_home";
}

/** Deterministic string hash -> 32-bit seed (no wall-clock/crypto randomness). */
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 PRNG, seeded — deterministic for a given seed. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface FallbackTemplate {
  readonly suffix: string;
  readonly intent: KeywordIntent;
  readonly volumeRange: readonly [number, number];
  readonly competitionRange: readonly [number, number];
  readonly relevance: number;
}

const FALLBACK_TEMPLATES: readonly FallbackTemplate[] = [
  {
    suffix: "{niche}",
    intent: "core",
    volumeRange: [3000, 12000],
    competitionRange: [0.6, 0.85],
    relevance: 1.0,
  },
  {
    suffix: "best {niche}",
    intent: "core",
    volumeRange: [1500, 6000],
    competitionRange: [0.5, 0.8],
    relevance: 0.9,
  },
  {
    suffix: "{niche} set",
    intent: "feature",
    volumeRange: [400, 2000],
    competitionRange: [0.35, 0.6],
    relevance: 0.85,
  },
  {
    suffix: "premium {niche}",
    intent: "feature",
    volumeRange: [300, 1500],
    competitionRange: [0.3, 0.55],
    relevance: 0.85,
  },
  {
    suffix: "{niche} that lasts",
    intent: "problem",
    volumeRange: [200, 900],
    competitionRange: [0.2, 0.4],
    relevance: 0.7,
  },
  {
    suffix: "{niche} for gift",
    intent: "useCase",
    volumeRange: [200, 800],
    competitionRange: [0.2, 0.4],
    relevance: 0.7,
  },
  {
    suffix: "{niche} alternative to leading brand",
    intent: "competitor",
    volumeRange: [150, 700],
    competitionRange: [0.45, 0.7],
    relevance: 0.6,
  },
  {
    suffix: "amph {niche}",
    intent: "ownBrand",
    volumeRange: [10, 60],
    competitionRange: [0.05, 0.15],
    relevance: 1.0,
  },
  {
    suffix: "{niche} accessories",
    intent: "irrelevant",
    volumeRange: [500, 3000],
    competitionRange: [0.4, 0.6],
    relevance: 0.15,
  },
  {
    suffix: "{niche} replacement parts",
    intent: "irrelevant",
    volumeRange: [300, 1500],
    competitionRange: [0.3, 0.5],
    relevance: 0.15,
  },
];

function generateFallbackDataset(nicheId: string): KeywordDataset {
  const normalized = normalizeNicheId(nicheId);
  const nicheLabel = normalized.replace(/-/g, " ");
  const rand = mulberry32(hashSeed(normalized));

  const keywords = FALLBACK_TEMPLATES.map((tpl) => {
    const term = tpl.suffix.replace("{niche}", nicheLabel);
    const volume = Math.round(
      tpl.volumeRange[0] + rand() * (tpl.volumeRange[1] - tpl.volumeRange[0]),
    );
    const competition =
      Math.round(
        (tpl.competitionRange[0] + rand() * (tpl.competitionRange[1] - tpl.competitionRange[0])) *
          100,
      ) / 100;
    const bidMedian = Math.round((0.3 + competition * 0.8) * 100) / 100;
    return row(term, tpl.intent, {
      volume,
      competition,
      bidMedian,
      relevance: tpl.relevance,
      confidence: 0.4,
    });
  });

  return {
    datasetId: `kwds-synthetic-${normalized}`,
    version: "fallback-v1",
    marketplace: "US",
    currencyCode: "USD",
    categoryId: guessCategoryId(normalized),
    nicheId: normalized,
    sourceType: "synthetic_calibrated",
    generatedAt: "2026-07-29T00:00:00.000Z",
    keywords,
  };
}

// ── Repository ───────────────────────────────────────────────────────────

export class StaticKeywordDatasetRepository implements KeywordDatasetRepository {
  async findByNiche(
    nicheId: string,
  ): Promise<Result<KeywordDataset, KeywordDatasetRepositoryError>> {
    const normalized = normalizeNicheId(nicheId);
    if (normalized.length === 0) {
      return Result.err({ kind: "invalid_niche" });
    }

    const starter = STARTER_DATASETS[normalized];
    if (starter) {
      return Result.ok(starter);
    }

    return Result.ok(generateFallbackDataset(nicheId));
  }
}

/** Niche ids with a hand-authored starter dataset (for UI niche pickers). */
export const STARTER_NICHE_IDS: readonly string[] = Object.keys(STARTER_DATASETS);
