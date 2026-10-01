// SPDX-License-Identifier: Apache-2.0

// Checks that CHANGELOG.md exists and has an Unreleased section.
// Run: `npm run check:changelog`.
import { existsSync, readFileSync } from 'node:fs';
import { hasUnreleased } from './lib/rules.mjs';

if (!existsSync('CHANGELOG.md')) {
  console.error('changelog-check: CHANGELOG.md is missing.');
  process.exit(1);
}
if (!hasUnreleased(readFileSync('CHANGELOG.md', 'utf8'))) {
  console.error('changelog-check: CHANGELOG.md has no "## [Unreleased]" section.');
  process.exit(1);
}
console.log('changelog-check: CHANGELOG.md ok.');
