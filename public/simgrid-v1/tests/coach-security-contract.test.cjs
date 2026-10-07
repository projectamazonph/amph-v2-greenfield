const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const coach = fs.readFileSync(path.join(root, 'ppc-coach.html'), 'utf8');

test('PPC Coach escapes user-controlled chat text before rendering HTML', () => {
  assert.match(coach, /function escapeHtml\(value\)/);
  assert.match(coach, /escapeHtml\(m\.text\)/);
  assert.doesNotMatch(coach, /box\.innerHTML=.*\+m\.text\+/);
});
