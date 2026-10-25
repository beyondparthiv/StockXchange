# Market emblem assets (bull / bear watermark)

The game board shows a bull and a bear as low-opacity watermarks. By default
these are stylised heads drawn as inline SVG — deliberately simple, because
detailed full-body figures authored as raw path data read as blobs at
watermark opacity.

To use a real illustration instead:

1. Drop your files here:

   public/emblems/bull.svg
   public/emblems/bear.svg

2. Point `src/lib/brand/emblems.ts` at them:

   bull: "/emblems/bull.svg",
   bear: "/emblems/bear.svg",

No component changes are needed. Leaving them `null` keeps the built-in
emblems and costs no network request.

## Guidelines

- **SVG, transparent background.** The file is tinted by the theme only if it
  uses `fill="currentColor"`; full-colour artwork keeps its own colours, which
  will look heavier at the same opacity.
- The bull is rendered wide (roughly 4:3) at the bottom-left; the bear is
  rendered taller (roughly 4:5) at the bottom-centre. Match those proportions
  or the artwork will letterbox inside its box.
- Opacity is applied by CSS (`--backdrop-opacity` and the per-figure opacity
  in globals.css). Ship the artwork at full strength and tune it there.

## Licensing

Bull/bear market illustrations found online are usually copyrighted. Use
artwork you have the rights to before shipping publicly.
