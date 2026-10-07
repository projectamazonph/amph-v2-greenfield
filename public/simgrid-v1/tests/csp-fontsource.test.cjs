const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const cssPath = path.join(root, 'assets', 'fonts.css');
const filesDir = path.join(root, 'assets', 'fonts', 'files');
const css = fs.readFileSync(cssPath, 'utf8');

const EXPECTED = {
  Archivo: [400, 500, 600, 700],
  'PT Sans': [400, 700],
  'Barlow Condensed': [500, 600, 700],
  'IBM Plex Mono': [400, 500, 600],
};
const SUBSETS = ['latin', 'latin-ext'];
const PESO = 0x20b1;
const BYTE_BUDGET = 600_000;

function htmlFiles(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    // Dot-prefixed entries are tooling state and scratch, never a shipped surface.
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(full, found);
    else if (entry.isFile() && full.endsWith('.html')) found.push(full);
  }
  return found;
}

function faces() {
  return [...css.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)].map((m) => {
    const body = m[1];
    const spec = /url\(([^)]+)\)/.exec(body)?.[1];
    return {
      family: /font-family:\s*'([^']+)'/.exec(body)?.[1],
      weight: Number(/font-weight:\s*(\d+)/.exec(body)?.[1]),
      // Resolved the way a browser resolves it: relative to the stylesheet, not to the repo root.
      // An earlier version of this file matched Fontsource's own `./files/` layout while the CSS
      // sits one level above it, so every face 404-ed, the tests stayed green, and only a real
      // page load revealed that no font had ever been requested.
      abs: spec ? path.resolve(path.dirname(cssPath), spec) : null,
      file: spec ? path.basename(spec) : undefined,
      range: /unicode-range:\s*([^;]+);/.exec(body)?.[1] ?? '',
    };
  });
}

function rangeCovers(range, code) {
  return range.split(',').some((part) => {
    const m = /^\s*U\+([0-9A-F]+)(?:-([0-9A-F]+))?\s*$/i.exec(part);
    if (!m) return false;
    const lo = parseInt(m[1], 16);
    const hi = m[2] ? parseInt(m[2], 16) : lo;
    return code >= lo && code <= hi;
  });
}

