# Changelog

All notable changes to this repository are documented here, in the
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

## [Unreleased]

### Added

- Licence split: Apache-2.0 for code, all rights reserved for brand assets (#1).
- Repo conventions: README, CLAUDE.md, commit-msg hook (#2).
- DTCG source tokens (colour with light and dark themes, typography, spacing, radius, motion) in
  `tokens/`, and `npm run check:tokens` to validate them (#4).
- Style Dictionary build (`npm run build`) with committed outputs in `dist/` (`css/tokens.css`,
  `json/tokens.json`, `motion/motion.json`) and `npm run check:fresh` (#5).
- WCAG 2.2 AA contrast check for both themes (`npm run check:contrast`), the declared pairs in
  `tokens/contrast-pairs.json`, the generated table `docs/contrast.md`, and unit tests (#6).
- Verification CI on GitHub-hosted runners: `build`, `contrast`, `licence-check`, `branch-lint`,
  `lint-history` and `changelog-check` workflows, the Node scripts behind them in `tool/`, the
  commit baseline (the 2023 commit) and the licence exceptions file (#7).
- Logo masters (chamfer mark, outlined `cubealgos` wordmark, horizontal and stacked lockups) with
  `ink`, `paper`, `ink-on-paper`, `ink-on-amber` and `paper-on-ink` colourways, PNG exports at 128 to 1024 px,
  `docs/logo.md` (clear space, minimum size, misuse), the Onest ExtraBold source and OFL text, and
  `npm run build:logo`; `check:fresh` now covers generated assets (#8).

### Removed

- The 2023 brand files, recoverable from the `legacy-2023` tag (#3).
