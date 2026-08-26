import { readFile, writeFile } from "node:fs/promises";

const path = "/home/ubuntu/amph-v2-greenfield/content/migration/teaching-deck-slide-map.json";
const enrichedLessons = new Set([
  "0.1-welcome",
  "0.2-platform-tour",
  "0.3-first-simulation",
  "1.5-metrics-in-practice",
  "2.2-keyword-research-workflow",
  "2.4-keyword-grouping",
  "3.1-listing-quality-score",
  "4.2-sponsored-brands-display",
  "6.3-bid-elevator-prep",
]);
const manifest = JSON.parse(await readFile(path, "utf8"));
manifest.rows = manifest.rows.map((row) => {
  if (row.sourceModule > 6) return row;
  const ported = enrichedLessons.has(row.targetLessonSlug);
  return {
    ...row,
    editorialStatus: ported ? "ported" : "reviewed",
    editorialNotes: ported
      ? "Wave 2 initial port applied: a native representation of this source aid is now present in the target lesson; full parity review remains open."
      : "Wave 2 source review completed: target lesson location is assigned; native enrichment remains queued for the next editorial pass.",
  };
});
await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
console.log("Updated Wave 2 editorial statuses for source modules M0–M6.");
