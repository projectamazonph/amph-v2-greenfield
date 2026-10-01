const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

// Why this file exists
// -------------------
// Every other gate in this repo reads files. The flagship course page was a SyntaxError for four
// weeks with the suite green, and the first font-vendoring pass shipped 24 faces that all 404-ed
// with the suite green. Both defects are invisible to static analysis and obvious to a browser:
// the page either throws, or asks for nothing. This test loads every root page in a real browser
// engine and asserts it actually runs.
//
// It loads pages over file://, which is the *desktop* condition - the shipped product is the
// Electron installer, and a page has no http origin there, so CSP 'self' is judged the same way the
// installed app judges it. No local HTTP server is needed.
//
// SCOPE, stated so nobody over-trusts it: this covers the 20 root tool pages - the pages with
// simulator state, charts, uploads and scoring. It does NOT cover the other 196 product pages
// (191 under coach-decks/, 5 under learn/), which are static prose and deck pages. Walking those
// too is a one-line change but adds roughly four minutes to every local run, so it is a deliberate
// exclusion rather than an oversight.
//
// It degrades to a skip rather than a failure when no browser is available (CI runners, machines
// where Edge/Chrome is elsewhere), because a gate that turns a missing developer tool into a red
// build gets deleted within a week.

const root = path.resolve(__dirname, '..');
const OPT_OUT = process.env.PHASM_NO_SMOKE === '1';
const BROWSER_ENV = process.env.PHASM_BROWSER;
const PORT = Number(process.env.PHASM_SMOKE_PORT || 9333);
const PROFILE = path.join(os.tmpdir(), 'phasm-smoke-profile');
const PER_PAGE_TIMEOUT_MS = Number(process.env.PHASM_SMOKE_PAGE_TIMEOUT || 20000);

const CANDIDATES = [
  BROWSER_ENV,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
].filter(Boolean);

// Console noise that is real, already documented in PROJECT-CONTEXT.md, and not caused by the page
// rendering. Each entry is a prefix match plus the reason it is tolerated.
const KNOWN = [
  {
    prefix: "The Content Security Policy directive 'frame-ancestors' is ignored",
    why: 'every page carries it in <meta>; GitHub Pages cannot send headers - pending a security decision',
  },
  {
    prefix: 'cdn.tailwindcss.com should not be used in production',
    why: 'emitted by the vendored Tailwind Play runtime itself, which is intentional for now',
  },
];

function findBrowser() {
  for (const c of CANDIDATES) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {
      /* keep looking */
    }
  }
  return null;
}

