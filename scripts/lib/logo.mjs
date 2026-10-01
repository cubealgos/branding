// SPDX-License-Identifier: Apache-2.0

// Logo geometry (decisions 11, 12 and 27): the chamfer mark, the outlined
// wordmark `cubealgos` (Onest 800) and the lockups, in a 64-unit mark box.
// Colours are read from the built tokens, never typed twice.
import { readFileSync } from 'node:fs';
import opentype from 'opentype.js';

export const MARK_OUTER = 'M0 0H45.255L64 18.745V64H18.745L0 45.255Z';
export const MARK_INNER = 'M14 14H39.46L50 24.54V50H24.54L14 39.46Z';
export const MARK_D = `${MARK_OUTER} ${MARK_INNER}`;
/** Clear space and the gap between mark and wordmark: the inner void width, 14 of 64 units. */
export const UNIT = 14;

const tokens = JSON.parse(readFileSync('dist/json/tokens.json', 'utf8'));
export const COLOURS = {
  ink: tokens['color.primitive.ink'].$value,
  paper: tokens['color.primitive.paper'].$value,
  amber: tokens['color.primitive.amber'].$value,
  white: tokens['color.primitive.on-amber-white'].$value,
};
export const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

const r2 = (n) => String(Math.round(n * 100) / 100);

/** Colourways: foreground fill and an optional solid background. */
export const COLOURWAYS = {
  ink: { fg: COLOURS.ink, bg: null },
  paper: { fg: COLOURS.paper, bg: null },
  'ink-on-paper': { fg: COLOURS.ink, bg: COLOURS.paper },
  'ink-on-amber': { fg: COLOURS.ink, bg: COLOURS.amber },
  'paper-on-ink': { fg: COLOURS.paper, bg: COLOURS.ink },
};

let wordmarkCache;
/** `cubealgos` outlined from the static Onest ExtraBold (800) font, at 40 units per em. */
export function wordmark() {
  if (wordmarkCache) return wordmarkCache;
  const buf = readFileSync('fonts/onest/Onest-ExtraBold.ttf');
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const F = 40;
  const path = font.getPath('cubealgos', 0, 0, F, { letterSpacing: -0.015, kerning: true });
  const bb = path.getBoundingBox();
  const x0 = bb.x1;
  const out = [];
  for (const c of path.commands) {
    const p = (x, y) => `${r2(x - x0)} ${r2(y)}`;
    if (c.type === 'M' || c.type === 'L') out.push(`${c.type}${p(c.x, c.y)}`);
    else if (c.type === 'Q') out.push(`Q${p(c.x1, c.y1)} ${p(c.x, c.y)}`);
    else if (c.type === 'C') out.push(`C${p(c.x1, c.y1)} ${p(c.x2, c.y2)} ${p(c.x, c.y)}`);
    else if (c.type === 'Z') out.push('Z');
  }
  wordmarkCache = {
    d: out.join(''),
    width: bb.x2 - bb.x1,
    top: bb.y1, // negative: ascender above the baseline (y = 0)
    bottom: bb.y2, // descender below the baseline
    cap: (font.tables.os2.sCapHeight / font.unitsPerEm) * F,
  };
  return wordmarkCache;
}

/**
 * A logo artwork: its viewBox, and its paths as { d, rule, m } where m places the
 * path in the box ({ s: scale, tx, ty }); the same data drives the SVG and the PNG.
 */
export function artwork(name) {
  const w = wordmark();
  const mark = { d: MARK_D, rule: 'evenodd', m: { s: 1, tx: 0, ty: 0 } };
  if (name === 'mark') return { vb: [0, 0, 64, 64], paths: [mark] };
  if (name === 'wordmark') {
    return { vb: [0, w.top, w.width, w.bottom - w.top], paths: [{ d: w.d, rule: 'nonzero', m: { s: 1, tx: 0, ty: 0 } }] };
  }
  if (name === 'lockup-horizontal') {
    // cap-height band of the wordmark centred on the mark's centre (y = 32)
    const baseline = 32 + w.cap / 2;
    const x = 64 + UNIT;
    const top = Math.min(0, baseline + w.top);
    const bottom = Math.max(64, baseline + w.bottom);
    return {
      vb: [0, top, x + w.width, bottom - top],
      paths: [mark, { d: w.d, rule: 'nonzero', m: { s: 1, tx: x, ty: baseline } }],
    };
  }
  if (name === 'lockup-stacked') {
    const k = 0.8; // wordmark scale against the horizontal lockup
    const ww = w.width * k;
    const W = Math.max(64, ww);
    const baseline = 64 + UNIT - w.top * k;
    return {
      vb: [0, 0, W, baseline + w.bottom * k],
      paths: [
        { ...mark, m: { s: 1, tx: (W - 64) / 2, ty: 0 } },
        { d: w.d, rule: 'nonzero', m: { s: k, tx: (W - ww) / 2, ty: baseline } },
      ],
    };
  }
  throw new Error(`unknown artwork ${name}`);
}

const attrs = (m) => (m.s === 1 && m.tx === 0 && m.ty === 0 ? '' : ` transform="translate(${r2(m.tx)} ${r2(m.ty)})${m.s === 1 ? '' : ` scale(${r2(m.s)})`}"`);

const TITLES = {
  mark: 'Cube Algos mark',
  wordmark: 'cubealgos',
  'lockup-horizontal': 'Cube Algos logo',
  'lockup-stacked': 'Cube Algos logo',
};

/** SVG for an artwork; fill is a colour or `currentColor`; bg adds a solid rect with UNIT padding. */
export function svg(name, fill = 'currentColor', bg = null) {
  const a = artwork(name);
  let [x, y, w, h] = a.vb;
  if (bg) {
    x -= UNIT;
    y -= UNIT;
    w += 2 * UNIT;
    h += 2 * UNIT;
  }
  const body = a.paths
    .map((p) => `  <path${attrs(p.m)} fill="${fill}"${p.rule === 'evenodd' ? ' fill-rule="evenodd"' : ''} d="${p.d}"/>`)
    .join('\n');
  const rect = bg ? `  <rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="${bg}"/>\n` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${[x, y, w, h].map(r2).join(' ')}" role="img" aria-label="${TITLES[name]}">\n` +
    `  <title>${TITLES[name]}</title>\n${rect}${body}\n</svg>\n`
  );
}
