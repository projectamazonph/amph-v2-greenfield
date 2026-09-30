const fs = require('fs');
const path = require('path');

const modules = [
  ['Amazon Basics', '🛒', '#FF9900', 'The marketplace, the listing, and why visibility is everything.', ['What is Amazon Marketplace?', 'Anatomy of a Product Listing', 'Organic vs Paid and the Buy Box']],
  ['What is PPC?', '🖱️', '#0EA5E9', 'Pay per click, the auction, and the click journey.', ['Pay Per Click in Plain Words', 'The Auction', 'The Click Journey and the Funnel']],
  ['Money Math', '🧮', '#10B981', 'CPC, CTR, ACOS, ROAS, TACoS and break-even — with worked examples.', ['Spend, Sales and CPC', 'CTR and Conversion Rate', 'ACOS Deep Dive', 'ROAS, TACoS and a Full Worked Example']],
  ['Campaign Structure', '🗂️', '#8B5CF6', 'Hierarchy, naming, and the three ad types.', ['The Hierarchy: Campaign, Ad Group, Targeting', 'Naming and Organization', 'The Three Ad Types']],
  ['Keywords & Match Types', '🔑', '#F43F5E', 'Keywords vs search terms, match types, negatives, and research.', ['Keyword vs Search Term', 'Match Types Deep Dive', 'Negative Keywords', 'Keyword Research Starter Process']],
  ['Listing Readiness', '📄', '#F59E0B', 'Why PPC cannot fix a weak page, and how to check yours.', ['The Listing Does the Selling', 'The Readiness Checklist', 'Diagnosing Conversion Leaks']],
  ['Campaign Setup', '🏗️', '#06B6D4', 'Auto vs manual, a safe first structure, and a launch plan.', ['Auto vs Manual Campaigns', 'A Safe First Structure', 'New Product Launch Plan']],
  ['Bids & Budgets', '💰', '#84CC16', 'Budget math, bid rules, and a live bid-change walkthrough.', ['Budget Basics', 'Bid Rules for Beginners', 'A Bid Change Walkthrough']],
  ['Search Terms & Negatives', '🕵️', '#EF4444', 'Read the report, pick winners and wasters, run the harvest loop.', ['Reading the Search Term Report', 'Winners and Wasters', 'The Harvesting Workflow']],
  ['Weekly Optimization', '🔄', '#3B82F6', 'The routine, the one-change rule, and how much data is enough.', ['The Weekly Routine', 'One Change at a Time', 'How Much Data is Enough?']],
  ['Reporting & Troubleshooting', '📈', '#6366F1', 'Reports humans understand, and fixing the five classic problems.', ['The Simple Report Structure', 'Explaining Numbers in Human Words', 'Troubleshooting: No Impressions and Low CTR', 'Troubleshooting: Clicks No Sales, High ACOS, Sales Drop']],
  ['VA Workflow & Capstone', '🎓', '#14B8A6', 'Cadence, permissions, SOPs, communication and the final project.', ['Tasks by Cadence', 'The Permissions Ladder', 'SOPs and the Change Log', 'Client Communication and the Capstone']],
];

const esc = value => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

