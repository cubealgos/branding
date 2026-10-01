// SPDX-License-Identifier: Apache-2.0

// Generates the deterministic part of the sting exports under assets/sting/:
// the animated SVGs and the reduced-motion stills (SVG and PNG). The GIF, MP4
// and WebM files come from `npm run render:sting` (Chrome + ffmpeg).
import { artwork, hex } from './lib/logo.mjs';
import { encodePng, render } from './lib/raster.mjs';
import { BACKGROUNDS, stage, stillSvg, stingSvg } from './lib/sting.mjs';

const STILL_PX = 1280;

function stillPng(bgName) {
  const c = BACKGROUNDS[bgName];
  const [vx, vy, vw, vh] = stage().vb;
  const s = STILL_PX / vw;
  const [W, H] = [STILL_PX, Math.round(vh * s)];
  const items = artwork('lockup-horizontal').paths.map((p) => ({
    d: p.d,
    rule: p.rule,
    color: hex(c.fg),
    m: { s: p.m.s * s, tx: (p.m.tx - vx) * s, ty: (p.m.ty - vy) * s },
  }));
  return encodePng(W, H, render(W, H, items, hex(c.bg)));
}

export function generate() {
  const out = new Map();
  for (const bg of Object.keys(BACKGROUNDS)) {
    out.set(`assets/sting/sting-${bg}.svg`, Buffer.from(stingSvg(bg)));
    out.set(`assets/sting/sting-${bg}-still.svg`, Buffer.from(stillSvg(bg)));
    out.set(`assets/sting/sting-${bg}-still.png`, stillPng(bg));
  }
  out.set('assets/sting/LICENSE.md', Buffer.from('Licence: all rights reserved, see [`assets/LICENSE.md`](../LICENSE.md).\n'));
  return out;
}
