const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const simulatorPages = [
  'account-audit.html',
  'ad-console.html',
  'bid-decisions.html',
  'bulk-file.html',
  'campaign-architect.html',
  'capstone-sequence.html',
  'client-onboarding.html',
  'keyword-lab.html',
  'listing.html',
  'pacing-deck.html',
  'ppc-coach.html',
  'search-triage.html',
  'sqp-studio.html'
];

const sharedDecisionPages = new Set();

const learningPages = [
  'learn/downloads.html',
  'learn/features.html',
  'learn/guide.html',
  'learn/handouts.html',
  'learn/index.html'
];

test('every simulator consumes the central design-system cascade', () => {
  for (const page of simulatorPages) {
    const html = read(page);
    const fonts = html.indexOf('href="assets/fonts.css"');
    const tokens = html.indexOf('href="assets/tokens.css"');
    const nativeHref = sharedDecisionPages.has(page)
      ? 'href="assets/decision-simulator.css"'
      : `href="assets/${page.replace('.html', '.css')}"`;
    const nativeStyles = html.indexOf(nativeHref);
    const skin = html.indexOf('href="assets/skin.css"');
    const shell = html.indexOf('href="assets/shell.css"');

    assert.notEqual(fonts, -1, `${page} must import the shared brand fonts`);
    assert.notEqual(tokens, -1, `${page} must import tokens.css`);
    assert.notEqual(skin, -1, `${page} must import skin.css`);
    assert.notEqual(shell, -1, `${page} must import shell.css`);
    assert.ok(fonts < tokens, `${page} must load fonts before design tokens`);
    assert.ok(tokens < nativeStyles, `${page} must expose tokens to its native stylesheet`);
    assert.ok(nativeStyles < skin, `${page} must load the unifying skin after native styles`);
    assert.ok(skin < shell, `${page} must load the shared shell last`);
  }
});

test('simulators do not load page-specific font families', () => {
  for (const page of simulatorPages) {
    const html = read(page);

    assert.doesNotMatch(html, /(?:fontsource|fonts\.googleapis\.com\/css2)/i, `${page} bypasses fonts.css`);
  }
});

