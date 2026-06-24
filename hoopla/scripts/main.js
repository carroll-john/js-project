import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/* ============================================================ *
 * HOOPLA SALON — step inside
 * An orbitable cutaway salon interior. Click a stylist for their
 * bio + booking, click the reception desk for the service menu,
 * tap the neon sign to flip day / night.
 *
 * Visual cues from the real salon: blue->plum gradient walls,
 * scalloped mustard oval mirrors, pink checker tiles, mustard
 * shelves, black & white op-art patterns. UI keeps Hoopla brand.
 * ============================================================ */

const BOOK = "https://apps.kitomba.com/bookings/hooplasalon";

const C = {
  lime: 0xddeab3,
  mustard: 0xded663,
  plum: 0x43323a,
  off: 0xfaf9f5,
  indigo: 0x55539a,
  midwall: 0x47376a,
  pink: 0xe283ab,
  pinkPale: 0xf3c9da,
  wine: 0x7a2f4a,
};

/* ---- Team & menu. Real names; Emma relaxes on the couch, Lana minds the
 * front desk and Delia works a station (both apprentices). Bios & prices are
 * placeholders to confirm/replace before launch. --------------------------- */
const STYLISTS = [
  {
    id: "emma",
    name: "Emma",
    role: "Owner & Creative Director",
    initial: "E",
    color: "#43323a",
    hair: 0xd76a7a,
    smock: C.mustard,
    leopard: true,
    skin: 0xe8c4a8,
    bio: "Hoopla's owner and the reason it all feels like a celebration. Emma has led the team to multiple Salon of the Year wins and lives for a transformation that makes you stand a little taller.",
    specs: ["Transformations", "Colour correction", "Editorial"],
  },
  {
    id: "paige",
    name: "Paige",
    role: "Senior Stylist",
    initial: "P",
    color: "#7a2f4a",
    hair: 0x5a3a26,
    smock: C.plum,
    skin: 0xc9956f,
    bio: "Sharp, considered cuts with a soft finish. Paige reads your hair's natural movement first, then cuts to it — curls, cowlicks and all. Lived-in colour is her happy place.",
    specs: ["Precision cuts", "Lived-in colour", "Styling"],
  },
  {
    id: "kristy",
    name: "Kristy",
    role: "Colour Specialist",
    initial: "K",
    color: "#3a5a78",
    hair: 0xc9a14a,
    smock: C.indigo,
    skin: 0xead0bb,
    bio: "Balayage whisperer. Kristy paints low-maintenance colour that grows out beautifully — think sun-kissed, never stripey. Ask about a gloss to keep it glassy.",
    specs: ["Balayage", "Foils", "Blondes"],
  },
  {
    id: "persia",
    name: "Persia",
    role: "Stylist & Curl Specialist",
    initial: "Pe",
    color: "#5a4a86",
    hair: 0x4a3120,
    smock: C.wine,
    skin: 0x8d5a44,
    bio: "Curls, coils and textured hair are Persia's specialty — cut dry, styled to suit your routine, never fought against. Treatments to keep everything bouncy and healthy.",
    specs: ["Curly hair", "Cuts", "Treatments"],
  },
  {
    id: "lana",
    name: "Lana",
    role: "Apprentice",
    initial: "L",
    color: "#8a7012",
    hair: 0xbf5d2a,
    smock: C.mustard,
    skin: 0xe8c4a8,
    bio: "One of Hoopla's apprentices — learning from the best and already a dab hand at a glossy blow-dry. You'll often find Lana minding the front desk and keeping the coffee (and good vibes) flowing.",
    specs: ["Blow-dries", "Front of house", "Treatments"],
  },
  {
    id: "delia",
    name: "Delia",
    role: "Apprentice",
    initial: "D",
    color: "#a85a3f",
    hair: 0xddb968,
    smock: 0xd9876a,
    skin: 0xc9956f,
    bio: "Hoopla's other apprentice, soaking up everything colour and cutting. Book a supervised apprentice service for great hair at a friendly price — she's one to watch.",
    specs: ["Apprentice cuts", "Colour assisting", "Blow-dries"],
  },
];

const SERVICES = [
  { name: "Cut & Finish", desc: "Consult, cut and a polished blow-dry.", price: "from $75" },
  { name: "Colour", desc: "Permanent, demi gloss & creative colour.", price: "from $95" },
  { name: "Balayage / Foils", desc: "Hand-painted, lived-in lightness.", price: "from $180" },
  { name: "Olaplex Power Treatment", desc: "Rebuild and restore the bonds.", price: "from $45" },
  { name: "Blow-dry & Styling", desc: "For the day it needs to be a moment.", price: "from $55" },
];

