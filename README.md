# Paarth Patodia — portfolio site

Live at **https://paarthpatodia.github.io/** (GitHub Pages, served from the `main` branch of `PaarthPatodia/PaarthPatodia.github.io`).

To publish a change: edit, then from this folder

```
git add -A && git commit -m "describe the change" && git push
```

GitHub Pages rebuilds in under a minute.

A single static page: `index.html`, one stylesheet, one small script, self-hosted fonts, three linked figure PNGs and the resume PDF. No build step is needed to deploy; no backend, no analytics, no third-party requests.

## Deploy

**GitHub Pages**

1. Create a repository (for example `PaarthPatodia.github.io` for a root site, or any name for `https://<user>.github.io/<repo>/`).
2. Copy the contents of this folder (`index.html`, `css/`, `js/`, `assets/`) to the repository root and push.
3. Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.

All paths are relative, so the page works at the domain root or under a sub-path.

**Vercel**

1. `npx vercel` from inside this folder, or import the repository in the Vercel dashboard.
2. Framework preset: *Other*. Build command: none. Output directory: `.` (this folder).

**Any static host** (Netlify, Cloudflare Pages, S3, nginx): serve this folder as-is. Make sure `.woff2` is served with `font/woff2` and `.pdf` with `application/pdf` (all common hosts do).

## Update the content

Edit `index.html` directly. Every sentence on the page comes from the master CV; keep it that way.

If the figures need regenerating (for example after re-running the toolkit), the source pipeline lives one level up in the package:

```
digitize/*.py         pixel → data digitisation of the matplotlib PNGs (writes digitize/*.json)
digitize/render_svg.py data → palette-agnostic inline SVG (writes build/svg/*.svg)
build/index.template.html + build/build.py → site/index.html
```

Run `python3 digitize/render_svg.py && python3 build/build.py` from the package root. Python 3.11+ with numpy and Pillow.

## Files

```
index.html            the page (figures inlined as SVG)
css/site.css          tokens, layout, figures, motion, responsive rules
js/site.js            hero playback, draw-on-entry, desktop margin strip (progressive enhancement)
assets/fonts/         Bricolage Grotesque (variable), Charis SIL (4 styles), IBM Plex Mono (2 weights); latin subsets, OFL
assets/figures/       original matplotlib PNGs, linked from each figure as "Original output"
assets/Paarth_Patodia_Resume.pdf
assets/og-image.png   social preview
```

## Design notes

- Type: Bricolage Grotesque for display (the name settles from its condensed width on load), Charis SIL for text (the open extension of Charter, the face the printed resume is set in), IBM Plex Mono only inside figures and tables of results. Scale is √2 from 17px.
- Colour: cool paper, one ink, one accent (the end-of-rest OCV green from the toolkit's own figure). Light only.
- Motif: the terminal-voltage trace from `ecm_segmentation.png`, digitised to data and redrawn as SVG. It is the hero figure, the rotated margin strip that the scroll marker follows on desktop, and the two rest-period dividers.
- Motion respects `prefers-reduced-motion`: the page ships fully drawn and the script only adds animation when motion is allowed.