// fonts.css used to @import twelve stylesheets from jsDelivr. That was the last dependency every
// single page made, so the paid Electron installer rendered the whole brand in fallback type with
// the laptop offline. These checks are what keeps it that way.
test('assets/fonts.css declares no remote font source', () => {
  const remote = [...css.matchAll(/https?:\/\/[^\s)"']+/g)].map((m) => m[0]);
  assert.deepEqual(remote, [], `fonts.css still reaches the network ${remote.length} time(s): ${remote.join(', ')}`);
  assert.ok(/@font-face/.test(css), 'fonts.css has no @font-face rules at all');
});

test('every brand family and weight from the design system is self-hosted', () => {
  const declared = faces();

  const missing = [];
  for (const [family, weights] of Object.entries(EXPECTED)) {
    for (const weight of weights) {
      for (const subset of SUBSETS) {
        const slug = `${family.toLowerCase().replace(/ /g, '-')}-${subset}-${weight}-normal`;
        const hit = declared.find((d) => d.family === family && d.weight === weight && d.file === `${slug}.woff2`);
        if (!hit) missing.push(`${family} ${weight} ${subset}`);
      }
    }
  }

  assert.deepEqual(missing, [], `missing self-hosted faces: ${missing.join(', ')}`);
  assert.equal(declared.length, 24, 'expected exactly 24 faces (4 families x their weights x 2 subsets)');
});

test('every referenced woff2 resolves from the stylesheet, is real woff2, and nothing is orphaned', () => {
  const declared = faces();
  assert.ok(declared.length > 0, 'no font files referenced');

  // A url() that exists relative to the repo root but not relative to fonts.css is exactly the
  // bug this test previously missed, so resolve first and only then check the file.
  const missing = declared.filter((f) => !f.abs || !fs.existsSync(f.abs)).map((f) => f.file || '(no src)');
  assert.deepEqual(missing, [], `referenced but unresolvable from assets/fonts.css: ${missing.join(', ')}`);

  const escaped = declared
    .filter((f) => f.abs && !f.abs.startsWith(path.resolve(filesDir) + path.sep))
    .map((f) => f.file);
  assert.deepEqual(escaped, [], `font files must live under assets/fonts/files: ${escaped.join(', ')}`);

  const badMagic = [];
  for (const f of declared) {
    const head = fs.readFileSync(f.abs).subarray(0, 4).toString('latin1');
    if (head !== 'wOF2') badMagic.push(`${f.file}: ${JSON.stringify(head)}`);
  }
  assert.deepEqual(badMagic, [], `not woff2: ${badMagic.join(', ')}`);

  const referenced = declared.map((f) => f.file);
  const onDisk = fs.readdirSync(filesDir).filter((f) => f.endsWith('.woff2'));
  const orphans = onDisk.filter((f) => !referenced.includes(f));
  assert.deepEqual(orphans, [], `font files carried by the installer but never used: ${orphans.join(', ')}`);
});

test('self-hosted fonts stay inside their byte budget', () => {
  const total = fs
    .readdirSync(filesDir)
    .reduce((sum, f) => sum + (f.endsWith('.woff2') ? fs.statSync(path.join(filesDir, f)).size : 0), 0);

  assert.ok(total <= BYTE_BUDGET, `assets/fonts/files is ${total} bytes, over the ${BYTE_BUDGET} budget`);
});

// latin-ext is kept because exactly two codepoints are declared by no other vendored subset, and
// both matter here: U+0100 (Ā) and U+20B1 (peso sign). U+0153 and U+2020 are also inside the latin
// range, so they argue for latin-ext on their own and were wrongly listed as its justification in
// an earlier draft of this file.
//
// This asserts the declared unicode-range, which is the most a static test can prove. Whether the
// font file really carries the glyph was verified separately in the browser and is NOT uniform:
// U+20B1 renders from the webfont in Archivo and IBM Plex Mono but is absent from PT Sans and
// Barlow Condensed, so a peso amount set in body text falls back to a system font. That is
// pre-existing behaviour -- the same Fontsource 5.1.0 files were fetched from jsDelivr before
// vendoring -- and is recorded in assets/fonts/README.md. Do not rename this test into a
// glyph-coverage claim it cannot check.
test('every brand family declares a face whose range covers the peso sign', () => {
  const uncovered = Object.keys(EXPECTED).filter(
    (family) => !faces().some((f) => f.family === family && rangeCovers(f.range, PESO))
  );

  assert.deepEqual(
    uncovered,
    [],
    `no @font-face unicode-range covers U+20B1 for: ${uncovered.join(', ')} - latin-ext faces are missing`
  );
});

test('exactly 25 pages load the shared font stylesheet', () => {
  const pages = htmlFiles(root).filter((file) => fs.readFileSync(file, 'utf8').includes('assets/fonts.css'));
  assert.equal(pages.length, 25, `expected 25 pages linking assets/fonts.css, found ${pages.length}`);
});

// CSP hardening shipped in PR #60: unused CDN allowances (cdn.tailwindcss.com, cdn.jsdelivr.net,
// cdn.sheetjs.com, fonts.googleapis.com, fonts.gstatic.com, image.qwenlm.ai, manuscdn.com) are
// stripped from all 25 pages. Only 'self', data:, and projectamazonph.github.io (coach-decks only)
// remain as allowed sources.
test('CSP is narrowed: no unused CDN hosts remain in any page', () => {
  const REMOVED_HOSTS = [
    'cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'cdn.sheetjs.com',
    'fonts.googleapis.com', 'fonts.gstatic.com', 'image.qwenlm.ai', 'manuscdn.com',
    'private-us-east-1',
  ];
  const pages = htmlFiles(root).filter((file) => fs.readFileSync(file, 'utf8').includes('assets/fonts.css'));
  assert.equal(pages.length, 25);
  for (const file of pages) {
    const html = fs.readFileSync(file, 'utf8');
    for (const host of REMOVED_HOSTS) {
      assert.equal(
        html.includes(host), false,
        `${path.relative(root, file)}: unused CDN host "${host}" should not appear in CSP`
      );
    }
    // font-src must still include 'self' (self-hosted fonts)
    assert.match(html, /font-src[^>]*'self'/, path.relative(root, file));
    // font-src and connect-src must not be merged without a semicolon
    // A correctly-formed CSP has: font-src 'self' data:; connect-src 'self'
    // A broken one has: font-src 'self' data: connect-src 'self' (no semicolon)
    const mergedBroken = /font-src[^;]*data: connect-src/i.test(html); // space between data: and connect-src = broken
    assert.equal(mergedBroken, false,
      `${path.relative(root, file)}: font-src and connect-src must not be merged without semicolon`);
  }
});
