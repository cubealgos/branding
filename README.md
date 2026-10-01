# Cube Algos branding

The Cube Algos brand: design tokens, logo, mascot, motion and guidelines. This repository is being
rebuilt in place (see the open issues and milestones). The 2023 brand is retired and recoverable
with `git checkout legacy-2023`.

## Contents

| Path | What |
| --- | --- |
| `assets/` | Brand assets (logo, wordmark, mascot, favicons, stings, animations); all rights reserved, see `assets/LICENSE.md` |
| `tokens/` | DTCG source tokens: `color`, `typography`, `spacing`, `radius`, `motion` (`*.json`, Apache-2.0; JSON cannot hold a header, so each file's root carries `$extensions["com.cubealgos.license"]`) |
| `scripts/` | Node scripts (`validate-tokens.mjs`, `build.mjs`, `check-fresh.mjs`) |
| `dist/` | Generated token outputs, committed: `css/tokens.css`, `json/tokens.json`, `motion/motion.json` |
| `bin/hooks/` | Git hooks (`commit-msg`) |
| `CLAUDE.md` | Working rules for the branch, commit and PR workflow |
| `CHANGELOG.md` | Keep a Changelog |

Guidelines arrive with a later milestone.

## Build

Node 24 (`.nvmrc`), dependencies pinned exactly with `package-lock.json` committed, install scripts
disabled (`.npmrc`).

```sh
npm ci
npm run build          # tokens/*.json -> dist/ with Style Dictionary
npm run check:tokens   # validate the DTCG sources (references, primitives, descriptions)
npm run check:fresh    # rebuild into a temp dir; fail with a diff if the committed dist/ differs
```

`dist/` is generated and committed, so consumers read it on GitHub and can pin a release. Never
edit it by hand: change `tokens/*.json`, run `npm run build`, commit both.

| Output | What |
| --- | --- |
| `dist/css/tokens.css` | CSS custom properties. Light is the default on `:root`; dark values are redefined under `@media (prefers-color-scheme: dark)` for `:root:not([data-theme="light"])` and under `:root[data-theme="dark"]`. Semantic colours are `--color-bg`, `--color-fg`, `--color-card`, `--color-muted`, `--color-rule`, `--color-accent-fill`, `--color-accent-text`, `--color-on-accent`; motion is `--duration-draw: 900ms`, `--ease-draw: cubic-bezier(.65,0,.35,1)`, `--press-scale` |
| `dist/json/tokens.json` | The resolved flat token set (dotted path to `$value`, `$type`) for tools |
| `dist/motion/motion.json` | For video tools: every duration with `ms`, `frames24`, `frames60`, every easing with `x1 y1 x2 y2` |

Consuming the CSS: copy `dist/css/tokens.css` from a release tag into the site (or link it) and load
it before your own styles, then use the properties:

```css
@import "tokens.css";
body { background: var(--color-bg); color: var(--color-fg); font-family: var(--font-family-sans); }
```

Set `data-theme="light"` or `data-theme="dark"` on `<html>` to override the visitor's system theme.

## Contributing

1. Install the commit hook once per clone: `git config core.hooksPath bin/hooks`.
2. Branch from `development` as `<family>/<N>-<slug>` (`feature` `bugfix` `chore` `documentation`
   `release`; `hotfix` from `production`), `N` being the GitHub issue number, in its own worktree:
   `git worktree add --relative-paths .worktrees/<N> -b <family>/<N>-<slug> origin/development`.
3. Commit as `type(scope): description (#N)`. One issue, one branch, one pull request; plain merge
   only.

See `CONTRIBUTING.md` and `CLAUDE.md` for the full rules, and `SECURITY.md` to report a
vulnerability.

## Licence

| What | Licence |
| --- | --- |
| Code: design-token sources, build and generator scripts, CI, docs tooling | Apache-2.0 + CLA: [LICENSE](LICENSE), [NOTICE](NOTICE), [CLA.md](CLA.md) |
| Brand assets: logos, wordmark, clownfish mascot, favicons, stings, animations, and anything that identifies Cube Algos | All rights reserved, trademarks: [assets/LICENSE.md](assets/LICENSE.md) |

The code is free to reuse under Apache-2.0. The brand assets are not: you may show the logo
unmodified to refer to Cube Algos, and anything else needs written permission from
hello@cubealgos.de. The Apache-2.0 licence never applies to an asset file.
