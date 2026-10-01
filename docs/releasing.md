# Releasing

Releases are tagged `vX.Y.Z` on `production`. The website (and anything else) pins a release by tag
and checksum. Publishing is a separate workflow, `.github/workflows/release.yml`: it runs only when a
`v*.*.*` tag is pushed, deploys nothing and gates nothing (a failed run is a new bug issue, not a
blocked merge). Verification stays in its own workflows.

## Steps

1. Branch `release/<N>-X.Y.Z` from `development`, in a worktree (`<N>` is the release issue).
2. Bump `version` in `package.json` (and `package-lock.json`: `npm version X.Y.Z --no-git-tag-version`).
3. Update `CHANGELOG.md`: turn the `Unreleased` entries into a `## [X.Y.Z] - YYYY-MM-DD` section and
   leave a fresh empty `## [Unreleased]` above it.
4. Run `npm run package` twice and compare the sums (see below); commit
   `release(repo): X.Y.Z (#N)`.
5. Open the PR titled `release(repo): X.Y.Z (#N)` and merge it **plainly into `production`**.
6. Tag the merge commit on `production` and push the tag:
   `git tag -a vX.Y.Z -m vX.Y.Z && git push origin vX.Y.Z`.
7. Check the `release` workflow run and the GitHub release (assets, notes, `shasum -a 256 -c SHA256SUMS`).
8. Merge `production` back into `development` (`merge(repo): production into development (#N)`).

## What the workflow does

On a `v*.*.*` tag push, on GitHub-hosted `ubuntu-24.04`, with `contents: write` on the release job
only: it refuses a tag whose commit is not on `production`, runs `npm run package -- --tag "$TAG"`
(which refuses a tag that is not `vX.Y.Z`, does not equal the `package.json` version or has no
non-empty `CHANGELOG.md` section), verifies the sums, and creates the GitHub release with notes copied
from that CHANGELOG section (a tag with a `-suffix` is marked a pre-release).

## Assets

| Asset | What |
| --- | --- |
| `tokens.css`, `tokens.json`, `motion.json` | `dist/css/tokens.css`, `dist/json/tokens.json`, `dist/motion/motion.json` |
| `logo-vX.Y.Z.zip` | Mark, wordmark, lockups and colourways (SVG and PNG), the favicon set, `LICENSE.md` |
| `fish-vX.Y.Z.zip` | Static and animated SVGs in both colour versions, `fish.css`, GIF and WebM, `LICENSE.md` |
| `sting-vX.Y.Z.zip` | Animated SVG, GIF, MP4, WebM and stills for paper, ink and amber, the mark-only inline sting (`sting-mark.svg`, `sting-mark-still.svg`), `LICENSE.md` |
| `SHA256SUMS` | SHA-256 of every asset above: `<hash>  <file>` |

Every zip unpacks into its own folder (`logo-vX.Y.Z/`), carries `LICENSE.md` (the brand asset licence,
all rights reserved) at its top and mirrors the layout of `assets/`.

## Reproducibility

`npm run package` (`scripts/package.mjs`, no dependencies beyond Node's `zlib`) writes everything to the
gitignored `release/`: zip entries sorted bytewise, a fixed 1980-01-01 timestamp, no extra fields, PNG, GIF,
MP4, WebM and ICO stored without recompression. The same tree therefore gives the same sums. Check:

```sh
npm run package && cp release/SHA256SUMS /tmp/sums-1 && npm run package && diff /tmp/sums-1 release/SHA256SUMS
(cd release && shasum -a 256 -c SHA256SUMS)
```

`npm run package -- --tag vX.Y.Z` additionally checks the tag against `package.json` and the changelog.

## Pinning a release in the website

Pin the tag and the checksum from `SHA256SUMS`, then verify after download:

```sh
curl -fsSLO https://github.com/cubealgos/branding/releases/download/vX.Y.Z/tokens.css
echo "<sha256 from SHA256SUMS>  tokens.css" | shasum -a 256 -c
```

The website records the tag (`vX.Y.Z`) and the sha256 of each file it vendors; bumping a pin means
changing both in one commit.
