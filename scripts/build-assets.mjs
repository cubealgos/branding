// SPDX-License-Identifier: Apache-2.0

// Writes the generated brand assets. Run: `npm run build:assets`, or one group:
// `npm run build:logo`, `npm run build:icons`, `npm run build:sting`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { generators } from './lib/assets.mjs';

export async function buildAssets(groups = Object.keys(generators), root = '.') {
  let n = 0;
  for (const g of groups) {
    for (const [p, buf] of await generators[g]()) {
      const f = `${root}/${p}`;
      mkdirSync(dirname(f), { recursive: true });
      writeFileSync(f, buf);
      n++;
    }
  }
  return n;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const groups = process.argv.slice(2);
  console.log(`build-assets: wrote ${await buildAssets(groups.length ? groups : undefined)} file(s).`);
}
