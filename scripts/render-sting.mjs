// SPDX-License-Identifier: Apache-2.0

// Renders the sting GIF, MP4 and WebM exports in assets/sting/. Every frame is
// drawn by the repository's own rasteriser (scripts/lib/sting-frames.mjs, from
// the same keyframe tables as the animated SVG's CSS), so frames are identical
// on every machine; ffmpeg only encodes them. Local-only (`npm run render:sting`):
// the outputs are committed and CI checks them by existence, dimensions, frame
// count and duration (`scripts/lib/sting-check.mjs`).
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { frameAt } from './lib/sting-frames.mjs';
import { BACKGROUNDS, FORMATS, FPS, GIF_FPS, LOOP_MS, frameView, sourceHash } from './lib/sting.mjs';

const GIF_SIZE = [800, 450];
const BT709 = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709'];
const REPRO = ['-fflags', '+bitexact', '-flags:v', '+bitexact', '-map_metadata', '-1'];
const YUV = 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p';

/** Runs ffmpeg reading raw RGBA frames (n frames from frame(i)) on stdin; returns the sha256 of all pixels. */
async function encode(bgName, vb, [w, h], fps, n, outArgs) {
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-framerate', String(fps), '-i', '-', ...outArgs], {
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  const done = new Promise((resolve, reject) => {
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
    ff.on('error', reject);
  });
  const hash = createHash('sha256');
  for (let i = 0; i < n; i++) {
    const px = Buffer.from(frameAt(bgName, (i * 1000) / fps, { w, h, vb }));
    hash.update(px);
    if (!ff.stdin.write(px)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await done;
  return hash.digest('hex');
}

export async function renderSting() {
  mkdirSync('assets/sting', { recursive: true });
  const frames = {};
  const nVideo = Math.ceil((LOOP_MS * FPS) / 1000); // 3.2 s = 76.8: 77 frames
  for (const bg of Object.keys(BACKGROUNDS)) {
    for (const [fmt, f] of Object.entries(FORMATS)) {
      const vb = frameView(fmt).vb;
      const out = `assets/sting/sting-${bg}-${fmt}`;
      frames[`${bg}-${fmt}`] = await encode(bg, vb, [f.w, f.h], FPS, nVideo, [
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-level', '4.2', '-tune', 'animation',
        '-vf', YUV, ...BT709, ...REPRO, '-movflags', '+faststart', '-an', `${out}.mp4`,
      ]);
      await encode(bg, vb, [f.w, f.h], FPS, nVideo, [
        '-c:v', 'libvpx-vp9', '-crf', '24', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2',
        '-vf', YUV, ...BT709, ...REPRO, '-an', `${out}.webm`,
      ]);
    }
    // GIF: 80 frames at 25 fps = 3.2 s, 800x450 (16:9), palette-optimised, loops forever
    frames[`${bg}-gif`] = await encode(bg, frameView('16x9').vb, GIF_SIZE, GIF_FPS, (LOOP_MS * GIF_FPS) / 1000, [
      '-vf', 'split[a][b];[a]palettegen=stats_mode=full:max_colors=64[p];[b][p]paletteuse=dither=none', '-loop', '0', ...REPRO, `assets/sting/sting-${bg}.gif`,
    ]);
  }
  const version = (cmd, args) => execFileSync(cmd, args).toString().split('\n')[0];
  const manifest = {
    sourceHash: sourceHash(),
    ffmpeg: version('ffmpeg', ['-version']).replace(/ Copyright.*/, ''),
    frameHashes: frames, // sha256 of each video's RGBA pixels, in frame order
  };
  writeFileSync('assets/sting/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = await renderSting();
  console.log(`render-sting: done (${m.ffmpeg}).`);
}