/* ====================== renderer / scene / camera ====================== */
const canvas = document.getElementById("scene");

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
} catch (err) {
  const l = document.getElementById("loader");
  l.querySelector(".loader__hoop").style.display = "none";
  l.querySelector(".loader__text").textContent = "WebGL isn't available on this device.";
  throw err;
}
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x3a2f4a, 28, 58);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(8.5, 7, 11);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.minDistance = 6.5;
controls.maxDistance = 19;
controls.minPolarAngle = 0.25;
controls.maxPolarAngle = 1.46;
controls.target.set(0, 1.7, -0.5);
controls.autoRotate = true;
controls.autoRotateSpeed = 0.55;

/* ====================== helpers ====================== */
function clay(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, ...extra });
}
// soft, rounded "clay" box
function rbox(w, h, d, r = 0.1, seg = 5) {
  const rr = Math.max(0.01, Math.min(r, Math.min(w, h, d) / 2 - 0.01));
  return new RoundedBoxGeometry(w, h, d, seg, rr);
}
function shade(obj) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return obj;
}

function canvasTex(draw, w = 256, h = 256, repeat) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  draw(cv.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

const wallTex = canvasTex((x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#7c79c6"); // periwinkle top
  g.addColorStop(0.5, "#605191");
  g.addColorStop(1, "#574455"); // plum bottom
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
}, 16, 256);

const pinkChecker = canvasTex((x, w, h) => {
  const n = 6;
  const s = w / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      x.fillStyle = (i + j) % 2 ? "#e283ab" : "#f3c9da";
      x.fillRect(i * s, j * s, s, s);
    }
}, 256, 256, [10, 1]);

// playful mustard + cream checker (echoes the salon's checker tiles)
const mustardCheck = canvasTex((x, w, h) => {
  const n = 8;
  const s = w / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      x.fillStyle = (i + j) % 2 ? "#ded663" : "#f3c9da";
      x.fillRect(i * s, j * s, s, s);
    }
}, 256, 256, [3, 2]);

const neonTex = (text) =>
  canvasTex((x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.font = "120px 'Shadows Into Light Two', cursive";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.shadowColor = "#fff2a8";
    x.shadowBlur = 26;
    x.fillStyle = "#fff6c4";
    x.fillText(text, w / 2, h / 2 + 6);
    x.shadowBlur = 10;
    x.fillStyle = "#ded663";
    x.fillText(text, w / 2, h / 2 + 6);
  }, 512, 256);

// little "menu" plaque texture for the desk sign
const menuSignTex = canvasTex((x, w, h) => {
  x.clearRect(0, 0, w, h);
  x.font = "600 78px 'Space Grotesk', system-ui, sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillStyle = "#ded663";
  x.fillText("menu", w / 2, h / 2);
}, 256, 160);

// leopard print (for Emma's smock)
const leopardTex = canvasTex((x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#e3b86d");
  g.addColorStop(1, "#cf9b4f");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h;
    const r = 9 + Math.random() * 12;
    x.fillStyle = "rgba(150,92,38,0.45)";
    x.beginPath();
    x.ellipse(cx, cy, r * 0.7, r * 0.55, Math.random() * 6.28, 0, 6.28);
    x.fill();
    x.strokeStyle = "#3a2414";
    x.lineWidth = 3;
    const segs = 5 + Math.floor(Math.random() * 3);
    for (let k = 0; k < segs; k++) {
      const a = (k / segs) * 6.28 + Math.random() * 0.4;
      x.beginPath();
      x.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.85, 3.2, a + 1.1, a + 2.7);
      x.stroke();
    }
  }
}, 256, 256, [2, 3]);

/* floating, always-visible 3D tag (camera-facing sprite) */
function makeLabel(text, sx = 2.6, sy = 0.8) {
  const tex = canvasTex((x, w, h) => {
    x.clearRect(0, 0, w, h);
    const r = 56;
    const pad = 14;
    x.fillStyle = "#43323a";
    if (x.roundRect) {
      x.beginPath();
      x.roundRect(pad, h / 2 - r, w - pad * 2, r * 2, r);
      x.fill();
    } else {
      x.fillRect(pad, h / 2 - r, w - pad * 2, r * 2);
    }
    x.font = "600 60px 'Space Grotesk', system-ui, sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillStyle = "#ded663";
    x.fillText(text, w / 2, h / 2 + 2);
  }, 512, 160);
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false })
  );
  sp.scale.set(sx, sy, 1);
  sp.renderOrder = 1;
  return sp;
}