function getJson(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http
      .get(url, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(null);
          }
        });
      })
      .on('error', () => resolve(null));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function waitForDevtools(deadlineMs) {
  const until = Date.now() + deadlineMs;
  while (Date.now() < until) {
    const v = await getJson(`http://127.0.0.1:${PORT}/json/version`);
    if (v && v.webSocketDebuggerUrl) return v;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

function pagesToCheck() {
  // Dot-prefixed entries are undeletable local scratch on this machine (this repo's safety policy
  // blocks Remove-Item), not product files. Every other HTML walker in tests/ skips them for the
  // same reason, and the first run of this test proved why: five `.tmp-cand*.html` stubs failed
  // the render assertions while all 25 real pages passed.
  return fs
    .readdirSync(root)
    .filter((f) => f.endsWith('.html') && !f.startsWith('.'))
    .sort();
}

class Cdp {
  constructor(url) {
    this.url = url;
    this.next = 0;
    this.pend = new Map();
    this.events = [];
  }

  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((res, rej) => {
      this.ws.addEventListener('open', res, { once: true });
      this.ws.addEventListener('error', rej, { once: true });
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pend.has(msg.id)) {
        const p = this.pend.get(msg.id);
        this.pend.delete(msg.id);
        msg.error ? p.rej(new Error(`${msg.method}: ${msg.error.message}`)) : p.res(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }

  send(method, params = {}, sessionId) {
    return new Promise((res, rej) => {
      const id = ++this.next;
      this.pend.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  drain(predicate) {
    return this.events.filter(predicate);
  }

  clear() {
    this.events = [];
  }

  close() {
    try {
      this.ws.close();
    } catch {
      /* already gone */
    }
  }
}

test('every root page loads and runs in a real browser engine', async (t) => {
  if (OPT_OUT) return t.skip('PHASM_NO_SMOKE=1');
  const exe = findBrowser();
  if (!exe) return t.skip('no Edge/Chrome found (set PHASM_BROWSER to enable)');

  const child = spawn(
    exe,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-gpu',
      '--disable-sync',
    ],
    { windowsHide: true, stdio: 'ignore' }
  );

  const version = await waitForDevtools(12000);
  if (!version) {
    child.kill();
    // A profile already locked by a running instance is the usual cause; that is an environment
    // condition, not a product defect.
    return t.skip(`browser at ${exe} did not expose DevTools on ${PORT} (profile busy or browser missing)`);
  }

  const cdp = new Cdp(version.webSocketDebuggerUrl);
  await cdp.open();

  const teardown = async () => {
    cdp.close();
    try {
      child.kill();
    } catch {
      /* already exited */
    }
  };
  t.after(teardown);

  const failures = [];

  // Coverage guard. A walker that quietly stopped finding pages would make everything below pass by
  // omission, which is the exact failure mode that let the dead course page through for four weeks.
  // The bound is the ROOT PRODUCT page count, not whatever a directory listing returns: on this
  // machine `Get-ChildItem -Filter *.html` reports 25 because five undeletable `.tmp-*.html` scratch
  // stubs sit in the root, and conflating those two populations is what previously put a wrong page
  // count into PROJECT-CONTEXT.md. tests/csp-fontsource.test.cjs pins a different set (25 pages
  // tree-wide that link assets/fonts.css) — do not compare the two numbers.
  const pages = pagesToCheck();
  assert.ok(pages.length >= 20, `expected at least 20 root product pages to smoke-load, walker found ${pages.length}: ${pages.join(', ')}`);
  t.diagnostic(`smoke-loading ${pages.length} root pages over file://`);

  for (const page of pages) {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Log.enable', {}, sessionId);
    await cdp.send('Network.enable', {}, sessionId);
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
    cdp.clear();

    await cdp.send('Page.navigate', { url: `file:///${path.join(root, page).replace(/\\/g, '/')}` }, sessionId);

    const loaded = await Promise.race([
      new Promise((res) => {
        const until = Date.now() + PER_PAGE_TIMEOUT_MS;
        const poll = () => {
          if (cdp.drain((e) => e.sessionId === sessionId && e.method === 'Page.loadEventFired').length) return res(true);
          if (Date.now() > until) return res(false);
          setTimeout(poll, 100);
        };
        poll();
      }),
      new Promise((res) => setTimeout(() => res(false), PER_PAGE_TIMEOUT_MS)),
    ]);

    // Let late console output and font/image decodes land before reading state.
    await new Promise((r) => setTimeout(r, 600));

    const problems = [];
    if (!loaded) problems.push('load event never fired');

    const missing = cdp.drain(
      (e) => e.sessionId === sessionId && e.method === 'Network.loadingFailed' && !/ERR_ABORTED/.test(e.params.errorText)
    );
    if (missing.length) {
      problems.push(`${missing.length} subresource request(s) failed: ${missing.map((e) => `${e.params.errorText} ${e.params.requestId}`.slice(0, 90)).slice(0, 3).join(' | ')}`);
    }

    const http4xx = cdp.drain(
      (e) => e.sessionId === sessionId && e.method === 'Network.responseReceived' && e.params.response.status >= 400
    );
    if (http4xx.length) problems.push(`${http4xx.length} response(s) >= 400: ${http4xx.map((e) => e.params.response.url.split('/').pop()).slice(0, 3).join(' | ')}`);

    const thrown = cdp.drain((e) => e.sessionId === sessionId && e.method === 'Runtime.exceptionThrown');
    if (thrown.length) {
      problems.push(
        `${thrown.length} uncaught exception(s): ${thrown
          .map((e) => (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text || '').split('\n')[0])
          .slice(0, 2)
          .join(' | ')}`
      );
    }

    // Two sources of page-side noise: Log.entryAdded carries engine-detected problems (CSP
    // violations, blocked requests) while Runtime.consoleAPICalled carries what the page's own
    // script logged. Both are filtered through the same allowlist.
    const noise = [];
    for (const e of cdp.drain((ev) => ev.sessionId === sessionId && ev.method === 'Log.entryAdded')) {
      if (e.params.entry.level !== 'error' && e.params.entry.level !== 'warning') continue;
      noise.push({ level: e.params.entry.level, text: e.params.entry.text || '' });
    }
    for (const e of cdp.drain((ev) => ev.sessionId === sessionId && ev.method === 'Runtime.consoleAPICalled')) {
      if (e.params.type !== 'error' && e.params.type !== 'warning') continue;
      const text = (e.params.args || [])
        .map((a) => (typeof a.value === 'string' ? a.value : a.description || a.unserializableValue || ''))
        .join(' ')
        .trim();
      noise.push({ level: e.params.type, text });
    }

    const unexpected = noise
      .filter((n) => !KNOWN.some((k) => n.text.startsWith(k.prefix)))
      .slice(0, 3)
      .map((n) => `${n.level}: ${n.text.slice(0, 140)}`);
    if (unexpected.length) problems.push(`console noise not on the known list:\n      ${unexpected.join('\n      ')}`);

    const state = await cdp.send(
      'Runtime.evaluate',
      {
        expression: `JSON.stringify({
          title: (document.title || '').trim(),
          bodyKids: document.body ? document.body.children.length : -1,
          fontsLoaded: [...document.fonts].filter(f => f.status === 'loaded').length,
          faces: document.fonts.size,
          imgs: document.images.length,
          broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).length,
          app: !!(document.querySelector('#app,main,.pha-skin-wrap') || document.body.children.length > 2)
        })`,
        returnByValue: true,
      },
      sessionId
    );
    const s = JSON.parse(state.result.value);

    if (!s.title) problems.push('document.title is empty');
    if (s.bodyKids <= 0) problems.push('body rendered no children');
    if (s.faces > 0 && s.fontsLoaded === 0) problems.push(`page declares ${s.faces} font faces and loaded none`);
    if (s.broken > 0) problems.push(`${s.broken} broken image(s) of ${s.imgs}`);

    await cdp.send('Target.closeTarget', { targetId });

    if (problems.length) failures.push(`${page}\n    - ${problems.join('\n    - ')}`);
  }

  assert.deepEqual(failures, [], `${failures.length} page(s) did not load and run cleanly:\n\n  ${failures.join('\n\n  ')}`);
});
