# Cube Algos branding

The Cube Algos brand: design tokens, logo, mascot, motion and guidelines. This repository is being
rebuilt in place (see the open issues and milestones). The 2023 brand is retired and recoverable
with `git checkout legacy-2023`.

## Contents

| Path | What |
| --- | --- |
| `assets/` | Brand assets (logo, wordmark, mascot, favicons, stings, animations); all rights reserved, see `assets/LICENSE.md` |
| `tokens/` | DTCG source tokens: `color`, `typography`, `spacing`, `radius`, `motion` (`*.json`, Apache-2.0; JSON cannot hold a header, so each file's root carries `$extensions["com.cubealgos.license"]`) |
| `scripts/` | Node scripts (`validate-tokens.mjs`) |
| `bin/hooks/` | Git hooks (`commit-msg`) |
| `CLAUDE.md` | Working rules for the branch, commit and PR workflow |
| `CHANGELOG.md` | Keep a Changelog |

Guidelines arrive with a later milestone.

## Build

Node 24 (see `.nvmrc`). `npm run check:tokens` loads every `tokens/*.json` and fails on a missing
`$value`/`$type`, an unresolved reference, a wrong primitive hex or a semantic role that repeats a
hex value. The Style Dictionary build is added next in milestone M1.

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
