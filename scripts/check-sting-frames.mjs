// SPDX-License-Identifier: Apache-2.0

// Frame-count check of the exported MP4s (needs ffmpeg; run after
// `npm run render:sting`, or `npm run check:sting-frames`). Decodes each video
// and finds the key moments from the pixels: draw end, fill start, press peak,
// echo start and end, wordmark in; compares them with the 24 fps frames of the
// timeline (round(ms * 24 / 1000)) and checks the 10% safe margin of every frame.
import { execFileSync } from 'node:child_process';
import { BACKGROUNDS, FORMATS, FPS, T, frameOf, frameView, stage } from './lib/sting.mjs';
import { hex } from './lib/logo.mjs';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Decodes a crop (px) of every frame, optionally downscaled; returns an array of rgb24 Buffers. */
function frames(file, [x, y, w, h], scaleTo) {
  const dims = scaleTo ? [scaleTo, Math.round((h * scaleTo) / w)] : [w, h];
  const vf = `crop=${w}:${h}:${x}:${y}${scaleTo ? `,scale=${dims[0]}:${dims[1]}:flags=area` : ''}`;
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 2 ** 31 - 1 });
  const size = dims[0] * dims[1] * 3;
  return { list: Array.from({ length: raw.length / size }, (_, i) => raw.subarray(i * size, (i + 1) * size)), dims };
}

const px = (b, i) => [b[i * 3], b[i * 3 + 1], b[i * 3 + 2]];
const first = (arr, pred) => arr.findIndex(pred);

let failed = false;
const rows = [];
function expect(name, got, want, tol, file) {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) failed = true;
  rows.push(`${ok ? 'ok  ' : 'FAIL'} ${file}: ${name} frame ${got}, expected ${want} (+-${tol})`);
}

for (const [bgName, c] of Object.entries(BACKGROUNDS)) {
  const bg = hex(c.bg);
  const fg = hex(c.fg);
  const echo = hex(c.echo);
  for (const [fmt, f] of Object.entries(FORMATS)) {
    const file = `assets/sting/sting-${bgName}-${fmt}.mp4`;
    const label = `${bgName}-${fmt}`;
    const { scale, vb } = frameView(fmt);
    const at = (ux, uy) => [Math.round((ux - vb[0]) * scale), Math.round((uy - vb[1]) * scale)];
    const rect = (x0, y0, x1, y1) => {
      const [a, b] = at(x0, y0);
      const [d, e] = at(x1, y1);
      return [a, b, Math.max(d - a, 2), Math.max(e - b, 2)];
    };
    const contrast = dist(bg, fg);

    // fill start: the ring wall centre (7, 32) first leaves the background
    const wall = frames(file, rect(5, 30, 9, 34)).list.map((b) => dist(px(b, 0), bg));
    expect('fill start', first(wall, (d) => d > 0.05 * contrast), frameOf(T.fillStart), 1, label);
    // draw end: (13.4, 14.8) lies only on the last unit of the inner outline's closing segment
    const end = frames(file, rect(12.8, 14.3, 13.5, 15.0)).list.map((b) => dist(px(b, 0), bg));
    // the easing tail (last 1% of the stroke) takes the final ~2 frames, so the visible end is 1-2 frames early
    expect('draw end', first(end, (d) => d > 0.5 * contrast), frameOf(T.drawEnd), 2, label);
    // wordmark in: any pixel of the wordmark band right of the echo's reach (x > 95) leaves the background
    const { lockupWidth } = stage();
    const wm = frames(file, rect(95, 17, lockupWidth, 56)).list.map((b) => {
      let m = 0;
      for (let i = 0; i < b.length / 3; i++) m = Math.max(m, dist(px(b, i), bg));
      return m;
    });
    expect('wordmark in', first(wm, (d) => d > 0.08 * contrast), frameOf(T.wordmarkIn), 1, label);
    // echo and press: pixels near the echo colour / the mark colour around the mark
    const around = frames(file, rect(-28, -28, 92, 92), 240);
    const echoCount = around.list.map((b) => {
      let n = 0;
      for (let i = 0; i < b.length / 3; i++) if (dist(px(b, i), echo) < 45) n++;
      return n;
    });
    const eStart = first(echoCount, (n) => n >= 12);
    // echo end: the last frame whose pixels outside the mark (beyond its press) still differ from the final hold frame
    const hold = around.list[60];
    const [aw, ah] = around.dims;
    const unitPx = aw / 120;
    const outside = (i) => {
      const ux = (i % aw) / unitPx - 28;
      const uy = Math.floor(i / aw) / unitPx - 28;
      return ux < -3 || (ux > 67 && ux < 77) || uy < -3 || uy > 67; // not the wordmark (x >= 78)
    };
    const diffCount = around.list.map((b) => {
      let n = 0;
      for (let i = 0; i < aw * ah; i++) if (outside(i) && dist(px(b, i), px(hold, i)) > 0.06 * contrast) n++;
      return n;
    });
    const eEnd = diffCount.slice(0, 55).findLastIndex((n) => n >= 3);
    expect('echo start', eStart, frameOf(T.press), 1, label);
    // the echo's opacity uses the same easing as its scale (the board's), so its last ~8 frames are below 6% opacity:
    // the visible end is at least 8 frames after the start and not after the 17-frame animation ends
    const eOk = eEnd >= eStart + 8 && eEnd <= frameOf(T.echoEnd) + 2;
    if (!eOk) failed = true;
    rows.push(`${eOk ? 'ok  ' : 'FAIL'} ${label}: echo visible frames ${eStart}-${eEnd} (animation ${frameOf(T.press)}-${frameOf(T.echoEnd)})`);
    // press peak: the mark's fill area is largest at the press peak (scale 1.06)
    const area = around.list.map((b) => {
      let n = 0;
      for (let i = 0; i < b.length / 3; i++) if (dist(px(b, i), fg) < 60) n++;
      return n;
    });
    const win = area.slice(24, 40);
    expect('press peak', 24 + win.indexOf(Math.max(...win)), frameOf(T.pressPeak), 1, label);
    // margins: every frame keeps all non-background pixels at least 10% from each edge
    const whole = frames(file, [0, 0, FORMATS[fmt].w, FORMATS[fmt].h], 360);
    const [W, H] = whole.dims;
    let [l, t, r, bt] = [W, H, 0, 0];
    for (const b of whole.list) {
      for (let i = 0; i < W * H; i++) {
        if (dist(px(b, i), bg) > 0.25 * contrast) {
          const x = i % W;
          const y = Math.floor(i / W);
          l = Math.min(l, x);
          r = Math.max(r, x);
          t = Math.min(t, y);
          bt = Math.max(bt, y);
        }
      }
    }
    const margin = Math.min(l / W, t / H, 1 - (r + 1) / W, 1 - (bt + 1) / H);
    const ok = margin >= 0.1;
    if (!ok) failed = true;
    rows.push(`${ok ? 'ok  ' : 'FAIL'} ${label}: smallest margin ${(margin * 100).toFixed(1)}% of the frame (needs >= 10%)`);
  }
}
console.log(rows.join('\n'));
console.log(`check-sting-frames: ${failed ? 'FAILED' : 'all key moments on their 24 fps frames, margins >= 10%'}`);
process.exit(failed ? 1 : 0);
