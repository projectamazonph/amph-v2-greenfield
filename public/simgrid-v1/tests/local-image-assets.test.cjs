const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const imgDir = path.join(root, 'assets', 'img');

// Course art used to be hot-linked from a third-party AI CDN at ~1 MB per PNG (14.3 MB for 13
// files), which broke the offline installer and burned mobile data. It is self-hosted and
// re-encoded now; these checks keep it that way.
const THIRD_PARTY_ART = /https?:\/\/[^\s"'()]*\/public_source\/[^\s"'()<>]*/g;
const BYTE_BUDGET = 400_000;

const SKIP_DIRS = new Set(['.git', 'node_modules', 'release', 'dist', 'out', 'build', '.cache']);
const SOURCE_EXT = new Set(['.html', '.css', '.js']);

function sourceFiles(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    // Dot-prefixed entries are tooling state and scratch, never a shipped surface, so they are
    // out of contract scope here (the repo root carries undeletable .tmp-* leftovers).
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      sourceFiles(path.join(dir, entry.name), found);
    } else if (entry.isFile() && SOURCE_EXT.has(path.extname(entry.name).toLowerCase())) {
      found.push(path.join(dir, entry.name));
    }
  }
  return found;
}

function localImages() {
  return fs
    .readdirSync(imgDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && ['.png', '.webp', '.jpg', '.jpeg', '.svg', '.gif'].includes(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name);
}

test('no source file loads artwork from a third-party host', () => {
  const offenders = [];

  for (const file of sourceFiles(root)) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const src = fs.readFileSync(file, 'utf8');
    for (const match of src.matchAll(THIRD_PARTY_ART)) {
      offenders.push(`${rel}: ${match[0]}`);
    }
  }

  // A CSP `img-src` entry naming the host is a permission, not a dependency, so only an actual
  // path-bearing URL counts. Those must all be gone.
  assert.deepEqual(offenders, [], `${offenders.length} third-party artwork reference(s) remain`);
});

test('every self-hosted image is used by a page', () => {
  const images = localImages();
  assert.ok(images.length >= 13, `expected the 13 self-hosted images, found ${images.length}`);

  const bodies = sourceFiles(root).map((file) => fs.readFileSync(file, 'utf8'));
  const unused = images.filter((name) => !bodies.some((body) => body.includes(`assets/img/${name}`)));

  assert.deepEqual(unused, [], 'delete unused art instead of shipping weight nobody renders');
});

test('self-hosted artwork stays inside its byte budget', () => {
  const total = localImages().reduce((sum, name) => sum + fs.statSync(path.join(imgDir, name)).size, 0);

  assert.ok(
    total <= BYTE_BUDGET,
    `assets/img is ${total} bytes, over the ${BYTE_BUDGET} budget (was 14.3 MB before self-hosting)`
  );
});

// A page that builds its art paths from a key map can reference a key that was never declared.
// The render guards it with `m.img ? … : …`, so nothing throws and nothing shows: the
// illustration is silently absent for the entire life of the product. That is exactly how
// PPC Coach shipped, so key liveness is now a contract rather than a review habit.
test('every artwork key a page reads is a key it declares', () => {
  const offenders = [];

  for (const file of sourceFiles(root)) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const src = fs.readFileSync(file, 'utf8');

    for (const block of src.matchAll(/const\s+(\w+)\s*=\s*\{([\s\S]*?)\};/g)) {
      const alias = block[1];
      const body = block[2];
      if (!/["'`]assets\/img\//.test(body)) continue;

      const declared = new Set([...body.matchAll(/^\s*(\w+)\s*:\s*["'`]assets\/img\//gm)].map((m) => m[1]));
      assert.ok(declared.size > 0, `${rel}: "${alias}" maps asset paths but no declared key was parsed`);

      const reads = new Set([...src.matchAll(new RegExp(`\\b${alias}\\.(\\w+)\\b`, 'g'))].map((m) => m[1]));
      for (const key of reads) {
        if (!declared.has(key)) offenders.push(`${rel}: reads ${alias}.${key} but only declares ${[...declared].join(', ')}`);
      }
    }
  }

  assert.deepEqual(offenders, [], `${offenders.length} undeclared artwork key read(s):\n  ${offenders.join('\n  ')}`);
});

// The mirror half of the same contract: a declared key that nothing reads is art the installer
// carries and no student ever sees. New spares must be a decision, not an accident.
test('artwork map keys are either rendered or listed as known spares', () => {
  const KNOWN_SPARES = new Set(['logo', 'listing', 'va']);
  const undeclaredSpares = [];

  const src = fs.readFileSync(path.join(root, 'ppc-coach.html'), 'utf8');
  const block = /const\s+IMG\s*=\s*\{([\s\S]*?)\};/.exec(src);
  assert.ok(block, 'ppc-coach.html no longer has an IMG map');

  const declared = [...block[1].matchAll(/^\s*(\w+)\s*:\s*["'`]assets\/img\//gm)].map((m) => m[1]);
  const reads = new Set([...src.matchAll(/\bIMG\.(\w+)\b/g)].map((m) => m[1]));

  for (const key of declared) {
    if (!reads.has(key) && !KNOWN_SPARES.has(key)) undeclaredSpares.push(key);
  }

  assert.deepEqual(
    undeclaredSpares,
    [],
    `IMG keys declared but never read and not listed as spares: ${undeclaredSpares.join(', ')} — wire them to a module or drop the file`
  );
});
