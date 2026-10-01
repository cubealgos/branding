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
- `chamfer` tokens (`sm` 6px, `md` 9px, `lg` 16px) emitted as `--chamfer-*`, with the clip-path pattern
- `focus` colour role (the amber-family text colour), checked as a 3:1 boundary on bg and card in both themes; the chamfer focus-ring pattern uses it with a 2px gap.
  and a focus-ring pattern that survives `clip-path` documented in the README (#22).

### Removed

- The 2023 brand files, recoverable from the `legacy-2023` tag (#3).
