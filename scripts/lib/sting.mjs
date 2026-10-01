// SPDX-License-Identifier: Apache-2.0

// The logo sting "Draw + Ping" (decision 22): the animated SVG, the still end
// state and the video/GIF frame geometry. Durations and easings come from
// dist/motion/motion.json; the keyframe times below are the decided timeline
// in ms (draw 0-900, fill 850-1100, press and echo from 1060, wordmark 1200-1500).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COLOURS, MARK_D, MARK_INNER, MARK_OUTER, artwork } from './logo.mjs';

const motion = JSON.parse(readFileSync('dist/motion/motion.json', 'utf8'));
const E = (n) => motion.easings[n].css;
const D = (n) => motion.durations[n].ms;

export const FPS = 24;
export const GIF_FPS = 25; // 3.2 s = 80 frames of 4 cs: an exact GIF delay
export const LOOP_MS = 3200;
export const SING_MS = D('sting'); // 1800
export const BACKGROUNDS = {
  paper: { bg: COLOURS.paper, fg: COLOURS.ink, echo: COLOURS.amber },
  ink: { bg: COLOURS.ink, fg: COLOURS.paper, echo: COLOURS.amber },
  amber: { bg: COLOURS.amber, fg: COLOURS.ink, echo: COLOURS.white },
};
/** Video formats: pixel size and the lockup's width as a fraction of the frame width. */
export const FORMATS = {
  '16x9': { w: 1920, h: 1080, lockup: 0.5 },
  '9x16': { w: 1080, h: 1920, lockup: 0.6 },
  '1x1': { w: 1080, h: 1080, lockup: 0.6 },
};
/** The key moments in ms; frames are round(ms * 24 / 1000). */
export const T = {
  drawEnd: D('draw'), // 900
  fillStart: 850,
  fillEnd: 1100,
  press: 1060,
  pressPeak: 1060 + D('press'),
  echoEnd: 1060 + D('echo'),
  wordmarkIn: 1200,
  wordmarkEnd: 1500,
  fadeStart: 2800,
  fadeEnd: 3100,
};
export const frameOf = (ms, fps = FPS) => Math.round((ms * fps) / 1000);

const r = (n) => String(Math.round(n * 1000) / 1000);

function lockupParts() {
  const a = artwork('lockup-horizontal');
  const w = a.paths[1];
  return { wordmark: w, width: a.vb[2], x: w.m.tx, baseline: w.m.ty };
}

/** Width of the lockup in mark units, and the stage box (room for the echo) around it. */
export function stage() {
  const { width } = lockupParts();
  return { lockupWidth: width, vb: [-28, -28, width + 56, 120] };
}

/** The viewBox of a video frame: the lockup centred, `lockup` of the frame width. */
export function frameView(fmt) {
  const { lockupWidth } = stage();
  const f = FORMATS[fmt];
  const scale = (f.w * f.lockup) / lockupWidth; // px per mark unit
  const [w, h] = [f.w / scale, f.h / scale];
  return { scale, vb: [lockupWidth / 2 - w / 2, 32 - h / 2, w, h] };
}

