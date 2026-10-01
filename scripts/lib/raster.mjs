// SPDX-License-Identifier: Apache-2.0

// A tiny dependency-free vector rasteriser and PNG/ICO writer, so the logo and
// icon exports are generated the same way on every machine (no browser, no
// librsvg): exact horizontal coverage on 8 sub-scanlines per pixel row.
// Supports absolute path data with M L H V Q C Z only (what the generators emit).
import { deflateSync, inflateSync } from 'node:zlib';

/** Parses absolute SVG path data (M L H V Q C Z) into subpaths of flattened points. */
export function flatten(d, m = { s: 1, tx: 0, ty: 0 }) {
  const toks = d.match(/[MLHVQCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const subs = [];
  let cur = null;
  let x = 0;
  let y = 0;
  let i = 0;
  const num = () => Number(toks[i++]);
  const pt = (px, py) => [px * m.s + m.tx, py * m.s + m.ty];
  while (i < toks.length) {
    const c = toks[i++];
    if (c === 'M') {
      x = num();
      y = num();
      cur = [pt(x, y)];
      subs.push(cur);
    } else if (c === 'L') {
      x = num();
      y = num();
      cur.push(pt(x, y));
    } else if (c === 'H') {
      x = num();
      cur.push(pt(x, y));
    } else if (c === 'V') {
      y = num();
      cur.push(pt(x, y));
    } else if (c === 'Q') {
      const [x1, y1, x2, y2] = [num(), num(), num(), num()];
      for (let k = 1; k <= 12; k++) {
        const t = k / 12;
        const u = 1 - t;
        cur.push(pt(u * u * x + 2 * u * t * x1 + t * t * x2, u * u * y + 2 * u * t * y1 + t * t * y2));
      }
      x = x2;
      y = y2;
    } else if (c === 'C') {
      const [x1, y1, x2, y2, x3, y3] = [num(), num(), num(), num(), num(), num()];
      for (let k = 1; k <= 16; k++) {
        const t = k / 16;
        const u = 1 - t;
        cur.push(
          pt(
            u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
            u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
          ),
        );
      }
      x = x3;
      y = y3;
    } else if (c === 'Z') {
      // closed implicitly when filling
    }
  }
  return subs;
}

/** Coverage (0..1 per pixel) of the filled subpaths. rule: 'evenodd' | 'nonzero'. */
export function coverage(subs, w, h, rule = 'nonzero') {
  const S = 8;
  const edges = [];
  for (const p of subs) {
    for (let k = 0; k < p.length; k++) {
      const [x0, y0] = p[k];
      const [x1, y1] = p[(k + 1) % p.length];
      if (y0 === y1) continue;
      edges.push(y0 < y1 ? { x0, y0, x1, y1, dir: 1 } : { x0: x1, y0: y1, x1: x0, y1: y0, dir: -1 });
    }
  }
  const cov = new Float32Array(w * h);
  if (edges.length === 0) return cov;
  const y0 = Math.max(0, Math.floor(Math.min(...edges.map((e) => e.y0))));
  const y1 = Math.min(h, Math.ceil(Math.max(...edges.map((e) => e.y1))));
  for (let py = y0; py < y1; py++) {
    for (let k = 0; k < S; k++) {
      const ys = py + (k + 0.5) / S;
      const xs = [];
      for (const e of edges) {
        if (ys >= e.y0 && ys < e.y1) xs.push([e.x0 + ((ys - e.y0) / (e.y1 - e.y0)) * (e.x1 - e.x0), e.dir]);
      }
      if (xs.length === 0) continue;
      xs.sort((a, b) => a[0] - b[0]);
      let wind = 0;
      for (let j = 0; j < xs.length - 1; j++) {
        wind += xs[j][1];
        const inside = rule === 'evenodd' ? (j + 1) % 2 === 1 : wind !== 0;
        if (!inside) continue;
        const a = Math.max(xs[j][0], 0);
        const b = Math.min(xs[j + 1][0], w);
        for (let px = Math.floor(a); px < Math.ceil(b); px++) {
          cov[py * w + px] += (Math.min(b, px + 1) - Math.max(a, px)) / S;
        }
      }
    }
  }
  return cov;
}

/**
 * Renders items over an optional background to an RGBA buffer.
 * item: { d, rule, color: [r,g,b], m: {s,tx,ty} }; bg: [r,g,b] or null (transparent).
 */
export function render(w, h, items, bg = null) {
  const rgba = new Uint8Array(w * h * 4);
  // premultiplied float accumulation, composited item by item
  const acc = new Float64Array(w * h * 4);
  if (bg) {
    for (let i = 0; i < w * h; i++) acc.set([bg[0], bg[1], bg[2], 255], i * 4);
  }
  for (const it of items) {
    const cov = coverage(it.subs ?? flatten(it.d, it.m), w, h, it.rule);
    const alpha = it.alpha ?? 1;
    for (let i = 0; i < w * h; i++) {
      const a = Math.min(cov[i], 1) * alpha;
      if (a === 0) continue;
      const o = i * 4;
      const inv = 1 - a;
      acc[o] = it.color[0] * a * 1 + acc[o] * inv;
      acc[o + 1] = it.color[1] * a + acc[o + 1] * inv;
      acc[o + 2] = it.color[2] * a + acc[o + 2] * inv;
      acc[o + 3] = 255 * a + acc[o + 3] * inv;
    }
  }
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const a = acc[o + 3];
    if (a === 0) continue;
    // un-premultiply: acc holds colour*alpha/255 scaled; recover straight colour
    const k = 255 / a;
    rgba[o] = Math.round(Math.min(255, acc[o] * k));
    rgba[o + 1] = Math.round(Math.min(255, acc[o + 1] * k));
    rgba[o + 2] = Math.round(Math.min(255, acc[o + 2] * k));
    rgba[o + 3] = Math.round(a);
  }
  return rgba;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Encodes RGBA pixels as an 8-bit RGBA PNG (filter 0 on every row). */
export function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Reads width, height and the inflated scanlines of a PNG (compression-independent comparison). */
export function decodePng(buf) {
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const idat = [];
  for (let o = 8; o < buf.length; ) {
    const len = buf.readUInt32BE(o);
    if (buf.toString('ascii', o + 4, o + 8) === 'IDAT') idat.push(buf.subarray(o + 8, o + 8 + len));
    o += 12 + len;
  }
  return { w, h, raw: inflateSync(Buffer.concat(idat)) };
}

/** An ICO with uncompressed 32-bit BMP images; images: [{ size, rgba }]. */
export function encodeIco(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  const bodies = images.map(({ size, rgba }) => {
    const mask = Buffer.alloc(Math.ceil(size / 32) * 4 * size); // all zero: opaque, alpha channel decides
    const dib = Buffer.alloc(40 + size * size * 4);
    dib.writeUInt32LE(40, 0);
    dib.writeInt32LE(size, 4);
    dib.writeInt32LE(size * 2, 8);
    dib.writeUInt16LE(1, 12);
    dib.writeUInt16LE(32, 14);
    dib.writeUInt32LE(size * size * 4, 20);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const s = ((size - 1 - y) * size + x) * 4;
        const d = 40 + (y * size + x) * 4;
        dib[d] = rgba[s + 2];
        dib[d + 1] = rgba[s + 1];
        dib[d + 2] = rgba[s];
        dib[d + 3] = rgba[s + 3];
      }
    }
    return Buffer.concat([dib, mask]);
  });
  let off = head.length;
  images.forEach(({ size }, i) => {
    const o = 6 + i * 16;
    head[o] = size;
    head[o + 1] = size;
    head.writeUInt16LE(1, o + 4);
    head.writeUInt16LE(32, o + 6);
    head.writeUInt32LE(bodies[i].length, o + 8);
    head.writeUInt32LE(off, o + 12);
    off += bodies[i].length;
  });
  return Buffer.concat([head, ...bodies]);
}