test('stylesheets use the shared font tokens instead of legacy font stacks', () => {
  const cssFiles = fs.readdirSync(path.join(root, 'assets'))
    .filter((file) => file.endsWith('.css') && file !== 'fonts.css');
  const fragmentedFonts = /(?:['"]Inter['"]|Space Grotesk|['"]Anton['"]|JetBrains Mono|IBM Plex Sans|Archivo Variable)/i;

  for (const file of cssFiles) {
    assert.doesNotMatch(read(`assets/${file}`), fragmentedFonts, `${file} declares a legacy font family`);
  }
});

test('simulator pages keep presentation out of HTML', () => {
  for (const page of simulatorPages) {
    assert.doesNotMatch(read(page), /<style(?:\s[^>]*)?>[\s\S]*?<\/style>/i, `${page} contains inline CSS`);
  }
});

test('shared shell aliases central tokens instead of duplicating brand constants', () => {
  const css = read('assets/shell.css');

  assert.match(css, /--shell-navy:\s*var\(--c-navy-2\)/);
  assert.match(css, /--shell-orange:\s*var\(--c-orange\)/);
  assert.doesNotMatch(css.match(/:root\s*\{[\s\S]*?\}/)?.[0] || '', /#[0-9a-f]{3,8}/i);
});

test('shared shell repairs either missing design-system stylesheet independently', () => {
  const shell = read('assets/shell.js');
  const injectSkin = shell.match(/function injectSkin\(\)[\s\S]*?\n  \}/)?.[0] || '';

  assert.match(injectSkin, /if \(!document\.querySelector\('link\[data-pha-tokens\]/);
  assert.match(injectSkin, /if \(!document\.querySelector\('link\[data-pha-skin\]/);
  assert.doesNotMatch(injectSkin, /tokens[^\n]*\) return/);
});

test('decision simulators alias the central palette instead of defining a parallel one', () => {
  const css = read('assets/decision-simulator.css');
  const rootTokens = css.match(/:root\s*\{[\s\S]*?\}/)?.[0] || '';

  assert.match(rootTokens, /--ds-bg:\s*var\(--c-bg\)/);
  assert.match(rootTokens, /--ds-orange:\s*var\(--c-orange\)/);
  assert.doesNotMatch(rootTokens, /#[0-9a-f]{3,8}/i);
});

test('shared shell resolves assets and navigation from nested learning pages', () => {
  const shell = read('assets/shell.js');

  for (const page of learningPages) {
    const html = read(page);
    assert.match(html, /<body[^>]*data-pha-root="\.\.\/"/);
    assert.match(html, /<body[^>]*data-pha-page-name="Learn &amp; Docs"/);
  }
  assert.match(shell, /function rootPrefix\(\)/);
  assert.match(shell, /rootPrefix\(\) \+ 'assets\/tokens\.css'/);
  assert.match(shell, /rootPrefix\(\) \+ t\.file/);
  assert.match(shell, /var root = rootPrefix\(\)/);
  assert.match(shell, /root \+ 'index\.html"/);
  assert.match(shell, /data-pha-page-name/);
});

test('learning pages use the shared design-system cascade without inline style blocks', () => {
  for (const page of learningPages) {
    const html = read(page);
    const name = page.split('/').pop().replace('.html', '');
    const fonts = html.indexOf('href="../assets/fonts.css"');
    const tokens = html.indexOf('href="../assets/tokens.css"');
    const shared = html.indexOf('href="../assets/learn.css"');
    const pageStyles = html.indexOf(`href="../assets/learn-${name}.css"`);
    const skin = html.indexOf('href="../assets/skin.css"');
    const shell = html.indexOf('href="../assets/shell.css"');

    assert.ok(fonts !== -1 && fonts < tokens, `${page} must load shared fonts first`);
    assert.ok(tokens < shared && shared < pageStyles, `${page} has an invalid learning CSS cascade`);
    assert.ok(pageStyles < skin && skin < shell, `${page} must load skin and shell last`);
    assert.doesNotMatch(html, /<style(?:\s[^>]*)?>[\s\S]*?<\/style>/i, `${page} contains inline CSS`);
    assert.doesNotMatch(html, /<main[^>]*style=/i, `${page} styles its main landmark inline`);
  }
});

test('interactive HTML uses explicit button behavior and valid link semantics', () => {
  const pages = [
    ...fs.readdirSync(root).filter((file) => file.endsWith('.html')),
    ...learningPages
  ];

  for (const page of pages) {
    const html = read(page);
    assert.doesNotMatch(html, /<button\b(?![^>]*\btype=)/i, `${page} has a button with an implicit type`);
    assert.doesNotMatch(html, /<a\b(?![^>]*\bhref=)/i, `${page} uses a link without a destination`);
  }
});

test('shared shell provides keyboard users a skip-to-content link', () => {
  const shell = read('assets/shell.js');
  const shellCss = read('assets/shell.css');

  assert.match(shell, /function ensureSkipLink\(\)/);
  assert.match(shell, /document\.querySelector\('main'\)/);
  assert.match(shell, /skip\.className = 'pha-skip-link'/);
  assert.match(shell, /ensureChrome\(\);\s*ensureSkipLink\(\);/);
  assert.match(shellCss, /\.pha-skip-link:focus/);
});

test('mobile shell keeps navigation out of header flow and groups footer links', () => {
  const responsive = read('assets/responsive.css');
  const shell = read('assets/shell.js');
  assert.match(responsive, /\.pha-topbar \{[\s\S]*?height: 72px/);
  assert.match(responsive, /\.pha-topbar \.pha-nav \{[\s\S]*?display: none/);
  assert.match(responsive, /\.pha-topbar \.pha-nav\.is-open \{[\s\S]*?display: flex/);
  ['Learn', 'Practice', 'Coach', 'Project'].forEach(label => {
    assert.match(shell, new RegExp(`data-label="${label}"`));
  });
});

/* ──────────────────────────────────────────────────────────
   Priority 5 regression guard — skin.css must not reintroduce
   hard-coded hex overrides on body.pha-skin
   ────────────────────────────────────────────────────────── */
test('skin.css routes every pha-skin override through central tokens', () => {
  const css = read('assets/skin.css');
  const skinBlock = css.match(/body\.pha-skin\s*\{[\s\S]*?\n\}/)?.[0] || '';
  assert.match(skinBlock, /background:\s*var\(--c-bg\)/);
  assert.match(skinBlock, /color:\s*var\(--c-ink\)/);
  // font-family is in the body.pha-skin, body.pha-skin * block, so check full css
  assert.match(css, /font-family:\s*var\(--font-body\)/);
  assert.doesNotMatch(skinBlock, /#[0-9a-f]{3,8}/i, 'skin.css body.pha-skin must not contain hard-coded hex');
});

/* ──────────────────────────────────────────────────────────
   Priority 3 — PPC Coach Tailwind config must align with the
   central token system (no parallel colour definitions)
   ────────────────────────────────────────────────────────── */
test('ppc-coach tailwind config aligns navy palette and fonts with central tokens', () => {
  const html = read('ppc-coach.html');
  const config = html.match(/tailwind\.config\s*=\s*\{[\s\S]*?\}\};/)?.[0] || '';

  // navy palette must match --c-navy-1 / --c-navy-2 / --c-navy-3
  assert.match(config, /navy:\{[^}]*DEFAULT:'#0F1419'[^}]*\}/);
  assert.match(config, /navy:\{[^}]*800:'#131921'[^}]*\}/);
  assert.match(config, /navy:\{[^}]*700:'#232F3E'[^}]*\}/);

  // brand 500 must equal --c-orange
  assert.match(config, /brand:\{[^}]*500:'#FF9900'[^}]*\}/);

  // font families must reference token variables, not legacy stacks
  assert.match(config, /sans:\['var\(--font-body\)'/);
  assert.match(config, /display:\['var\(--font-disp\)'/);

  // box-shadow must use --c-navy-1 rgb (15,17,17), not the old (15,23,42)
  assert.doesNotMatch(config, /rgba\(15,23,42/);

  // body must not use arbitrary hex background values
  assert.doesNotMatch(html, /class="[^"]*bg-\[#/);
});

test('ppc-coach module data references CSS variables, not hard-coded hex', () => {
  const html = read('ppc-coach.html');

  // Module colour entries must use CSS variable references
  assert.doesNotMatch(html, /color:"#0EA5E9"/);
  assert.doesNotMatch(html, /color:"#10B981"/);
  assert.doesNotMatch(html, /color:"#8B5CF6"/);
  assert.doesNotMatch(html, /color:"#EC4899"/);
  assert.doesNotMatch(html, /color:"#EF4444"/);
  assert.doesNotMatch(html, /color:"#F59E0B"/);

  // Verify the CSS variable references exist
  assert.match(html, /color:"var\(--c-orange\)"/);
  assert.match(html, /color:"var\(--mc-blue\)"/);
  assert.match(html, /color:"var\(--mc-emerald\)"/);
  assert.match(html, /color:"var\(--mc-violet\)"/);
  assert.match(html, /color:"var\(--mc-pink\)"/);
  assert.match(html, /color:"var\(--c-red\)"/);
  assert.match(html, /color:"var\(--c-amber\)"/);

  // Gradient must use color-mix, not hex+opacity trick
  assert.doesNotMatch(html, /m\.color\+'18/);
  assert.match(html, /color-mix\(in srgb,/);

  // Funnel diagram must use token references, not hex
  assert.doesNotMatch(html, /cols=\["#FF9900"/);
  assert.match(html, /cols=\["var\(--c-chart-1\)"/);

  // Chart data must use token references
  assert.doesNotMatch(html, /backgroundColor:\["#FF9900","#E2E8F0"\]/);
  assert.match(html, /backgroundColor:\["var\(--c-orange\)","var\(--c-border-2\)"\]/);

  // Final exam colour must use token
  assert.match(html, /color:"var\(--c-navy-1\)"/);
});

test('ppc-coach.css bridges tailwind utilities through token variables', () => {
  const css = read('assets/ppc-coach.css');

  // Module colour custom properties must be defined in :root
  assert.match(css, /--mc-blue:\s*#0EA5E9/);
  assert.match(css, /--mc-emerald:\s*#10B981/);
  assert.match(css, /--mc-violet:\s*#8B5CF6/);
  assert.match(css, /--mc-pink:\s*#EC4899/);

  // key Tailwind-to-token bridge rules
  assert.match(css, /\.bg-navy\s*\{[^}]*var\(--c-navy-1\)/);
  assert.match(css, /\.text-navy\s*\{[^}]*var\(--c-navy-1\)/);
  assert.match(css, /\.bg-brand-500\s*\{[^}]*var\(--c-orange\)/);
  assert.match(css, /\.text-slate-800\s*\{[^}]*var\(--c-navy-2\)/);
  assert.match(css, /\.bg-emerald-50\s*\{[^}]*var\(--c-green-bg\)/);
  assert.match(css, /\.text-red-600\s*\{[^}]*var\(--c-red-text\)/);

  // font tokens bridged
  assert.match(css, /\.font-sans\s*\{[^}]*var\(--font-body\)/);
  assert.match(css, /\.font-display\s*\{[^}]*var\(--font-disp\)/);

  // No hard-coded hex in component styles (only in :root module definitions)
  const rootBlock = css.match(/:root\s*\{[\s\S]*?\n\}/)?.[0] || '';
  assert.match(rootBlock, /--mc-blue:\s*#0EA5E9/);
  const componentStyles = css.replace(/:root\s*\{[\s\S]*?\n\}/, '');
  const hexInComponents = componentStyles.match(/#[0-9A-Fa-f]{6}/g);
  assert.strictEqual(hexInComponents, null, 'ppc-coach.css component styles must not hard-code hex');
});
