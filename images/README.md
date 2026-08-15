# Client-supplied image masters

DALL·E generations DirectHired produced from the prompts in
`docs/design/image-prompts-2026-08-16.md`. Kept because the derivatives in
`src/assets/` are lossy crops — `og-share.png` is a centre-crop of slot B and
cannot be re-derived at a different ratio without these.

| File | Source prompt | Feeds |
|---|---|---|
| `image_slota_prompt1.png` (1402×1122) | Slot A, prompt A1 | `src/assets/hero-together.png` — byte-identical copy |
| `image_slotb_promp1.png` (1730×909) | Slot B, prompt B1 | `src/assets/og-share.png` — centre-cropped to exactly 1200×630 |

These are **placeholders**, not DirectHired's own photography. Provenance is
tracked in `src/data/images.json` and surfaces in
`docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md` under Category D.

Neither is served: `src/assets/` is what Astro processes, and the built output
is AVIF/WebP at a fraction of these sizes.