/** The keyframes of every animated part: ms, values, and `e` = the easing from this keyframe to the next. */
export const TRACKS = {
  outline: [
    { ms: 0, offset: 1000, opacity: 1, e: 'draw' },
    { ms: T.drawEnd, offset: 0, opacity: 1 },
    { ms: 1150, offset: 0, opacity: 0 },
  ],
  fillin: [
    { ms: 0, opacity: 0 },
    { ms: T.fillStart, opacity: 0 },
    { ms: T.fillEnd, opacity: 1 },
  ],
  press: [
    { ms: 0, scale: 1 },
    { ms: T.press, scale: 1, e: 'settle' },
    { ms: T.pressPeak, scale: 1.06, e: 'settle' },
    { ms: 1400, scale: 1 },
  ],
  echo: [
    { ms: 0, scale: 1, opacity: 0 },
    { ms: T.press - 1, scale: 1, opacity: 0 },
    { ms: T.press, scale: 1, opacity: 1, e: 'echo' },
    { ms: T.echoEnd, scale: 1.75, opacity: 0 },
  ],
  wm: [
    { ms: 0, opacity: 0, dx: -6 },
    { ms: T.wordmarkIn, opacity: 0, dx: -6, e: 'settle' },
    { ms: T.wordmarkEnd, opacity: 1, dx: 0 },
  ],
  out: [
    { ms: 0, opacity: 1 },
    { ms: T.fadeStart, opacity: 1 },
    { ms: T.fadeEnd, opacity: 0 },
  ],
};
const CSS_PROP = {
  offset: (v) => `stroke-dashoffset: ${r(v)}`,
  opacity: (v) => `opacity: ${r(v)}`,
  scale: (v) => `transform: scale(${r(v)})`,
  dx: (v) => `transform: translateX(${r(v)}px)`,
};

/** y of a CSS cubic-bezier(x1, y1, x2, y2) at progress x. */
export function bezier({ x1, y1, x2, y2 }, x) {
  const at = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;
  let [lo, hi] = [0, 1];
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid, x1, x2) < x) lo = mid;
    else hi = mid;
  }
  return at((lo + hi) / 2, y1, y2);
}

/** Values of one track at time ms (holding the last keyframe's values): what the CSS animation computes. */
export function trackAt(name, ms) {
  const kf = TRACKS[name];
  if (ms <= kf[0].ms) return kf[0];
  for (let i = 0; i < kf.length - 1; i++) {
    const [a, b] = [kf[i], kf[i + 1]];
    if (ms < b.ms) {
      const x = (ms - a.ms) / (b.ms - a.ms);
      const k = a.e ? bezier(motion.easings[a.e], x) : x;
      return Object.fromEntries(Object.keys(a).filter((n) => n !== 'ms' && n !== 'e').map((n) => [n, a[n] + (b[n] - a[n]) * k]));
    }
  }
  return kf.at(-1);
}

/** The `@keyframes` rule of one track: percentages of `total`, a closing 100% frame holding the last values. */
function keyframes(name, total, prefix = 's-') {
  const p = (ms) => `${r((ms / total) * 100)}%`;
  const kf = TRACKS[name];
  const frames = kf.map((f) => {
    const decl = Object.keys(f).filter((n) => CSS_PROP[n]).map((n) => `${CSS_PROP[n](f[n])};`);
    if (f.e) decl.push(`animation-timing-function: ${E(f.e)};`);
    return `${p(f.ms)} { ${decl.join(' ')} }`;
  });
  const last = kf.at(-1);
  if (last.ms < total) frames.push(`100% { ${Object.keys(last).filter((n) => CSS_PROP[n]).map((n) => `${CSS_PROP[n](last[n])};`).join(' ')} }`);
  return `@keyframes ${prefix}${name} { ${frames.join(' ')} }`;
}

function css(total, loop) {
  const dur = `${total}ms`;
  const k = [];
  for (const name of Object.keys(TRACKS)) {
    if (name === 'out' && !loop) continue;
    k.push(keyframes(name, total));
  }
  const rules = [
    `.a { animation-duration: ${dur}; animation-fill-mode: both; animation-iteration-count: ${loop ? 'infinite' : '1'}; animation-timing-function: linear; }`,
    `.outline { fill: none; stroke-width: 2.6; stroke-linejoin: miter; stroke-dasharray: 1000; animation-name: s-outline; }`,
    `.fillin { animation-name: s-fillin; }`,
    `.press { transform-origin: 32px 32px; animation-name: s-press; }`,
    `.echo { fill: none; stroke-width: 2.5; transform-origin: 32px 32px; animation-name: s-echo; }`,
    `.wm { animation-name: s-wm; }`,
  ];
  if (loop) rules.push(`.out { animation-name: s-out; }`);
  const reduce = `@media (prefers-reduced-motion: reduce) { .a { animation: none !important; } .outline, .echo { opacity: 0; } .fillin, .wm { opacity: 1; transform: none; } }`;
  return [...rules, ...k, reduce].map((l) => `    ${l}`).join('\n');
}

