/* ============================================================ *
 * Hoopla Salon — site controller (always runs, lightweight)
 *
 * Owns the real-site UI: nav, theme toggle, booking analytics, the
 * focused stylist dialog, and the *gated, lazy* load of the heavy
 * Three.js scene. The page (info + booking) is fully usable without
 * the 3D ever loading.
 * ============================================================ */

const $ = (sel) => document.querySelector(sel);

/* ---------- theme (site-wide dark mode; also drives the 3D scene) ---------- */
try {
  if (localStorage.getItem("hoopla-theme") === "dark") {
    document.documentElement.classList.add("dark");
  }
} catch (e) {
  /* storage optional */
}

function toggleTheme() {
  const dark = document.documentElement.classList.toggle("dark");
  try {
    localStorage.setItem("hoopla-theme", dark ? "dark" : "light");
  } catch (e) {}
  window.hoopla.setNight?.(dark); // if the scene is loaded, flip day/night too
}
$("#themeToggle")?.addEventListener("click", toggleTheme);

/* ---------- mobile menu ---------- */
const menuToggle = $("#menuToggle");
const overlayNav = $("#overlayNav");
function setMenu(open) {
  document.body.classList.toggle("menu-open", open);
  menuToggle?.setAttribute("aria-expanded", String(open));
  overlayNav?.setAttribute("aria-hidden", String(!open)); // expose drawer to assistive tech when open
}
menuToggle?.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
document.querySelectorAll("#overlayNav a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
$("#brand")?.addEventListener("click", () => setMenu(false));

/* ---------- booking analytics (delegated; no-op if no analytics present) ---------- */
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest("[data-book]");
  if (!b) return;
  window.dataLayer?.push?.({ event: "book_click", location: b.closest("[id]")?.id || "page" });
  window.gtag?.("event", "book_click", { transport_type: "beacon" });
});

/* ---------- focused stylist dialog (reuses the team card's content) ---------- */
const dialog = $("#stylistDialog");
const dialogBody = $("#dialogBody");
function openStylistDialog(id) {
  const card = document.getElementById("stylist-" + id);
  if (!card) {
    scrollToId("team");
    return;
  }
  dialogBody.innerHTML = card.innerHTML;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", ""); // very old browsers
}
function closeDialog() {
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}
dialog?.addEventListener("click", (e) => {
  // close on backdrop click or the ✕ button
  if (e.target === dialog || e.target.hasAttribute("data-close")) closeDialog();
});

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- bridge the 3D scene calls back into ---------- */
window.hoopla = {
  onSelect: openStylistDialog, // click a stylist in the 3D → open their card
  onServices: () => scrollToId("services"), // click the desk → jump to the menu
  onToggleTheme: toggleTheme, // click the neon sign → flip day/night
  setNight: null, // scene.js assigns this once loaded
};

/* ---------- gated, lazy load of the Three.js scene ---------- */
function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch (e) {
    return false;
  }
}

const stepInside = $("#stepInside");
let sceneLoaded = false;
function loadScene() {
  if (sceneLoaded) return;
  sceneLoaded = true;
  stepInside?.setAttribute("hidden", "");
  import("./scene.js").catch((err) => {
    console.error("Hoopla: 3D scene failed to load", err);
    sceneLoaded = false; // leave the poster in place; site still works
  });
}

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const small = matchMedia("(max-width: 768px)").matches;
const saveData = navigator.connection && navigator.connection.saveData;
const mem = navigator.deviceMemory ?? 4;
const cores = navigator.hardwareConcurrency ?? 4;

const canRun = hasWebGL() && !reduced;
// only auto-load the heavy scene on capable, non-metered, larger devices
const autoLoad = canRun && !saveData && !small && mem >= 4 && cores >= 4;

if (canRun) stepInside?.removeAttribute("hidden"); // always offer it as opt-in when possible
if (autoLoad) requestAnimationFrame(loadScene); // load after first paint, never blocking it
stepInside?.addEventListener("click", loadScene);
