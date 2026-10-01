// SPDX-License-Identifier: Apache-2.0

// Checks every commit reachable from HEAD against the commit subject rule.
// Grandfathered commits are exempt by full SHA only, listed in
// tool/commit-baseline.txt. Run: `npm run check:history`.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { findOffenders, parseBaseline } from './lib/rules.mjs';

const baseline = existsSync('tool/commit-baseline.txt')
  ? parseBaseline(readFileSync('tool/commit-baseline.txt', 'utf8'))
  : new Set();
const out = execFileSync('git', ['log', '--format=%H%x09%s'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const lines = out === '' ? [] : out.split('\n');
const offenders = findOffenders(lines, baseline);
if (offenders.length > 0) {
  console.error(`lint-history: ${offenders.length} offending commit(s):`);
  for (const o of offenders) console.error(`  ${o}`);
  process.exit(1);
}
console.log(`lint-history: ${lines.length} commit(s) checked, ${baseline.size} baseline exemption(s), no offenders.`);
