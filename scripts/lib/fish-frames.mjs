// SPDX-License-Identifier: Apache-2.0

// Renders one frame of an animated clownfish at time t with the repository's own
// rasteriser, from the same keyframe tables (SPECS) that generate the CSS, so the
// GIF and WebM frames are identical on every machine (no browser).
import { BAND, BODY, ORIGIN, POSES, TAIL, VERSIONS } from '../fishkit.mjs';
import { flatten, render, strokeOpen } from './raster.mjs';
import { SPECS, stateAt } from './fish-motion.mjs';
import { COLOURS, hex } from './logo.mjs';

/** Export backgrounds; `extra` is the colour of the ? and z Z on it (the standard colour version on both). */
export const BACKGROUNDS = {
  paper: { bg: COLOURS.paper, extra: COLOURS.ink },
  ink: { bg: COLOURS.ink, extra: COLOURS.paper },
};

// 2D affine matrices [a, b, c, d, e, f] as in SVG
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const I = [1, 0, 0, 1, 0, 0];
const move = (x, y) => [1, 0, 0, 1, x, y];
const turn = (deg) => {
  const r = (deg * Math.PI) / 180;
  return [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
};
/** CSS `rotate() translate()` about origin o, as the animated elements apply it. */
const about = (o, rot = 0, x = 0, y = 0) => mul(mul(mul(move(o[0], o[1]), turn(rot)), move(x, y)), move(-o[0], -o[1]));
const apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const through = (m, subs) => subs.map((s) => s.map((pt) => apply(m, pt)));

const rectPoly = ([x, y, w, h]) => [[[x, y], [x + w, y], [x + w, y + h], [x, y + h]]];
/** A stroked polyline with square caps and miter joins, as polygons. */
function strokePolys({ width, lines }) {
  const hw = width / 2;
  return lines.flatMap((l) => {
    const pts = l.map((p) => [...p]);
    const ext = (a, b) => {
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return [a[0] + ((a[0] - b[0]) / d) * hw, a[1] + ((a[1] - b[1]) / d) * hw];
    };
    pts[0] = ext(pts[0], pts[1]);
    pts[pts.length - 1] = ext(pts.at(-1), pts.at(-2));
    return strokeOpen(pts, width);
  });
}
const eyePolys = (e) => (e.rect ? rectPoly(e.rect) : e.stroke ? strokePolys(e.stroke) : flatten(e.d));

/**
 * The shapes of one frame in user units: [{ subs, color, alpha }] in paint order.
 * `t` is in ms of the steady-state loop; version is the colour version (standard on paper and ink).
 */
export function scene(pose, bgName, t, version = 'standard') {
  const p = POSES[pose];
  const v = VERSIONS[version];
  const st = Object.fromEntries(SPECS[pose].map((a) => [a.sel, stateAt(a, t)]));
  const s = (sel) => st[sel] ?? {};
  const moverM = move(s('.mover').x ?? 0, s('.mover').y ?? 0);
  const bodyg = s('.bodyg');
  const bodyM = mul(moverM, about(ORIGIN, bodyg.rot ?? p.tilt, bodyg.x ?? 0, bodyg.y ?? 0));
  const tail = s('.tail');
  const tailM = mul(bodyM, about([60, 40], tail.rot ?? 0));
  const flip = p.flip ? [1, 0, 0, -1, 0, 2 * ORIGIN[1]] : I;
  const items = [];
  const add = (m, subs, color, alpha = 1) => {
    if (alpha > 0.0005) items.push({ subs: through(m, subs), color, alpha });
  };
  add(mul(tailM, flip), flatten(TAIL), v.body);
  add(mul(bodyM, flip), flatten(BODY), v.body);
  add(mul(bodyM, flip), rectPoly([BAND.x, BAND.y, BAND.width, BAND.height]), v.band);
  const look = s('.look').x ?? 0;
  const eyeM = mul(bodyM, move(look, 0));
  if (pose === 'idle') {
    for (const e of p.eyes) add(eyeM, eyePolys(e), v.ink, s('.open').o);
    for (const e of [[82, 38, 7, 3], [95, 38, 7, 3]]) add(eyeM, rectPoly(e), v.ink, s('.shut').o);
  } else for (const e of p.eyes) add(eyeM, eyePolys(e), v.ink);
  for (const x of p.extras ?? []) {
    const a = s(`.${x.cls}`);
    const m = mul(x.inBody ? bodyM : moverM, move(a.x ?? 0, a.y ?? 0));
    const shape = x.rect ? rectPoly(x.rect) : flatten(x.d);
    add(m, shape, x.fill === 'band' ? v.band : BACKGROUNDS[bgName].extra, a.o ?? 1);
  }
  return items;
}

/** RGBA pixels of a frame of w x h px showing viewBox vb; `transparent` leaves the background out. */
export function frameAt(pose, bgName, t, { w, h, vb, transparent = false }) {
  const k = w / vb[2];
  const px = [k, 0, 0, k, -vb[0] * k, -vb[1] * k];
  const items = scene(pose, bgName, t).map((i) => ({ subs: through(px, i.subs), rule: 'nonzero', color: hex(i.color), alpha: i.alpha }));
  return render(w, h, items, transparent ? null : hex(BACKGROUNDS[bgName].bg));
}
