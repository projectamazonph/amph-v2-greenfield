const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('SimHub start cards include the onboarding entry and use the established full-card link interaction', () => {
  const html = read('index.html');
  const start = html.match(/<section class="pha-tools" id="learning-start">([\s\S]*?)<\/section>/)?.[1] || '';

  assert.equal((start.match(/<a class="pha-tcard/g) || []).length, 5);
  assert.match(start, /href="start-here\.html"/);
  assert.equal(start.includes('<article class="pha-tcard'), false);
});

test('SimHub renders PPC Coach once as the primary learning card', () => {
  const html = read('index.html');
  const coachCards = html.match(/<a class="pha-tcard[^"]*" href="ppc-coach\.html">/g) || [];

  assert.equal(coachCards.length, 1);
  assert.ok(html.indexOf('href="ppc-coach.html"') < html.indexOf('id="simulator-library"'));
});

test('new simulator display names do not expose roadmap S-number prefixes', () => {
  const displaySources = [
    'index.html',
    'planned-simulators.html',
    'assets/shell.js',
    'assets/curriculum-manifest.js',
    'assets/bid-decisions-core.js',
    'assets/campaign-architect-core.js',
    'assets/account-audit-core.js',
    'assets/sqp-studio-core.js',
    'assets/client-onboarding-core.js',
    'assets/capstone-sequence-core.js'
  ].map(read).join('\n');

  assert.doesNotMatch(displaySources, /['">]\s*S(?:2|8|9|10|11|12-S14)\s+(?:Bid Decisions|Campaign Architect|Account Audit|SQP Studio|Client Onboarding|Capstone)/);
});

test('hub progress presentation inherits the existing theme without inline colors', () => {
  const js = read('assets/hub-progress.js');
  const css = read('assets/hub.css');

  assert.equal(/#[0-9a-f]{3,8}/i.test(js), false);
  assert.equal(js.includes('style.cssText'), false);
  assert.match(css, /\.pha-progress-badge\s*\{/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.pha-progress-badge/);
});

test('PPC Coach progress uses its established brand treatment instead of status palettes', () => {
  const coach = read('ppc-coach.html');
  const practiceRenderer = coach.match(/function renderModulePractice[\s\S]*?\r?\n}\r?\n/)?.[0] || '';

  assert.equal(practiceRenderer.includes("view.tone==='success'"), false);
  assert.match(practiceRenderer, /bg-brand-50 text-brand-700 border border-brand-200/);
});

test('shared decision tables expose labels for a compact mobile presentation', () => {
  const renderer = read('assets/decision-simulator-page.js');
  const css = read('assets/decision-simulator.css');

  for (const label of ['Case', 'Signal', 'Metrics']) {
    assert.match(renderer, new RegExp('data-label="' + label + '"'));
  }
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.ds-table thead\s*\{\s*display:\s*none/);
  assert.match(css, /\.ds-table td::before/);
});

test('Bid Decisions and SQP Studio expose mobile field labels', () => {
  const bid = read('bid-decisions.html');
  const bidRenderer = read('assets/bid-decisions-page.js');
  const bidCss = read('assets/bid-decisions.css');
  const sqp = read('sqp-studio.html');
  const sqpRenderer = read('assets/sqp-studio-page.js');
  const sqpCss = read('assets/sqp-studio.css');

  assert.match(bid, /data-bid-cockpit/);
  assert.match(bidRenderer, /Evidence confidence/);
  assert.match(bidRenderer, /aria-pressed/);
  assert.match(bidCss, /@media \(max-width: 520px\)/);
  assert.match(sqp, /data-signal-lab/);
  assert.match(sqpRenderer, /role=\\?"meter/);
  assert.match(sqpRenderer, /data-diagnosis/);
  assert.match(sqpCss, /@media\(max-width:520px\)/);
});

test('shared skin wrappers include padding inside the mobile viewport', () => {
  const skin = read('assets/skin.css');
  assert.match(skin, /\.pha-skin-wrap\s*\{[\s\S]*?box-sizing:\s*border-box\s*!important;[\s\S]*?width:\s*100%\s*!important;/);
});

test('Coach Tools and Coach Library mobile media queries are valid and reachable', () => {
  const coach = read('assets/coach-tools.css');
  const library = read('assets/coach-library.css');
  assert.doesNotMatch(coach, /\}\.@media/);
  assert.doesNotMatch(library, /\}\.@media/);
  assert.match(coach, /@media \(max-width:620px\)/);
  assert.match(library, /@media \(max-width:620px\)/);
});

test('legacy shell pages have mobile containment overrides', () => {
  const responsive = read('assets/responsive.css');
  assert.match(responsive, /body\.pha-skin \.shell\s*\{[\s\S]*?grid-template-columns:\s*1fr\s*!important;/);
  assert.match(responsive, /body\.pha-skin \.shell > \.side\s*\{[\s\S]*?overflow-x:\s*auto\s*!important;/);
  assert.match(responsive, /body\.pha-skin \.suite \.chip:not\(\.on\)\s*\{\s*display:\s*none\s*!important;/);
});

test('Learn Handouts tables use the shared mobile scroll utility', () => {
  const html = read('learn/handouts.html');
  assert.equal((html.match(/class="table-scroll-wrap"/g) || []).length, 6);
  assert.equal((html.match(/class="table-scroll"/g) || []).length, 6);
});

test('legacy mobile pages contain padded grid children and native panels', () => {
  const responsive = read('assets/responsive.css');
  assert.match(responsive, /body\.pha-skin \.card\s*\{[\s\S]*?min-width:\s*0\s*!important;[\s\S]*?box-sizing:\s*border-box\s*!important;/);
  assert.match(responsive, /body\.pha-skin \.ca-layout\s*> \*\s*,[\s\S]*?box-sizing:\s*border-box\s*!important;/);
});
