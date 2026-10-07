const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const CurriculumManifest = require('../assets/curriculum-manifest.js');

const html = fs.readFileSync(path.join(root, 'ppc-coach.html'), 'utf8');

// Grab a top-level literal whose declaration ends with the opening character and
// whose closing brace/bracket sits on its own line. Keeping the anchors that
// strict means the extractor fails loudly rather than silently reading too much.
function literalOf(decl, closingLine) {
  const start = html.indexOf(decl);
  assert.notEqual(start, -1, `ppc-coach.html must declare \`${decl}\``);
  const end = html.indexOf(closingLine, start);
  assert.notEqual(end, -1, `\`${decl}\` must close with \`${closingLine}\` on its own line`);
  return html.slice(start + decl.length - 1, end + 2); // `[` / `{` through the matching close
}

function evalLiteral(decl, closingLine, sandbox) {
  return vm.runInNewContext(`(${literalOf(decl, closingLine)})`, sandbox);
}

function readCoachModules() {
  // MODULES reaches for IMG (lesson hero images), so the sandbox needs it and
  // nothing else — any other global reference throws and fails the test.
  const images = evalLiteral('const IMG = {', '\n};', Object.create(null));
  return evalLiteral('const MODULES=[', '\n];', vm.createContext({ IMG: images }));
}

test('ppc-coach module list matches the curriculum manifest, in order', () => {
  const modules = readCoachModules();

  assert.equal(modules.length, 12, 'the course is 12 modules');
  assert.equal(modules.length, CurriculumManifest.MODULES.length, 'coach and manifest must agree');

  // Quiz ids and stored progress keys are positional (m0..m11), so a renamed,
  // reordered, or dropped module silently points old learner data at new content.
  CurriculumManifest.MODULES.forEach((entry, index) => {
    assert.equal(modules[index].title, entry.title, `module ${index + 1} title drifted from ${entry.id}`);
  });
});

test('ppc-coach lessons and quizzes are complete enough to grade', () => {
  const modules = readCoachModules();
  const lessonIds = new Set();

  let totalLessons = 0;
  let totalQuestions = 0;

  modules.forEach((module, moduleIndex) => {
    const where = `module ${moduleIndex + 1} (${module.title})`;

    assert.ok(module.icon, `${where} needs an icon`);
    assert.match(module.color, /^var\(--/, `${where} must theme through a CSS token`);
    assert.ok(module.desc, `${where} needs a description`);
    assert.ok(Array.isArray(module.lessons) && module.lessons.length > 0, `${where} needs lessons`);

    module.lessons.forEach((lesson) => {
      totalLessons += 1;
      assert.ok(lesson.id, `${where} has a lesson without an id`);
      assert.ok(!lessonIds.has(lesson.id), `duplicate lesson id "${lesson.id}" breaks saved progress`);
      lessonIds.add(lesson.id);
      assert.ok(lesson.title, `lesson ${lesson.id} needs a title`);
      assert.ok(lesson.mins > 0, `lesson ${lesson.id} needs a positive duration`);
      assert.ok(
        Array.isArray(lesson.blocks) && lesson.blocks.length > 0,
        `lesson ${lesson.id} needs at least one content block`
      );
      lesson.blocks.forEach((block, i) => {
        assert.ok(block && typeof block.t === 'string' && block.t.length > 0, `lesson ${lesson.id} block ${i} has no type`);
      });
    });

    assert.ok(Array.isArray(module.quiz) && module.quiz.length >= 3, `${where} needs at least 3 quiz questions`);
    module.quiz.forEach((question, qIndex) => {
      totalQuestions += 1;
      const at = `${where} quiz question ${qIndex + 1}`;
      assert.ok(question.q, `${at} needs a prompt`);
      assert.ok(Array.isArray(question.o) && question.o.length >= 2, `${at} needs answer options`);
      assert.ok(
        Number.isInteger(question.a) && question.a >= 0 && question.a < question.o.length,
        `${at} points at option index ${question.a}, which does not exist`
      );
      assert.ok(question.e, `${at} needs an explanation so a wrong answer teaches`);
    });
  });

  // The page advertises this shape to learners; keep the copy honest.
  assert.equal(totalLessons, 60, 'the course copy promises 60 lessons');
  assert.equal(totalQuestions, modules.length * 3, 'one quiz set per module, same size');
});

/* ================= LESSON AIDS ================= */

test('every lesson ends with a "Your next step" aid and a check-yourself question', () => {
  const modules = readCoachModules();
  modules.forEach((module) => {
    module.lessons.forEach((lesson) => {
      const last = lesson.blocks[lesson.blocks.length - 1];
      assert.equal(
        last.t,
        'next',
        `lesson ${lesson.id} must end with a "next" block so the teaching standard's direction rule holds`
      );
      assert.ok(last.x && last.x.length > 20, `lesson ${lesson.id} next-step prompt is too thin to act on`);
      assert.ok(last.q && last.q.length > 10, `lesson ${lesson.id} needs a retrieval question in its next block`);
      assert.equal(
        lesson.blocks.filter((b) => b.t === 'next').length,
        1,
        `lesson ${lesson.id} should carry exactly one next block`
      );
    });
  });
});

test('the block renderer knows the next-block type', () => {
  assert.match(html, /b\.t==="next"/, 'renderBlock must render the "next" aid');
  assert.match(
    html,
    /Your next step:/,
    'the next block renders a visible "Your next step" label'
  );
});
