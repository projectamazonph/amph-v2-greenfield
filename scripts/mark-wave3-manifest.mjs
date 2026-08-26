import { readFile, writeFile } from "node:fs/promises";

const path = "/home/ubuntu/amph-v2-greenfield/content/migration/teaching-deck-slide-map.json";
const enrichedLessons = new Set([
  "6.1-bid-strategies",
  "6.2-placement-adjustments",
  "7.1-search-term-analysis",
  "7.2-negative-keywords",
  "7.3-str-triage-prep",
  "8.1-brand-analytics",
  "8.2-share-of-voice",
  "8.3-competitor-benchmarking",
  "9.1-weekly-routine",
  "9.2-one-change-at-a-time",
  "9.3-how-much-data-is-enough",
]);
const manifest = JSON.parse(await readFile(path, "utf8"));
manifest.rows = manifest.rows.map((row) => {
  if (row.sourceModule < 7 || row.sourceModule > 9) return row;
  const ported = enrichedLessons.has(row.targetLessonSlug);
  return {
    ...row,
    editorialStatus: ported ? "ported" : "reviewed",
    editorialNotes: ported
      ? "Wave 3 initial port applied: the target lesson now contains a native representation of the mapped search, market, bid, or optimization learning aid; full parity review remains open."
      : "Wave 3 source review completed: the target lesson is assigned and remains queued for a deeper editorial parity pass.",
  };
});
await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
console.log("Updated Wave 3 editorial statuses for source modules M7–M9.");
