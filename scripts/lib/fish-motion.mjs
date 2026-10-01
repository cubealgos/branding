// SPDX-License-Identifier: Apache-2.0

// The clownfish animations (decisions 13 and 22): calm, no bounce, no overshoot. The
// keyframes live once, in SPECS; they generate the CSS of the animated SVGs and of
// fish.css, and the same table drives the frame renderer for the GIF and WebM exports.
// Durations are multiples of motion tokens (--duration-*) and easings are the motion
// tokens (--ease-*), each with its token value as the documented fallback.
import { readFileSync } from 'node:fs';
import { POSES, ORIGIN } from '../fishkit.mjs';
import { bezier } from './sting.mjs';

const motion = JSON.parse(readFileSync('dist/motion/motion.json', 'utf8'));
export const unitMs = (unit) => motion.durations[unit].ms;
const easing = (name) => motion.easings[name === 'out' ? 'ease-out' : name];

/** Social export frame rate: 25 fps, so every loop is a whole number of 40 ms GIF frames. */
export const FPS = 25;
/** Loop length of each pose's export in ms: a whole multiple of every period in its animations. */
export const LOOP_MS = { idle: 7000, swimming: 3000, happy: 2000, confused: 3200, sad: 3600, asleep: 3800, dead: 5000 };

/**
 * One animation: `sel` the element (inside `.fish--<pose>`), the duration `k` x the `unit` token (a half
 * cycle when `alt`), `ease` a motion-token easing name (or 'steps' for the blink), `tf` the transform
 * keyframes [percent, {rot deg, x px, y px}] (rotate then translate) and `op` the opacity keyframes.
 * `delay` is k x `unit` as well.
 */
export const SPECS = {
  idle: [
    { sel: '.look', unit: 'wipe', k: 7, ease: 'draw', tf: [[0, { x: 0 }], [52, { x: 0 }], [58, { x: -2.5 }], [74, { x: -2.5 }], [80, { x: 0 }], [100, { x: 0 }]] },
    { sel: '.open', unit: 'wipe', k: 3.5, ease: 'steps', op: [[0, 1], [92, 1], [94, 0], [97, 1], [100, 1]] },
    { sel: '.shut', unit: 'wipe', k: 3.5, ease: 'steps', op: [[0, 0], [92, 0], [94, 1], [97, 0], [100, 0]] },
  ],
  swimming: [
    { sel: '.mover', unit: 'wipe', k: 3, ease: 'draw', tf: [[0, { x: 0, y: 0 }], [50, { x: 8, y: -3 }], [100, { x: 0, y: 0 }]] },
    { sel: '.tail', unit: 'wipe', k: 0.5, alt: true, ease: 'draw', tf: [[0, { rot: -7 }], [100, { rot: 7 }]] },
  ],
  happy: [
    // the double hop: two lifts (-9, then -5 px) that settle back, then rest
    { sel: '.mover', unit: 'wipe', k: 2, ease: 'settle', tf: [[0, { y: 0 }], [10, { y: -9 }], [20, { y: 0 }], [30, { y: -5 }], [40, { y: 0 }], [100, { y: 0 }]] },
    { sel: '.tail', unit: 'quick', k: 1.25, alt: true, ease: 'draw', tf: [[0, { rot: -7 }], [100, { rot: 7 }]] },
  ],
  confused: [
    { sel: '.bodyg', unit: 'wipe', k: 3.2, ease: 'draw', tf: [[0, { rot: -6 }], [50, { rot: -11 }], [100, { rot: -6 }]] },
    { sel: '.q', unit: 'wipe', k: 1.6, ease: 'draw', tf: [[0, { y: 0 }], [50, { y: -3 }], [100, { y: 0 }]] },
  ],
  sad: [
    { sel: '.bodyg', unit: 'wipe', k: 3.6, ease: 'draw', tf: [[0, { rot: 9, y: 0 }], [50, { rot: 10, y: 3 }], [100, { rot: 9, y: 0 }]] },
    { sel: '.tail', unit: 'wipe', k: 1.8, alt: true, ease: 'draw', tf: [[0, { rot: -3 }], [100, { rot: 3 }]] },
    { sel: '.tear', unit: 'wipe', k: 3.6, ease: 'draw', tf: [[0, { y: 0 }], [35, { y: 0 }], [90, { y: 16 }], [100, { y: 20 }]], op: [[0, 0], [35, 0], [45, 1], [90, 1], [100, 0]] },
  ],
  asleep: [
    { sel: '.mover', unit: 'wipe', k: 3.8, ease: 'draw', tf: [[0, { y: 0 }], [50, { y: 2 }], [100, { y: 0 }]] },
    { sel: '.z1', unit: 'wipe', k: 3.8, ease: 'out', tf: [[0, { x: 0, y: 6 }], [80, { x: 3, y: -4 }], [100, { x: 4, y: -6 }]], op: [[0, 0], [25, 1], [80, 1], [100, 0]] },
    { sel: '.z2', unit: 'wipe', k: 3.8, ease: 'out', delay: 1.2, tf: [[0, { x: 0, y: 6 }], [80, { x: 3, y: -4 }], [100, { x: 4, y: -6 }]], op: [[0, 0], [25, 1], [80, 1], [100, 0]] },
  ],
  dead: [
    { sel: '.mover', unit: 'wipe', k: 5, ease: 'draw', tf: [[0, { x: 0, y: 0 }], [50, { x: 4, y: 2 }], [100, { x: 0, y: 0 }]] },
    { sel: '.bodyg', unit: 'wipe', k: 5, ease: 'draw', tf: [[0, { rot: -14 }], [50, { rot: -11 }], [100, { rot: -14 }]] },
  ],
};

