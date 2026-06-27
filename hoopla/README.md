# Hoopla Salon — site (`hoopla/`)

A static, **no-build** salon website (just open `index.html` over HTTP). Real,
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

## Before launch (placeholders to confirm)

- Real **phone number** (currently `+61300000000` in the JSON-LD, contact, and
  action bar).
- Confirmed **prices** and **opening hours**.
- A real **hero photo** at `assets/poster.webp`.
- The approximated **fonts** (Oswald / Fredoka / Nunito) and chartreuse hex.

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000/hoopla/
```
