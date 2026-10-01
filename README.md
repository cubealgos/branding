# Cube Algos branding

The Cube Algos brand: design tokens, logo, mascot, motion and guidelines. This repository is being
rebuilt in place (see the open issues and milestones). The 2023 brand is retired and recoverable
with `git checkout legacy-2023`.

## Contents

| Path | What |
| --- | --- |
| `assets/` | Brand assets (logo, wordmark, mascot, favicons, stings, animations); all rights reserved, see `assets/LICENSE.md` |
| `tokens/` | DTCG source tokens: `color`, `typography`, `spacing`, `radius`, `motion` (`*.json`, Apache-2.0; JSON cannot hold a header, so each file's root carries `$extensions["com.cubealgos.license"]`) |
| `scripts/` | Node scripts (`validate-tokens.mjs`, `build.mjs`, `check-fresh.mjs`, `contrast-check.mjs`) |
| `fonts/onest/` | Onest ExtraBold source for the outlined wordmark, with its OFL text (build input, not a brand asset) |
| `docs/` | `logo.md` (logo files, clear space, misuse), `contrast.md` (generated contrast table), `licence-exceptions.toml` (recorded licence exceptions, empty) |
| `tool/` | CI checks: `branch-lint`, `lint-history`, `changelog-check`, `licence-check` (`.mjs`), `commit-baseline.txt` (grandfathered SHAs) |
| `.github/` | Verification workflows (GitHub-hosted `ubuntu-24.04`, actions pinned by SHA) and the `setup` composite action |
| `test/` | Unit tests (`npm test`) |
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
npm run check:fresh    # rebuild into a temp dir; fail with a diff if the committed dist/ or docs/contrast.md differs
npm run check:contrast # WCAG 2.2 AA contrast of the declared pairs, both themes; writes docs/contrast.md
npm run build:logo     # regenerate assets/logo/ (SVG colourways, PNG exports, clear-space diagram)
npm run build:icons    # regenerate assets/favicon/ (favicon.svg/.ico, app and maskable icons, snippets)
npm test               # unit tests (contrast maths, the amber rule)
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

### Contrast

`tokens/contrast-pairs.json` declares the role pairs (`fg/bg`, `muted/card`, `on-accent/accent-fill`, ...)
with a `kind`: `text` (4.5:1), `large-text` and `boundary` (3:1) or `decoration` (no threshold, listed so
the exemption is visible). `npm run check:contrast` evaluates them in the light and dark themes against
`dist/json/tokens.json`, prints the table and exits 1 on any failure. The amber rule is enforced: a
`text` or `boundary` pair with `accent-fill` (amber) on paper always fails. Results: `docs/contrast.md`.

## Checks

CI runs one workflow per check on every push to `development`/`production` and every pull request,
on GitHub-hosted runners only; verification only, nothing deploys. Run each locally (after `npm ci`):

| Workflow | Locally | What it fails on |
| --- | --- | --- |
| `build` | `npm run build && git status --short dist` and `npm run check:fresh` | a stale committed `dist/`, `docs/contrast.md` or generated asset (`assets/logo/`, `assets/favicon/`; PNGs compared by pixels) |
| `contrast` | `npm run check:contrast`, `npm test` | a role pair under its WCAG 2.2 AA threshold; amber text or boundary on paper |
| `licence-check` | `npm run check:licence` | a lockfile package (production or dev) on the deny list, not on the allow list, unknown, or MPL-2.0 without a recorded exception in `docs/licence-exceptions.toml`; exceptions are printed every run |
| `branch-lint` | `npm run check:branch [-- <branch>]` | a branch not named `<family>/<N>-<slug>` |
| `lint-history` | `npm run check:history` | a commit subject not `type(scope): description (#N)`, unless its full SHA is in `tool/commit-baseline.txt` (the 2023 commit only) |
| `changelog-check` | `npm run check:changelog` | a `CHANGELOG.md` without an `Unreleased` section |

The licence policy mirrors `standards/legal/dependency-license-policy.md` of the org's standards: it
allows MIT, Apache-2.0 (also WITH LLVM-exception), BSD-2/3-Clause, Unicode-3.0, Unlicense, CC0-1.0,
Zlib, ISC, PSF-2.0 (`Python-2.0` is read as PSF-2.0), BlueOak-1.0.0, MIT-0 and 0BSD, and denies GPL,
AGPL, LGPL, SSPL and BUSL.

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