/* ====================== interactivity registry ====================== */
const interactables = [];
const interactableSet = new Set();
function markInteractive(root, data) {
  root.userData = Object.assign({ interactive: true, hover: 0 }, data);
  interactables.push(root);
  interactableSet.add(root);
}
function findRoot(obj) {
  while (obj && !interactableSet.has(obj)) obj = obj.parent;
  return obj || null;
}

/* dynamic materials toggled by day / night */
const glowMats = []; // scallop frames + bulbs (emissive mustard)
const warmLights = []; // station point lights
let neonMat;
let starMat;

/* ====================== build the room ====================== */
const room = new THREE.Group();
scene.add(room);

// floor
const floor = new THREE.Mesh(
  rbox(15, 0.4, 13, 0.18),
  clay(0xe7dbc6, { roughness: 0.85 })
);
floor.position.y = -0.2;
floor.receiveShadow = true;
room.add(floor);

// checker rug (mustard + cream)
const rug = new THREE.Mesh(
  new THREE.PlaneGeometry(6.4, 4.6),
  new THREE.MeshStandardMaterial({ map: mustardCheck, roughness: 0.9 })
);
rug.rotation.x = -Math.PI / 2;
rug.position.set(0, 0.02, 1.2);
rug.receiveShadow = true;
room.add(rug);

// walls (back + left) with gradient
const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 1 });
const backWall = new THREE.Mesh(new THREE.BoxGeometry(15, 7, 0.3), wallMat);
backWall.position.set(0, 3.3, -6);
backWall.receiveShadow = true;
room.add(backWall);

const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7, 13), wallMat);
leftWall.position.set(-7.35, 3.3, 0);
leftWall.receiveShadow = true;
room.add(leftWall);

// pink checker wainscot (skirting band)
const skirtMat = new THREE.MeshStandardMaterial({ map: pinkChecker, roughness: 0.8 });
const backSkirt = new THREE.Mesh(new THREE.BoxGeometry(15, 1.1, 0.34), skirtMat);
backSkirt.position.set(0, 0.55, -5.95);
room.add(backSkirt);
const leftSkirt = new THREE.Mesh(
  new THREE.BoxGeometry(0.34, 1.1, 13),
  new THREE.MeshStandardMaterial({ map: pinkChecker.clone(), roughness: 0.8 })
);
leftSkirt.material.map.repeat.set(10, 1);
leftSkirt.position.set(-7.3, 0.55, 0);
room.add(leftSkirt);

/* ---- scalloped mustard oval mirror ---- */
function makeMirror() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(1, 48),
    new THREE.MeshStandardMaterial({ color: 0x3a3656, roughness: 0.12, metalness: 0.7 })
  );
  glass.scale.set(1, 1.62, 1);
  g.add(glass);

  const rx = 1.08;
  const ry = 1.74;
  const n = 30;
  const bulbGeo = new THREE.SphereGeometry(0.13, 14, 14);
  const mat = clay(C.mustard, { emissive: C.mustard, emissiveIntensity: 0.12 });
  glowMats.push(mat);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const b = new THREE.Mesh(bulbGeo, mat);
    b.position.set(Math.cos(a) * rx, Math.sin(a) * ry, 0.04);
    b.castShadow = true;
    g.add(b);
  }
  return g;
}

/* ---- salon chair ---- */
function makeChair() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.16, 24), clay(0x564f5c));
  base.position.y = 0.08;
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.7, 16),
    clay(0x9a94a0, { roughness: 0.45, metalness: 0.35 })
  );
  pole.position.y = 0.5;
  const seat = new THREE.Mesh(new THREE.SphereGeometry(0.48, 28, 20), clay(0xd884a4));
  seat.scale.set(1, 0.44, 1);
  seat.position.y = 0.95;
  const backrest = new THREE.Mesh(rbox(0.9, 1.05, 0.22, 0.1), clay(0xd884a4));
  backrest.position.set(0, 1.55, -0.34);
  g.add(base, pole, seat, backrest);
  return shade(g);
}

