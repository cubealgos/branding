// SPDX-License-Identifier: Apache-2.0

// Renders the clownfish GIF and WebM exports in assets/fish/animated/social/: for every pose and for
// paper and ink backgrounds, a looping 512 px GIF (solid background) and a looping 512 px VP9 WebM with
// an alpha channel (transparent; the ? and z Z take the background's contrast colour). Every frame is
// drawn by the repository's own rasteriser (scripts/lib/fish-frames.mjs, from the same keyframe tables
// as the CSS), so frames are identical on every machine; ffmpeg only encodes them. Local-only
// (`npm run render:fish`): the outputs are committed and CI checks them by headers (fish-exports.mjs).
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { POSES, VIEWBOX } from './fishkit.mjs';
import { BACKGROUNDS, frameAt } from './lib/fish-frames.mjs';
import { DIR, SIZE, frames, sourceHash } from './lib/fish-exports.mjs';
import { FPS } from './lib/fish-motion.mjs';

const REPRO = ['-fflags', '+bitexact', '-flags:v', '+bitexact', '-map_metadata', '-1'];

/** Runs ffmpeg reading n raw RGBA frames on stdin; returns the sha256 of all pixels. */
async function encode(pose, bg, transparent, outArgs) {
  const [w, h] = SIZE;
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-framerate', String(FPS), '-i', '-', ...outArgs], {
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  const done = new Promise((resolve, reject) => {
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
    ff.on('error', reject);
  });
  const hash = createHash('sha256');
  for (let i = 0; i < frames(pose); i++) {
    const px = Buffer.from(frameAt(pose, bg, (i * 1000) / FPS, { w, h, vb: VIEWBOX, transparent }));
    hash.update(px);
    if (!ff.stdin.write(px)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await done;
  return hash.digest('hex');
}

export async function renderFish() {
  mkdirSync(DIR, { recursive: true });
  const frameHashes = {};
  for (const pose of Object.keys(POSES)) {
    for (const bg of Object.keys(BACKGROUNDS)) {
      const out = `${DIR}/${pose}-${bg}`;
      frameHashes[`${pose}-${bg}-gif`] = await encode(pose, bg, false, [
        '-vf', 'split[a][b];[a]palettegen=stats_mode=full:max_colors=48[p];[b][p]paletteuse=dither=none:diff_mode=rectangle', '-loop', '0', ...REPRO, `${out}.gif`,
      ]);
      frameHashes[`${pose}-${bg}-webm`] = await encode(pose, bg, true, [
        '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-crf', '28', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', ...REPRO, '-an', `${out}.webm`,
      ]);
    }
  }
  const ffmpeg = execFileSync('ffmpeg', ['-version']).toString().split('\n')[0].replace(/ Copyright.*/, '');
  const manifest = { sourceHash: sourceHash(), ffmpeg, frameHashes };
  writeFileSync(`${DIR}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = await renderFish();
  console.log(`render-fish: done (${m.ffmpeg}).`);
}
