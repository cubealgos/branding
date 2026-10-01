// SPDX-License-Identifier: Apache-2.0

// Evaluates tokens/contrast-pairs.json against the built dist/json/tokens.json
// in the light and dark themes, prints the table, writes docs/contrast.md and
// exits 1 on any failure. Run: `npm run check:contrast` (after `npm run build`).
import { readFileSync, writeFileSync } from 'node:fs';
import { allPass, evaluate, renderMarkdown, renderText } from './contrast.mjs';

const tokens = JSON.parse(readFileSync('dist/json/tokens.json', 'utf8'));
const def = JSON.parse(readFileSync('tokens/contrast-pairs.json', 'utf8'));
const result = evaluate(tokens, def);
process.stdout.write(renderText(result));
writeFileSync('docs/contrast.md', renderMarkdown(result));
if (!allPass(result)) {
  console.error('check:contrast: failed.');
  process.exit(1);
}
console.log('check:contrast: all pairs pass; docs/contrast.md written.');
