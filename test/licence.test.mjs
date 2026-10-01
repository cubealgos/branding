// SPDX-License-Identifier: Apache-2.0

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkLockfile, classifyExpression, parseExceptions } from '../tool/lib/licence-policy.mjs';

const lock = (license, name = 'dep') => ({ packages: { '': {}, [`node_modules/${name}`]: { version: '1.0.0', license } } });
const run = (dir) => spawnSync('node', ['tool/licence-check.mjs', `test/fixtures/${dir}/package-lock.json`], { encoding: 'utf8' });

test('fixtures: a GPL lockfile fails the CLI, an MIT lockfile passes', () => {
  const gpl = run('licence-gpl');
  assert.equal(gpl.status, 1);
  assert.match(gpl.stderr, /GPL-3.0-only is denied/);
  const mit = run('licence-mit');
  assert.equal(mit.status, 0, mit.stderr);
  assert.match(mit.stdout, /recorded exceptions .*none/);
});

test('every allowed licence passes, Python-2.0 reads as PSF-2.0', () => {
  for (const id of ['MIT', 'Apache-2.0', 'Apache-2.0 WITH LLVM-exception', 'BSD-2-Clause', 'BSD-3-Clause', 'Unicode-3.0', 'Unlicense', 'CC0-1.0', 'Zlib', 'ISC', 'PSF-2.0', 'BlueOak-1.0.0', 'MIT-0', '0BSD', 'Python-2.0']) {
    assert.deepEqual(checkLockfile(lock(id)).problems, [], id);
  }
});

test('GPL, AGPL, LGPL, SSPL and BUSL are denied, even with an exception entry', () => {
  for (const id of ['GPL-2.0-only', 'AGPL-3.0-or-later', 'LGPL-3.0-or-later', 'SSPL-1.0', 'BUSL-1.1']) {
    const ex = [{ package: 'dep', licence: id }];
    assert.equal(checkLockfile(lock(id), ex).problems.length, 1, id);
  }
});

test('unknown and missing licences fail', () => {
  assert.equal(checkLockfile(lock('WTFPL')).problems.length, 1);
  assert.equal(checkLockfile(lock(undefined)).problems.length, 1);
  assert.equal(checkLockfile(lock('SEE LICENSE IN LICENSE')).problems.length, 1);
});

test('MPL-2.0 is denied unless recorded, keyed on package and licence', () => {
  assert.equal(checkLockfile(lock('MPL-2.0')).problems.length, 1);
  const ok = checkLockfile(lock('MPL-2.0'), [{ package: 'dep', licence: 'MPL-2.0' }]);
  assert.deepEqual(ok.problems, []);
  assert.equal(ok.used.length, 1);
  assert.equal(checkLockfile(lock('MPL-2.0'), [{ package: 'other', licence: 'MPL-2.0' }]).problems.length, 1);
});

test('SPDX expressions: OR takes the best alternative, AND needs all', () => {
  assert.equal(classifyExpression('(MIT OR GPL-3.0-only)'), 'allowed');
  assert.equal(classifyExpression('MIT AND GPL-3.0-only'), 'denied');
  assert.equal(classifyExpression('MIT AND Zlib'), 'allowed');
  assert.equal(classifyExpression('GPL-2.0-only OR LGPL-3.0-only'), 'denied');
});

test('the repo lockfile conforms and the exceptions file is empty', () => {
  const r = checkLockfile(JSON.parse(readFileSync('package-lock.json', 'utf8')), parseExceptions(readFileSync('docs/licence-exceptions.toml', 'utf8')));
  assert.deepEqual(r.problems, []);
  assert.deepEqual(parseExceptions(readFileSync('docs/licence-exceptions.toml', 'utf8')), []);
});
