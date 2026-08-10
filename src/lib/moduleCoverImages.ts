/**
 * Static lookup from a curriculum module's title (as produced by
 * `deriveTitle()` in scripts/seed-all-content.mjs) to its cover image.
 *
 * Module has no `coverImage` column (only Course does), and these 9
 * covers are fixed 1:1 with the 9 folders under content/curriculum/modules/,
 * so a DB column isn't needed — this table is the wiring.
 */
export const MODULE_COVER_IMAGES: Record<string, string> = {
  Onboarding: "/images/courses/module-00-academy-onboarding.png",
  Foundations: "/images/courses/module-01-ppc-foundations.png",
  "Keyword Research": "/images/courses/module-02-keyword-research.png",
  "Listing Optimization": "/images/courses/module-03-listing-optimization.png",
  "Campaign Architecture": "/images/courses/module-04-campaign-architecture.png",
  "Portfolio Strategy": "/images/courses/module-05-portfolio-strategy.png",
  "Bidding Lab": "/images/courses/module-06-bidding-lab.png",
  "Search Term Triage": "/images/courses/module-07-search-term-triage.png",
  "Competitive Intelligence": "/images/courses/module-08-competitive-intelligence.png",
};
