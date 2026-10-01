// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MARK_ECHO, SING_MS, T, TRACKS, markStillSvg, markStingSvg } from '../scripts/lib/sting.mjs';

const svg = markStingSvg();
const pct = (ms) => String(Math.round((ms / SING_MS) * 100 * 1000) / 1000);
/** The percentages of one `@keyframes cas-<name>` rule. */
const stops = (name) => [...svg.match(new RegExp(`@keyframes cas-${name} \\{(.*)\\}\\s*\\n`))[1].matchAll(/(?:^|\s)([\d.]+)% \{/g)].map((m) => m[1]);

test('mark sting timing comes from the TRACKS of the full sting', () => {
  assert.equal(SING_MS, 1800);
  assert.match(svg, /animation-duration: 1800ms/);
  assert.match(svg, /animation-iteration-count: 1/);
  for (const name of ['outline', 'fillin', 'press', 'echo']) {
    const want = TRACKS[name].map((k) => pct(k.ms));
    if (TRACKS[name].at(-1).ms < SING_MS) want.push('100');
    assert.deepEqual(stops(name), want, name);
  }
  // decision 22: outline 0-0.9 s, fill 0.85-1.1 s, echo 1 -> 1.75 with press 1.06
  assert.equal(TRACKS.outline[1].ms, 900);
  assert.deepEqual([T.fillStart, T.fillEnd], [850, 1100]);
  assert.equal(TRACKS.echo.at(-1).scale, 1.75);
  assert.equal(TRACKS.press[2].scale, 1.06);
});

test('mark sting is inline-safe and theme-aware', () => {
  assert.doesNotMatch(svg, /\sid=|<rect|<text|wordmark/);
  const rules = svg.split('\n').filter((l) => !l.includes('@keyframes') && !l.includes('@media')).join('\n');
  const selectors = [...rules.matchAll(/^\s*([^{}<]+)\{/gm)].flatMap((m) => m[1].split(','));
  for (const s of selectors) assert.match(s.trim(), /\.cas-|^\.is-playing \.cas-mark/, s);
  assert.doesNotMatch(svg, /@keyframes (?!cas-)/);
  assert.match(svg, /stroke: currentColor/);
  assert.match(svg, /fill: currentColor/);
  assert.equal(MARK_ECHO, 'var(--color-accent-fill, #D9831A)');
  assert.ok(svg.includes(`stroke: ${MARK_ECHO}`));
  assert.doesNotMatch(svg, /#(?!D9831A)[0-9a-fA-F]{6}/);
});

test('mark sting: paused until .is-playing, resting styles equal the last frame, reduced motion shows the still', () => {
  assert.match(svg, /\.cas-a \{[^}]*animation-play-state: paused/);
  assert.match(svg, /\.cas-mark\.is-playing \.cas-a, \.is-playing \.cas-mark \.cas-a \{ animation-play-state: running/);
  assert.match(svg, /\.cas-outline \{[^}]*opacity: 0;/);
  assert.match(svg, /\.cas-fillin \{[^}]*opacity: 1;/);
  assert.match(svg, /\.cas-echo \{[^}]*transform: scale\(1\.75\); opacity: 0;/);
  assert.match(svg, /prefers-reduced-motion: reduce\) \{ \.cas-a \{ animation: none !important/);
  assert.match(markStillSvg(), /fill="currentColor" fill-rule="evenodd"/);
});
