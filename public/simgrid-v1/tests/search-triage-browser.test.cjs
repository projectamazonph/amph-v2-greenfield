const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

// Browser completion tests for Search Term Triage simulator
// These tests verify the HTML structure and core functionality without DOM

test('Search Term Triage core module exports expertFor function', () => {
  const SearchTriageCore = require('../assets/search-triage-core.js');
  
  assert.ok(typeof SearchTriageCore.expertFor === 'function');
  assert.ok(typeof SearchTriageCore.RUBRIC_VERSION === 'string');
});

test('Search Term Triage expertFor handles all grading classes', () => {
  const SearchTriageCore = require('../assets/search-triage-core.js');
  
  const classes = [
    'winner', 'head', 'starved', 'zero', 'irr', 'pat', 'comp', 'trap', 'early'
  ];
  
  classes.forEach(cls => {
    const result = SearchTriageCore.expertFor({ cls: cls, m: {} }, { margin: 30 });
    assert.ok(result.a, `Class ${cls} should return an action`);
    assert.ok(result.why, `Class ${cls} should return a why explanation`);
  });
});

test('Search Term Triage expertFor throws on unknown class', () => {
  const SearchTriageCore = require('../assets/search-triage-core.js');
  
  assert.throws(
    () => SearchTriageCore.expertFor({ cls: 'unknown', m: {} }, { margin: 30 }),
    /Unknown Search Term Triage class/
  );
});

test('Search Term Triage handles winner class with metrics', () => {
  const SearchTriageCore = require('../assets/search-triage-core.js');
  
  const result = SearchTriageCore.expertFor({
    cls: 'winner',
    m: { clicks: 100, orders: 15, acos: 25 }
  }, { margin: 30 });
  
  assert.equal(result.a, 'HARVEST');
  assert.match(result.why, /15 orders/);
  assert.match(result.why, /25.0% ACOS/);
  assert.match(result.why, /30%/);
});

test('Search Term Triage handles zero-order traffic correctly', () => {
  const SearchTriageCore = require('../assets/search-triage-core.js');
  
  const result = SearchTriageCore.expertFor({
    cls: 'zero',
    m: { clicks: 15, orders: 0, acos: null }
  }, { margin: 30 });
  
  assert.equal(result.a, 'KEEP');
  assert.match(result.why, /zero orders is not an automatic negative/i);
});

test('Search Term Triage handles irrelevant traffic with NEG_EXACT', () => {
  const SearchTriageCore = require('../assets/search-triage-core.js');
  
  const result = SearchTriageCore.expertFor({
    cls: 'irr',
    m: {}
  }, { margin: 30 });
  
  assert.equal(result.a, 'NEG_EXACT');
  assert.match(result.why, /do not sell/);
});

test('Search Term Triage handles pattern negatives with NEG_PHRASE', () => {
  const SearchTriageCore = require('../assets/search-triage-core.js');
  
  const result = SearchTriageCore.expertFor({
    cls: 'pat',
    word: 'cheap',
    m: {}
  }, { margin: 30 });
  
  assert.equal(result.a, 'NEG_PHRASE');
  assert.match(result.why, /cheap/);
});

test('Search Term Triage handles early converter with thin data', () => {
  const SearchTriageCore = require('../assets/search-triage-core.js');
  
  const result = SearchTriageCore.expertFor({
    cls: 'early',
    m: { clicks: 6, orders: 1, acos: 18 }
  }, { margin: 30 });
  
  assert.equal(result.a, 'KEEP');
  assert.match(result.why, /still thin evidence/);
});

test('Search Term Triage page has required meta tags', () => {
  const html = fs.readFileSync('./search-triage.html', 'utf8');
  
  // Check for required meta tags
  assert.match(html, /<meta name="description"/i);
  assert.match(html, /<meta name="keywords"/i);
  assert.match(html, /<meta name="viewport"/i);
  
  // Check for Open Graph tags
  assert.match(html, /<meta property="og:title"/i);
  assert.match(html, /<meta property="og:description"/i);
  assert.match(html, /<meta property="og:type"/i);
  
  // Check for canonical URL
  assert.match(html, /<link rel="canonical"/i);
});

test('Search Term Triage page has structured data', () => {
  const html = fs.readFileSync('./search-triage.html', 'utf8');
  
  // Check for JSON-LD structured data
  assert.match(html, /<script type="application\/ld\+json">/i);
  assert.match(html, /"@context": "https:\/\/schema.org"/i);
  assert.match(html, /"@type": "WebPage"/i);
});

test('Search Term Triage page links to shell resources', () => {
  const html = fs.readFileSync('./search-triage.html', 'utf8');
  
  // Verify shell.js is included
  assert.match(html, /<script src="assets\/shell\.js"/i);
  
  // Verify tokens.css is included
  assert.match(html, /<link rel="stylesheet" href="assets\/tokens\.css">/i);
  
  // Verify skin.css is included
  assert.match(html, /<link rel="stylesheet" href="assets\/skin\.css">/i);
  
  // Verify shell.css is included
  assert.match(html, /<link rel="stylesheet" href="assets\/shell\.css">/i);
});

test('Search Term Triage page loads search-triage-core.js', () => {
  const html = fs.readFileSync('./search-triage.html', 'utf8');
  
  // Verify search-triage-core.js is loaded
  assert.match(html, /<script src="assets\/search-triage-core\.js"/i);
});

test('Search Term Triage page has proper title', () => {
  const html = fs.readFileSync('./search-triage.html', 'utf8');
  
  assert.match(html, /<title>.*Search Term Triage.*<\/title>/i);
});

test('Search Term Triage page includes simulator attempt tracking', () => {
  const html = fs.readFileSync('./search-triage.html', 'utf8');
  
  // Verify simulator attempt script is loaded
  assert.match(html, /<script src="assets\/simulator-attempt\.js"/i);
  
  // Verify student progress script is loaded
  assert.match(html, /<script src="assets\/student-progress\.js"/i);
});

test('Search Term Triage core handles head class with high ACOS', () => {
  const SearchTriageCore = require('../assets/search-triage-core.js');
  
  const result = SearchTriageCore.expertFor({
    cls: 'head',
    m: { clicks: 50, orders: 5, acos: 45 }
  }, { margin: 30 });
  
  assert.equal(result.a, 'KEEP');
  assert.match(result.why, /45.0% ACOS/);
  assert.match(result.why, /above your 30%/);
});

test('Search Term Triage core handles starved class with low clicks', () => {
  const SearchTriageCore = require('../assets/search-triage-core.js');
  
  const result = SearchTriageCore.expertFor({
    cls: 'starved',
    m: { clicks: 5, orders: 0, acos: 0 }
  }, { margin: 30 });
  
  assert.equal(result.a, 'KEEP');
  assert.match(result.why, /Only 5 clicks/);
  assert.match(result.why, /gather a fair sample/);
});

test('Search Term Triage core handles competitor class', () => {
  const SearchTriageCore = require('../assets/search-triage-core.js');
  
  const result = SearchTriageCore.expertFor({
    cls: 'comp',
    m: {}
  }, { margin: 30 });
  
  assert.equal(result.a, 'NEG_EXACT');
  assert.match(result.why, /another brand by name/);
});

test('Search Term Triage core handles trap class', () => {
  const SearchTriageCore = require('../assets/search-triage-core.js');
  
  const result = SearchTriageCore.expertFor({
    cls: 'trap',
    m: {}
  }, { margin: 30 });
  
  assert.equal(result.a, 'NEG_EXACT');
  assert.match(result.why, /does not fit your product/);
});
