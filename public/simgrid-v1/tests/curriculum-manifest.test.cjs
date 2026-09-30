const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const CurriculumManifest = require('../assets/curriculum-manifest.js');

test('curriculum manifest maps all twelve Coach modules to valid simulator practice', () => {
  assert.equal(CurriculumManifest.MODULES.length, 12);

  const simulatorIds = new Set(CurriculumManifest.SIMULATORS.map((simulator) => simulator.id));

  CurriculumManifest.MODULES.forEach((module, index) => {
    assert.equal(module.id, `m${index}`);
    assert.ok(module.practice.length > 0, `${module.id} must assign simulator practice`);

    module.practice.forEach((assignment) => {
      assert.ok(
        simulatorIds.has(assignment.simulatorId),
        `${module.id} references unknown simulator ${assignment.simulatorId}`
      );
      assert.ok(assignment.minimumScore > 0 && assignment.minimumScore <= 100);
    });
  });
});

test('every simulator in the curriculum manifest points to a live page', () => {
  CurriculumManifest.SIMULATORS.forEach((simulator) => {
    assert.ok(fs.existsSync(simulator.file), `${simulator.file} must exist`);
  });
});

test('Module 1 (Amazon Advertising Foundations) assigns BuyBox Dojo as required practice', () => {
  const module = CurriculumManifest.getModule('m0');

  assert.equal(module.title, 'Amazon Advertising Foundations');
  assert.deepEqual(module.practice, [
    {
      simulatorId: 'listing',
      minimumScore: 75,
      required: true
    }
  ]);
});

test('manifest validation rejects duplicate identifiers and broken assignments', () => {
  const errors = CurriculumManifest.validateManifest({
    simulators: [
      { id: 'duplicate', file: 'one.html' },
      { id: 'duplicate', file: 'two.html' }
    ],
    modules: [
      {
        id: 'm0',
        practice: [{ simulatorId: 'missing', minimumScore: 75, required: true }]
      }
    ]
  });

  assert.deepEqual(errors, [
    'Duplicate simulator id: duplicate',
    'Module m0 references unknown simulator: missing'
  ]);
});
