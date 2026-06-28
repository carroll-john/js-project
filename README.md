# Hoopla Salon — website

A static, **no-build** salon website at the repo root (just open `index.html` over HTTP). Real,
crawlable content is the product; an interactive 3D salon is a progressively
enhanced hero that **lazy-loads only on capable devices** and never blocks the
page. Styled to match the real hooplasalon.com.au (flat chartreuse + plum).

## Files

| File | Role |
| --- | --- |
| `index.html` | **All human content + SEO.** Sections, team cards, services/prices, hours, address, JSON-LD. The single source of truth for copy. |
| `scripts/main.js` | **Site controller — always runs, lightweight.** Nav/menu, theme toggle plumbing, booking-link sync + analytics, the stylist `<dialog>`, and the *gated, lazy* `import()` of the 3D scene. No Three.js here. |
| `scripts/scene.js` | **The Three.js 3D salon.** Loaded by `main.js` only when it should be. ~1k lines: editable config at the top, scene machinery below. |
| `styles/style.css` | Two-colour flat design system (chartreuse `--chartreuse`, plum `--plum`). |

## How the two scripts talk (`window.hoopla` bridge)

`main.js` owns the DOM; `scene.js` owns the 3D. They communicate through one
global object so neither imports the other's internals:

```
main.js sets:   window.hoopla = { onSelect(id), onServices(), onToggleTheme(), setNight }
scene.js calls: onSelect(id)    -> main.js opens the stylist <dialog>
                onServices()     -> main.js scrolls to #services
                onToggleTheme()  -> main.js toggles .dark + calls setNight back
scene.js sets:  window.hoopla.setNight = (bool) => ...   (so main.js can drive night/disco)
```

## Lazy-load gating (in `main.js`)

The scene is `import()`-ed only if WebGL is supported, motion isn't reduced,
data-saver is off, and the device looks capable (memory/cores/screen). Otherwise
the **poster fallback** (`#poster`, drop a real image at `assets/poster.webp`)
stays and a **"Step inside ▸"** opt-in button is shown. The page (info + booking)
is fully usable with the 3D never loading.

## How to change things

- **Booking URL** — `data-book-url` on `<body>` (controller syncs every link).
  Also update the inline `[data-book]` hrefs in `index.html` for no-JS users.
- **Services / prices / hours / address / bios** — edit `index.html` only.
  Do **not** mirror prices/bios into `scene.js` (the 3D doesn't need them).
- **Add / edit a stylist** — add a `.stylist-card` in `index.html` **and** a row
  in `STYLISTS` (visual fields only) in `scene.js`, plus a placement in
  `STATIONS` or the Emma/Lana `placePerson(...)` calls.
- **Palette / day-night** — `:root` tokens in `style.css`; 3D colours in the `C`
  object at the top of `scene.js`; day↔night light values in `applyTheme()`.
- **Where people stand** — `STATIONS` (back-wall chairs) + the Emma (couch) and
  Lana (front desk) `placePerson` calls in `scene.js`.

`scene.js` keeps its editable config (`C`, `STYLISTS`, `STATIONS`, `DISCO_TINTS`)
at the top; everything from the `build the room` banner down is scene machinery.

## Real details vs. things to confirm

Filled in from the salon's public listings (Brunswick, Sydney Road):

- **Phone** `+61 3 9388 9929` — in the JSON-LD, contact block, and action bar.
- **Address** 345 Sydney Road, Brunswick VIC 3056.
- **Opening hours** Tue–Thu 9–9, Fri 9–8, Sat 9–4 (Sun & Mon closed) — in the
  contact block, the JSON-LD `openingHoursSpecification`, and the `<noscript>`.

Still owner-to-confirm:

- **Prices** — kept realistic but marked *indicative* (the salon publishes no
  public price list; confirm against the Kitomba menu, then drop the "indicative"
  note in `index.html` once locked).
- **Hero photo** — `assets/poster.svg` is a **branded placeholder**. To use a
  real photo, add `assets/poster.webp` (square ~1200×1200 looks best) and point
  `.frame__poster` (`styles/style.css`), `og:image`, and the JSON-LD `image`
  (`index.html`) back at `assets/poster.webp`.
- **Fonts / chartreuse hex** — Oswald / Fredoka / Nunito and `#d9df68` are
  matched by eye from the live site (which blocks automated inspection); confirm
  against the real brand kit if one exists.

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000/
```