function wrapText(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function textBlock(lines, x, y, lineHeight, attrs = '') {
  return `<text x="${x}" y="${y}" ${attrs}>${lines.map((line, i) => `<tspan x="${x}" dy="${i ? lineHeight : 0}">${esc(line)}</tspan>`).join('')}</text>`;
}

function slug(value) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function render(index, [title, icon, color, description, lessons]) {
  const moduleNumber = String(index + 1).padStart(2, '0');
  const lessonRows = lessons.map((lesson, i) => {
    const y = 425 + i * 76;
    const lines = wrapText(lesson, 47);
    return `<rect x="320" y="${y}" width="1030" height="60" rx="14" fill="#FFFFFF" stroke="#E2E8F0"/>` +
      `<circle cx="350" cy="${y + 30}" r="15" fill="${color}" fill-opacity=".14"/>` +
      `<text x="350" y="${y + 35}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="${color}">${i + 1}</text>` +
      textBlock(lines, 382, y + 27, 18, 'font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#0F172A"') +
      `<text x="1288" y="${y + 34}" text-anchor="end" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#94A3B8">LESSON ${i + 1}</text>`;
  }).join('');
  const quizY = 425 + lessons.length * 76 + 26;
  const descriptionLines = wrapText(description, 74);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="${quizY + 118}" viewBox="0 0 1440 ${quizY + 118}">
  <rect width="1440" height="${quizY + 118}" fill="#F4F5FA"/>
  <rect width="260" height="${quizY + 118}" fill="#0F172A"/>
  <rect x="0" y="0" width="260" height="92" fill="#111C34"/>
  <rect x="24" y="24" width="42" height="42" rx="12" fill="#FFFFFF"/>
  <circle cx="45" cy="45" r="14" fill="${color}" fill-opacity=".88"/>
  <path d="M38 47h14M41 41h8M41 53h8" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round"/>
  <text x="80" y="43" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#FFFFFF">PPC Coach</text>
  <text x="80" y="63" font-family="Arial, sans-serif" font-size="11" fill="#94A3B8">Amazon PPC Teaching Companion</text>
  ${['Dashboard', 'Lessons', 'Glossary', 'Search Term Trainer', 'Campaign Builder', 'Report Builder', 'Quiz Arena', 'AI Coach', 'Cohort (Teacher)'].map((item, i) => {
    const y = 128 + i * 42;
    const active = item === 'Lessons';
    return `${active ? `<rect x="12" y="${y - 25}" width="236" height="36" rx="10" fill="${color}"/>` : ''}<circle cx="31" cy="${y - 7}" r="4" fill="${active ? '#0F172A' : '#64748B'}"/><text x="48" y="${y - 2}" font-family="Arial, sans-serif" font-size="14" font-weight="${active ? '700' : '600'}" fill="${active ? '#0F172A' : '#CBD5E1'}">${esc(item)}</text>`;
  }).join('')}
  <rect x="16" y="${quizY - 42}" width="228" height="70" rx="14" fill="#FFFFFF" fill-opacity=".06" stroke="#FFFFFF" stroke-opacity=".1"/>
  <text x="30" y="${quizY - 16}" font-family="Arial, sans-serif" font-size="11" fill="#94A3B8">YOUR JOURNEY</text>
  <text x="30" y="${quizY + 8}" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="${color}">Trainee</text>
  <rect x="30" y="${quizY + 17}" width="196" height="6" rx="3" fill="#FFFFFF" fill-opacity=".12"/><rect x="30" y="${quizY + 17}" width="36" height="6" rx="3" fill="${color}"/>
  <text x="30" y="${quizY + 43}" font-family="Arial, sans-serif" font-size="11" fill="#94A3B8">0 XP</text>
  <rect x="260" width="1180" height="72" fill="#FFFFFF" fill-opacity=".86" stroke="#E2E8F0"/>
  <text x="300" y="44" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#0F172A">Lessons</text>
  <rect x="1250" y="23" width="82" height="28" rx="14" fill="#0F172A"/><text x="1291" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#FFFFFF">🎓 Trainee</text>
  <text x="320" y="126" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#64748B">12 MODULES · 40 LESSONS · QUIZ AFTER EVERY MODULE</text>
  <rect x="320" y="151" width="1030" height="214" rx="22" fill="#FFFFFF" stroke="#E2E8F0"/>
  <rect x="320" y="151" width="9" height="214" rx="4" fill="${color}"/>
  <circle cx="392" cy="221" r="42" fill="${color}" fill-opacity=".14"/>
  <text x="392" y="233" text-anchor="middle" font-family="Arial, sans-serif" font-size="32">${icon}</text>
  <text x="468" y="211" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="${color}">MODULE ${moduleNumber}</text>
  <text x="468" y="246" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#0F172A">${esc(title)}</text>
  ${textBlock(descriptionLines, 468, 280, 22, 'font-family="Arial, sans-serif" font-size="16" fill="#64748B"')}
  <rect x="1174" y="192" width="126" height="126" rx="20" fill="${color}" fill-opacity=".1"/>
  <text x="1237" y="250" text-anchor="middle" font-family="Arial, sans-serif" font-size="42">${icon}</text>
  <text x="1237" y="278" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="${color}">${lessons.length} LESSONS</text>
  <text x="320" y="402" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#0F172A">Module lessons</text>
  ${lessonRows}
  <rect x="320" y="${quizY}" width="1030" height="84" rx="18" fill="#0F172A"/>
  <text x="350" y="${quizY + 34}" font-family="Arial, sans-serif" font-size="24">🧠</text>
  <text x="394" y="${quizY + 31}" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#FFFFFF">Module ${index + 1} quiz</text>
  <text x="394" y="${quizY + 55}" font-family="Arial, sans-serif" font-size="12" fill="#CBD5E1">Test your understanding after completing the lessons · pass mark 70%</text>
  <rect x="1190" y="${quizY + 23}" width="120" height="38" rx="10" fill="${color}"/><text x="1250" y="${quizY + 47}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#0F172A">Take quiz →</text>
</svg>`;
}

const outputDir = path.join(__dirname, '..', 'assets', 'screenshots', 'ppc-coach');
fs.mkdirSync(outputDir, { recursive: true });
modules.forEach((module, index) => {
  const filename = `module-${String(index + 1).padStart(2, '0')}-${slug(module[0])}.svg`;
  fs.writeFileSync(path.join(outputDir, filename), render(index, module));
});
console.log(`Generated ${modules.length} module screenshots in ${outputDir}`);
