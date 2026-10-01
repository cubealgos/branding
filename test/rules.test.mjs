// SPDX-License-Identifier: Apache-2.0

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findOffenders, hasUnreleased, parseBaseline, validateBranchName, validateCommitSubject } from '../tool/lib/rules.mjs';

test('branch names', () => {
  for (const ok of ['development', 'production', 'feature/4-dtcg-source-tokens', 'chore/7-ci', 'hotfix/12-fix', 'release/14-1.0.0', 'release/31-1.2.10']) {
    assert.equal(validateBranchName(ok), null, ok);
  }
  for (const bad of ['main', 'feature/dtcg', 'feat/4-x', 'feature/4-Bad_Slug', 'feature/4-', 'fix/4-x', 'feature/14-1.0.0', 'release/14-1.0', 'release/14-v1.0.0']) {
    assert.match(validateBranchName(bad), /does not match/, bad);
  }
});

test('commit subjects', () => {
  assert.equal(validateCommitSubject('feat(tokens): add things (#4)'), null);
  assert.equal(validateCommitSubject('merge(repo): feature/4-x into development (#4)'), null);
  assert.ok(validateCommitSubject('Initial Commit'));
  assert.ok(validateCommitSubject('feat: no scope (#4)'));
  assert.ok(validateCommitSubject('feat(tokens): no issue'));
  assert.ok(validateCommitSubject('wip(tokens): bad type (#4)'));
});

test('history lint exempts by full SHA only', () => {
  const lines = ['a'.repeat(40) + '\tInitial Commit', 'b'.repeat(40) + '\tfeat(x): ok (#1)'];
  assert.equal(findOffenders(lines, new Set()).length, 1);
  assert.equal(findOffenders(lines, new Set(['a'.repeat(40)])).length, 0);
  assert.equal(findOffenders(lines, new Set(['a'.repeat(12)])).length, 1);
  assert.deepEqual([...parseBaseline('# c\n\nabc\n')], ['abc']);
});

test('changelog needs an Unreleased section', () => {
  assert.ok(hasUnreleased('# C\n\n## [Unreleased]\n'));
  assert.ok(hasUnreleased('## Unreleased\n'));
  assert.equal(hasUnreleased('## [1.0.0]\n'), false);
});
