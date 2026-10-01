// SPDX-License-Identifier: Apache-2.0

// The clownfish geometry and key-frame SVG generator (decision 13), ported from the
// prototype's fishkit.py. One flat silhouette (a body with all four corners cut, a
// forked tail, one band); the seven poses differ only in eyes, posture and small
// extras. Colours are read from the built tokens, never typed twice.
import { readFileSync } from 'node:fs';
import { flatten } from './lib/raster.mjs';

const tokens = JSON.parse(readFileSync('dist/json/tokens.json', 'utf8'));
const tok = (n) => tokens[`color.primitive.${n}`].$value;

export const BODY = 'M54 8 H90 L110 28 V52 L90 72 H54 L36 54 V26 Z';
export const TAIL = 'M60 40 L14 14 L27 40 L14 66 Z';
export const BAND = { x: 60, y: 8, width: 12, height: 64 };
/** Centre of the body: tilts rotate about it, the dead fish is flipped about its horizontal axis. */
export const ORIGIN = [72, 40];
/** Includes every extra (the "?", the "z Z", the tear's fall) and the tilted bodies without clipping. */
export const VIEWBOX = [-4, -6, 144, 90];

/** The two colour versions: standard (every background except amber) and on amber. */
export const VERSIONS = {
  standard: { dir: '', body: tok('amber'), band: tok('fish-band'), ink: tok('ink') },
  'on-amber': { dir: 'on-amber/', body: tok('on-amber-white'), band: tok('fish-band'), ink: tok('ink') },
};
/** The extras' fill: ink by default, overridable with `--fish-extra` (paper on an ink background). */
export const PAPER = tok('paper');

const rect = (x, y, w, h) => ({ rect: [x, y, w, h] });
const poly = (width, ...lines) => ({ stroke: { width, lines } });

const IDLE_EYES = [rect(82, 28, 7, 16), rect(95, 28, 7, 16)];
const CLOSED_EYES = [rect(82, 38, 7, 3), rect(95, 38, 7, 3)];

// extras use absolute path data only (the repo rasteriser reads M L H V Z)
const QMARK = { cls: 'q', d: 'M118 2 H130 V14 H124 V20 H118 V12 H124 V8 H118 Z M118 24 H124 V30 H118 Z' };
const Z1 = { cls: 'z1', d: 'M112 14 H121 V17 L116 22 H121 V25 H112 V22 L117 17 H112 Z' };
const Z2 = { cls: 'z2', d: 'M124 0 H136 V4 L129 11 H136 V15 H124 V11 L131 4 H124 Z' };
/** The tear sits under the left eye, in the band colour, and falls along the tilted body. */
const TEAR = { cls: 'tear', rect: [86, 47, 3, 5], fill: 'band', inBody: true };

/**
 * The seven poses. tilt: degrees about ORIGIN; flip: belly-up (the shape is mirrored, the eyes are not);
 * eyes: rects, filled paths or stroked polylines (square caps) in ink; extras: outside-the-shape details.
 */
export const POSES = {
  idle: { label: 'Idle', eyes: IDLE_EYES, tilt: 0 },
  swimming: { label: 'Swimming', eyes: IDLE_EYES, tilt: 0 },
  happy: {
    label: 'Happy',
    eyes: [poly(3.4, [[82, 38], [85.5, 30], [89, 38]], [[95, 38], [98.5, 30], [102, 38]])],
    tilt: 0,
  },
  confused: { label: 'Confused', eyes: [rect(81, 22, 7, 17), rect(95, 31, 7, 8)], tilt: -8, extras: [QMARK] },
  sad: { label: 'Sad', eyes: [{ d: 'M82 37 L89 33 V44 H82 Z M95 33 L102 37 V44 H95 Z' }], tilt: 9, extras: [TEAR] },
  asleep: { label: 'Asleep', eyes: CLOSED_EYES, tilt: 4, extras: [Z1, Z2] },
  dead: {
    label: 'Dead',
    eyes: [poly(3.2, [[82, 43], [89, 51]], [[89, 43], [82, 51]], [[95, 43], [102, 51]], [[102, 43], [95, 51]])],
    tilt: -14,
    flip: true,
  },
};

