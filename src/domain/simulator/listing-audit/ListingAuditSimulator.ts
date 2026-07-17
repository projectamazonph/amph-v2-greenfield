/**
 * ListingAuditSimulator — audits Amazon listings and generates keyword research.
 *
 * STORY-040: Listing Audit + Keyword Research simulator.
 *
 * Runs two analyses:
 *  1. Listing audit — scores title/bullets/description, identifies gaps
 *  2. Keyword research — generates a prioritized keyword list from the niche
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import type { ListingAuditInput } from "./ListingAuditInput";
import type {
  ListingAuditOutput,
  ListingAudit,
  AuditFinding,
  KeywordResult,
} from "./ListingAuditOutput";

// ── Title audit ──────────────────────────────────────────────────────────────

function auditTitle(title: string, niche: string): { score: number; findings: AuditFinding[] } {
  const findings: AuditFinding[] = [];
  const lowerTitle = title.toLowerCase();
  const lowerNiche = niche.toLowerCase();
  const nicheWords = lowerNiche.split(/\s+/);

  // Score: 1pt per 10 chars, +10 if niche is referenced, +10 per niche word found
  let score = Math.min(100, Math.round(title.length / 3));

  if (title.length < 50) {
    findings.push({
      category: "title",
      severity: "warning",
      message: "Title is shorter than recommended (50–200 characters).",
      suggestion: "Expand the title with key features, material, and target audience.",
    });
    score = Math.max(0, score - 20);
  }

  // Check niche coverage
  const nicheCovered = nicheWords.every((w) => lowerTitle.includes(w));
  if (!nicheCovered) {
    const missing = nicheWords.filter((w) => !lowerTitle.includes(w));
    findings.push({
      category: "title",
      severity: "info",
      message: `Niche keyword "${missing[0]}" not found in title.`,
      suggestion: `Add "${missing[0]}" to the title.`,
    });
    score = Math.max(0, score - 10);
  }

  if (title.length === 0) {
    return {
      score: 0,
      findings: [
        {
          category: "title",
          severity: "critical",
          message: "Title is empty.",
          suggestion: "Write a descriptive title including the product name and key features.",
        },
      ],
    };
  }

  return { score: Math.min(100, score), findings };
}

// ── Bullet audit ────────────────────────────────────────────────────────────

function auditBullets(bullets: readonly string[]): { score: number; findings: AuditFinding[] } {
  const findings: AuditFinding[] = [];
  if (bullets.length === 0) {
    return {
      score: 0,
      findings: [
        {
          category: "bullets",
          severity: "critical",
          message: "No bullet points found.",
          suggestion: "Add at least 3–5 keyword-rich bullet points.",
        },
      ],
    };
  }

  const totalChars = bullets.reduce((sum, b) => sum + b.length, 0);
  let score = Math.min(100, Math.round(totalChars / 5));

  if (bullets.length < 5) {
    findings.push({
      category: "bullets",
      severity: "warning",
      message: `Only ${bullets.length} bullet(s) found — add more for full coverage.`,
      suggestion: "Aim for 5 bullet points (Amazon limit).",
    });
    score = Math.max(0, score - 15);
  }

  return { score, findings };
}

// ── Keyword research ─────────────────────────────────────────────────────────

function generateKeywords(niche: string): KeywordResult[] {
  const lower = niche.toLowerCase();
  const words = lower.split(/\s+/);

  const templates: Array<[string, number, KeywordResult["competition"]]> = [
    [`${lower}`, 5000, "high"],
    [`${lower} buy online`, 2000, "medium"],
    [`best ${lower}`, 3000, "high"],
    [`${words[0]} ${words[words.length - 1]} reviews`, 1000, "low"],
    [`${lower} cheap`, 1500, "medium"],
    [`${lower} for ${words[0]}`, 800, "low"],
    [`wholesale ${lower}`, 300, "low"],
    [`${lower} near me`, 2000, "medium"],
    [`${lower} bulk`, 400, "low"],
    [`${lower} free shipping`, 1200, "medium"],
    [`${words[0]} ${words[words.length - 1]} ${words[words.length - 1]}`, 600, "low"],
  ];

  return templates.map(([keyword, volume, competition]) => ({
    keyword,
    searchVolumeEstimate: volume,
    competition,
    priority: volume >= 2500 ? "high" : volume >= 1000 ? "medium" : "low",
  }));
}

// ── Simulator ────────────────────────────────────────────────────────────────

export class ListingAuditSimulator implements Simulator<ListingAuditInput, ListingAuditOutput> {
  readonly simulatorId = "listing-audit" as const;
  readonly name = "Listing Audit + Keyword Research";

  async run(input: ListingAuditInput): Promise<ListingAuditOutput> {
    const { title, bullets, description, niche } = input;

    if (!niche && !title) {
      return {
        audit: {
          titleScore: 0,
          bulletScore: 0,
          descriptionScore: 0,
          overallScore: 0,
          findings: [],
        },
        keywordResearch: { keywords: [], searchVolumeEstimate: 0 },
        score: 0,
      };
    }

    const { score: titleScore, findings: titleFindings } = auditTitle(title, niche);
    const { score: bulletScore, findings: bulletFindings } = auditBullets(bullets);

    // Description score: proportional to length (100 chars = 50pts, 200+ = 100pts)
    const descriptionScore = Math.min(100, Math.round(description.length / 2));
    const descriptionFindings =
      description.length < 100
        ? [
            {
              category: "description" as const,
              severity: "warning" as const,
              message: "Description is short.",
              suggestion: "Write at least 200 characters covering features and benefits.",
            },
          ]
        : [];

    // Backend keywords: if bullets + title < 500 chars combined, suggest backend
    const totalChars = title.length + bullets.reduce((s, b) => s + b.length, 0);
    const backendFindings =
      totalChars < 500
        ? [
            {
              category: "backend" as const,
              severity: "info" as const,
              message: "Not enough room in visible content for all keywords.",
              suggestion: "Add missable keywords to the backend (search terms field).",
            },
          ]
        : [];

    const allFindings = [
      ...titleFindings,
      ...bulletFindings,
      ...descriptionFindings,
      ...backendFindings,
    ];

    const overallScore = Math.round((titleScore + bulletScore + descriptionScore) / 3);

    const audit: ListingAudit = {
      titleScore,
      bulletScore,
      descriptionScore,
      overallScore,
      findings: allFindings,
    };

    const keywords = generateKeywords(niche);
    const searchVolumeEstimate = keywords.reduce((sum, k) => sum + k.searchVolumeEstimate, 0);

    return {
      audit,
      keywordResearch: { keywords, searchVolumeEstimate },
      score: overallScore,
    };
  }
}
