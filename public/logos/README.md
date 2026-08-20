# Company logo assets

Drop each company's logo here as an SVG named after its lowercased ticker:

```
public/logos/tsla.svg
public/logos/aapl.svg
public/logos/amzn.svg
public/logos/jpm.svg
public/logos/nflx.svg
public/logos/cvs.svg
```

No code changes are needed — `CompanyLogo` and `CompanyWatermark` read the path
from `src/lib/brand/companies.ts` and pick the file up automatically. Until a
file exists, the logo slot renders a monogram in the company's brand accent.

## Guidelines

- **SVG, square viewBox.** The mark is rendered with `object-fit: contain` into
  a square box (24–40px in tiles, 96px for the watermark). Pad the artwork
  inside the viewBox rather than relying on component margins.
- **Monochrome marks want `fill="currentColor"`** so they inherit the brand
  accent. Full-colour marks should keep their own fills.
- **Wordmarks don't work here** — use the symbol/glyph form, not the horizontal
  logotype, or it will be illegible at 24px.

## Licensing

These are third-party trademarks and are intentionally not committed to the
repo. Source them from each company's own brand/press kit and confirm the usage
terms before shipping publicly. To add a company, append an entry to `COMPANIES`
in `src/lib/brand/companies.ts` and drop its file here.
