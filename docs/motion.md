# Motion: the logo sting

Decision 22: "Draw, then press", and of ten stings the **Draw + Ping hybrid with a single amber echo**.
All files are brand assets (all rights reserved, `assets/LICENSE.md`).

## Timeline

Durations and easings come from `dist/motion/motion.json` (the `draw`, `press`, `echo` and `sting`
tokens); the frames are `round(ms x 24 / 1000)`.

| What | Time | 24 fps frames |
| --- | --- | --- |
| Outline of the mark draws (2.6 stroke in the 64-unit box, easing `draw`) | 0 to 900 ms | 0 to 22 (draw = 22 frames) |
| Evenodd fill fades in | 850 to 1100 ms | from 20 |
| Press (scale 1.06, 120 ms, easing `settle`) with the **one echo** (stroke 2.5, scale 1 to 1.75, fading over 700 ms, easing `echo`) | from 1060 ms | from 25; press 3 frames, echo 17 frames |
| Wordmark `cubealgos` slides in beside the mark | 1200 to 1500 ms | from 29 |
| GIF and video loop | 3200 ms: the lockup holds, fades out at 2800 to 3100 ms, restarts | 77 frames (3.208 s); the GIF is 80 frames at 25 fps = 3.200 s |

Colour: the echo is amber `#D9831A` on paper `#EDEEF1` (ink mark) and on ink `#16181D` (paper mark). On amber the mark is ink and the **echo is white `#FBFBFC`**
(white takes the accent role there). The outline fades out while the fill arrives (900 to 1150 ms), as on the prototype board. The lockup stays where it ends, so before the wordmark arrives the mark sits left of centre.

## Files (`assets/sting/`)

For each background `paper`, `ink`, `amber`:

| File | What |
| --- | --- |
| `sting-<bg>.svg` | Self-contained animated SVG: CSS keyframes, no script, no external file; plays the 1800 ms sting once and holds the end state; under `prefers-reduced-motion: reduce` it shows the still instead |
| `sting-<bg>-still.svg`, `-still.png` | The reduced-motion still: the final frame, mark and wordmark, no echo (PNG 1280 px wide) |
| `sting-<bg>.gif` | 800x450, 80 frames at 25 fps, loops forever, loop length 3.2 s, palette-optimised (about 80 KB) |
| `sting-<bg>-<16x9\|9x16\|1x1>.mp4`, `.webm` | 1920x1080, 1080x1920, 1080x1080 at 24 fps, H.264 (yuv420p, BT.709) and VP9; the lockup is 50% (16:9) or 60% (9:16, 1:1) of the frame width, so every frame keeps at least 10% margin, echo included |

`manifest.json` records the ffmpeg version of the last render, a hash of everything the render depends on
(the SVG generator, the frame renderer and the rasteriser) and a hash of every video's pixels.

## Recipe

The keyframes live once, in `TRACKS` of `scripts/lib/sting.mjs` (times from the motion tokens). They generate the CSS of the
animated SVG, and the same table drives the frame renderer (`scripts/lib/sting-frames.mjs`), which draws any frame
with the repository's dependency-free rasteriser (strokes with miter joins, partial outline draw, press scale,
echo, wordmark slide, easing as CSS computes it). No browser is involved, so the frames are bit-identical on every
machine (two full renders give the same pixel hashes); against headless Chrome playing the SVG the frames differ by
anti-aliasing only (mean 0.1 of 255 on sampled frames).

`npm run build:sting` writes the animated SVGs and the stills (byte-checked by `npm run check:fresh`).
`npm run render:sting` is the **local-only** step: it draws every frame (`i / 24` s, or `i / 25` s for the GIF) and
pipes it to ffmpeg (libx264 and libvpx-vp9; palettegen/paletteuse for the GIF). Commit the result with `manifest.json`.

CI has no pinned ffmpeg, so `npm run check:fresh` checks the rendered files
by existence, dimensions, frame count, duration, loop flag and GIF size (under 2 MB) read from the container
headers, and fails if the render manifest's source hash no longer matches the generators, so a changed
timeline or renderer cannot ship with stale videos. The encoded bytes are not compared (encoders are not deterministic across versions).

`npm run check:sting-frames` (needs ffmpeg) decodes the MP4s and finds the key moments from the pixels:
fill start, draw end, press peak, echo start and end and wordmark in, against the 24 fps column of
the table above (one frame of tolerance; two for the draw end, whose last 1% is the easing tail, and
the echo's last frames are below 6% opacity because its opacity uses the echo easing), and that
every frame keeps at least 10% margin on all sides.