const num = (n) => String(Math.round(n * 1000) / 1000);
const name = (pose, sel) => `fish-${pose}-${sel.slice(1)}`;
const cssEase = (e) => (e === 'steps' ? 'steps(1)' : `var(--ease-${e}, ${easing(e).css})`);
const cssTime = (unit, k) => `calc(var(--duration-${unit}, ${unitMs(unit)}ms) * ${k})`;

/** The functions an animation's transform uses, in order: rotate, then translate. */
const fnsOf = (a) => {
  const used = new Set(a.tf.flatMap(([, v]) => Object.keys(v)));
  return { rot: used.has('rot'), move: used.has('x') || used.has('y') };
};
const tfValue = (a, v) => {
  const f = fnsOf(a);
  return [f.rot && `rotate(${num(v.rot ?? 0)}deg)`, f.move && `translate(${num(v.x ?? 0)}px, ${num(v.y ?? 0)}px)`].filter(Boolean).join(' ');
};

/** The CSS of one pose: base rules, then animations inside `prefers-reduced-motion: no-preference`. */
export function poseCss(pose) {
  const rules = [];
  const keyframes = [];
  for (const a of SPECS[pose]) {
    const decl = [
      `animation-name: ${name(pose, a.sel)};`,
      `animation-duration: ${cssTime(a.unit, a.k)};`,
      `animation-timing-function: ${cssEase(a.ease)};`,
      'animation-iteration-count: infinite;',
      a.alt ? 'animation-direction: alternate;' : '',
      'animation-fill-mode: both;',
      a.delay ? `animation-delay: ${cssTime(a.unit, a.delay)};` : '',
    ].filter(Boolean);
    rules.push(`.fish--${pose} ${a.sel} { ${decl.join(' ')} }`);
    const pcts = [...new Set([...(a.tf ?? []), ...(a.op ?? [])].map(([p]) => p))].sort((x, y) => x - y);
    const frames = pcts.map((p) => {
      const d = [];
      const t = a.tf?.find(([q]) => q === p);
      const o = a.op?.find(([q]) => q === p);
      if (t) d.push(`transform: ${tfValue(a, t[1])};`);
      if (o) d.push(`opacity: ${num(o[1])};`);
      return `${p}% { ${d.join(' ')} }`;
    });
    keyframes.push(`@keyframes ${name(pose, a.sel)} { ${frames.join(' ')} }`);
  }
  const base = [];
  const tilt = POSES[pose].tilt;
  if (tilt) base.push(`.fish--${pose} .bodyg { transform: rotate(${tilt}deg); }`);
  if (pose === 'idle') base.push('.fish--idle .shut { opacity: 0; }');
  return { base, rules, keyframes };
}

