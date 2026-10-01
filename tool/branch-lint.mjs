// SPDX-License-Identifier: Apache-2.0

// Checks branch names. With branch name arguments checks those (CI passes the
// pushed or PR branch); without, audits every local branch.
// Run: `npm run check:branch [-- <branch>]`.
import { execFileSync } from 'node:child_process';
import { validateBranchName } from './lib/rules.mjs';

const args = process.argv.slice(2).filter(Boolean);
const branches = args.length > 0
  ? args
  : execFileSync('git', ['for-each-ref', '--format=%(refname:short)', 'refs/heads/'], { encoding: 'utf8' }).trim().split('\n');
const errors = branches.map(validateBranchName).filter(Boolean);
if (errors.length > 0) {
  for (const e of errors) console.error(e);
  process.exit(1);
}
console.log(`branch-lint: ${branches.length} branch name(s) conform.`);
