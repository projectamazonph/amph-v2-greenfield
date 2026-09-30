const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');

// Mojibake marker = UTF-8 bytes of real punctuation re-encoded as Latin-1/cp1252,
// e.g. "â€”" instead of "—". Learners saw these rendered literally for the whole
// life of the course because nothing in the suite looked at encoding.
const MARKERS = [
  'â€', // mangled em dash, quotes, ellipsis (E2 80 xx)
  'â†', // mangled arrows (E2 86 xx)
  'âœ', // mangled check/bullet glyphs (E2 9C xx)
  'âš', // mangled warning glyphs (E2 9A xx)
  'ðŸ', // mangled emoji (F0 9F xx)
  'Ã—', // mangled multiplication sign
  'Â·', // mangled middle dot (C2 B7)
  'Â£' // mangled pound/peso-adjacent glyphs (C2 A3)
];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.html?$/i.test(entry.name)) out.push(full);
  }
  return out;
}

test('no HTML page ships mojibake to learners', () => {
  const pages = walk(root);
  assert.ok(pages.length > 200, `expected a large tree, walked ${pages.length}`);
  const offenders = [];
  for (const page of pages) {
    const text = fs.readFileSync(page, 'utf8');
    for (const marker of MARKERS) {
      if (text.includes(marker)) {
        offenders.push(`${path.relative(root, page)} contains ${JSON.stringify(marker)}`);
        break;
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'these pages contain double-encoded text (rendered as garbage like "â€”"); re-save the file as UTF-8'
  );
});
