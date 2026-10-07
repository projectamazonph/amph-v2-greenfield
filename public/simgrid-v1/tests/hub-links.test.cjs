const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assertSimulatorSlot({ name, file, id, category }) {
  const index = read('index.html');
  const planned = read('planned-simulators.html');
  const shell = read('assets/shell.js');

  const escapedFile = file.replace('.', '\\.');
  const categoryPattern = new RegExp('<span class="cat">' + category + '<\\/span><span class="pha-tcard-cta">Open simulator \\u2192<\\/span>');

  assert.match(index, new RegExp('href="' + escapedFile + '"'));
  assert.match(index, new RegExp(name));
  assert.match(planned, new RegExp('href="' + escapedFile + '"'));
  assert.match(planned, categoryPattern);
  assert.match(shell, new RegExp("id: '" + id + "'"));
  assert.match(shell, new RegExp("file: '" + escapedFile + "'"));
}

[
  { name: 'SQP Studio', file: 'sqp-studio.html', id: 'sqp-studio', category: 'Analytics' },
  { name: 'Bid Decisions', file: 'bid-decisions.html', id: 'bid-decisions', category: 'Bids' },
  { name: 'Campaign Architect', file: 'campaign-architect.html', id: 'campaign-architect', category: 'Planning' },
  { name: 'Account Audit', file: 'account-audit.html', id: 'account-audit', category: 'Audit' },
  { name: 'Client Onboarding', file: 'client-onboarding.html', id: 'client-onboarding', category: 'Onboarding' },
  { name: 'Capstone', file: 'capstone-sequence.html', id: 'capstone-sequence', category: 'Capstone' }
].forEach((simulator) => {
  test(`${simulator.name} is slotted into the hub and shared simulator navigation`, () => {
    assertSimulatorSlot(simulator);
  });
});