// SPDX-License-Identifier: Apache-2.0

// What the social exports (GIF and WebM, 512 px wide, looping) are, and how to check them without
// ffmpeg or a browser: existence, dimensions, frame count, duration, loop flag and GIF size read from
// the container headers, plus a render manifest that must match the current source (so a changed
// timeline or artwork without a re-render fails). Used by check:fresh.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { VIEWBOX, POSES } from '../fishkit.mjs';
import { BACKGROUNDS } from './fish-frames.mjs';
import { FPS, LOOP_MS, SPECS, fishCss } from './fish-motion.mjs';
import { gifInfo, webmInfo } from './media.mjs';

export const DIR = 'assets/fish/animated/social';
export const WIDTH = 512;
export const SIZE = [WIDTH, Math.round((WIDTH * VIEWBOX[3]) / VIEWBOX[2])];
export const GIF_LIMIT = 1.5 * 1024 * 1024;
export const frames = (pose) => (LOOP_MS[pose] * FPS) / 1000;
export const files = () =>
  Object.keys(POSES).flatMap((pose) => Object.keys(BACKGROUNDS).flatMap((bg) => ['gif', 'webm'].map((ext) => ({ pose, bg, ext, path: `${DIR}/${pose}-${bg}.${ext}` }))));

/** Everything a render depends on, hashed into manifest.json to detect stale exports. */
export function sourceHash() {
  const parts = [JSON.stringify({ SPECS, LOOP_MS, FPS, SIZE, VIEWBOX, BACKGROUNDS }), fishCss()];
  for (const f of ['../fishkit.mjs', './fish-frames.mjs', './fish-motion.mjs', './raster.mjs']) parts.push(readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8'));
  return createHash('sha256').update(parts.join('\n')).digest('hex');
}

export function checkRendered(root = '.') {
  const problems = [];
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  for (const { pose, path, ext } of files()) {
    const f = `${root}/${path}`;
    if (!existsSync(f)) {
      problems.push(`${path}: missing`);
      continue;
    }
    const buf = readFileSync(f);
    const seconds = LOOP_MS[pose] / 1000;
    if (ext === 'gif') {
      const g = gifInfo(buf);
      if (g.width !== SIZE[0] || g.height !== SIZE[1]) problems.push(`${path}: ${g.width}x${g.height}, expected ${SIZE.join('x')}`);
      if (g.frames !== frames(pose) || !near(g.seconds, seconds, 0.001)) problems.push(`${path}: ${g.frames} frames over ${g.seconds} s, expected ${frames(pose)} over ${seconds} s`);
      if (g.loop !== 0) problems.push(`${path}: does not loop forever`);
      if (buf.length >= GIF_LIMIT) problems.push(`${path}: ${buf.length} bytes, 1.5 MB limit`);
    } else {
      const w = webmInfo(buf);
      if (w.width !== SIZE[0] || w.height !== SIZE[1]) problems.push(`${path}: ${w.width}x${w.height}, expected ${SIZE.join('x')}`);
      if (w.frames !== frames(pose)) problems.push(`${path}: ${w.frames} frames, expected ${frames(pose)}`);
      if (!near(w.seconds, seconds, 0.05)) problems.push(`${path}: ${w.seconds} s, expected ${seconds} s`);
    }
  }
  const m = existsSync(`${root}/${DIR}/manifest.json`) ? JSON.parse(readFileSync(`${root}/${DIR}/manifest.json`, 'utf8')) : null;
  if (!m) problems.push(`${DIR}/manifest.json: missing`);
  else if (m.sourceHash !== sourceHash()) problems.push(`${DIR}/manifest.json: the fish source changed since the last render (run \`npm run render:fish\` and commit the result)`);
  return problems;
}