/**
 * The animated sting as a self-contained SVG (CSS keyframes, no script, no external file).
 * loop = false: the 1800 ms sting once, ending on the lockup. loop = true: the 3200 ms
 * GIF/video timeline (build, hold, fade) repeating. `vb` overrides the viewBox (video frames).
 */
export function stingSvg(bgName, { loop = false, vb, size } = {}) {
  const c = BACKGROUNDS[bgName];
  const { wordmark, x, baseline } = lockupParts();
  const box = vb ?? stage().vb;
  const total = loop ? LOOP_MS : SING_MS;
  const stroke = (col) => ` stroke="${col}"`;
  const dims = size ? ` width="${size[0]}" height="${size[1]}"` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.map(r).join(' ')}"${dims} role="img" aria-label="Cube Algos logo">\n` +
    `  <title>Cube Algos logo</title>\n  <style>\n${css(total, loop)}\n  </style>\n` +
    `  <rect x="${r(box[0])}" y="${r(box[1])}" width="${r(box[2])}" height="${r(box[3])}" fill="${c.bg}"/>\n` +
    `  <g${loop ? ' class=\"a out\"' : ''}>\n` +
    `    <path class="a echo"${stroke(c.echo)} d="${MARK_OUTER}"/>\n` +
    `    <g class="a press">\n` +
    `      <path class="a outline" pathLength="1000"${stroke(c.fg)} d="${MARK_OUTER}"/>\n` +
    `      <path class="a outline" pathLength="1000"${stroke(c.fg)} d="${MARK_INNER}"/>\n` +
    `      <path class="a fillin" fill="${c.fg}" fill-rule="evenodd" d="${MARK_D}"/>\n` +
    `    </g>\n` +
    `    <g transform="translate(${r(x)} ${r(baseline)})"><path class="a wm" fill="${c.fg}" d="${wordmark.d}"/></g>\n` +
    `  </g>\n</svg>\n`
  );
}

/** The reduced-motion still: the final frame (mark and wordmark, no echo). */
export function stillSvg(bgName) {
  const c = BACKGROUNDS[bgName];
  const { wordmark, x, baseline } = lockupParts();
  const box = stage().vb;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.map(r).join(' ')}" role="img" aria-label="Cube Algos logo">\n` +
    `  <title>Cube Algos logo</title>\n` +
    `  <rect x="${r(box[0])}" y="${r(box[1])}" width="${r(box[2])}" height="${r(box[3])}" fill="${c.bg}"/>\n` +
    `  <path fill="${c.fg}" fill-rule="evenodd" d="${MARK_D}"/>\n` +
    `  <path transform="translate(${r(x)} ${r(baseline)})" fill="${c.fg}" d="${wordmark.d}"/>\n</svg>\n`
  );
}

