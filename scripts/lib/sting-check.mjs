// SPDX-License-Identifier: Apache-2.0

// Checks of the rendered sting files without ffmpeg or a browser (what CI can
// run): every file exists, its dimensions, frame count, duration and loop
// flag read from its container header match, GIFs are under 2 MB, and the
// render manifest records the current source (so a changed timeline or
// artwork without a re-render fails). Used by check:fresh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { gifInfo, mp4Info, webmInfo } from './media.mjs';
import { BACKGROUNDS, FORMATS, FPS, GIF_FPS, LOOP_MS, sourceHash } from './sting.mjs';

export const GIF_SIZE = [800, 450];
export const VIDEO_FRAMES = Math.ceil((LOOP_MS * FPS) / 1000);

export function checkRendered(root = '.') {
  const problems = [];
  const read = (p) => (existsSync(`${root}/${p}`) ? readFileSync(`${root}/${p}`) : null);
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  for (const bg of Object.keys(BACKGROUNDS)) {
    const gifPath = `assets/sting/sting-${bg}.gif`;
    const gif = read(gifPath);
    if (!gif) problems.push(`${gifPath}: missing`);
    else {
      const g = gifInfo(gif);
      if (g.width !== GIF_SIZE[0] || g.height !== GIF_SIZE[1]) problems.push(`${gifPath}: ${g.width}x${g.height}, expected ${GIF_SIZE.join('x')}`);
      if (g.frames !== (LOOP_MS * GIF_FPS) / 1000 || !near(g.seconds, LOOP_MS / 1000, 0.001)) problems.push(`${gifPath}: ${g.frames} frames over ${g.seconds} s, expected ${LOOP_MS / 1000} s`);
      if (g.loop !== 0) problems.push(`${gifPath}: does not loop forever`);
      if (gif.length >= 2 * 1024 * 1024) problems.push(`${gifPath}: ${gif.length} bytes, 2 MB limit`);
    }
    for (const [fmt, f] of Object.entries(FORMATS)) {
      for (const [ext, info] of [['mp4', mp4Info], ['webm', webmInfo]]) {
        const p = `assets/sting/sting-${bg}-${fmt}.${ext}`;
        const buf = read(p);
        if (!buf) {
          problems.push(`${p}: missing`);
          continue;
        }
        const v = info(buf);
        if (v.width !== f.w || v.height !== f.h) problems.push(`${p}: ${v.width}x${v.height}, expected ${f.w}x${f.h}`);
        if (v.frames !== VIDEO_FRAMES) problems.push(`${p}: ${v.frames} frames, expected ${VIDEO_FRAMES}`);
        if (!near(v.seconds, VIDEO_FRAMES / FPS, 0.05)) problems.push(`${p}: ${v.seconds} s, expected ${(VIDEO_FRAMES / FPS).toFixed(3)} s`);
      }
    }
  }
  const m = read('assets/sting/manifest.json');
  if (!m) problems.push('assets/sting/manifest.json: missing');
  else if (JSON.parse(m).sourceHash !== sourceHash()) problems.push('assets/sting/manifest.json: the sting source changed since the last render (run `npm run render:sting` and commit the result)');
  return problems;
}
