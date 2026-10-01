// SPDX-License-Identifier: Apache-2.0

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allPass, evaluate, luminance, ratio } from '../scripts/contrast.mjs';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

test('luminance of the WCAG reference colours', () => {
  assert.equal(luminance('#000000'), 0);
  assert.equal(luminance('#FFFFFF'), 1);
  near(luminance('#808080'), 0.2159, 0.0005);
  near(luminance('#FF0000'), 0.2126, 0.0001);
});

test('ratio: black on white is 21:1, either order, and identical colours are 1:1', () => {
  near(ratio('#000000', '#FFFFFF'), 21, 0.0001);
  near(ratio('#FFFFFF', '#000000'), 21, 0.0001);
  near(ratio('#777777', '#777777'), 1, 0.0001);
});

test('ratio: known reference pairs', () => {
  near(ratio('#767676', '#FFFFFF'), 4.54, 0.01); // the classic smallest AA grey on white
  near(ratio('#0000FF', '#FFFFFF'), 8.59, 0.01);
});

const token = (v) => ({ $value: v, $type: 'color' });
const tokens = {
  'color.primitive.paper': token('#EDEEF1'),
  'color.primitive.amber': token('#D9831A'),
  'color.primitive.ink': token('#16181D'),
  'color.theme.light.bg': token('#EDEEF1'),
  'color.theme.light.card': token('#FBFBFC'),
  'color.theme.light.fg': token('#16181D'),
  'color.theme.light.accent-fill': token('#D9831A'),
  'color.theme.dark.bg': token('#16181D'),
  'color.theme.dark.card': token('#23262D'),
  'color.theme.dark.fg': token('#EDEEF1'),
  'color.theme.dark.accent-fill': token('#D9831A'),
};

test('a passing text pair passes in both themes', () => {
  const r = evaluate(tokens, { pairs: [{ fg: 'fg', bg: 'bg', kind: 'text' }] });
  assert.ok(allPass(r));
});

test('amber rule: a text or boundary pair with amber on paper fails', () => {
  for (const kind of ['text', 'boundary', 'large-text']) {
    const r = evaluate(tokens, { pairs: [{ fg: 'accent-fill', bg: 'bg', kind }] });
    const light = r.rows.find((row) => row.theme === 'light');
    assert.equal(light.pass, false, kind);
    assert.match(light.reason, /amber rule/);
    assert.equal(allPass(r), false);
  }
});

test('amber rule: a decoration pair with amber on paper is listed, not failed', () => {
  const r = evaluate(tokens, { pairs: [{ fg: 'accent-fill', bg: 'bg', kind: 'decoration' }] });
  assert.equal(r.rows[0].pass, null);
  assert.ok(allPass(r));
});

test('a text pair below 4.5:1 fails on the ratio alone', () => {
  const low = { ...tokens, 'color.theme.dark.fg': token('#5A5F6B') };
  const r = evaluate(low, { pairs: [{ fg: 'fg', bg: 'bg', kind: 'text' }] });
  assert.equal(r.rows.find((row) => row.theme === 'dark').pass, false);
});

test('published ratios must match within 0.1', () => {
  const ok = evaluate(tokens, { pairs: [], published: [{ fg: 'color.primitive.ink', bg: 'color.primitive.paper', ratio: 15.3 }] });
  assert.ok(allPass(ok));
  const bad = evaluate(tokens, { pairs: [], published: [{ fg: 'color.primitive.ink', bg: 'color.primitive.paper', ratio: 14 }] });
  assert.equal(allPass(bad), false);
});
