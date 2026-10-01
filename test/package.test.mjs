// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changelogSection, checkTag, zip } from '../scripts/package.mjs';

test('zip is deterministic and independent of entry order', () => {
  const a = [['b.txt', Buffer.from('bbb')], ['a.svg', Buffer.from('<svg/>'.repeat(50))]];
  assert.ok(zip(a).equals(zip([...a].reverse())));
  assert.ok(zip(a).equals(zip(a)));
});

test('checkTag accepts only vX.Y.Z equal to the version', () => {
  checkTag('v1.0.0', '1.0.0');
  assert.throws(() => checkTag('v1.0.1', '1.0.0'));
  assert.throws(() => checkTag('1.0.0', '1.0.0'));
  assert.throws(() => checkTag('v1.0.0-rc1', '1.0.0'));
});

test('changelogSection returns the section body and refuses a missing or empty one', () => {
  const log = '# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-10-01\n\n### Added\n\n- x\n\n## [0.9.0]\n\n- y\n';
  assert.equal(changelogSection(log, '1.0.0'), '### Added\n\n- x');
  assert.throws(() => changelogSection(log, '2.0.0'));
  assert.throws(() => changelogSection('## [1.0.0]\n\n## [0.9.0]\n- y', '1.0.0'));
});
