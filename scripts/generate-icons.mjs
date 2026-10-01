// SPDX-License-Identifier: Apache-2.0

// Generates the favicon and app icon set under assets/favicon/ from the mark
// (one colour, never amber): the SVG favicon, favicon.ico (16, 32, 48), the
// apple-touch icon, the 192 and 512 icons and their maskable twins.
// Run: `npm run build:icons`. Same output on every machine (own rasteriser).
import { COLOURS, MARK_D, hex } from './lib/logo.mjs';
import { encodeIco, encodePng, render } from './lib/raster.mjs';

/** Padding around the mark on the "any" icons: 12% of the icon on each side. */
export const PAD = 0.12;
/**
 * Maskable icons: the mark's corners must stay inside the 80% safe circle
 * (radius 0.4 of the icon), so the mark's side is at most 0.4 * 2 / sqrt(2) = 0.5657;
 * 0.55 leaves a small margin.
 */
export const MASKABLE_MARK = 0.55;

/** The mark in ink on a solid paper square; `markFraction` is the mark's side over the icon's. */
export function icon(size, markFraction) {
  const s = (size * markFraction) / 64;
  const t = (size - size * markFraction) / 2;
  return render(
    size,
    size,
    [{ d: MARK_D, rule: 'evenodd', color: hex(COLOURS.ink), m: { s, tx: t, ty: t } }],
    hex(COLOURS.paper),
  );
}

const png = (size, markFraction) => encodePng(size, size, icon(size, markFraction));

const POINTER = 'Licence: all rights reserved, see [`assets/LICENSE.md`](../LICENSE.md).\n';

export function generate() {
  const out = new Map();
  const put = (p, c) => out.set(`assets/favicon/${p}`, Buffer.from(c));
  put(
    'favicon.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">\n` +
      `  <style>path { fill: ${COLOURS.ink}; } @media (prefers-color-scheme: dark) { path { fill: ${COLOURS.paper}; } }</style>\n` +
      `  <path fill-rule="evenodd" d="${MARK_D}"/>\n</svg>\n`,
  );
  out.set(
    'assets/favicon/favicon.ico',
    encodeIco([16, 32, 48].map((size) => ({ size, rgba: icon(size, 1 - 2 * PAD) }))),
  );
  out.set('assets/favicon/apple-touch-icon.png', png(180, 1 - 2 * PAD));
  for (const size of [192, 512]) {
    out.set(`assets/favicon/icon-${size}.png`, png(size, 1 - 2 * PAD));
    out.set(`assets/favicon/icon-maskable-${size}.png`, png(size, MASKABLE_MARK));
  }
  put(
    'manifest-snippet.json',
    JSON.stringify(
      {
        theme_color: COLOURS.paper,
        background_color: COLOURS.paper,
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      null,
      2,
    ) + '\n',
  );
  put(
    'head-snippet.html',
    [
      '<link rel="icon" href="/favicon.ico" sizes="48x48">',
      '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
      '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
      '<link rel="manifest" href="/manifest.webmanifest">',
      `<meta name="theme-color" content="${COLOURS.paper}">`,
      '',
    ].join('\n'),
  );
  put('LICENSE.md', POINTER);
  return out;
}
