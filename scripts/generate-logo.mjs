// SPDX-License-Identifier: Apache-2.0

// Generates the logo masters, colourways and PNG exports under assets/logo/.
// generate() returns a Map of repo-relative path to Buffer; build-assets.mjs
// writes it and check-fresh.mjs compares it with the committed files.
import { COLOURS, COLOURWAYS, UNIT, artwork, hex, svg } from './lib/logo.mjs';
import { encodePng, render } from './lib/raster.mjs';

export const ARTWORKS = ['mark', 'lockup-horizontal', 'lockup-stacked'];
export const SIZES = [128, 256, 512, 1024];
export const POINTER = 'Licence: all rights reserved, see [`assets/LICENSE.md`](%PATH%).\n';

/** Renders an artwork to a PNG of the given wide side. */
export function png(name, cw, size) {
  const a = artwork(name);
  const { fg, bg } = COLOURWAYS[cw];
  let [x, y, w, h] = a.vb;
  if (bg) {
    x -= UNIT;
    y -= UNIT;
    w += 2 * UNIT;
    h += 2 * UNIT;
  }
  const s = size / w;
  const [W, H] = [size, Math.round(h * s)];
  const items = a.paths.map((p) => ({
    d: p.d,
    rule: p.rule,
    color: hex(fg),
    m: { s: p.m.s * s, tx: (p.m.tx - x) * s, ty: (p.m.ty - y) * s },
  }));
  return encodePng(W, H, render(W, H, items, bg ? hex(bg) : null));
}

/** The clear-space diagram for docs/logo.md: the horizontal lockup, the clear-space box and the unit x. */
export function clearSpaceDiagram() {
  const a = artwork('lockup-horizontal');
  const [vx, vy, vw, vh] = a.vb;
  const pad = 2 * UNIT;
  const W = vw + 2 * pad;
  const H = vh + 2 * pad;
  const ox = pad - vx;
  const oy = pad - vy;
  const grey = '#5A5F6B';
  const paths = a.paths
    .map((p) => {
      const t = `translate(${p.m.tx + ox} ${p.m.ty + oy})${p.m.s === 1 ? '' : ` scale(${p.m.s})`}`;
      return `  <path transform="${t}" fill="${COLOURS.ink}"${p.rule === 'evenodd' ? ' fill-rule="evenodd"' : ''} d="${p.d}"/>`;
    })
    .join('\n');
  const f = (n) => Math.round(n * 100) / 100;
  const sq = (x, y) => `  <rect x="${f(x)}" y="${f(y)}" width="${UNIT}" height="${UNIT}" fill="none" stroke="${grey}" stroke-width="0.6"/>\n  <text x="${f(x + UNIT / 2)}" y="${f(y + UNIT / 2 + 3.5)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="${grey}">x</text>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(W)} ${f(H)}" role="img" aria-label="Clear space around the Cube Algos logo: x on every side">\n` +
    `  <title>Clear space: x on every side, x = 14/64 of the mark's side</title>\n` +
    `  <rect width="${f(W)}" height="${f(H)}" fill="${COLOURS.paper}"/>\n` +
    `  <rect x="${f(pad - UNIT)}" y="${f(pad - UNIT)}" width="${f(vw + 2 * UNIT)}" height="${f(vh + 2 * UNIT)}" fill="none" stroke="${grey}" stroke-width="0.6" stroke-dasharray="3 2"/>\n` +
    `  <rect x="${f(pad)}" y="${f(pad)}" width="${f(vw)}" height="${f(vh)}" fill="none" stroke="${grey}" stroke-width="0.4"/>\n` +
    `${paths}\n` +
    `${sq(pad - UNIT, oy + 32 - UNIT / 2)}\n${sq(pad + vw, oy + 32 - UNIT / 2)}\n${sq(ox + 32 - UNIT / 2, pad - UNIT)}\n${sq(ox + 32 - UNIT / 2, pad + vh)}\n` +
    `</svg>\n`
  );
}

export function generate() {
  const out = new Map();
  const put = (p, c) => out.set(p, Buffer.from(c));
  for (const n of ['mark', 'wordmark', 'lockup-horizontal', 'lockup-stacked']) put(`assets/logo/${n}.svg`, svg(n));
  for (const n of ARTWORKS) {
    for (const [cw, { fg, bg }] of Object.entries(COLOURWAYS)) {
      put(`assets/logo/svg/${n}-${cw}.svg`, svg(n, fg, bg));
      for (const size of SIZES) out.set(`assets/logo/png/${n}-${cw}-${size}.png`, png(n, cw, size));
    }
  }
  put('assets/logo/clear-space.svg', clearSpaceDiagram());
  put('assets/logo/LICENSE.md', POINTER.replace('%PATH%', '../LICENSE.md'));
  put('assets/logo/svg/LICENSE.md', POINTER.replace('%PATH%', '../../LICENSE.md'));
  put('assets/logo/png/LICENSE.md', POINTER.replace('%PATH%', '../../LICENSE.md'));
  return out;
}
