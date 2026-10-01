# Cube Algos branding

The Cube Algos brand: design tokens, logo, mascot, motion and guidelines. This repository is being
rebuilt in place (see the open issues and milestones); the 2023 brand files still in the tree are
replaced as the new brand lands.

## Contents

| Path | What |
| --- | --- |
| `assets/` | Brand assets (logo, wordmark, mascot, favicons, stings, animations); all rights reserved, see `assets/LICENSE.md` |
| `bin/hooks/` | Git hooks (`commit-msg`) |
| `full_logo/`, `icon_logo/`, `colors.json` | 2023 brand, being retired |
| `CLAUDE.md` | Working rules for the branch, commit and PR workflow |
| `CHANGELOG.md` | Keep a Changelog |

Design tokens and guidelines arrive with the later milestones.

## Build

There is nothing to build yet. The build (design tokens via Style Dictionary, asset exports) is
added in milestone M1, and its commands will be listed here.

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
