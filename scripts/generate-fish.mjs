// SPDX-License-Identifier: Apache-2.0

// Generates the clownfish key-frame masters (assets/fish/<pose>.svg standard, assets/fish/on-amber/<pose>.svg)
// and the animations (assets/fish/animated/..., assets/fish/fish.css) for the seven poses (decision 13).
// Run: `npm run build:fish`. The GIF and WebM exports come from `npm run render:fish` (ffmpeg).
import { POSES, VERSIONS, poseSvg } from './fishkit.mjs';
import { fishCss, svgCss } from './lib/fish-motion.mjs';

const pointer = (up) => Buffer.from(`Licence: all rights reserved, see [\`assets/LICENSE.md\`](${up}LICENSE.md).\n`);

export function generate() {
  const out = new Map();
  for (const [version, v] of Object.entries(VERSIONS)) {
    for (const pose of Object.keys(POSES)) out.set(`assets/fish/${v.dir}${pose}.svg`, Buffer.from(poseSvg(pose, version)));
  }
  for (const [version, v] of Object.entries(VERSIONS)) {
    for (const pose of Object.keys(POSES)) {
      out.set(`assets/fish/animated/${v.dir}${pose}.svg`, Buffer.from(poseSvg(pose, version, { css: svgCss(pose), blink: pose === 'idle' })));
    }
  }
  out.set('assets/fish/fish.css', Buffer.from(fishCss()));
  out.set('assets/fish/animated/LICENSE.md', pointer('../../'));
  out.set('assets/fish/animated/on-amber/LICENSE.md', pointer('../../../'));
  out.set('assets/fish/animated/social/LICENSE.md', pointer('../../../'));
  out.set('assets/fish/LICENSE.md', pointer('../'));
  out.set('assets/fish/on-amber/LICENSE.md', pointer('../../'));
  return out;
}
