// SPDX-License-Identifier: Apache-2.0

// Generates the clownfish key-frame masters: assets/fish/<pose>.svg (standard) and
// assets/fish/on-amber/<pose>.svg for the seven poses (decision 13). Run: `npm run build:fish`.
import { POSES, VERSIONS, poseSvg } from './fishkit.mjs';

const pointer = (up) => Buffer.from(`Licence: all rights reserved, see [\`assets/LICENSE.md\`](${up}LICENSE.md).\n`);

export function generate() {
  const out = new Map();
  for (const [version, v] of Object.entries(VERSIONS)) {
    for (const pose of Object.keys(POSES)) out.set(`assets/fish/${v.dir}${pose}.svg`, Buffer.from(poseSvg(pose, version)));
  }
  out.set('assets/fish/LICENSE.md', pointer('../'));
  out.set('assets/fish/on-amber/LICENSE.md', pointer('../../'));
  return out;
}
