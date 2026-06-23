# Particle Universe 🌌

An interactive **WebGL / Three.js** experience: 80,000 GPU particles that
continuously morph between five formations — a spiral **galaxy**, a **sphere**,
a **torus**, a **double helix**, and a rippling **wave field** — rendered with
custom GLSL shaders, additive blending, and Unreal bloom.

**▶ Live:** https://carroll-john.github.io

## Features

- **80k-particle GPU system** — positions interpolated entirely in the vertex
  shader between a "start" and "end" formation via a single morph uniform.
- **Five formations** with smootherstep easing for silky transitions.
- **Custom GLSL shaders** — soft circular points, per-particle twinkle, and a
  baked galaxy colour gradient (warm core → cool rim).
- **Unreal bloom** post-processing for that glowing, neon-nebula look.
- **Orbit controls** — drag to rotate, scroll to zoom, with auto-rotation.
- **Auto-cycle** through formations, or tap a button to jump to one.
- Fully responsive, capped device-pixel-ratio for performance, and a graceful
  WebGL fallback message.

## Run it locally

No build step — just serve the folder over HTTP (ES modules need a server):

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000>.

## Tech

- [Three.js](https://threejs.org/) `0.160.0` (loaded via CDN import map)
- `ShaderMaterial` with hand-written GLSL
- `EffectComposer` + `UnrealBloomPass`
- `OrbitControls`

## Controls

| Action            | Effect                          |
| ----------------- | ------------------------------- |
| Drag              | Orbit the camera                |
| Scroll / pinch    | Zoom in / out                   |
| Galaxy/Sphere/…   | Morph to that formation         |

Built with vanilla JS — no bundler, no dependencies to install.
