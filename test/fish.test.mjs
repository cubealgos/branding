// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { BAND, BODY, POSES, TAIL, VERSIONS, VIEWBOX, extent } from '../scripts/fishkit.mjs';
import { generate } from '../scripts/generate-fish.mjs';

const poses = Object.keys(POSES);
const files = [...generate()].filter(([p]) => p.endsWith('.svg'));
const svgs = (version) => poses.map((p) => [p, readFileSync(`assets/fish/${VERSIONS[version].dir}${p}.svg`, 'utf8')]);
const attr = (s, re) => s.match(re)?.[1];

test('the seven poses exist in both colour versions (14 files), as generated', () => {
  assert.equal(files.length, 14);
  for (const [p, buf] of files) assert.equal(readFileSync(p, 'utf8'), buf.toString(), p);
  assert.deepEqual(poses, ['idle', 'swimming', 'happy', 'confused', 'sad', 'asleep', 'dead']);
});

test('silhouette, tail and band are identical in all seven poses', () => {
  for (const version of Object.keys(VERSIONS)) {
    for (const [pose, s] of svgs(version)) {
      assert.equal(attr(s, /class="body" fill="[^"]+" d="([^"]+)"/), BODY, `${version}/${pose} body`);
      assert.equal(attr(s, /class="tail" fill="[^"]+" d="([^"]+)"/), TAIL, `${version}/${pose} tail`);
      const band = s.match(/<rect class="band" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/).slice(1).map(Number);
      assert.deepEqual(band, [BAND.x, BAND.y, BAND.width, BAND.height], `${version}/${pose} band`);
      assert.match(s, /<clipPath id="fish-clip"><path d="M54 8[^"]*"\/><path d="M60 40[^"]*"\/><\/clipPath>/);
    }
  }
});

test('only the two colour versions, hex exactly as decided', () => {
  const colours = (v) => new Set([...svgs(v).map(([, s]) => s).join('').matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0].toUpperCase()));
  assert.deepEqual([...colours('standard')].sort(), ['#16181D', '#D9831A', '#E7CEB0']);
  assert.deepEqual([...colours('on-amber')].sort(), ['#16181D', '#E7CEB0', '#FBFBFC']);
});

test('no stroke or outline on the body or tail; strokes only on the happy and dead eyes', () => {
  for (const version of Object.keys(VERSIONS)) {
    for (const [pose, s] of svgs(version)) {
      for (const el of s.match(/<(?:path|rect)[^>]*class="(?:body|tail|band)"[^>]*>/g)) assert.doesNotMatch(el, /stroke/, `${pose} ${el}`);
      const stroked = (s.match(/stroke=/g) ?? []).length;
      assert.equal(stroked > 0, pose === 'happy' || pose === 'dead', `${pose} strokes`);
    }
  }
});

test('role img, aria-label, no external references, extras inside the viewBox', () => {
  for (const version of Object.keys(VERSIONS)) {
    for (const [pose, s] of svgs(version)) {
      assert.match(s, new RegExp(`role="img" aria-label="${POSES[pose].label} clownfish"`));
      assert.doesNotMatch(s, /href|url\((?!#)|@import|<image|<script|http:\/\/(?!www\.w3\.org)/);
      const [x0, y0, x1, y1] = extent(pose);
      assert.ok(x0 >= VIEWBOX[0] && y0 >= VIEWBOX[1] && x1 <= VIEWBOX[0] + VIEWBOX[2] && y1 <= VIEWBOX[1] + VIEWBOX[3], `${pose} extent ${[x0, y0, x1, y1]}`);
    }
  }
});
