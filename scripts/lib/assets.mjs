// SPDX-License-Identifier: Apache-2.0

// The registry of asset generators and the freshness comparison used by
// check:fresh. Each generator returns Map<repo-relative path, Buffer>.
import { existsSync, readFileSync } from 'node:fs';
import { generate as logo } from '../generate-logo.mjs';
import { generate as icons } from '../generate-icons.mjs';
import { decodePng } from './raster.mjs';

export const generators = { logo, icons };

/**
 * Compares generated files with the committed ones; returns problem strings.
 * PNGs compare by size and inflated pixel rows, so a different zlib build cannot fail the check.
 */
export function compare(generated, root = '.') {
  const problems = [];
  for (const [p, buf] of generated) {
    const f = `${root}/${p}`;
    if (!existsSync(f)) {
      problems.push(`${p}: missing`);
      continue;
    }
    const have = readFileSync(f);
    if (p.endsWith('.png')) {
      const a = decodePng(have);
      const b = decodePng(buf);
      if (a.w !== b.w || a.h !== b.h || !a.raw.equals(b.raw)) problems.push(`${p}: stale (pixels differ)`);
    } else if (!have.equals(buf)) {
      problems.push(`${p}: stale`);
    }
  }
  return problems;
}
