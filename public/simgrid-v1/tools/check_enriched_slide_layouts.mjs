import { spawn } from 'node:child_process';

const chrome = spawn('chromium', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=9228',
  '--user-data-dir=/tmp/enriched-slide-qa', 'about:blank'
], { stdio: 'ignore' });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const port = 9228;

async function waitForChrome() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) return;
    } catch { /* wait for Chrome */ }
    await delay(200);
  }
  throw new Error('Chrome DevTools did not start.');
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 1;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  });
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('DevTools connection failed.')), { once: true });
  });
  return { ready, send(method, params = {}) { const requestId = id++; return new Promise((resolve, reject) => { pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params })); }); }, close() { ws.close(); } };
}

await waitForChrome();
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const client = connect(target.webSocketDebuggerUrl);
await client.ready;
await client.send('Page.enable');
await client.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

const failures = [];
for (let moduleNumber = 0; moduleNumber < 12; moduleNumber += 1) {
  for (let slideNumber = 1; slideNumber <= 12; slideNumber += 1) {
    const url = `file:///home/ubuntu/amazon-ph-simulators-hub/coach-decks/modules/m${moduleNumber}/slide_${slideNumber}.html`;
    await client.send('Page.navigate', { url });
    await delay(90);
    const result = await client.send('Runtime.evaluate', {
      expression: `(() => { const canvas = document.querySelector('.slide-container'); const action = document.querySelector('.action'); const footer = document.querySelector('.footer'); const c = canvas.getBoundingClientRect(); const a = action.getBoundingClientRect(); const f = footer.getBoundingClientRect(); return JSON.stringify({ canvasWidth: Math.round(c.width), canvasHeight: Math.round(c.height), actionBottom: Math.round(a.bottom - c.top), footerTop: Math.round(f.top - c.top), scrollWidth: canvas.scrollWidth, scrollHeight: canvas.scrollHeight, bodyScrollWidth: document.body.scrollWidth }); })()`,
      returnByValue: true
    });
    const metrics = JSON.parse(result.result.value);
    const valid = metrics.canvasWidth === 1280 && metrics.canvasHeight >= 720 && metrics.scrollWidth <= 1280 && metrics.scrollHeight <= metrics.canvasHeight && metrics.bodyScrollWidth <= 1280 && metrics.actionBottom < metrics.footerTop;
    if (!valid) failures.push({ moduleNumber, slideNumber, metrics });
  }
}

client.close();
chrome.kill('SIGTERM');
if (failures.length) throw new Error(`Layout QA failed: ${JSON.stringify(failures)}`);
console.log('Layout QA passed for 144 enriched module slides.');
