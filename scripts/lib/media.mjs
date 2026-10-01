// SPDX-License-Identifier: Apache-2.0

// Dependency-free header readers for the rendered sting files, so CI can check
// existence, dimensions, duration and frame count without ffmpeg or a browser.

/** GIF: size, frame count, total delay in seconds and the NETSCAPE loop count (0 = forever). */
export function gifInfo(buf) {
  if (buf.toString('latin1', 0, 3) !== 'GIF') throw new Error('not a GIF');
  const width = buf.readUInt16LE(6);
  const height = buf.readUInt16LE(8);
  let o = 13 + (buf[10] & 0x80 ? 3 * 2 ** ((buf[10] & 7) + 1) : 0);
  let frames = 0;
  let cs = 0;
  let loop = null;
  const skip = () => {
    while (buf[o] !== 0) o += buf[o] + 1;
    o++;
  };
  while (o < buf.length && buf[o] !== 0x3b) {
    if (buf[o] === 0x21) {
      const label = buf[o + 1];
      if (label === 0xf9) cs += buf.readUInt16LE(o + 4);
      if (label === 0xff && buf.toString('latin1', o + 3, o + 14) === 'NETSCAPE2.0') loop = buf.readUInt16LE(o + 16);
      o += 2;
      o += buf[o] + 1;
      skip();
    } else if (buf[o] === 0x2c) {
      frames++;
      const packed = buf[o + 9];
      o += 10 + (packed & 0x80 ? 3 * 2 ** ((packed & 7) + 1) : 0) + 1;
      skip();
    } else throw new Error('bad GIF block');
  }
  return { width, height, frames, seconds: cs / 100, loop };
}

/** MP4: video track size, frame count (stts) and movie duration in seconds. */
export function mp4Info(buf) {
  const boxes = (start, end) => {
    const out = [];
    for (let o = start; o + 8 <= end; ) {
      let size = buf.readUInt32BE(o);
      const type = buf.toString('latin1', o + 4, o + 8);
      let head = 8;
      if (size === 1) {
        size = Number(buf.readBigUInt64BE(o + 8));
        head = 16;
      } else if (size === 0) size = end - o;
      out.push({ type, start: o + head, end: o + size });
      o += size;
    }
    return out;
  };
  const find = (list, type) => list.find((b) => b.type === type);
  const moov = find(boxes(0, buf.length), 'moov');
  if (!moov) throw new Error('no moov box');
  const kids = boxes(moov.start, moov.end);
  const mvhd = find(kids, 'mvhd');
  const v1 = buf[mvhd.start] === 1;
  const timescale = buf.readUInt32BE(mvhd.start + (v1 ? 20 : 12));
  const duration = v1 ? Number(buf.readBigUInt64BE(mvhd.start + 24)) : buf.readUInt32BE(mvhd.start + 16);
  for (const trak of kids.filter((b) => b.type === 'trak')) {
    const tk = boxes(trak.start, trak.end);
    const tkhd = find(tk, 'tkhd');
    const width = buf.readUInt32BE(tkhd.end - 8) / 65536;
    const height = buf.readUInt32BE(tkhd.end - 4) / 65536;
    if (!width) continue;
    const mdia = find(tk, 'mdia');
    const minf = find(boxes(mdia.start, mdia.end), 'minf');
    const stbl = find(boxes(minf.start, minf.end), 'stbl');
    const stts = find(boxes(stbl.start, stbl.end), 'stts');
    let frames = 0;
    for (let i = 0, n = buf.readUInt32BE(stts.start + 4); i < n; i++) frames += buf.readUInt32BE(stts.start + 8 + i * 8);
    return { width, height, frames, seconds: duration / timescale };
  }
  throw new Error('no video track');
}

/** WebM (Matroska): video track size, frame count (blocks) and duration in seconds. */
export function webmInfo(buf) {
  const vint = (o, keepMarker) => {
    let len = 1;
    while (len <= 8 && !(buf[o] & (0x80 >> (len - 1)))) len++;
    let v = keepMarker ? buf[o] : buf[o] & (0xff >> len);
    for (let i = 1; i < len; i++) v = v * 256 + buf[o + i];
    const unknown = !keepMarker && buf.subarray(o, o + len).every((b, i) => b === (i === 0 ? 0xff >> len | (0x80 >> (len - 1)) : 0xff));
    return { v, len, unknown };
  };
  const info = { width: 0, height: 0, frames: 0, seconds: 0 };
  let scale = 1e6;
  let rawDuration = 0;
  const walk = (start, end) => {
    for (let o = start; o < end; ) {
      const id = vint(o, true);
      const size = vint(o + id.len, false);
      const body = o + id.len + size.len;
      const stop = size.unknown ? end : Math.min(body + size.v, end);
      const n = () => {
        let v = 0;
        for (let i = body; i < stop; i++) v = v * 256 + buf[i];
        return v;
      };
      switch (id.v) {
        case 0x18538067: // Segment
        case 0x1549a966: // Info
        case 0x1654ae6b: // Tracks
        case 0xae: // TrackEntry
        case 0xe0: // Video
        case 0x1f43b675: // Cluster
        case 0xa0: // BlockGroup
          if (id.v === 0xa0) info.frames++;
          walk(body, stop);
          break;
        case 0x2ad7b1:
          scale = n();
          break;
        case 0x4489:
          rawDuration = size.v === 4 ? buf.readFloatBE(body) : buf.readDoubleBE(body);
          break;
        case 0xb0:
          info.width = n();
          break;
        case 0xba:
          info.height = n();
          break;
        case 0xa3: // SimpleBlock
          info.frames++;
          break;
        default:
      }
      o = stop;
    }
  };
  walk(0, buf.length);
  info.seconds = (rawDuration * scale) / 1e9;
  return info;
}
