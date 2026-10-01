# Logo

The logo is the chamfer ring (decision 11) and the lowercase wordmark `cubealgos` (decisions 12 and 27,
Onest ExtraBold 800, converted to outlines). One colour per use: **ink `#16181D` on paper `#EDEEF1`,
ink on amber `#D9831A`, paper on ink. Never amber.** Amber stays with the mascot, buttons and accents.
All logo files are brand assets: all rights reserved, see `assets/LICENSE.md`.

## Files

| File | What |
| --- | --- |
| `assets/logo/mark.svg`, `wordmark.svg`, `lockup-horizontal.svg`, `lockup-stacked.svg` | Masters in `currentColor`: set `color` on the element or the `<img>`'s container (inline the SVG to recolour) |
| `assets/logo/svg/<artwork>-<colourway>.svg` | `ink` and `paper` (transparent), `ink-on-paper`, `ink-on-amber`, `paper-on-ink` (solid background including the clear space) for the mark and both lockups |
| `assets/logo/png/<artwork>-<colourway>-<128\|256\|512\|1024>.png` | The same as PNG, wide side in px; transparent for `ink`/`paper`, solid for the filled ones |
| `assets/logo/clear-space.svg` | The clear-space diagram below |

Artworks are `mark`, `lockup-horizontal` (mark left, wordmark right, the wordmark's cap height centred on the
mark's centre, gap `x`) and `lockup-stacked` (mark above the wordmark, centred, gap `x`, wordmark at 80% of the
horizontal size). Everything is generated: `npm run build:logo` rewrites it from
`scripts/lib/logo.mjs`, the Onest instance in `fonts/onest/` and the colour tokens, and
`npm run check:fresh` fails if the committed files differ (PNGs compare by pixels). The PNGs come from the
repository's own dependency-free rasteriser (`scripts/lib/raster.mjs`), so they are identical on every machine.

## Clear space and minimum size

![Clear space around the horizontal lockup](../assets/logo/clear-space.svg)

- **Clear space** is `x` on all sides, where `x` is 14/64 of the mark's side (one ring wall). Nothing
  (text, edges, other logos) enters that box.
- **Minimum size** (digital): mark 16 px, wordmark lockup 96 px wide. Print: lockup 20 mm wide.
- Below 16 px use the favicon set, not the mark.

*Proposed in the issue, confirmed in PR review.*

## Misuse

Do not:

- recolour the logo (only ink, paper, or `currentColor` set to one of those);
- use amber for the logo, in any form;
- stretch, squash, rotate or skew it;
- outline it, or add strokes, shadows, glows, gradients or other effects;
- place it on busy backgrounds or photographs without a solid ground;
- redraw it, re-set the wordmark in a font, or change the chamfers (top right and bottom left, 29.29%).
