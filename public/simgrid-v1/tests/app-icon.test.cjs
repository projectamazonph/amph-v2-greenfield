const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const WEB_ICON = path.join(root, 'favicon.ico');
const APP_ICON = path.join(root, 'build', 'icon.ico');

// The Windows installer shipped with the stock Electron icon for its whole life: build.win.icon
// was unset and there was no .ico anywhere in the repo, so the taskbar, Start-menu shortcut and
// installed-apps entry all said "Electron" on a paid training product. Both icons come from the
// same 1024px master; these checks keep that from quietly reverting.
//
// The two files are NOT interchangeable, and a probe is what settled it. 18 of the 20 product
// pages declare no <link rel="icon">, so a browser falls back to /favicon.ico on its own: loading
// index.html in a fresh Edge profile transferred 77,585 B of the 350,967 B page, 22% of the hub.
// That ICO carried 16/24/32/48/64/128/256, and the 64px-and-up entries were 73,203 of its 79,229 bytes â€”
// sizes only a desktop shell asks for. So the web file keeps the <=48px ladder and the installer
// keeps the full one, and the entries they share must stay byte-identical so the artwork cannot
// drift. A file:// session requests neither: verified 18 requests, none for a favicon, because
// the tab icon comes from the executable.

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const APP_SIZES = [16, 24, 32, 48, 64, 128, 256];
const WEB_SIZES = [16, 24, 32, 48];
const WEB_BUDGET = 8_000;

function parseIco(file) {
  const buf = fs.readFileSync(file);
  assert.equal(buf.readUInt16LE(0), 0, `${file}: reserved field must be 0`);
  assert.equal(buf.readUInt16LE(2), 1, `${file}: type must be 1 (icon)`);
  const count = buf.readUInt16LE(4);
  assert.ok(count > 0, `${file}: zero image entries`);

  const entries = new Map();
  for (let i = 0; i < count; i++) {
    const o = 6 + i * 16;
    const off = buf.readUInt32LE(o + 12);
    const bytes = buf.readUInt32LE(o + 8);
    const w = buf.readUInt8(o) || 256;
    const h = buf.readUInt8(o + 1) || 256;
    assert.ok(off + bytes <= buf.length, `${file}: entry ${w}x${h} runs past EOF`);
    assert.equal(w, h, `${file}: ${w}x${h} is not square`);
    const data = Buffer.from(buf.subarray(off, off + bytes));
    assert.ok(data.subarray(0, 4).equals(PNG_MAGIC), `${file}: ${w}px entry is not PNG-compressed`);
    assert.equal(data.readUInt32BE(16), w, `${file}: ${w}px entry's IHDR says ${data.readUInt32BE(16)}`);
    assert.ok(!entries.has(w), `${file}: duplicate ${w}px entry`);
    entries.set(w, data);
  }
  return { buf, entries };
}

const web = parseIco(WEB_ICON);
const app = parseIco(APP_ICON);

test('the installer icon carries every size a Windows shell asks for', () => {
  assert.deepEqual([...app.entries.keys()].sort((a, b) => a - b), APP_SIZES);
});

test('the web favicon stops at 48px because the browser fetches it unprompted', () => {
  assert.deepEqual([...web.entries.keys()].sort((a, b) => a - b), WEB_SIZES);
  assert.ok(
    web.buf.length <= WEB_BUDGET,
    `favicon.ico is ${web.buf.length} bytes over the ${WEB_BUDGET} budget â€” a large entry went back into the file ` +
      'that 18 pages request without declaring it',
  );
});

test('shared sizes are byte-identical, so web and installer artwork cannot drift', () => {
  for (const size of WEB_SIZES) {
    assert.ok(app.entries.has(size), `build/icon.ico lost its ${size}px entry`);
    assert.deepEqual(web.entries.get(size), app.entries.get(size), `${size}px entry differs between the two ICOs`);
  }
});

test('the installer config points at the icon that is actually shipped', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.build.win.icon, 'build/icon.ico', 'build.win.icon must be explicit, not defaulted');
  assert.ok(fs.existsSync(path.join(root, pkg.build.win.icon)), 'build.win.icon names a missing file');
});

// Every root product page must DECLARE an icon, not rely on the browser's default request.
// Two reasons, both measured on this repo rather than assumed:
//   1. The undeclared default resolves against the ORIGIN ROOT, so on a project-pages URL
//      (https://host/<repo>/index.html) it asks for https://host/favicon.ico and 404s. Observed
//      live on projectamazonph.github.io. A declared href is resolved against the page instead.
//   2. Whether the default request fires at all proved unreliable: in a 3-run cold A/B it happened
//      in one run. A declared link is a request the page controls.
test('every root product page declares its own icon, with a page-relative href', () => {
  const pages = fs
    .readdirSync(root)
    .filter((f) => f.endsWith('.html') && !f.startsWith('.'))
    .sort();
  assert.ok(pages.length >= 20, `only ${pages.length} root product pages found — the population itself changed`);

  const missing = [];
  const rootAbsolute = [];
  for (const f of pages) {
    const html = fs.readFileSync(path.join(root, f), 'utf8');
    const line = html.split(/\r?\n/).find((l) => /<link[^>]+rel=["']icon["']/i.test(l));
    if (!line) {
      missing.push(f);
      continue;
    }
    const href = (line.match(/href=["']([^"']+)["']/i) || [])[1];
    // data: URIs are self-contained; anything else must be relative so it resolves under the base path.
    if (href && !href.startsWith('data:') && href.startsWith('/')) rootAbsolute.push(`${f} -> ${href}`);
  }
  // Name the population in every failure: "N of M" without M is how a wrong page count got committed here.
  assert.deepEqual(missing, [], `${missing.length} of ${pages.length} root product pages declare no icon and fall back to an origin-root request`);
  assert.deepEqual(rootAbsolute, [], `${rootAbsolute.length} of ${pages.length} root product pages use a root-absolute icon href, which breaks on a project-pages subpath`);
});

// A *declared* <link rel="icon"> is fetched even from a file:// page — measured: index.html over
// file:// issues `favicon.ico -> 200` once the link exists, while the undeclared default never fires
// there. Now that every product page declares the icon, the installed app has to ship it or each page
// load carries a broken subresource. This is where the trim pays off: 5,978 B rather than the 79,229 B
// the installer's ladder would have cost to do the same job.
test('the declared favicon ships with the app, and stays small enough to be worth it', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(pkg.build.files.includes('favicon.ico'), 'every page declares the icon, so file:// will request it');
  assert.ok(pkg.build.files.includes('assets/**/*'), 'assets must still ship (fonts and art live there)');
  const bytes = fs.statSync(WEB_ICON).size;
  assert.ok(bytes <= WEB_BUDGET, `packaged favicon is ${bytes} B, over the ${WEB_BUDGET} budget`);
});
