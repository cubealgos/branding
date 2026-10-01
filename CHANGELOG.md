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

### Removed

- The 2023 brand files, recoverable from the `legacy-2023` tag (#3).
