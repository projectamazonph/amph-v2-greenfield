const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const baseUrl = 'https://projectamazonph.github.io/amazon-ph-simulators/';
const corePages = [
  'index.html', 'start-here.html', 'ppc-coach.html', 'coach-tools.html', 'coach-resource-library.html',
  'coach-decks.html', 'planned-simulators.html', 'ad-console.html', 'keyword-lab.html',
  'search-triage.html', 'sqp-studio.html', 'bid-decisions.html', 'campaign-architect.html',
  'account-audit.html', 'client-onboarding.html', 'capstone-sequence.html', 'bulk-file.html',
  'listing.html', 'pacing-deck.html', 'learn/index.html', 'learn/guide.html',
  'learn/features.html', 'learn/handouts.html', 'learn/downloads.html'
];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

// Text files committed with LF may be checked out with CRLF on Windows
// runners (git's default `core.autocrlf=true`). Normalize to LF before
// regex assertions that anchor on line breaks.
function readNormalized(file) {
  return read(file).replace(/\r\n/g, '\n');
}

test('core public pages expose canonical, social, and structured discovery metadata', () => {
  corePages.forEach(file => {
    const html = read(file);
    const canonical = new URL(file, baseUrl).href;
    const jsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);

    assert.match(html, /<meta name="description" content="[^"]+">/, `${file} has a description`);
    assert.match(html, new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`), `${file} has its canonical URL`);
    assert.match(html, /<meta property="og:title" content="[^"]+">/, `${file} has Open Graph title`);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/, `${file} has social card metadata`);
    assert.match(html, /<link rel="describedby" type="text\/markdown" href="https:\/\/projectamazonph\.github\.io\/amazon-ph-simulators\/llms\.txt"/, `${file} links the AI-readable guide`);
    assert.ok(jsonMatch, `${file} has JSON-LD`);
    assert.doesNotThrow(() => JSON.parse(jsonMatch[1]), `${file} JSON-LD is valid JSON`);
    const schema = JSON.parse(jsonMatch[1]);
    const footerNavigation = schema['@graph'].find(item => item['@type'] === 'SiteNavigationElement');
    assert.ok(footerNavigation, `${file} includes footer navigation structured data`);
    assert.equal(footerNavigation.name, 'Project Amazon PH Academy footer navigation');
    assert.deepEqual(footerNavigation.hasPart.map(group => group.name), ['Learn footer links', 'Practice footer links', 'Coach footer links', 'Project footer links']);
    assert.equal(footerNavigation.hasPart.flatMap(group => group.itemListElement).length, 13, `${file} exposes all visible footer navigation destinations`);
  });
});

test('crawl and AI-readable files point to the curated public discovery surface', () => {
  const robots = readNormalized('robots.txt');
  const sitemap = read('sitemap.xml');
  const llms = readNormalized('llms.txt');
  const guide = readNormalized('site-guide.md');

  assert.match(robots, /^User-agent: \*\nAllow: \/\n/m);
  assert.match(robots, /Sitemap: https:\/\/projectamazonph\.github\.io\/amazon-ph-simulators\/sitemap\.xml/);
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  corePages.forEach(file => assert.match(sitemap, new RegExp(`<loc>${new URL(file, baseUrl).href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>`)));
  assert.match(llms, /^# Project Amazon PH Academy\n/m);
  assert.match(llms, /\[VA Start Here\]\(https:\/\/projectamazonph\.github\.io\/amazon-ph-simulators\/start-here\.html\)/);
  assert.match(llms, /\[PPC Coach\]\(https:\/\/projectamazonph\.github\.io\/amazon-ph-simulators\/ppc-coach\.html\)/);
  assert.match(llms, /\[Source repository\]\(https:\/\/github\.com\/projectamazonph\/amazon-ph-simulators\)/);
  assert.match(guide, /^# Project Amazon PH Academy SimGrid: Public Site Guide\n/m);
});

test('shared footer exposes concise grouped paths to learning, practice, coaching, and project information', () => {
  const shell = read('assets/shell.js');
  const css = read('assets/shell.css');
  const responsive = read('assets/responsive.css');

  ['Learn', 'Practice', 'Coach', 'Project'].forEach(label => {
    assert.match(shell, new RegExp(`data-label=\\"${label}\\"`), `footer includes ${label} group`);
  });
  assert.match(shell, /AI site guide/);
  assert.match(shell, /VA Start Here/);
  assert.match(shell, /Source Repository/);
  assert.match(css, /grid-template-columns: minmax\(240px, 1\.45fr\) repeat\(4, minmax\(120px, \.8fr\)\)/);
  assert.match(css, /\.pha-footer \.pha-foot-meta \{ grid-column: 1 \/ -1/);
  assert.match(responsive, /@media \(max-width: 767\.98px\)[\s\S]*?\.pha-footer \{[\s\S]*?grid-template-columns: 1fr 1fr/);
  assert.match(responsive, /@media \(min-width: 768px\) and \(max-width: 1023\.98px\)[\s\S]*?\.pha-footer \{[\s\S]*?grid-template-columns: 1fr 1fr/);
  assert.match(responsive, /\.pha-footer \.pha-foot-links a \{ min-height: 40px; \}/);
});

test('VA Start Here provides a searchable plain-English onboarding glossary with direct next-step links', () => {
  const page = read('start-here.html');

  assert.match(page, /New to Amazon\?/);
  assert.match(page, /Your first 30 minutes/);
  assert.match(page, /First rule for a new VA/);
  assert.match(page, /id="glossarySearch"/);
  assert.match(page, /data-group="shopping"/);
  assert.match(page, /data-group="ppc"/);
  assert.match(page, /data-group="campaign"/);
  assert.match(page, /data-group="results"/);
  assert.match(page, /data-group="workflow"/);
  assert.equal((page.match(/<tr data-group=/g) || []).length, 25, 'onboarding glossary keeps the full 25-term quick reference');
  assert.match(page, /Buy Box/);
  assert.match(page, /Break-even ACOS/);
  assert.match(page, /search-triage\.html/);
  assert.match(page, /listing\.html/);
  assert.match(page, /ppc-coach\.html/);
});
