const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modules = ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11']
  .map(moduleId => [moduleId, 12]);

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('public teaching viewer registers one final deck for every curriculum module', () => {
  const manifest = read('coach-decks/module-decks.js');
  const viewer = read('coach-decks.html');
  const coachTools = read('coach-tools.html');

  assert.match(viewer, /coach-decks\/module-decks\.js/);
  assert.match(viewer, /\?module=\$\{deckId\}/);
  modules.forEach(([moduleId]) => {
    assert.match(manifest, new RegExp(`"id": "${moduleId}"`));
    assert.match(coachTools, new RegExp(`href="coach-decks\\.html\\?module=${moduleId}"`));
  });
});

test('every final module deck has its expected slide sequence and permanent local assets', () => {
  modules.forEach(([moduleId, slideCount]) => {
    const folder = path.join('coach-decks', 'modules', moduleId);
    const slides = fs.readdirSync(folder).filter(file => /^slide_\d+\.html$/.test(file));
    assert.equal(slides.length, slideCount, `${moduleId} slide count`);
    for (let index = 1; index <= slideCount; index += 1) {
      const slide = read(path.join(folder, `slide_${index}.html`));
      assert.doesNotMatch(slide, /private-us-east-1\.manuscdn\.com/);
      assert.match(slide, /slide-container/);
      assert.match(slide, /(?:@keyframes|animation:|transition:)/, `${moduleId} slide ${index} has motion treatment`);
    }
  });
});

test('every final module deck keeps the beginner-first teaching structure', () => {
  modules.forEach(([moduleId, slideCount]) => {
    for (let index = 1; index <= slideCount; index += 1) {
      const slide = read(path.join('coach-decks', 'modules', moduleId, `slide_${index}.html`));
      const text = slide
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const words = text.match(/\b[\w'-]+\b/g) || [];

      assert.match(slide, /data-learning-aid=/, `${moduleId} slide ${index} has a visible learning aid`);
      assert.match(slide, /Your next step:/, `${moduleId} slide ${index} gives a clear learner action`);
      assert.match(slide, /prefers-reduced-motion:reduce/, `${moduleId} slide ${index} supports reduced motion`);
      assert.ok(words.length <= 140, `${moduleId} slide ${index} keeps learner copy short`);

      if (index >= 2 && index <= 8) {
        assert.match(slide, /Word to know/, `${moduleId} concept slide ${index} has a defined term`);
        assert.match(slide, /Plain meaning/, `${moduleId} concept slide ${index} has a plain-language explanation`);
        assert.match(slide, /Worked situation/, `${moduleId} concept slide ${index} has a concrete example`);
      }
      if (index === 9) {
        assert.match(slide, /Try the decision/, `${moduleId} practice slide includes an interactive exercise`);
        assert.match(slide, /choice-btn/, `${moduleId} practice slide includes selectable learner choices`);
        assert.match(slide, /Debrief:/, `${moduleId} practice slide keeps the answer visible without interaction`);
      }
    }
  });
});

test('enriched decks retain authentic local cover illustrations and one testable correct choice per practice exercise', () => {
  modules.forEach(([moduleId]) => {
    const folder = path.join('coach-decks', 'modules', moduleId);
    const cover = read(path.join(folder, 'slide_1.html'));
    const exercise = read(path.join(folder, 'slide_9.html'));
    const image = cover.match(/<img src="([^"]+)"[^>]*alt="[^"]+course illustration"/);

    assert.ok(image, `${moduleId} cover has an authentic course illustration`);
    assert.ok(fs.existsSync(path.resolve(folder, image[1])), `${moduleId} cover illustration resolves locally`);
    assert.equal((exercise.match(/data-correct="true"/g) || []).length, 1, `${moduleId} exercise marks one evidence-based choice as correct`);
  });
});
