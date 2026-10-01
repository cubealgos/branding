// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { POSES, VERSIONS, VIEWBOX } from '../scripts/fishkit.mjs';
import { scene } from '../scripts/lib/fish-frames.mjs';
import { FPS, LOOP_MS, SPECS, fishCss, periodMs, stateAt, svgCss } from '../scripts/lib/fish-motion.mjs';
import { generate } from '../scripts/generate-fish.mjs';

const poses = Object.keys(POSES);
const motion = JSON.parse(readFileSync('dist/motion/motion.json', 'utf8'));

test('all seven poses animate; each loop is a whole number of every period and of 40 ms frames', () => {
  assert.deepEqual(Object.keys(SPECS), poses);
  for (const pose of poses) {
    assert.ok(LOOP_MS[pose] % (1000 / FPS) === 0, `${pose} loop is whole frames`);
    for (const a of SPECS[pose]) assert.equal(LOOP_MS[pose] % periodMs(a), 0, `${pose} ${a.sel}`);
  }
});

test('no bounce or overshoot: only token easings that stay inside 0..1; the happy hop settles', () => {
  const used = new Set(poses.flatMap((p) => SPECS[p].map((a) => a.ease)));
  assert.deepEqual([...used].sort(), ['draw', 'out', 'settle', 'steps']);
  for (const e of used) {
    if (e === 'steps') continue;
    const t = motion.easings[e === 'out' ? 'ease-out' : e];
    for (const y of [t.y1, t.y2]) assert.ok(y >= 0 && y <= 1, `${e} overshoots`);
  }
  assert.equal(SPECS.happy.find((a) => a.sel === '.mover').ease, 'settle');
  assert.match(fishCss(), /\.fish--happy \.mover \{[^}]*var\(--ease-settle, cubic-bezier\(\.2,\.8,\.3,1\)\)/);
  assert.doesNotMatch(fishCss(), /ease-in|bounce|elastic|spring|linear/);
});

test('fish.css uses the motion tokens with fallbacks and only animates under no-preference', () => {
  const css = fishCss();
  for (const pose of poses) assert.match(css, new RegExp(`\\.fish--${pose} `));
  for (const m of css.matchAll(/animation-duration: ([^;]+);/g)) assert.match(m[1], /^calc\(var\(--duration-(wipe|quick), \d+ms\) \* [\d.]+\)$/);
  for (const m of css.matchAll(/animation-timing-function: ([^;]+);/g)) assert.match(m[1], /^(steps\(1\)|var\(--ease-(draw|settle|out), cubic-bezier\([^)]+\)\))$/);
  // every animation-* declaration sits inside a prefers-reduced-motion: no-preference block
  const outside = css.replace(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}/g, '');
  assert.doesNotMatch(outside, /animation-name/);
  // the fallbacks are the token values
  assert.equal(motion.durations.wipe.ms, 1000);
  assert.equal(motion.durations.quick.ms, 200);
});

test('animated SVGs: self-contained, both colour versions, same silhouette as the key frames', () => {
  const out = generate();
  for (const v of Object.values(VERSIONS)) {
    for (const pose of poses) {
      const s = out.get(`assets/fish/animated/${v.dir}${pose}.svg`).toString();
      const still = out.get(`assets/fish/${v.dir}${pose}.svg`).toString();
      assert.doesNotMatch(s, /<script|href|@import|url\((?!#)|<image/);
      assert.match(s, /<style>[\s\S]*prefers-reduced-motion: no-preference[\s\S]*<\/style>/);
      assert.ok(s.includes(svgCss(pose)));
      for (const re of [/class="tail"[^>]*/, /class="body"[^>]*/, /class="band"[^>]*/]) assert.equal(s.match(re)[0], still.match(re)[0]);
      assert.match(s, new RegExp(`role="img" aria-label="${POSES[pose].label} clownfish" class="fish fish--${pose}"`));
    }
  }
});

test('the animation state matches the keyframes', () => {
  const sway = SPECS.confused.find((a) => a.sel === '.bodyg');
  assert.equal(stateAt(sway, 0).rot, -6);
  assert.ok(Math.abs(stateAt(sway, 1600).rot - -11) < 1e-9);
  const hop = SPECS.happy.find((a) => a.sel === '.mover');
  assert.ok(Math.abs(stateAt(hop, 200).y - -9) < 1e-9);
  const blink = SPECS.idle.find((a) => a.sel === '.shut');
  assert.equal(stateAt(blink, 0).o, 0);
  assert.equal(stateAt(blink, 0.95 * 3500).o, 1);
  const z2 = SPECS.asleep.find((a) => a.sel === '.z2');
  assert.equal(stateAt(z2, 1200).o, 0); // z2 starts 1.2 s after z1
});

test('everything stays inside the viewBox through every loop', () => {
  for (const pose of poses) {
    for (let t = 0; t < LOOP_MS[pose]; t += 1000 / FPS) {
      for (const bg of ['paper', 'ink']) {
        for (const { subs } of scene(pose, bg, t)) {
          for (const [x, y] of subs.flat()) {
            assert.ok(x >= VIEWBOX[0] - 0.01 && x <= VIEWBOX[0] + VIEWBOX[2] + 0.01 && y >= VIEWBOX[1] - 0.01 && y <= VIEWBOX[1] + VIEWBOX[3] + 0.01, `${pose} t=${t} (${x.toFixed(1)}, ${y.toFixed(1)})`);
          }
        }
      }
    }
  }
});
