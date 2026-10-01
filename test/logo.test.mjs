// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { coverage, decodePng, encodePng, flatten, render } from '../scripts/lib/raster.mjs';
import { COLOURS, MARK_D, artwork, svg, wordmark } from '../scripts/lib/logo.mjs';

test('mark is the decided chamfer ring', () => {
  assert.equal(MARK_D, 'M0 0H45.255L64 18.745V64H18.745L0 45.255Z M14 14H39.46L50 24.54V50H24.54L14 39.46Z');
  const s = svg('mark');
  assert.match(s, /viewBox="0 0 64 64"/);
  assert.match(s, /fill-rule="evenodd"/);
  assert.match(s, /currentColor/);
});

test('wordmark is outlines only, no text or font reference', () => {
  assert.doesNotMatch(svg('wordmark'), /<text|font/);
  assert.ok(wordmark().width > 0);
});

test('amber is never a logo colour', () => {
  for (const n of ['mark', 'lockup-horizontal', 'lockup-stacked']) {
    for (const [cw, fg] of [['ink', COLOURS.ink], ['paper', COLOURS.paper]]) assert.notEqual(fg, COLOURS.amber, `${n} ${cw}`);
  }
  assert.ok(artwork('lockup-horizontal').paths.length === 2);
});

test('rasteriser: evenodd ring leaves the void empty, coverage is antialiased', () => {
  const cov = coverage(flatten(MARK_D, { s: 1, tx: 0, ty: 0 }), 64, 64, 'evenodd');
  assert.equal(cov[32 * 64 + 32], 0);
  assert.equal(cov[5 * 64 + 20], 1);

});

test('png round-trip keeps pixels', () => {
  const rgba = render(8, 8, [{ d: 'M0 0H4V4H0Z', rule: 'nonzero', color: [1, 2, 3], m: { s: 1, tx: 0, ty: 0 } }]);
  const d = decodePng(encodePng(8, 8, rgba));
  assert.equal(d.w, 8);
  assert.equal(d.raw.length, 8 * (8 * 4 + 1));
  assert.deepEqual([...d.raw.subarray(1, 5)], [1, 2, 3, 255]);
});

test('icons: ico holds 16, 32 and 48 px images; maskable mark stays in the safe circle', async () => {
  const { generate, MASKABLE_MARK } = await import('../scripts/generate-icons.mjs');
  const files = generate();
  const ico = files.get('assets/favicon/favicon.ico');
  assert.equal(ico.readUInt16LE(4), 3);
  assert.deepEqual([6, 22, 38].map((o) => ico[o]), [16, 32, 48]);
  assert.ok((MASKABLE_MARK * Math.SQRT2) / 2 <= 0.4);
  assert.match(files.get('assets/favicon/favicon.svg').toString(), /prefers-color-scheme: dark/);
});

test('sting timeline lands on the 24 fps column of the motion tokens', async () => {
  const { T, frameOf, stingSvg, stillSvg } = await import('../scripts/lib/sting.mjs');
  assert.equal(frameOf(T.drawEnd), 22);
  assert.equal(frameOf(T.pressPeak - T.press), 3);
  assert.equal(frameOf(T.echoEnd - T.press), 17);
  assert.equal(frameOf(1800), 43);
  const once = stingSvg('amber');
  assert.match(once, /stroke="#FBFBFC"/); // white echo on amber
  assert.match(once, /fill="#16181D"/); // ink mark on amber
  assert.match(stingSvg('paper'), /stroke="#D9831A"/);
  assert.doesNotMatch(once, /<script|href=/); // self-contained
  assert.match(once, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(stillSvg('ink'), /animation|echo/);
});

test('container readers agree on the committed GIF', async () => {
  const { gifInfo } = await import('../scripts/lib/media.mjs');
  const { readFileSync, existsSync } = await import('node:fs');
  if (!existsSync('assets/sting/sting-ink.gif')) return;
  const g = gifInfo(readFileSync('assets/sting/sting-ink.gif'));
  assert.deepEqual([g.width, g.height, g.frames, g.seconds, g.loop], [800, 450, 80, 3.2, 0]);
});

test('sting keyframe evaluator matches the timeline', async () => {
  const { trackAt, T } = await import('../scripts/lib/sting.mjs');
  assert.equal(trackAt('fillin', T.fillStart).opacity, 0);
  assert.equal(trackAt('fillin', T.fillEnd).opacity, 1);
  assert.equal(trackAt('press', T.pressPeak).scale, 1.06);
  assert.equal(trackAt('echo', T.echoEnd).scale, 1.75);
  assert.equal(trackAt('echo', T.echoEnd).opacity, 0);
  assert.equal(trackAt('outline', 0).offset, 1000);
  assert.equal(trackAt('outline', T.drawEnd).offset, 0);
  assert.equal(trackAt('wm', T.wordmarkEnd).dx, 0);
  const mid = trackAt('outline', 450).offset; // the draw easing is symmetric: half-way at half time
  assert.ok(Math.abs(mid - 500) < 1);
});

test('sting frame: drawn outline, filled mark and the white echo on amber', async () => {
  const { frameAt } = await import('../scripts/lib/sting-frames.mjs');
  const { frameView } = await import('../scripts/lib/sting.mjs');
  const [w, h] = [480, 270];
  const vb = frameView('16x9').vb;
  const px = (f, x, y) => [...f.subarray((y * w + x) * 4, (y * w + x) * 4 + 3)];
  const end = frameAt('paper', 2000, { w, h, vb });
  assert.deepEqual(px(end, 2, 2), [0xed, 0xee, 0xf1]); // paper corner
  const first = frameAt('paper', 0, { w, h, vb });
  assert.ok(first.every((v, i) => i % 4 === 3 || v === [0xed, 0xee, 0xf1][i % 4] || i % 4 === 3)); // nothing drawn at t = 0
});
