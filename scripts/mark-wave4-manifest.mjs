import { readFile, writeFile } from "node:fs/promises";

const path = "/home/ubuntu/amph-v2-greenfield/content/migration/teaching-deck-slide-map.json";
const manifest = JSON.parse(await readFile(path, "utf8"));
manifest.rows = manifest.rows.map((row) => {
  if (row.sourceModule < 10 || row.sourceModule > 11) return row;
  return {
    ...row,
    editorialStatus: "ported",
    editorialNotes: "Wave 4 operational parity port applied: the target lesson contains a native report, diagnostic, permissions, evidence, or capstone representation of this source teaching role; final side-by-side editorial review remains open.",
  };
});
await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
console.log("Updated Wave 4 editorial statuses for source modules M10–M11.");
