# Nice and Co. — Brand Digital Assets

> **Source of truth for all brand logos, marks, and visual assets.**
> All files committed here are the canonical versions for use across web, print, and portal.

**This repo is the canonical brand asset home.**

- Git remote: `https://github.com/NiceandCo/NiceandCo.git`
- Branch: `main`
- Assets live in `brand/`; public web copies live in `/public/`.

---

## Asset Index

### Logos

| File | Description | Format | Usage |
|------|-------------|--------|-------|
| `logos/nco-wordmark-blue.png` | `niceandco.` horizontal wordmark — blue on transparent | PNG | Email headers, light backgrounds |

> **Public web copies** live in `/public/` — do not edit those directly; update here and copy.
> The marketing nav + footer now render the **live text wordmark** (see Wordmark below) instead of the PNG, so it stays crisp at any size.
> The square icon / favicon ships as `/public/nco-logo.png` (not yet mirrored into `brand/logos/`).

---

## Brand Colors

| Name | Hex | Usage |
|------|-----|-------|
| NCo Blue | `#2A3CDE` | Primary brand, buttons, links, wordmark |
| Deep Navy | `#1E3A5F` | Body text, headings |
| White | `#FFFFFF` | Backgrounds, reversed text |
| Slate | `#64748B` | Secondary text, labels |

---

## Typography

| Role | Spec |
|------|------|
| Typeface | **Fira Sans Condensed** (Google Fonts, weights 300–800) |
| Wordmark | Lowercase, weight contrast — see Wordmark below |
| Headings | Semibold, `tracking-tight` |
| Body | Regular, 14–16px |

---

## Wordmark

The wordmark is the lowercase **`niceandco.`** lockup. The `Co.` does double duty — it ends "Nice and Co." and pivots into "Connect" to form the portal name **`niceandco.nnect`**.

- **Company short form:** `niceandco.` — used at the logo lockups (header + footer).
- **Portal form:** `niceandco.nnect` — used for Co.nnect login CTAs (e.g., `niceandco.nnect Login`).
- **Weight contrast:** `nice` and `co`/`nnect` are extra-bold (`font-black`); `and` is regular (`font-normal`).
- **Color:** NCo Blue `#2A3CDE` on light backgrounds; white on dark / blue backgrounds (e.g., the filled blue login button).

### BrandName component (portal)

In the NCo-Connect portal the wordmark renders via the `<BrandName />` component:

- `accentClassName="text-white"` on dark / blue backgrounds (sidebar).
- Default on light backgrounds.

On the marketing homepage the same concept is rendered inline (no image dependency).

---

## Tagline

> *Cleveland Born and Raised*

---

## Adding New Assets

1. Place the file in the appropriate subfolder (`logos/`, `icons/`, `photography/`, `social/`)
2. Add a row to the Asset Index table above
3. Commit with message: `brand: add [asset name]`
4. Copy to `/public/` if needed for web use

---

## TODO — Assets Still Needed

- [ ] Mirror the square icon / favicon (`nco-logo.png`) from `/public/` into `brand/logos/`
- [ ] White version of wordmark (for dark / blue backgrounds)
- [ ] SVG version of wordmark (scalable, for dev use)
- [ ] Social media profile images (1:1 square)
- [ ] Email header banner