/* ---- stylist character ---- */
function makeStylist(s, seated = false) {
  const g = new THREE.Group();
  const legMat = clay(0x2f2933);
  const smockMat = s.leopard
    ? new THREE.MeshStandardMaterial({ map: leopardTex, roughness: 0.85, metalness: 0 })
    : clay(s.smock);

  if (seated) {
    for (const dx of [-0.16, 0.16]) {
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.62, 14), legMat);
      shin.position.set(dx, 0.31, 0.5);
      g.add(shin);
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.55, 14), legMat);
      thigh.rotation.x = 1.35;
      thigh.position.set(dx, 0.72, 0.27);
      g.add(thigh);
    }
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 1.0, 24), smockMat);
    body.position.y = 1.22;
    g.add(body);
    const collar = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16), smockMat);
    collar.position.y = 1.66;
    collar.scale.y = 0.6;
    g.add(collar);
    for (const dx of [-0.42, 0.42]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.85, 12), smockMat);
      arm.position.set(dx, 1.2, 0.06);
      arm.rotation.z = dx < 0 ? 0.18 : -0.18;
      g.add(arm);
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 28, 24), clay(s.skin));
    head.position.y = 2.02;
    g.add(head);
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.37, 28, 24, 0, Math.PI * 2, 0, Math.PI * 0.66),
      clay(s.hair)
    );
    hair.position.y = 2.08;
    g.add(hair);
    return shade(g);
  }

  for (const dx of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.7, 14), legMat);
    leg.position.set(dx, 0.36, 0);
    g.add(leg);
  }
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 1.15, 24), smockMat);
  body.position.y = 1.28;
  g.add(body);
  const collar = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16), smockMat);
  collar.position.y = 1.78;
  collar.scale.y = 0.6;
  g.add(collar);
  for (const dx of [-0.42, 0.42]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 12), smockMat);
    arm.position.set(dx, 1.28, 0.04);
    arm.rotation.z = dx < 0 ? 0.22 : -0.22;
    g.add(arm);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 28, 24), clay(s.skin));
  head.position.y = 2.18;
  g.add(head);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.37, 28, 24, 0, Math.PI * 2, 0, Math.PI * 0.66),
    clay(s.hair)
  );
  hair.position.y = 2.24;
  g.add(hair);
  return shade(g);
}

// place a clickable team member (slot supports the hover/idle animation)
function placePerson(member, x, z, rotY, seated = false) {
  const person = makeStylist(member, seated);
  const slot = new THREE.Group();
  slot.add(person);
  slot.position.set(x, 0, z);
  slot.rotation.y = rotY;
  room.add(slot);
  markInteractive(slot, { action: "stylist", id: member.id, label: `${member.name} — ${member.role}` });
  const tag = makeLabel(member.name, 1.5, 0.46);
  tag.position.set(0, seated ? 2.85 : 2.95, 0);
  slot.add(tag);
  return slot;
}

/* ---- floating mustard shelf with bottles ---- */
function makeShelf() {
  const g = new THREE.Group();
  const board = new THREE.Mesh(rbox(2.2, 0.1, 0.5, 0.04), clay(C.mustard));
  board.position.y = 0;
  g.add(board);
  const lip = new THREE.Mesh(rbox(2.2, 0.3, 0.08, 0.03), clay(C.mustard));
  lip.position.set(0, 0.1, 0.21);
  g.add(lip);
  const bottleCols = [0x6b4a2f, 0x2a2230, 0xf3c9da, 0x6b4a2f];
  bottleCols.forEach((col, i) => {
    const btl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.42, 16), clay(col, { roughness: 0.5 }));
    btl.position.set(-0.8 + i * 0.55, 0.31, 0);
    g.add(btl);
  });
  return shade(g);
}

/* ---- potted plant (eco nod) ---- */
function makePlant(scale = 1) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.5, 18), clay(0xcf7d54));
  pot.position.y = 0.25;
  g.add(pot);
  const leafMat = clay(0x6f9a4a);
  for (let i = 0; i < 9; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), leafMat);
    leaf.scale.set(0.5, 1.5, 0.5);
    const a = (i / 9) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.18, 0.8 + Math.random() * 0.5, Math.sin(a) * 0.18);
    leaf.rotation.z = Math.cos(a) * 0.5;
    leaf.rotation.x = Math.sin(a) * 0.5;
    g.add(leaf);
  }
  g.scale.setScalar(scale);
  return shade(g);
}

