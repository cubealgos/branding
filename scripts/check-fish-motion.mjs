// SPDX-License-Identifier: Apache-2.0

// Headless-browser check of the clownfish animations: every animated SVG (both colour versions) and
// fish.css are loaded in Chrome twice. With prefers-reduced-motion emulated as `reduce` no element may
// have a computed animation (animation-name none, no running Animation) and the tilted poses must show
// their key-frame tilt; without it every pose must be animating (so the check cannot pass vacuously).
// Needs Chrome/Chromium (CHROME, google-chrome, chromium, or the macOS app). Run: `npm run check:fish-motion`.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { POSES, VERSIONS } from './fishkit.mjs';

const candidates = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ...['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map((n) => {
    try {
      return execFileSync('which', [n]).toString().trim();
    } catch {
      return null;
    }
  }),
].filter(Boolean);
const chrome = candidates.find((c) => existsSync(c));
if (!chrome) {
  console.error('check-fish-motion: no Chrome or Chromium found (set CHROME).');
  process.exit(process.env.CI ? 1 : 0);
}

const poses = Object.keys(POSES);
const svgs = [];
for (const v of Object.values(VERSIONS)) for (const p of poses) svgs.push([`${v.dir}${p}`, p, readFileSync(`assets/fish/animated/${v.dir}${p}.svg`, 'utf8')]);
const probe = `
const out = svgs => [...document.querySelectorAll('svg.fish')].map((svg) => {
  const els = [svg, ...svg.querySelectorAll('*')];
  const named = els.filter((e) => getComputedStyle(e).animationName !== 'none').length;
  const tilt = svg.querySelector('.bodyg') ? getComputedStyle(svg.querySelector('.bodyg')).transform : '';
  return { id: svg.dataset.id, pose: svg.dataset.pose, named, running: svg.getAnimations({ subtree: true }).length, tilt };
});
document.getElementById('r').textContent = JSON.stringify({ rows: out(), total: document.getAnimations().length });`;

const dir = mkdtempSync(join(tmpdir(), 'fish-motion-'));
try {
  const html =
    `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="${process.cwd()}/assets/fish/fish.css">` +
    svgs.map(([id, pose, s]) => s.replace('<svg ', `<svg data-id="${id}" data-pose="${pose}" width="144" `)).join('\n') +
    `<pre id="r"></pre><script>window.addEventListener('load', () => setTimeout(() => {${probe}}, 300));</script>`;
  writeFileSync(join(dir, 'board.html'), html);
  const run = (reduce) => {
    const args = ['--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=2000', '--dump-dom', ...(reduce ? ['--force-prefers-reduced-motion'] : []), `file://${join(dir, 'board.html')}`];
    const dom = execFileSync(chrome, args, { maxBuffer: 2 ** 26, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    return JSON.parse(dom.match(/<pre id="r">([\s\S]*?)<\/pre>/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  };
  let failed = false;
  const fail = (m) => {
    failed = true;
    console.error(`check-fish-motion: ${m}`);
  };
  const still = run(true);
  const moving = run(false);
  if (still.rows.length !== svgs.length) fail(`${still.rows.length} SVGs found, expected ${svgs.length}`);
  for (const r of still.rows) {
    if (r.named || r.running) fail(`reduced motion: ${r.id} has ${r.named} animated element(s), ${r.running} running animation(s)`);
    if (POSES[r.pose].tilt && r.tilt === 'none') fail(`reduced motion: ${r.id} lost its key-frame tilt`);
  }
  if (still.total !== 0) fail(`reduced motion: ${still.total} animations in the document`);
  for (const r of moving.rows) if (!r.running) fail(`no reduction: ${r.id} is not animating (the check would pass vacuously)`);
  console.log(failed ? 'check-fish-motion: FAILED' : `check-fish-motion: ${svgs.length} SVGs: all animating normally, none with reduced motion (every pose shows its key frame).`);
  process.exitCode = failed ? 1 : 0;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
