// SPDX-License-Identifier: Apache-2.0

// Renders one frame of the sting at time t with the repository's own
// rasteriser, from the same keyframe tables (TRACKS) that generate the CSS of
// the animated SVG, so frames are identical on every machine (no browser).
import { MARK_INNER, MARK_OUTER, artwork, hex } from './logo.mjs';
import { flatten, perimeter, render, strokeClosed, strokeOpen, trimClosed } from './raster.mjs';
import { BACKGROUNDS, LOOP_MS, trackAt } from './sting.mjs';

const polygon = (d) => flatten(d)[0];
const OUTER = polygon(MARK_OUTER);
const INNER = polygon(MARK_INNER);

/**
 * RGBA pixels of the looping sting at time t (ms) for a frame of w x h px showing viewBox vb.
 * User units map to px with `scale`; the whole mark is scaled about (32, 32) by `s`.
 */
export function frameAt(bgName, t, { w, h, vb }) {
  const c = BACKGROUNDS[bgName];
  const scale = w / vb[2];
  const toPx = ([x, y]) => [(x - vb[0]) * scale, (y - vb[1]) * scale];
  const about = (s) => ([x, y]) => toPx([32 + (x - 32) * s, 32 + (y - 32) * s]);
  const out = trackAt('out', t).opacity;
  const items = [];
  const add = (subs, rule, color, alpha) => {
    if (alpha > 0.0005) items.push({ subs, rule, color: hex(color), alpha: alpha * out });
  };

  const echo = trackAt('echo', t);
  add(strokeClosed(OUTER.map(about(echo.scale)), 2.5 * echo.scale * scale), 'evenodd', c.echo, echo.opacity);

  const s = trackAt('press', t).scale;
  const o = trackAt('outline', t);
  const progress = 1 - o.offset / 1000;
  for (const ring of [OUTER, INNER]) {
    const len = perimeter(ring) * progress;
    if (len > 1e-6) add(strokeOpen(trimClosed(ring, len).map(about(s)), 2.6 * s * scale), 'nonzero', c.fg, o.opacity);
  }
  add([OUTER.map(about(s)), INNER.map(about(s))], 'evenodd', c.fg, trackAt('fillin', t).opacity);

  const wm = trackAt('wm', t);
  const { wordmark, x, baseline } = (() => {
    const a = artwork('lockup-horizontal');
    return { wordmark: a.paths[1], x: a.paths[1].m.tx, baseline: a.paths[1].m.ty };
  })();
  add(flatten(wordmark.d, { s: scale, tx: (x + wm.dx - vb[0]) * scale, ty: (baseline - vb[1]) * scale }), 'nonzero', c.fg, wm.opacity);
  return render(w, h, items, hex(c.bg));
}

export { LOOP_MS };
