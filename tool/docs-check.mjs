// SPDX-License-Identifier: Apache-2.0

// Docs check: no dead relative links in the markdown docs, no hex colour that is not in the
// token files, and the guidelines carry the current contrast table.
// Run: `npm run check:docs`.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** Markdown files to check: README.md, CONTRIBUTING.md and everything under docs/. */
function markdownFiles() {
  const out = ['README.md', 'CONTRIBUTING.md'].filter((f) => existsSync(f));
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.md')) out.push(p);
    }
  };
  walk('docs');
  return out;
}

/** Every `#rrggbb` (upper-cased) found in the token source files. */
export function tokenHexes(dir = 'tokens') {
  const set = new Set();
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    for (const m of readFileSync(join(dir, name), 'utf8').matchAll(/#[0-9a-fA-F]{6}\b/g)) set.add(m[0].toUpperCase());
  }
  return set;
}

/** Relative link targets of a markdown text, ignoring code fences and code spans. */
export function relativeLinks(text) {
  const plain = text.replace(/^```[\s\S]*?^```/gm, '').replace(/`[^`\n]*`/g, '');
  const out = [];
  for (const m of plain.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = m[1];
    if (/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) continue;
    out.push(target);
  }
  return out;
}

/** Table rows of the generated contrast table (pair rows only). */
const contrastRows = (text) => text.split('\n').filter((l) => /^\| `[^`]+` \| (light|dark) \|/.test(l));

const problems = [];
const known = tokenHexes();
for (const file of markdownFiles()) {
  const text = readFileSync(file, 'utf8');
  for (const target of relativeLinks(text)) {
    const path = decodeURIComponent(target.split('#')[0].split('?')[0]);
    if (path && !existsSync(resolve(dirname(file), path))) problems.push(`${file}: dead link "${target}"`);
  }
  for (const m of text.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
    if (!known.has(m[0].toUpperCase())) problems.push(`${file}: hex colour ${m[0]} is not in tokens/*.json`);
  }
}

if (existsSync('docs/guidelines.md') && existsSync('docs/contrast.md')) {
  const guide = new Set(contrastRows(readFileSync('docs/guidelines.md', 'utf8')));
  for (const row of contrastRows(readFileSync('docs/contrast.md', 'utf8'))) {
    if (!guide.has(row)) problems.push(`docs/guidelines.md: contrast table is stale, missing row ${row}`);
  }
}

if (problems.length) {
  console.error(`docs-check: ${problems.length} problem(s):\n${problems.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}
console.log('docs-check: links, hex colours and the contrast table ok.');