/* ---- stations along the back wall ---- */
const stationX = [-5.0, -1.7, 1.7, 5.0];
const stationIds = ["delia", "paige", "kristy", "persia"];
stationIds.forEach((id, i) => {
  const s = STYLISTS.find((m) => m.id === id);
  const x = stationX[i];

  const mirror = makeMirror();
  mirror.position.set(x, 3.1, -5.78);
  room.add(mirror);

  const counter = new THREE.Mesh(rbox(2.1, 0.18, 0.7, 0.07), clay(C.pink));
  counter.position.set(x, 1.05, -5.4);
  shade(counter);
  room.add(counter);
  const legMat = clay(0x3a3440);
  for (const dx of [-0.85, 0.85]) {
    const cl = new THREE.Mesh(rbox(0.12, 1.05, 0.12, 0.05), legMat);
    cl.position.set(x + dx, 0.52, -5.4);
    room.add(cl);
  }

  const chair = makeChair();
  chair.position.set(x, 0, -3.9);
  chair.rotation.y = Math.PI; // face the mirror
  room.add(chair);

  const stylist = makeStylist(s);
  stylist.position.set(x + 1.35, 0, -4.1);
  stylist.rotation.y = -0.5 + i * 0.2;
  const slot = new THREE.Group();
  slot.add(stylist);
  slot.position.copy(stylist.position);
  stylist.position.set(0, 0, 0);
  room.add(slot);
  markInteractive(slot, { action: "stylist", id: s.id, label: `${s.name} — ${s.role}` });

  const tag = makeLabel(s.name, 1.5, 0.46);
  tag.position.set(0, 2.95, 0);
  slot.add(tag);

  // warm station glow for night
  const pl = new THREE.PointLight(0xffd27a, 0, 6, 2);
  pl.position.set(x, 3, -5);
  room.add(pl);
  warmLights.push(pl);
});

/* ---- neon hoopla sign ---- */
{
  neonMat = new THREE.MeshBasicMaterial({ map: neonTex("hoopla"), transparent: true, opacity: 0.4 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), neonMat);
  sign.position.set(0, 5.4, -5.8);
  room.add(sign);
  markInteractive(sign, { action: "theme", label: "flip day / night ✦" });
}

/* ---- decorative hoop (the name motif) ---- */
{
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.1, 16, 48), clay(C.mustard));
  hoop.position.set(-6, 4.4, -2);
  hoop.rotation.y = Math.PI / 2;
  shade(hoop);
  room.add(hoop);
}

/* ---- reception desk (opens the service menu) ---- */
{
  const desk = new THREE.Group();
  const body = new THREE.Mesh(rbox(3.2, 1.5, 1.2, 0.16), clay(0x6a4f5e));
  body.position.y = 0.75;
  desk.add(body);
  const front = new THREE.Mesh(
    new THREE.PlaneGeometry(3.18, 1.46),
    new THREE.MeshStandardMaterial({ map: pinkChecker.clone(), roughness: 0.85 })
  );
  front.material.map.repeat.set(3, 1.2);
  front.position.set(0, 0.75, 0.61);
  desk.add(front);
  const top = new THREE.Mesh(rbox(3.4, 0.14, 1.4, 0.06), clay(C.mustard));
  top.position.y = 1.55;
  desk.add(top);

  // cash register — big & bright, with a glowing screen, so it's easy to spot
  const reg = new THREE.Group();
  const regBody = new THREE.Mesh(rbox(0.95, 0.6, 0.72, 0.12), clay(C.mustard));
  regBody.position.y = 0.3;
  const screen = new THREE.Mesh(
    rbox(0.74, 0.46, 0.08, 0.035),
    new THREE.MeshStandardMaterial({ color: 0x1f1b29, emissive: 0x7fa8ff, emissiveIntensity: 0.6, roughness: 0.4 })
  );
  screen.position.set(0, 0.64, -0.2);
  screen.rotation.x = -0.42;
  const keys = new THREE.Mesh(rbox(0.82, 0.1, 0.4, 0.04), clay(C.off));
  keys.position.set(0, 0.2, 0.2);
  reg.add(regBody, screen, keys);
  reg.position.set(-0.85, 1.62, 0);
  desk.add(reg);

  const bell = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    clay(0xcf3f5a)
  );
  bell.position.set(0.85, 1.7, 0.15);
  desk.add(bell);

  // small "menu" sign standing on the counter (part of the scene)
  const sign = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 10), clay(C.plum));
  post.position.y = 0.21;
  const plate = new THREE.Mesh(rbox(1.0, 0.52, 0.06, 0.08), clay(C.plum));
  plate.position.y = 0.66;
  const plateText = new THREE.Mesh(
    new THREE.PlaneGeometry(0.88, 0.42),
    new THREE.MeshBasicMaterial({ map: menuSignTex, transparent: true })
  );
  plateText.position.set(0, 0.66, 0.032);
  sign.add(post, plate, plateText);
  sign.position.set(0.7, 1.62, 0.4);
  desk.add(sign);

  shade(desk);

  desk.position.set(3.8, 0, 3.5);
  desk.rotation.y = -0.55;
  room.add(desk);
  markInteractive(desk, { action: "services", label: "the menu — services & prices" });
}

