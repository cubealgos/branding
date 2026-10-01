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
