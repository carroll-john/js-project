import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/* ------------------------------------------------------------------ *
 * Particle Universe
 * 80k GPU particles that morph between five formations. Colour and a
 * per-particle twinkle are baked once; positions are interpolated on
 * the GPU between a "start" and "end" formation via a single uniform.
 * ------------------------------------------------------------------ */

const COUNT = 80000;
const GALAXY_RADIUS = 5.0;

// ---- Formation generators ------------------------------------------------
// Each returns a Float32Array of length COUNT * 3 (xyz per particle).

function makeGalaxy() {
  const arr = new Float32Array(COUNT * 3);
  const branches = 5;
  const spin = 0.9;
  const randomnessPower = 2.6;
  for (let i = 0; i < COUNT; i++) {
    const radius = Math.pow(Math.random(), 1.6) * GALAXY_RADIUS;
    const branchAngle = ((i % branches) / branches) * Math.PI * 2;
    const spinAngle = radius * spin;

    const rand = () =>
      Math.pow(Math.random(), randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      (0.18 + radius * 0.12);

    const i3 = i * 3;
    arr[i3] = Math.cos(branchAngle + spinAngle) * radius + rand();
    arr[i3 + 1] = rand() * 0.6;
    arr[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + rand();
  }
  return arr;
}

function makeSphere() {
  const arr = new Float32Array(COUNT * 3);
  const r = 4.2;
  const golden = Math.PI * (1 + Math.sqrt(5));
  for (let i = 0; i < COUNT; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / COUNT);
    const theta = golden * i;
    const i3 = i * 3;
    arr[i3] = r * Math.sin(phi) * Math.cos(theta);
    arr[i3 + 1] = r * Math.cos(phi);
    arr[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  return arr;
}

function makeTorus() {
  const arr = new Float32Array(COUNT * 3);
  const R = 3.0;
  const tube = 1.25;
  for (let i = 0; i < COUNT; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = Math.random() * Math.PI * 2;
    const jitter = (Math.random() - 0.5) * 0.25;
    const rr = tube + jitter;
    const i3 = i * 3;
    arr[i3] = (R + rr * Math.cos(v)) * Math.cos(u);
    arr[i3 + 1] = rr * Math.sin(v);
    arr[i3 + 2] = (R + rr * Math.cos(v)) * Math.sin(u);
  }
  return arr;
}

function makeHelix() {
  const arr = new Float32Array(COUNT * 3);
  const turns = 6;
  const height = 9;
  const radius = 2.1;
  for (let i = 0; i < COUNT; i++) {
    const t = i / COUNT;
    const strand = i % 2;
    const angle = t * turns * Math.PI * 2 + strand * Math.PI;
    const i3 = i * 3;
    // ~12% of particles become the "rungs" bridging the two strands
    if (i % 8 === 0) {
      const lerp = Math.random();
      const a1 = angle;
      const a2 = angle + Math.PI;
      arr[i3] = (Math.cos(a1) * (1 - lerp) + Math.cos(a2) * lerp) * radius;
      arr[i3 + 2] = (Math.sin(a1) * (1 - lerp) + Math.sin(a2) * lerp) * radius;
    } else {
      arr[i3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.15;
      arr[i3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.15;
    }
    arr[i3 + 1] = (t - 0.5) * height;
  }
  return arr;
}

function makeWave() {
  const arr = new Float32Array(COUNT * 3);
  const side = Math.floor(Math.sqrt(COUNT));
  const span = 11;
  for (let i = 0; i < COUNT; i++) {
    const gx = i % side;
    const gz = Math.floor(i / side);
    const x = (gx / side - 0.5) * span;
    const z = (gz / side - 0.5) * span;
    const d = Math.sqrt(x * x + z * z);
    const i3 = i * 3;
    arr[i3] = x;
    arr[i3 + 1] = Math.sin(d * 1.6) * 1.3 * Math.exp(-d * 0.18);
    arr[i3 + 2] = z;
  }
  return arr;
}

const FORMATIONS = [
  { name: "Galaxy", build: makeGalaxy },
  { name: "Sphere", build: makeSphere },
  { name: "Torus", build: makeTorus },
  { name: "Helix", build: makeHelix },
  { name: "Wave", build: makeWave },
];

const shapes = FORMATIONS.map((f) => f.build());

// ---- Per-particle colour + twinkle seed (baked once) ---------------------
const colors = new Float32Array(COUNT * 3);
const seeds = new Float32Array(COUNT);
const scales = new Float32Array(COUNT);
{
  const inside = new THREE.Color("#ff7a3d");
  const outside = new THREE.Color("#3a7bff");
  const galaxy = shapes[0];
  const tmp = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    const x = galaxy[i3];
    const z = galaxy[i3 + 2];
    const radius = Math.min(1, Math.sqrt(x * x + z * z) / GALAXY_RADIUS);
    tmp.copy(inside).lerp(outside, radius);
    // a little brightness sparkle
    const b = 0.75 + Math.random() * 0.5;
    colors[i3] = Math.min(1, tmp.r * b);
    colors[i3 + 1] = Math.min(1, tmp.g * b);
    colors[i3 + 2] = Math.min(1, tmp.b * b);
    seeds[i] = Math.random();
    scales[i] = 0.5 + Math.random() * 1.4;
  }
}

// ---- Renderer / scene / camera ------------------------------------------
const canvas = document.getElementById("scene");

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
} catch (err) {
  const loader = document.getElementById("loader");
  loader.querySelector(".loader__ring").style.display = "none";
  loader.querySelector(".loader__text").textContent =
    "WebGL is not available on this device.";
  throw err; // stop the rest of the module from running without a renderer
}
renderer.setClearColor(0x02020a, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x02020a, 0.02);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
camera.position.set(0, 2.6, 9.5);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.45;
controls.minDistance = 4;
controls.maxDistance = 20;
controls.enablePan = false;

// ---- Geometry + shader material -----------------------------------------
const geometry = new THREE.BufferGeometry();
geometry.setAttribute("aStart", new THREE.BufferAttribute(shapes[0], 3));
geometry.setAttribute("aEnd", new THREE.BufferAttribute(shapes[0], 3));
geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

const uniforms = {
  uTime: { value: 0 },
  uMorph: { value: 0 },
  uSize: { value: 26.0 },
  uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
};

const material = new THREE.ShaderMaterial({
  uniforms,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    uniform float uTime;
    uniform float uMorph;
    uniform float uSize;
    uniform float uPixelRatio;

    attribute vec3 aStart;
    attribute vec3 aEnd;
    attribute vec3 aColor;
    attribute float aSeed;
    attribute float aScale;

    varying vec3 vColor;
    varying float vTwinkle;

    // smootherstep for a silky morph
    float ease(float t) {
      return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    }

    void main() {
      float m = ease(clamp(uMorph, 0.0, 1.0));
      vec3 pos = mix(aStart, aEnd, m);

      // gentle living motion
      float w = sin(uTime * 0.6 + aSeed * 6.2831 + pos.x * 0.5);
      pos.y += w * 0.06;

      vec4 mv = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mv;

      gl_PointSize = uSize * aScale * uPixelRatio * (1.0 / -mv.z);

      vColor = aColor;
      vTwinkle = 0.6 + 0.4 * sin(uTime * 2.0 + aSeed * 40.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vColor;
    varying float vTwinkle;

    void main() {
      float d = distance(gl_PointCoord, vec2(0.5));
      if (d > 0.5) discard;
      float strength = 1.0 - smoothstep(0.0, 0.5, d);
      strength = pow(strength, 1.6);
      gl_FragColor = vec4(vColor * vTwinkle, strength);
    }
  `,
});

const points = new THREE.Points(geometry, material);
scene.add(points);

// ---- Distant starfield backdrop -----------------------------------------
{
  const starCount = 1800;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    const r = 30 + Math.random() * 30;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPos[i3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i3 + 2] = r * Math.cos(phi);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0x9bbcff,
    size: 0.08,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  scene.add(new THREE.Points(starGeo, starMat));
}

// ---- Post-processing (bloom) --------------------------------------------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.05, 0.5, 0.0);
composer.addPass(bloom);

// ---- Morph control -------------------------------------------------------
let currentIndex = 0;
let targetIndex = 0;
let morphing = false;
const MORPH_SECONDS = 2.6;

function morphTo(index) {
  if (index === currentIndex && uniforms.uMorph.value === 0) return;
  // freeze the current displayed formation as the new start
  geometry.setAttribute("aStart", new THREE.BufferAttribute(shapes[currentIndex], 3));
  geometry.setAttribute("aEnd", new THREE.BufferAttribute(shapes[index], 3));
  uniforms.uMorph.value = 0;
  targetIndex = index;
  morphing = true;
  setActiveButton(index);
}

// auto-cycle through formations until the user picks one
let autoCycle = true;
let autoTimer = 0;
const AUTO_DELAY = 5.0;

// ---- Shape buttons -------------------------------------------------------
const shapesNav = document.getElementById("shapes");
const buttons = FORMATIONS.map((f, i) => {
  const btn = document.createElement("button");
  btn.className = "shape-btn";
  btn.textContent = f.name;
  btn.addEventListener("click", () => {
    autoCycle = false;
    morphTo(i);
  });
  shapesNav.appendChild(btn);
  return btn;
});

function setActiveButton(index) {
  buttons.forEach((b, i) => b.classList.toggle("is-active", i === index));
}
setActiveButton(targetIndex);

// ---- Resize --------------------------------------------------------------
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(w, h);
  bloom.setSize(w, h);
  uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
}
window.addEventListener("resize", resize);
resize();

// ---- Animation loop ------------------------------------------------------
const clock = new THREE.Clock();

function tick() {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  uniforms.uTime.value = t;

  if (morphing) {
    uniforms.uMorph.value += dt / MORPH_SECONDS;
    if (uniforms.uMorph.value >= 1) {
      uniforms.uMorph.value = 0;
      currentIndex = targetIndex;
      geometry.setAttribute("aStart", new THREE.BufferAttribute(shapes[currentIndex], 3));
      geometry.setAttribute("aEnd", new THREE.BufferAttribute(shapes[currentIndex], 3));
      morphing = false;
      autoTimer = 0;
    }
  } else if (autoCycle) {
    autoTimer += dt;
    if (autoTimer >= AUTO_DELAY) {
      morphTo((currentIndex + 1) % FORMATIONS.length);
    }
  }

  controls.update();
  composer.render();
  requestAnimationFrame(tick);
}

// ---- Boot ----------------------------------------------------------------
function boot() {
  const loader = document.getElementById("loader");
  // first frame, then reveal
  composer.render();
  requestAnimationFrame(() => {
    loader.classList.add("is-hidden");
    tick();
  });
}

boot();