/* ---- waiting bench + coffee table ---- */
{
  const bench = new THREE.Group();
  const seat = new THREE.Mesh(rbox(2.6, 0.4, 0.95, 0.16), clay(C.mustard));
  seat.position.y = 0.5;
  const back = new THREE.Mesh(rbox(2.6, 0.9, 0.25, 0.1), clay(C.mustard));
  back.position.set(0, 0.95, -0.35);
  bench.add(seat, back);
  shade(bench);
  bench.position.set(-4.6, 0, 3.4);
  bench.rotation.y = 0.5;
  room.add(bench);

  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.5, 20), clay(C.off));
  table.position.set(-3.2, 0.25, 2);
  shade(table);
  room.add(table);
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.16, 14), clay(0xffffff));
  coffee.position.set(-3.05, 0.58, 2);
  room.add(coffee);
  const wine = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.26, 14), clay(C.wine, { roughness: 0.4 }));
  wine.position.set(-3.4, 0.63, 2.1);
  room.add(wine);
}

/* ---- Emma relaxing on the couch + Lana behind the front desk ---- */
placePerson(STYLISTS.find((m) => m.id === "emma"), -4.6, 3.4, 0.5, true);
placePerson(STYLISTS.find((m) => m.id === "lana"), 4.4, 2.5, -0.55, false);

function makePlantAt(x, z, sc) {
  const p = makePlant(sc);
  p.position.set(x, 0, z);
  return p;
}
room.add(makePlantAt(6.3, 4.3, 1.2));
room.add(makePlantAt(-6.4, 4.6, 1.1));
room.add(makePlantAt(2, 4.6, 1));

// mustard shelf on back wall
const shelf = makeShelf();
shelf.position.set(-6.2, 2.4, -5.8);
room.add(shelf);