/** Everything a render depends on, hashed into assets/sting/manifest.json to detect stale videos. */
export function sourceHash() {
  const parts = [];
  for (const bg of Object.keys(BACKGROUNDS)) {
    for (const [fmt, f] of Object.entries(FORMATS)) {
      parts.push(stingSvg(bg, { loop: true, vb: frameView(fmt).vb, size: [f.w, f.h] }));
    }
    parts.push(stingSvg(bg, { loop: true, vb: frameView('16x9').vb, size: [800, 450] }));
  }
  parts.push(`${FPS} ${GIF_FPS} ${LOOP_MS} ${JSON.stringify(FORMATS)} gif800x450`);
  // the frame renderer and the rasteriser behind it
  for (const f of ['./sting-frames.mjs', './raster.mjs']) parts.push(readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8'));
  return createHash('sha256').update(parts.join('\n')).digest('hex');
}

// ---- the mark-only sting (issue #34): inline-ready, theme-aware, started by a class ----

/** Prefix of every class and keyframe name in the mark sting, so inlining it cannot touch the host page. */
export const MARK_PREFIX = 'cas-';
/** Fallback of `--color-accent-fill` (the amber primitive) when the host page does not define it. */
export const MARK_ECHO = `var(--color-accent-fill, ${COLOURS.amber})`;
const MARK_TRACKS = ['outline', 'fillin', 'press', 'echo'];
const rest = (name) => Object.keys(TRACKS[name].at(-1)).filter((n) => CSS_PROP[n]).map((n) => `${CSS_PROP[n](TRACKS[name].at(-1)[n])};`).join(' ');

function markCss() {
  const c = MARK_PREFIX;
  const total = SING_MS;
  // Base styles ARE the last keyframe (the resting frame); the animation runs from 0% to it.
  const rules = [
    `.${c}mark { display: block; overflow: visible; color: inherit; }`,
    `.${c}a { animation-duration: ${total}ms; animation-delay: var(--cas-delay, 0ms); animation-fill-mode: both; animation-iteration-count: 1; animation-timing-function: linear; animation-play-state: paused; }`,
    `.${c}mark.is-playing .${c}a, .is-playing .${c}mark .${c}a { animation-play-state: running; }`,
    `.${c}outline { fill: none; stroke: currentColor; stroke-width: 2.6; stroke-linejoin: miter; stroke-dasharray: 1000; ${rest('outline')} animation-name: ${c}outline; }`,
    `.${c}fillin { fill: currentColor; fill-rule: evenodd; ${rest('fillin')} animation-name: ${c}fillin; }`,
    `.${c}press { transform-origin: 32px 32px; ${rest('press')} animation-name: ${c}press; }`,
    `.${c}echo { fill: none; stroke: ${MARK_ECHO}; stroke-width: 2.5; transform-origin: 32px 32px; ${rest('echo')} animation-name: ${c}echo; }`,
    ...MARK_TRACKS.map((n) => keyframes(n, total, c)),
    `@media (prefers-reduced-motion: reduce) { .${c}a { animation: none !important; } }`,
  ];
  return rules.map((l) => `    ${l}`).join('\n');
}

/**
 * The mark-only sting as an inline-ready SVG: no background, no wordmark, no ids, every class and
 * keyframe prefixed `cas-`. The mark is `currentColor` (ink on paper, paper on ink with the host's
 * `color`), the echo `var(--color-accent-fill, amber)`. Plays once; animations stay paused until
 * `.is-playing` is on the SVG or an ancestor; the base styles are the resting frame, which
 * `prefers-reduced-motion` shows as is.
 */
export function markStingSvg() {
  const c = MARK_PREFIX;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="${c}mark" viewBox="-28 -28 120 120" role="img" aria-label="Cube Algos logo">\n` +
    `  <title>Cube Algos logo</title>\n  <style>\n${markCss()}\n  </style>\n` +
    `  <path class="${c}a ${c}echo" d="${MARK_OUTER}"/>\n` +
    `  <g class="${c}a ${c}press">\n` +
    `    <path class="${c}a ${c}outline" pathLength="1000" d="${MARK_OUTER}"/>\n` +
    `    <path class="${c}a ${c}outline" pathLength="1000" d="${MARK_INNER}"/>\n` +
    `    <path class="${c}a ${c}fillin" d="${MARK_D}"/>\n` +
    `  </g>\n</svg>\n`
  );
}

/** The resting frame of the mark sting: the mark in `currentColor`, no echo. */
export function markStillSvg() {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Cube Algos logo">\n` +
    `  <title>Cube Algos logo</title>\n` +
    `  <path fill="currentColor" fill-rule="evenodd" d="${MARK_D}"/>\n</svg>\n`
  );
}