export const COMMON_CSS = [
  '.fish { overflow: visible; }',
  '.fish .mover, .fish .bodyg, .fish .tail, .fish .look, .fish .q, .fish .z1, .fish .z2, .fish .tear { transform-box: view-box; }',
  `.fish .bodyg { transform-origin: ${ORIGIN[0]}px ${ORIGIN[1]}px; }`,
  '.fish .tail { transform-origin: 60px 40px; }',
];

const indent = (lines, n) => lines.map((l) => ' '.repeat(n) + l).join('\n');

/** The style block of one animated SVG (also the pose's part of fish.css). */
export function svgCss(pose) {
  const { base, rules, keyframes } = poseCss(pose);
  return [
    indent(COMMON_CSS, 4),
    indent(base, 4),
    '    @media (prefers-reduced-motion: no-preference) {',
    indent(rules, 6),
    '    }',
    indent(keyframes, 4),
  ].filter(Boolean).join('\n');
}

/** fish.css: every pose's animations as `.fish--<pose>` classes for inline SVG. */
export function fishCss() {
  const head = [
    '/* Cube Algos clownfish animations (brand asset, all rights reserved: assets/LICENSE.md). For inline SVG: put `fish fish--<pose>` on the <svg> (the markup of assets/fish/animated/<pose>.svg).',
    '   Durations are multiples of --duration-wipe / --duration-quick and easings are --ease-draw / --ease-settle / --ease-out from',
    '   dist/css/tokens.css; each var() carries the token value as its fallback, so the file also works without the tokens.',
    '   Under prefers-reduced-motion: reduce nothing animates and every pose shows its key frame.',
    '   Extras (? and z Z) are ink; on an ink background set --fish-extra: #EDEEF1 (paper) on the svg. */',
    ...COMMON_CSS,
  ];
  const parts = [head.join('\n')];
  for (const pose of Object.keys(SPECS)) {
    const { base, rules, keyframes } = poseCss(pose);
    parts.push([`/* ${pose} */`, ...base, '@media (prefers-reduced-motion: no-preference) {', indent(rules, 2), '}', ...keyframes].join('\n'));
  }
  return `${parts.join('\n\n')}\n`;
}

/** Period of one animation in ms (a full cycle: alternate animations take two half cycles). */
export const periodMs = (a) => unitMs(a.unit) * a.k * (a.alt ? 2 : 1);

/** y of a keyframe track [[percent, value]] at progress p (0..1), with the animation's per-interval easing. */
function trackAt(track, p, ease) {
  const pct = p * 100;
  if (pct <= track[0][0]) return track[0][1];
  for (let i = 0; i < track.length - 1; i++) {
    const [[a, va], [b, vb]] = [track[i], track[i + 1]];
    if (pct < b) {
      const x = (pct - a) / (b - a);
      const k = ease === 'steps' ? 0 : bezier(easing(ease), x);
      return va + (vb - va) * k;
    }
  }
  return track.at(-1)[1];
}

/**
 * The state {rot, x, y, o} of animation `a` at time t ms in the steady-state loop (what the CSS
 * animation computes, delays and alternation included); keys the animation does not touch are absent.
 */
export function stateAt(a, t) {
  const half = unitMs(a.unit) * a.k;
  const period = periodMs(a);
  const phase = (((t - (a.delay ? unitMs(a.unit) * a.delay : 0)) % period) + period) % period;
  const p = a.alt && phase > half ? 1 - (phase - half) / half : phase / half;
  const out = {};
  if (a.tf) {
    for (const key of ['rot', 'x', 'y']) {
      const track = a.tf.filter(([, v]) => key in v).map(([pc, v]) => [pc, v[key]]);
      if (track.length) out[key] = trackAt(track, p, a.ease);
    }
  }
  if (a.op) out.o = trackAt(a.op, p, a.ease);
  return out;
}
