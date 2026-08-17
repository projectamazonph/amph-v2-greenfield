const fs = require('fs');
const path = require('path');
const files = [
  'content/curriculum/modules/2-keyword-research/2.2-keyword-research-workflow.mdx',
  'content/curriculum/modules/2-keyword-research/2.4-keyword-grouping.mdx',
  'content/curriculum/modules/3-listing-optimization/3.1-listing-quality-score.mdx',
  'content/curriculum/modules/3-listing-optimization/3.2-listing-anatomy.mdx',
  'content/curriculum/modules/3-listing-optimization/3.3-aplus-content.mdx',
];

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split('\n');
  let lineNo = 0;
  let inCodeBlock = false;
  for (const line of lines) {
    lineNo++;
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    if (trimmed.length === 0) continue;
    // Skip frontmatter, tables, headings, lists, blockquotes
    if (trimmed.startsWith('---') || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('|') || trimmed.startsWith('-') || trimmed.startsWith('*')) continue;
    if (trimmed.startsWith('>')) continue;
    if (trimmed.startsWith('1.') || trimmed.startsWith('2.') || trimmed.startsWith('3.') || trimmed.startsWith('4.') || trimmed.startsWith('5.') || trimmed.startsWith('6.') || trimmed.startsWith('7.')) continue;
    if (trimmed.startsWith('- [')) continue;
    // Sentence split
    const sentences = trimmed.split(/(?<=[.!?])\s+/);
    for (const s of sentences) {
      const wordCount = s.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount > 30) {
        console.log(`${f}:${lineNo} (${wordCount} words): ${s.substring(0, 100)}...`);
      }
    }
  }
}
