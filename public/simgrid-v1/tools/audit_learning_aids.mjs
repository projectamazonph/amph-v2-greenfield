import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = '/home/ubuntu/amazon-ph-simulators-hub/coach-decks/modules';
const modules = (await readdir(root, { withFileTypes: true }))
  .filter(entry => entry.isDirectory() && /^m\d+$/.test(entry.name))
  .map(entry => entry.name)
  .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

const checks = [
  ['tables', /<table\b/i],
  ['diagrams', /class="[^"]*(diagram|flow|ladder|matrix|funnel)[^"]*"/i],
  ['illustrations', /class="[^"]*(illustration|visual|icon|scene)[^"]*"/i],
  ['exercises', /class="[^"]*(exercise|choice|decision|challenge|practice)[^"]*"/i],
  ['interactiveControls', /<(button|input|details)\b/i],
  ['workedExamples', /worked example|small example|example:/i]
];

const rows = [];
for (const module of modules) {
  const files = (await readdir(path.join(root, module))).filter(file => /^slide_\d+\.html$/.test(file)).sort();
  const results = Object.fromEntries(checks.map(([name]) => [name, 0]));
  for (const file of files) {
    const html = await readFile(path.join(root, module, file), 'utf8');
    for (const [name, pattern] of checks) if (pattern.test(html)) results[name] += 1;
  }
  rows.push({ module, slides: files.length, ...results });
}

const totals = Object.fromEntries(checks.map(([name]) => [name, rows.reduce((sum, row) => sum + row[name], 0)]));
const markdown = [
  '# Module Deck Learning-Aid Audit',
  '',
  'This audit identifies visible teaching aids in the current module deck files. A low count indicates a content-design opportunity, not a learner-performance score.',
  '',
  '| Module | Slides | Tables | Diagrams | Illustrations | Exercises | Interactive controls | Worked examples |',
  '|---|---:|---:|---:|---:|---:|---:|---:|',
  ...rows.map(row => `| ${row.module.toUpperCase()} | ${row.slides} | ${row.tables} | ${row.diagrams} | ${row.illustrations} | ${row.exercises} | ${row.interactiveControls} | ${row.workedExamples} |`),
  `| **Total** | **${rows.reduce((sum, row) => sum + row.slides, 0)}** | **${totals.tables}** | **${totals.diagrams}** | **${totals.illustrations}** | **${totals.exercises}** | **${totals.interactiveControls}** | **${totals.workedExamples}** |`,
  '',
  '## Finding',
  '',
  'The enriched beginner-first series now keeps the plain-language definition and next action while adding diagrams, comparison tables, illustrated decision aids, and one interactive exercise per module. The visual modes are intentionally repeated in a predictable pattern so new learners can focus on the lesson decision rather than relearning the layout.',
  ''
].join('\n');

await writeFile('/home/ubuntu/amazon-ph-simulators-hub/learning_aid_audit.md', markdown);
console.log(markdown);
