// SPDX-License-Identifier: Apache-2.0

// Rebuilds into a temp dir and fails with a diff if the committed dist/
// differs, or docs/contrast.md differs from the contrast table of the rebuilt
// tokens. Run: `npm run check:fresh`.
import { mkdtempSync, readdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from './build.mjs';
import { evaluate, renderMarkdown } from './contrast.mjs';

function files(dir, base = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name), base) : [join(dir, e.name).slice(base.length + 1)],
  );
}

const tmp = mkdtempSync(join(tmpdir(), 'branding-dist-'));
try {
  const fresh = join(tmp, 'dist');
  await build(fresh);
  const a = files('dist').sort();
  const b = files(fresh).sort();
  const stale =
    a.join('\n') !== b.join('\n') ||
    a.some((f) => !readFileSync(join('dist', f)).equals(readFileSync(join(fresh, f))));
  // docs/contrast.md must match what the freshly built tokens produce.
  const contrast = renderMarkdown(
    evaluate(
      JSON.parse(readFileSync(join(fresh, 'json', 'tokens.json'), 'utf8')),
      JSON.parse(readFileSync('tokens/contrast-pairs.json', 'utf8')),
    ),
  );
  const contrastStale = !existsSync('docs/contrast.md') || readFileSync('docs/contrast.md', 'utf8') !== contrast;
  if (contrastStale) {
    console.error('check:fresh: docs/contrast.md is stale. Run `npm run build && npm run check:contrast` and commit the result.');
    process.exitCode = 1;
  }
  if (stale) {
    spawnSync('diff', ['-ru', 'dist', fresh], { stdio: 'inherit' });
    console.error('check:fresh: committed dist/ is stale. Run `npm run build` and commit the result.');
    process.exitCode = 1;
  } else if (!contrastStale) {
    console.log(`check:fresh: dist/ and docs/contrast.md are up to date (${a.length} dist files).`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
