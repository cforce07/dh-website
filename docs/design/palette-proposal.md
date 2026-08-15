# DirectHired — Palette and Type Proposal

Derived from the official logo (`logo/logo.png`, 8335×2318 RGBA).
Task 7 of `docs/superpowers/plans/2026-08-15-directhired-foundation-homepage.md`.

## What the logo gave us

The mark is two colours and nothing else:

| Colour | Share of opaque pixels | Role in mark |
|---|---|---|
| `#4d4d4d` charcoal | 85.5% | Wordmark, tagline |
| `#00a4a6` teal | 14.5% | The "H" |

Two observations that shape everything below.

**The teal already satisfies the brief's exclusions.** §57 rules out corporate blue, generic green, and red/blue recruitment palettes. Teal is none of them. The palette does not need to be invented against the brief's constraints — the brand already complies.

**The "H" is two human figures joined at the crossbar.** Heads as dots, bodies as uprights, arms meeting in the middle. That is *"Happy Employer. Happy Helper."* — the brief's §22 emotional core — already encoded in the mark. Block 07 should derive its composition from the logo's own geometry rather than inventing a separate metaphor.

## The accessibility problem

The brand teal cannot be used for text or as a button fill. Measured against the proposed warm off-white surface `#FAF8F5`:

| Colour | Ratio | Verdict |
|---|---|---|
| `#4d4d4d` charcoal | 7.97:1 | Passes AA comfortably |
| `#00a4a6` brand teal | **2.89:1** | **Fails AA text (needs 4.5:1)** |

White text on `#00a4a6` fails equally — roughly 3.0:1. A primary CTA in the raw brand teal would be inaccessible, and the spec makes AA binding.

The resolution is a darkened teal from the same family for interactive use, with the brand teal retained for graphic elements where contrast rules do not apply:

| Candidate | Ratio on surface | |
|---|---|---|
| `#008C8E` | 3.85:1 | fails |
| `#007E80` | 4.61:1 | passes, but thin margin |
| `#046A6C` | **6.03:1** | **recommended** |
| `#005F61` | 7.05:1 | passes, reads darker than brand |

`#046A6C` carries white text at ~6.3:1 and still reads unmistakably as the brand teal.

## Proposed tokens

| Token | Value | Ratio | Purpose |
|---|---|---|---|
| `--color-ink` | `#2A2724` | 14.01:1 on surface | Body and headings. Warm near-black, not `#000`. |
| `--color-ink-muted` | `#4d4d4d` | 7.97:1 on surface | Secondary text. **The logo's own charcoal.** |
| `--color-surface` | `#FAF8F5` | — | Page ground. Warm off-white, not `#fff`. |
| `--color-surface-raised` | `#FFFFFF` | — | Cards, lifted panels. |
| `--color-accent` | `#046A6C` | 6.03:1 on surface | Primary CTA only. |
| `--color-accent-hover` | `#005F61` | — | CTA hover. |
| `--color-brand-teal` | `#00a4a6` | — | **Graphic use only** — rules, icon fills, the H motif. Never text, never a button fill. |
| `--color-deep` | `#0E3A3B` | — | Block 07 register shift. |
| `--color-on-deep` | `#FAF8F5` | 11.74:1 on deep | Text on the deep surface. |
| `--color-accent-on-deep` | `#3FC9CB` | 6.18:1 on deep | Accent that survives the dark ground. |
| `--color-border` | `#DDD8D1` | ~1.3:1 | Hairlines. **See note.** |

**Border note:** `#DDD8D1` is a hairline tone, not a contrast-bearing element. The spec's 3:1 requirement applies to non-text elements that convey information. Where a border is the *only* thing distinguishing a control from its background, use `--color-ink-muted` instead. The token test should assert 3:1 against `ink-muted`, not against the decorative hairline — this is a correction to the spec's §3.1 table.

## Typography

The wordmark is a geometric sans with circular bowls and a rounded, friendly axis. Two directions follow from that.

**Display — `Fraunces`.** A variable serif with `SOFT` and `WONK` axes, so its warmth is tunable rather than fixed. Set low-to-moderate on both, it reads editorial and premium without becoming decorative. This supplies the brief's 70% "premium family" register and is the single strongest defence against looking like a recruitment portal.

**Text — `Figtree`.** A geometric humanist sans that harmonises with the wordmark's construction rather than fighting it. Highly legible at 16px, wide weight range, excellent for UI.

Both are open-source, self-hostable, and subsettable to WOFF2 — required, since the spec forbids font-CDN requests.

**Alternative if Fraunces reads too characterful:** `Newsreader` — warmer and quieter, less distinctive but lower risk.

## What is not decided here

Layout, spacing rhythm, component composition, and motion design belong to the taste skills at Tasks 10–14, not to this document. This proposal fixes only colour and type, which the spec requires settled before any component is built.