/* ====================== sky + stars + confetti ====================== */
const skyUniforms = {
  top: { value: new THREE.Color("#f3e7d8") },
  bottom: { value: new THREE.Color("#cfe0c2") },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(50, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: skyUniforms,
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 bottom;
      void main(){ float h = clamp(vP.y/50.0*0.5+0.5,0.0,1.0); gl_FragColor = vec4(mix(bottom,top,h),1.0); }`,
  })
);
scene.add(sky);

// stars (visible at night)
{
  const n = 600;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 40;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = Math.abs(r * Math.cos(ph));
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  starMat = new THREE.PointsMaterial({ color: 0xfff3c4, size: 0.28, transparent: true, opacity: 0, depthWrite: false });
  scene.add(new THREE.Points(geo, starMat));
}

// drifting confetti
let confetti;
{
  const n = 140;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const palette = [new THREE.Color(C.mustard), new THREE.Color(C.pink), new THREE.Color(C.lime), new THREE.Color(0x8fb6ff)];
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 14;
    pos[i * 3 + 1] = Math.random() * 8;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
    const c = palette[(Math.random() * palette.length) | 0];
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  confetti = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false })
  );
  scene.add(confetti);
}

/* ====================== lights ====================== */
const hemi = new THREE.HemisphereLight(0xfff3e2, 0x6a5a72, 1.15);
scene.add(hemi);
const amb = new THREE.AmbientLight(0xfff4e6, 0.3);
scene.add(amb);
const key = new THREE.DirectionalLight(0xfff1dd, 1.7);
key.position.set(7, 12, 8);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1;
key.shadow.camera.far = 40;
key.shadow.camera.left = -12;
key.shadow.camera.right = 12;
key.shadow.camera.top = 12;
key.shadow.camera.bottom = -12;
key.shadow.bias = -0.0004;
key.shadow.radius = 4;
scene.add(key);
const fill = new THREE.DirectionalLight(0xbfa8ff, 0.35);
fill.position.set(-8, 6, 4);
scene.add(fill);

/* ====================== post-processing ====================== */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.6, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ====================== day / night ====================== */
let night = false;
let themeT = 0; // 0 day, 1 night (animated)
const dayTop = new THREE.Color("#f3e7d8");
const dayBot = new THREE.Color("#cfe0c2");
const nightTop = new THREE.Color("#191427");
const nightBot = new THREE.Color("#2c2236");
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function toggleTheme() {
  night = !night;
  document.documentElement.classList.toggle("dark", night);
}
function applyTheme(t) {
  hemi.intensity = lerp(1.15, 0.3, t);
  key.intensity = lerp(2.1, 0.55, t);
  fill.intensity = lerp(0.55, 0.22, t);
  amb.intensity = lerp(0.3, 0.14, t);
  renderer.toneMappingExposure = lerp(1.18, 1.22, t);
  bloom.strength = lerp(0.4, 1.05, t);
  skyUniforms.top.value.copy(dayTop).lerp(nightTop, t);
  skyUniforms.bottom.value.copy(dayBot).lerp(nightBot, t);
  starMat.opacity = t;
  neonMat.opacity = lerp(0.4, 1, t);
  glowMats.forEach((m) => (m.emissiveIntensity = lerp(0.12, 1.7, t)));
  warmLights.forEach((p) => (p.intensity = lerp(0, 1.5, t)));
}

/* ====================== modals ====================== */
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
function openModal(html) {
  modalBody.innerHTML = html;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.remove("menu-open");
}
function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}
modal.addEventListener("click", (e) => {
  if (e.target.hasAttribute("data-close")) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

function openStylist(id) {
  const s = STYLISTS.find((x) => x.id === id);
  if (!s) return;
  openModal(`
    <div class="stylist__head">
      <div class="stylist__avatar" style="background:${s.color}">${s.initial}</div>
      <div><div class="stylist__name">${s.name}</div><div class="stylist__role">${s.role}</div></div>
    </div>
    <p>${s.bio}</p>
    <div class="chips">${s.specs.map((x) => `<span class="chip">${x}</span>`).join("")}</div>
    <a class="btn" href="${BOOK}" target="_blank" rel="noopener">Book with ${s.name}</a>`);
}
function openServices() {
  openModal(`
    <p class="kicker">the menu</p>
    <h2>Services</h2>
    <ul class="menu">${SERVICES.map(
      (s) => `<li><div><b>${s.name}</b><span>${s.desc}</span></div><span class="price">${s.price}</span></li>`
    ).join("")}</ul>
    <p class="hand">Prices are indicative — confirmed at your consultation.</p>
    <a class="btn" href="${BOOK}" target="_blank" rel="noopener">Book now</a>`);
}
function openTeam() {
  openModal(`
    <p class="kicker">say hello</p>
    <h2>Meet the team</h2>
    <div class="team">${STYLISTS.map(
      (s) =>
        `<button data-stylist="${s.id}"><div class="stylist__avatar" style="background:${s.color}">${s.initial}</div><b>${s.name}</b><span>${s.role}</span></button>`
    ).join("")}</div>`);
  modalBody.querySelectorAll("[data-stylist]").forEach((b) =>
    b.addEventListener("click", () => openStylist(b.getAttribute("data-stylist")))
  );
}
function openInfo(key) {
  if (key === "vibe")
    openModal(`
      <p class="kicker">the vibe</p>
      <h2>Worth celebrating</h2>
      <p>Great hair should feel like something worth celebrating. No ego. No pressure — just a welcoming little world built around understanding you, your lifestyle and your hair goals.</p>
      <p>Pull up a chair; we'll pour you an organic wine or a fair-trade coffee.</p>
      <div class="badges">
        <span class="badge">🌱 Sustainable Salons Australia</span>
        <span class="badge">🐰 Cruelty-free</span>
        <span class="badge">🧴 Low-chem products</span>
        <span class="badge">🏆 Salon of the Year</span>
      </div>`);
  else
    openModal(`
      <p class="kicker">come say hi</p>
      <h2>Visit Hoopla</h2>
      <div class="info-cols">
        <div><h4>Find us</h4><p>345 Sydney Road<br>Brunswick VIC 3056</p></div>
        <div><h4>Hours</h4><p>Tue–Fri 9–6<br>Sat 9–4</p></div>
        <div><h4>Hello</h4><p><a href="https://www.instagram.com/hooplasalon/" target="_blank" rel="noopener">@hooplasalon</a><br><a href="https://www.hooplasalon.com.au/contact" target="_blank" rel="noopener">hooplasalon.com.au</a></p></div>
      </div>
      <a class="btn" href="${BOOK}" target="_blank" rel="noopener">Book your visit</a>`);
}

/* ====================== chrome wiring ====================== */
document.getElementById("themeToggle").addEventListener("click", toggleTheme);
const menuToggle = document.getElementById("menuToggle");
menuToggle.addEventListener("click", () => {
  const open = document.body.classList.toggle("menu-open");
  menuToggle.setAttribute("aria-expanded", String(open));
});
document.getElementById("brand").addEventListener("click", (e) => {
  e.preventDefault();
  closeModal();
  document.body.classList.remove("menu-open");
});
document.querySelectorAll("#overlayNav [data-action], #overlayNav [data-info]").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    document.body.classList.remove("menu-open");
    const act = a.getAttribute("data-action");
    if (act === "services") openServices();
    else if (act === "team") openTeam();
    else openInfo(a.getAttribute("data-info"));
  });
});

/* ====================== pointer / raycasting ====================== */
const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const hoverLabel = document.getElementById("hoverLabel");
let hovered = null;
let down = null;
let interacted = false;

function markInteracted() {
  if (interacted) return;
  interacted = true;
  controls.autoRotate = false;
  document.getElementById("hero").classList.add("is-hidden");
  document.getElementById("explore").classList.add("is-hidden");
}
controls.addEventListener("start", markInteracted);

function setPointer(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
}
function pick() {
  ray.setFromCamera(pointer, camera);
  const hits = ray.intersectObjects(interactables, true);
  return hits.length ? findRoot(hits[0].object) : null;
}
function setHover(root, x, y) {
  if (root !== hovered) {
    if (hovered) hovered.userData.target = 0;
    hovered = root;
    canvas.classList.toggle("is-pointer", !!root);
    hoverLabel.classList.toggle("is-on", !!root);
    if (root) hoverLabel.textContent = root.userData.label || "";
  }
  if (root) {
    hoverLabel.style.left = x + "px";
    hoverLabel.style.top = y + "px";
    root.userData.target = 1;
  }
}

canvas.addEventListener("pointerdown", (e) => {
  down = { x: e.clientX, y: e.clientY, moved: false };
  canvas.classList.add("is-grabbing");
});
canvas.addEventListener("pointermove", (e) => {
  if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) down.moved = true;
  if (e.pointerType === "mouse") {
    setPointer(e);
    setHover(down && down.moved ? null : pick(), e.clientX, e.clientY);
  }
});
canvas.addEventListener("pointerup", (e) => {
  canvas.classList.remove("is-grabbing");
  if (down && !down.moved) {
    setPointer(e);
    const root = pick();
    if (root) {
      markInteracted();
      activate(root);
    }
  }
  down = null;
});
canvas.addEventListener("pointerleave", () => setHover(null, 0, 0));

function activate(root) {
  const d = root.userData;
  if (d.action === "stylist") openStylist(d.id);
  else if (d.action === "services") openServices();
  else if (d.action === "theme") toggleTheme();
}

/* ====================== resize + loop ====================== */
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const dpr = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h);
  composer.setPixelRatio(dpr);
  composer.setSize(w, h);
  bloom.setSize(w, h);
}
window.addEventListener("resize", resize);
resize();

const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // smooth theme transition
  themeT += ((night ? 1 : 0) - themeT) * Math.min(dt * 3, 1);
  applyTheme(themeT);

  // hover/idle animation on interactables
  for (const o of interactables) {
    const target = o.userData.target || 0;
    o.userData.hover += (target - o.userData.hover) * Math.min(dt * 8, 1);
    if (o.userData.action === "stylist") {
      const s = 1 + o.userData.hover * 0.07;
      o.scale.setScalar(s);
      o.position.y = Math.sin(t * 1.6 + o.position.x) * 0.04 + o.userData.hover * 0.08;
    } else if (o.userData.action === "services") {
      o.scale.setScalar(1 + o.userData.hover * 0.04);
    }
  }

  // neon flicker at night
  if (neonMat) neonMat.opacity = lerp(0.4, 1, themeT) * (0.92 + Math.sin(t * 22) * 0.04 * themeT);

  // confetti drift
  if (confetti) {
    const p = confetti.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) - dt * (0.25 + (i % 5) * 0.05);
      let x = p.getX(i) + Math.sin(t + i) * dt * 0.15;
      if (y < 0) {
        y = 8;
        x = (Math.random() - 0.5) * 14;
      }
      p.setX(i, x);
      p.setY(i, y);
    }
    p.needsUpdate = true;
    confetti.rotation.y = t * 0.02;
  }

  controls.update();
  composer.render();
  requestAnimationFrame(tick);
}

/* ====================== boot ====================== */
async function boot() {
  try {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
  } catch (e) {
    /* fonts optional */
  }
  if (neonMat) {
    neonMat.map = neonTex("hoopla"); // redraw now the handwritten font is ready
    neonMat.needsUpdate = true;
  }
  applyTheme(0);
  composer.render();
  requestAnimationFrame(() => {
    document.getElementById("loader").classList.add("is-hidden");
    tick();
  });
}
boot();
