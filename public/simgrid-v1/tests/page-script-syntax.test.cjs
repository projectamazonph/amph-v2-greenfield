const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');

// Directories that never ship page code and must not be scanned.
const SKIP_DIRS = new Set(['.git', 'node_modules', 'release', 'dist', 'out', 'build', '.cache']);

// Script types the browser executes as classic JavaScript.
const JS_TYPE_RE = /^(?:text|application)\/(?:javascript|ecmascript)$/i;
const MODULE_TYPE_RE = /^(?:text|application)\/javascript;?\s*;?\s*module$/i;
const JSON_TYPE_RE = /^(?:application|text)\/(?:ld\+)?json$/i;

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const TYPE_ATTR_RE = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i;

function htmlFiles(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      htmlFiles(path.join(dir, entry.name), found);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      found.push(path.join(dir, entry.name));
    }
  }
  return found;
}

function scriptType(attrs) {
  const match = TYPE_ATTR_RE.exec(attrs);
  if (!match) return '';
  return (match[1] || match[2] || match[3] || '').trim();
}

function isExecutable(type) {
  if (type === '') return true; // classic <script> with no type attribute
  if (MODULE_TYPE_RE.test(type)) return false; // needs module semantics, out of scope
  return JS_TYPE_RE.test(type);
}

// Browsers ignore the legacy HTML-comment wrapper inside <script> blocks.
function unwrapComment(code) {
  return code.replace(/^\s*<!--/, '').replace(/-->\s*$/, '');
}

// vm syntax errors put the position on the first stack line as "<filename>:<line>"
// (a column is not always present); anything else means we cannot map it.
function lineInScript(err, rel) {
  const head = String(err.stack || '').split('\n')[0];
  if (!head.startsWith(`${rel}:`)) return 0;
  const line = Number(head.slice(rel.length + 1).split(':')[0]);
  return Number.isInteger(line) ? line : 0;
}

test('every page ships inline scripts that actually parse', () => {
  const files = htmlFiles(root);

  // Guard against a broken walk reporting a clean run over nothing.
  assert.ok(files.length > 100, `expected 100+ HTML pages, scanned ${files.length}`);
  assert.ok(
    files.some((file) => path.basename(file) === 'ppc-coach.html'),
    'the scan must include ppc-coach.html'
  );

  const failures = [];
  let checked = 0;

  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const html = fs.readFileSync(file, 'utf8');
    let match;

    SCRIPT_RE.lastIndex = 0;
    while ((match = SCRIPT_RE.exec(html)) !== null) {
      const attrs = match[1] || '';
      const raw = match[2] || '';
      if (/\bsrc\s*=/i.test(attrs)) continue; // external file, covered elsewhere
      const type = scriptType(attrs);
      const code = unwrapComment(raw);
      if (code.trim() === '') continue;

      const openTagEnd = match.index + match[0].indexOf('>') + 1;
      const tagLine = html.slice(0, match.index).split('\n').length;
      const codeLine = html.slice(0, openTagEnd).split('\n').length;
      const at = (scriptLine) =>
        scriptLine > 0 ? `line ${codeLine + scriptLine - 1}` : `line ${tagLine} (<script> tag)`;

      if (JSON_TYPE_RE.test(type)) {
        checked += 1;
        try {
          JSON.parse(code);
        } catch (err) {
          failures.push(`${rel}: <script type="${type}"> at ${at(0)}: ${err.message}`);
        }
        continue;
      }

      if (!isExecutable(type)) continue;
      checked += 1;

      try {
        // Parse only. Never executed, so page globals stay irrelevant.
        new vm.Script(code, { filename: rel });
      } catch (err) {
        failures.push(`${rel}: ${at(lineInScript(err, rel))}: ${err.message}`);
      }
    }
  }

  assert.ok(checked > 40, `expected 40+ inline script blocks, found ${checked}`);
  assert.deepEqual(failures, [], `${failures.length} inline script block(s) fail to parse`);
});