const strokeD = (lines) => lines.map((l) => l.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')).join(' ');
const clipId = 'fish-clip';

function eyeSvg(e, ink) {
  if (e.rect) return `<rect x="${e.rect[0]}" y="${e.rect[1]}" width="${e.rect[2]}" height="${e.rect[3]}" fill="${ink}"/>`;
  if (e.stroke) return `<path d="${strokeD(e.stroke.lines)}" fill="none" stroke="${ink}" stroke-width="${e.stroke.width}" stroke-linecap="square"/>`;
  return `<path d="${e.d}" fill="${ink}"/>`;
}

function extraSvg(x, v) {
  const fill = x.fill === 'band' ? `fill="${v.band}"` : `style="fill:var(--fish-extra,${v.ink})"`;
  const shape = x.rect ? `<rect class="${x.cls}" x="${x.rect[0]}" y="${x.rect[1]}" width="${x.rect[2]}" height="${x.rect[3]}"` : `<path class="${x.cls}" d="${x.d}"`;
  return `${shape} ${fill}/>`;
}

/**
 * The key-frame SVG of one pose in one colour version. `animation` (used by the animated
 * exports) may supply { css, eyes } to add a style block and replace the eyes markup.
 */
export function poseSvg(pose, version, animation = {}) {
  const p = POSES[pose];
  const v = VERSIONS[version];
  const label = `${p.label} clownfish`;
  const shape =
    `<path class="tail" fill="${v.body}" d="${TAIL}"/>` +
    `<path class="body" fill="${v.body}" d="${BODY}"/>` +
    `<rect class="band" x="${BAND.x}" y="${BAND.y}" width="${BAND.width}" height="${BAND.height}" fill="${v.band}" clip-path="url(#${clipId})"/>`;
  const eyes = animation.eyes ?? p.eyes.map((e) => eyeSvg(e, v.ink)).join('');
  const inBody = (p.extras ?? []).filter((x) => x.inBody).map((x) => extraSvg(x, v)).join('');
  const outside = (p.extras ?? []).filter((x) => !x.inBody).map((x) => extraSvg(x, v)).join('');
  const body = p.flip ? `<g class="flip" transform="translate(0 ${2 * ORIGIN[1]}) scale(1 -1)">${shape}</g>${eyes}` : `${shape}${eyes}${inBody}`;
  const tilt = p.tilt ? ` transform="rotate(${p.tilt} ${ORIGIN.join(' ')})"` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX.join(' ')}" role="img" aria-label="${label}" class="fish fish--${pose}">\n` +
    `  <title>${label}</title>\n` +
    (animation.css ? `  <style>\n${animation.css}\n  </style>\n` : '') +
    `  <defs><clipPath id="${clipId}"><path d="${BODY}"/><path d="${TAIL}"/></clipPath></defs>\n` +
    `  <g class="mover">\n    <g class="bodyg"${tilt}>${body}</g>\n${outside ? `    ${outside}\n` : ''}  </g>\n</svg>\n`
  );
}

/** Bounding box of everything a key frame draws (tilt and flip applied), for the no-clipping check. */
export function extent(pose) {
  const p = POSES[pose];
  const pts = [];
  const shapePts = [...flatten(BODY).flat(), ...flatten(TAIL).flat()];
  const flipY = ([x, y]) => [x, 2 * ORIGIN[1] - y];
  pts.push(...(p.flip ? shapePts.map(flipY) : shapePts));
  const hw = (w) => w / 2;
  for (const e of p.eyes) {
    if (e.rect) {
      const [x, y, w, h] = e.rect;
      pts.push([x, y], [x + w, y + h]);
    } else if (e.stroke) {
      for (const l of e.stroke.lines) for (const [x, y] of l) pts.push([x - hw(e.stroke.width), y - hw(e.stroke.width)], [x + hw(e.stroke.width), y + hw(e.stroke.width)]);
    } else pts.push(...flatten(e.d).flat());
  }
  const inBodyPts = [];
  const outsidePts = [];
  for (const x of p.extras ?? []) {
    const list = x.rect ? [[x.rect[0], x.rect[1]], [x.rect[0] + x.rect[2], x.rect[1] + x.rect[3]]] : flatten(x.d).flat();
    (x.inBody ? inBodyPts : outsidePts).push(...list);
  }
  const rot = (a) => ([x, y]) => {
    const r = (a * Math.PI) / 180;
    const [dx, dy] = [x - ORIGIN[0], y - ORIGIN[1]];
    return [ORIGIN[0] + dx * Math.cos(r) - dy * Math.sin(r), ORIGIN[1] + dx * Math.sin(r) + dy * Math.cos(r)];
  };
  const all = [...[...pts, ...inBodyPts].map(rot(p.tilt)), ...outsidePts];
  const xs = all.map((q) => q[0]);
  const ys = all.map((q) => q[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
