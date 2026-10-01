# CLAUDE.md — branding

The Cube Algos brand repo (design tokens, logo, mascot, motion, guidelines). Public. **Two
licences:** code is Apache-2.0 + CLA, brand assets are all rights reserved (trademarks) — see
`NOTICE` and `assets/LICENSE.md`. **Kevin reviews and merges**; an agent never merges a PR or closes
an issue.

## Read this before you do that

| about to… | read first |
| --- | --- |
| start work on an issue | Branches below: a new worktree, never the main checkout |
| commit | Commits below; install the hook once with `git config core.hooksPath bin/hooks` |
| open a PR | Pull requests below |
| add a code file | it carries `SPDX-License-Identifier: Apache-2.0` |
| add or touch an asset file | `assets/LICENSE.md`: no Apache-2.0 header or SPDX tag on assets; the directory carries a `LICENSE.md` pointer to it |
| add CI | CI below |
| add a dependency | `~/.claude/hafen/standards/legal/dependency-license-policy.md` (Kevin's global layer) |

## Branches

Two long-lived branches: `production` (releasable; the 2023 history lives there, tag `legacy-2023`)
and `development` (integration, default). Both are merge-only: never push to either directly.
Working branches are `<family>/<N>-<slug>`, `N` = GitHub issue number, family one of `feature`
`bugfix` `chore` `documentation` `release` (from `development`) or `hotfix` (from `production`). A CI
job (#7) fails on a non-conforming name.

Every working branch lives in its own worktree at `.worktrees/<N>/` (`git worktree add
--relative-paths`; `.worktrees/` is gitignored). The main checkout stays parked on `development`.
**`git stash` is forbidden**: use a worktree or a WIP commit. Rebase freely before a PR exists;
afterwards only `git merge development` into the branch.

## Commits

`type(scope): description (#N)`, type one of `feat fix docs style refactor perf test build ci chore
revert merge release`, scope and issue reference required for every commit, including
`merge(<scope>): <branch> into <target> (#N)` and `release(<scope>): X.Y.Z (#N)`. Enforced by
`bin/hooks/commit-msg`.

## Pull requests

1 PR = 1 issue. Title is a conforming commit subject ending `(#N)`; the body carries the issue's
acceptance-criteria checklist. **Plain merge only**, never squash or rebase-merge. Issue labels move
`status/in-progress` to `status/review`; the issue is closed manually after verification on merged
`development`, so PR bodies carry no closing keywords.

## CI

GitHub-hosted only (`runs-on: ubuntu-24.04`). **Never the org's self-hosted runner on `operations`**:
this repo is public, so a fork PR could run code on that server. Verification only, one run per
change (push to `development` and `production`, and `pull_request`); deployment is a separate
workflow on a release tag and gates nothing.

## Changelog

`CHANGELOG.md` follows Keep a Changelog; add an `Unreleased` entry with every user-visible change.
