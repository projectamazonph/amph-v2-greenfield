import { readFile } from "node:fs/promises";

const path = "content/curriculum/modules/1-foundations/1.1-read-ppc-data-before-you-change-it.mdx";
const source = await readFile(path, "utf8");
const lines = source.split(/\r?\n/);
const open = /^:::visual\{([^}]*)\}$/;
const close = /^:::\s*$/;
const attr = /([a-zA-Z][\w-]*)="([^"]*)"/g;
let blocks = 0;
for (let i = 0; i < lines.length; i += 1) {
  const match = lines[i].match(open);
  if (!match) continue;
  const attrs = Object.fromEntries([...match[1].matchAll(attr)].map((m) => [m[1], m[2]]));
  const body = [];
  let j = i + 1;
  for (; j < lines.length && !close.test(lines[j]); j += 1) body.push(lines[j]);
  if (j === lines.length) throw new Error(`Unclosed visual at line ${i + 1}`);
  if (!attrs.id || !attrs.kind || !attrs.title) throw new Error(`Missing metadata at line ${i + 1}`);
  JSON.parse(body.join("\n").trim());
  blocks += 1;
  i = j;
}
if (blocks < 5) throw new Error(`Expected at least five visual blocks, found ${blocks}`);
console.log(`Visual block contract: ${blocks} blocks valid`);
