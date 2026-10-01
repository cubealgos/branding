// SPDX-License-Identifier: Apache-2.0

// Gates the full npm dependency closure (production and dev) in
// package-lock.json against the org licence policy: allow list, deny list,
// MPL-2.0 only by recorded exception, unknown licences fail. Recorded
// exceptions are printed on every run.
// Run: `npm run check:licence [-- <package-lock.json> [<exceptions.toml>]]`.
import { existsSync, readFileSync } from 'node:fs';
import { checkLockfile, parseExceptions } from './lib/licence-policy.mjs';

const lockPath = process.argv[2] ?? 'package-lock.json';
const exPath = process.argv[3] ?? 'docs/licence-exceptions.toml';
const exceptions = existsSync(exPath) ? parseExceptions(readFileSync(exPath, 'utf8')) : [];

console.log(`licence-check: recorded exceptions (${exPath}): ${exceptions.length === 0 ? 'none' : ''}`);
for (const e of exceptions) {
  console.log(`  ${e.package} ${e.licence} scope=${e.scope ?? '-'}: ${e.reason ?? ''}`);
}
const { problems, used, count } = checkLockfile(JSON.parse(readFileSync(lockPath, 'utf8')), exceptions);
if (problems.length > 0) {
  console.error(`licence-check: ${problems.length} problem(s) in ${count} package(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`licence-check: ${count} package(s) in ${lockPath} conform (${used.length} exception(s) applied).`);
