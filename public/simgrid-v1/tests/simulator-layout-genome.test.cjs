const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const read = (file) => fs.readFileSync(file, 'utf8');
const rebuilt = {
  'account-audit.html': ['data-audit-sweep', 'assets/account-audit-page.js', 'assets/account-audit.css'],
  'bid-decisions.html': ['data-bid-cockpit', 'assets/bid-decisions-page.js', 'assets/bid-decisions.css'],
  'campaign-architect.html': ['data-blueprint', 'assets/campaign-architect-page.js', 'assets/campaign-architect.css'],
  'sqp-studio.html': ['data-signal-lab', 'assets/sqp-studio-page.js', 'assets/sqp-studio.css'],
  'client-onboarding.html': ['data-intake', 'assets/client-onboarding-page.js', 'assets/client-onboarding.css'],
  'capstone-sequence.html': ['data-journey', 'assets/capstone-sequence-page.js', 'assets/capstone-sequence.css']
};

test('new simulators own distinct roots, renderers, and layout stylesheets', () => {
  const roots = new Set();
  const renderers = new Set();
  const styles = new Set();
  Object.entries(rebuilt).forEach(([page, [root, renderer, css]]) => {
    const html = read(page);
    assert.match(html, new RegExp(root));
    assert.match(html, new RegExp(renderer.replace(/[.]/g, '\\.')));
    assert.match(html, new RegExp(css.replace(/[.]/g, '\\.')));
    assert.doesNotMatch(html, /decision-simulator-page\.js|decision-simulator\.css/);
    roots.add(root); renderers.add(renderer); styles.add(css);
  });
  assert.equal(roots.size, 6);
  assert.equal(renderers.size, 6);
  assert.equal(styles.size, 6);
});

test('all twelve simulators load the shared interaction foundation', () => {
  [
    'account-audit.html','ad-console.html','bid-decisions.html','bulk-file.html',
    'campaign-architect.html','capstone-sequence.html','client-onboarding.html',
    'keyword-lab.html','listing.html','pacing-deck.html','search-triage.html','sqp-studio.html'
  ].forEach((page) => assert.match(read(page), /assets\/simulator-foundation\.css/, page));
});

test('shared fonts are self-hosted Fontsource files, never Google Fonts', () => {
  const fonts = read('assets/fonts.css');
  // Delivery changed when the desktop installer became the priority surface: the twelve remote
  // Fontsource @imports are now 24 inlined @font-face rules over assets/fonts/files/. What has to
  // stay true is the provenance (Fontsource, not Google) and that the file needs no network.
  assert.doesNotMatch(fonts, /https?:\/\//, 'assets/fonts.css must not reach the network');
  assert.doesNotMatch(fonts, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(fonts, /Fontsource/, 'assets/fonts.css should record its Fontsource provenance');
  assert.equal((fonts.match(/@font-face/g) || []).length, 24, 'expected 24 self-hosted faces');
});

test('BuyBox Dojo seeds its simulation runs for replayable results', () => {
  const listing = read('listing.html');
  assert.match(listing, /function seededRandom\(seed\)/);
  assert.match(listing, /simRandom=seededRandom\(seed\)/);
  assert.match(listing, /const rnd=\(a,b\)=>a\+simRandom\(\)\*/);
});