/** Miter-join offset of a polyline vertex: the point `hw` to the left of the path at vertex i. */
function offsetPoint(pts, i, hw, closed) {
  const n = pts.length;
  const prev = closed || i > 0 ? pts[(i - 1 + n) % n] : null;
  const next = closed || i < n - 1 ? pts[(i + 1) % n] : null;
  const dir = (a, b) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  const d0 = prev ? dir(prev, pts[i]) : dir(pts[i], next);
  const d1 = next ? dir(pts[i], next) : d0;
  const n0 = [-d0[1], d0[0]];
  const n1 = [-d1[1], d1[0]];
  const mx = n0[0] + n1[0];
  const my = n0[1] + n1[1];
  const k = hw / (1 + n0[0] * n1[0] + n0[1] * n1[1]); // miter: offset = (n0 + n1) * hw / (1 + n0.n1)
  return [pts[i][0] + mx * k, pts[i][1] + my * k];
}

/** Stroke of a closed polygon (miter joins) as two rings; fill them with the evenodd rule. */
export function strokeClosed(pts, width) {
  const hw = width / 2;
  return [pts.map((_, i) => offsetPoint(pts, i, hw, true)), pts.map((_, i) => offsetPoint(pts, i, -hw, true))];
}

/** Stroke of an open polyline (butt caps, miter joins) as one polygon. */
export function strokeOpen(pts, width) {
  const hw = width / 2;
  const left = pts.map((_, i) => offsetPoint(pts, i, hw, false));
  const right = pts.map((_, i) => offsetPoint(pts, i, -hw, false)).reverse();
  return [[...left, ...right]];
}

/** The points of a closed polygon path from its start to arc length `len` (an open polyline). */
export function trimClosed(pts, len) {
  const out = [pts[0]];
  let left = len;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (left <= seg) {
      if (left > 1e-9) out.push([a[0] + ((b[0] - a[0]) * left) / seg, a[1] + ((b[1] - a[1]) * left) / seg]);
      return out;
    }
    out.push(b);
    left -= seg;
  }
  return out;
}

/** Total length of a closed polygon. */
export function perimeter(pts) {
  return pts.reduce((sum, a, i) => sum + Math.hypot(pts[(i + 1) % pts.length][0] - a[0], pts[(i + 1) % pts.length][1] - a[1]), 0);
}
