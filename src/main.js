import * as THREE from 'three';
import { Stage } from './three/stage.js';
import { NavControls } from './three/controls.js';
import { Vehicle } from './three/vehicle.js';
import { VEHICLES, PAINTS, getVehicle } from './data/vehicles.js';
import { partInfo } from './data/partsInfo.js';
import { updateTweens, wait } from './lib/tween.js';
import { narrator } from './lib/voice.js';
import { store } from './lib/store.js';
import { icon } from './ui/icons.js';
import { garage } from './ui/garage.js';
import { explore } from './ui/explore.js';
import { projects } from './ui/projects.js';
import { training } from './ui/training.js';
import { inspection } from './ui/inspection.js';

const $ = (s, r = document) => r.querySelector(s);
const ui = $('#ui'), overlay = $('#overlay');

ui.innerHTML = `
<header id="topbar">
  <div class="brand">${icon('logo')}<span>Torque<b>Lab</b></span></div>
  <button id="vehChip" class="chip" title="Change vehicle"></button>
  <nav id="tabs">
    <button data-mode="explore">${icon('cube')}Explore</button>
    <button data-mode="projects">${icon('wrench')}Projects</button>
    <button data-mode="training">${icon('book')}Training</button>
    <button data-mode="inspection">${icon('shield')}Inspection</button>
  </nav>
  <div class="spacer"></div>
  <button id="voiceBtn" class="iconbtn" title="Voice-over on/off"></button>
  <button id="helpBtn" class="iconbtn" title="Controls">${icon('help')}</button>
</header>
<aside id="rail">
  <div class="rail-group" id="tools">
    <button data-tool="orbit" title="Orbit — rotate around the point of interest (1)">${icon('orbit')}<i>Orbit</i></button>
    <button data-tool="pan" title="Pan — slide the view (2)">${icon('pan')}<i>Pan</i></button>
    <button data-tool="zoom" title="Zoom / dolly — move closer or farther (3)">${icon('zoom')}<i>Zoom</i></button>
    <button data-tool="roll" title="Roll — rotate around the line of sight (4)">${icon('roll')}<i>Roll</i></button>
    <button data-tool="look" title="Look — turn your head in place (5)">${icon('eye')}<i>Look</i></button>
  </div>
  <div class="rail-group">
    <button data-view="reset" title="Reset view (Home)">${icon('home')}<i>Reset</i></button>
  </div>
  <div class="rail-group" id="toggles">
    <button data-toggle="blueprint" title="Blueprint view (B)">${icon('blueprint')}<i>Blueprint</i></button>
    <button data-toggle="xray" title="X-ray body (X)">${icon('xray')}<i>X-ray</i></button>
    <button data-toggle="hood" title="Open / close hood (H)">${icon('hood')}<i>Hood</i></button>
    <button data-toggle="lift" title="Raise / lower on the lift (L)">${icon('lift')}<i>Lift</i></button>
  </div>
</aside>
<div id="explodeBar"><label>${icon('explode')}Pull apart</label><input id="explode" type="range" min="0" max="1" step="0.001" value="0"><span id="explodeVal">0%</span></div>
<aside id="panel"><div id="panelBody"></div></aside>
<div id="hint"></div>
<div id="tooltip"></div>
<div id="toast"></div>
<div id="modal" hidden><div class="modal-card"></div></div>
<div id="garage"></div>`;

// ---------------- core ----------------
const stage = new Stage($('#gl'));
const nav = new NavControls(stage.camera, stage.renderer.domElement);
const ray = new THREE.Raycaster();
const modes = { explore, projects, training, inspection };
const BAY = ['Engine', 'Ignition', 'Under the hood', 'Electrical', 'Air & fuel', 'Cooling', 'Accessory drive'];

export const app = {
  stage, nav, veh: null, def: null, year: null, paint: null, mode: null, selected: null, hover: null,
  hotspots: [], runId: 0, $, icon, narrator, store, partInfo,

  // ----- vehicle -----
  loadVehicle(id, year, paintId) {
    const def = getVehicle(id) || VEHICLES[0];
    const paint = PAINTS.find((p) => p.id === paintId) || PAINTS[0];
    if (this.veh && this.def === def) { this.veh.setPaint(paint.hex); this.paint = paint; this.year = year; this._chip(); return; }
    if (this.veh) { stage.scene.remove(this.veh.group); this.veh.dispose(); }
    this.def = def; this.year = year || def.years[def.years.length - 1]; this.paint = paint;
    this.veh = new Vehicle(def, paint.hex);
    stage.scene.add(this.veh.group);
    this.selected = this.hover = null; this.isolated = null;
    this._dims();
    for (const k of ['blueprint', 'xray']) if (this.flags[k]) { this.flags[k] = false; this.toggle(k, true); }
    $('#explode').value = 0; $('#explodeVal').textContent = '0%';
    store.set('vehicle', { id: def.id, year: this.year, paint: paint.id });
    this._chip();
  },
  _chip() { $('#vehChip').innerHTML = `<span class="sw" style="background:#${this.paint.hex.toString(16).padStart(6, '0')}"></span><b>${this.year} ${this.def.make} ${this.def.model}</b><em>${this.def.engine.label}</em>${icon('chev')}`; },
  home(instant) {
    const d = this.def.dims;
    nav.flyTo({ target: new THREE.Vector3(0, d.H * 0.42 + this.veh.root.position.y, 0), yaw: 0.72, pitch: 0.24, dist: d.L * 1.45, roll: 0 }, instant);
  },

  // ----- camera -----
  focus(partId, view = {}) {
    const veh = this.veh; if (!veh.parts.has(partId)) return;
    const c = veh.center(partId), r = veh.radius(partId);
    const dist = view.abs ?? Math.max(0.42, r * 2.4 + 3.2 / (view.k ?? 3));
    let { yaw, pitch } = view;
    if (pitch === undefined) {
      const cat = veh.parts.get(partId).cat;
      if (BAY.includes(cat)) { pitch = 0.8; yaw = 0.25; }
      else if (['Chassis', 'Exhaust', 'Drivetrain'].includes(cat) || ['oil_pan', 'drain_plug', 'oil_filter'].includes(partId)) { pitch = veh.lifted ? -0.3 : 0.1; }
      else if (cat === 'Wheels & brakes') { yaw = Math.atan2(c.z, c.x * 0.35); pitch = 0.12; }
      else if (cat === 'Lighting') { yaw = c.x > 0 ? 0.3 * Math.sign(c.z || 1) : Math.PI - 0.3 * Math.sign(c.z || 1); pitch = 0.15; }
    }
    nav.flyTo({ target: c, yaw, pitch, dist, roll: 0 });
  },

  // ----- scripted actions -----
  async act(a) {
    const v = this.veh;
    switch (a[0]) {
      case 'hood': return v.setHood(!!a[1]);
      case 'lift': return v.setLift(!!a[1]);
      case 'pull': return v.pull(a[1], !!a[2]);
      case 'pullAll': { const ids = [...v.parts.values()].filter((p) => p.base === a[1]).map((p) => p.id); for (const id of ids) { v.pull(id, !!a[2], 0.7); await wait(0.12); } return wait(0.6); }
      case 'drain': return v.drainOil();
      case 'pour': return v.pourOil();
      case 'hidefx': return v.hideFx();
      case 'wait': return wait(a[1]);
      case 'lamp': return v.setLamp(a[1], !!a[2]);
      case 'lampsoff': return v.lampsOff();
      case 'blink': return v.blink(a[1]);
      default: return null;
    }
  },
  /** Run a list of actions in order. A newer run cancels an older one. Camera follows `follow` part. */
  async run(list, follow, view) {
    const id = ++this.runId;
    if (follow) this.focus(follow, view);
    for (const a of list || []) {
      if (id !== this.runId) return false;
      const p = this.act(a);
      if (follow && (a[0] === 'lift' || a[0] === 'hood')) { const t0 = performance.now(); const chase = () => { if (id === this.runId && performance.now() - t0 < 2400) { this.focus(follow, view); requestAnimationFrame(chase); } }; chase(); }
      await p;
    }
    if (id === this.runId && follow) this.focus(follow, view);
    return id === this.runId;
  },
  /** Bring the car to a known state: hood/lift as requested, only `pulled` parts removed. */
  async setState({ hood = false, lift = false, pulled = [] } = {}) {
    const v = this.veh;
    for (const p of v.parts.values()) if (p.pullGoal === 1 && !pulled.includes(p.id)) v.pull(p.id, false, 0.6);
    v.hideFx();
    await Promise.all([v.setHood(hood), v.setLift(lift)]);
    for (const id of pulled) await v.pull(id, true, 0.7);
  },

  // ----- selection -----
  select(id, { fly = true, speak = true } = {}) {
    if (this.selected && this.selected !== this.hover) this.veh.highlight(this.selected, false);
    this.selected = id;
    if (id) { this.veh.highlight(id, true); if (fly) this.focus(id, {}); if (speak) { const i = partInfo(this.veh.parts.get(id)); narrator.speak(`${i.name}. ${i.text} ${i.tip || ''}`); } }
    modes[this.mode]?.onSelect?.(id);
  },
  isolate(id) { this.isolated = id; this.veh.isolate(id); if (id) this.focus(id, { k: 6 }); },

  // ----- hotspots -----
  setHotspots(list) {
    overlay.querySelectorAll('.hs').forEach((e) => e.remove());
    this.hotspots = list.map((h) => {
      const el = document.createElement('button');
      el.className = 'hs ' + (h.cls || '');
      el.innerHTML = `<span class="dot">${h.n ?? ''}</span><span class="lbl">${h.label}</span>`;
      el.addEventListener('click', (e) => { e.stopPropagation(); h.onClick?.(h); });
      overlay.appendChild(el);
      return { ...h, el };
    });
  },

  // ----- toggles -----
  flags: { blueprint: false, xray: false },
  toggle(k, force) {
    const v = this.veh;
    if (k === 'hood') v.setHood(force ?? !v.hoodOpen);
    else if (k === 'lift') v.setLift(force ?? !v.lifted);
    else if (k === 'xray') { this.flags.xray = force ?? !this.flags.xray; v.setXray(this.flags.xray); }
    else if (k === 'blueprint') { this.flags.blueprint = force ?? !this.flags.blueprint; v.setBlueprint(this.flags.blueprint); stage.setBlueprint(this.flags.blueprint); this.dims.visible = this.flags.blueprint; document.body.classList.toggle('bp', this.flags.blueprint); }
  },

  // ----- blueprint dimensions -----
  _dims() {
    const { L, W, H, wb } = this.def.dims, I = this.veh.info;
    const g = new THREE.Group(), pts = [], mat = new THREE.LineBasicMaterial({ color: 0xffd36b });
    const z = W / 2 + 0.55, x = L / 2 + 0.45;
    const seg = (a, b) => { pts.push(...a, ...b); };
    const tick = (p, d) => seg([p[0] - d[0], p[1] - d[1], p[2] - d[2]], [p[0] + d[0], p[1] + d[1], p[2] + d[2]]);
    seg([-L / 2, 0.01, z], [L / 2, 0.01, z]); tick([-L / 2, 0.01, z], [0, 0, 0.1]); tick([L / 2, 0.01, z], [0, 0, 0.1]);
    seg([I.xr, 0.01, z - 0.3], [I.xf, 0.01, z - 0.3]); tick([I.xr, 0.01, z - 0.3], [0, 0, 0.08]); tick([I.xf, 0.01, z - 0.3], [0, 0, 0.08]);
    seg([x, 0.01, -W / 2], [x, 0.01, W / 2]); tick([x, 0.01, -W / 2], [0.1, 0, 0]); tick([x, 0.01, W / 2], [0.1, 0, 0]);
    seg([-x, 0, 0], [-x, H, 0]); tick([-x, 0, 0], [0.1, 0, 0]); tick([-x, H, 0], [0.1, 0, 0]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.add(new THREE.LineSegments(geo, mat)); g.visible = false;
    if (this.dims) stage.scene.remove(this.dims);
    this.dims = g; stage.scene.add(g);
    const mm = (m) => `${Math.round(m * 1000).toLocaleString()} mm`;
    overlay.querySelectorAll('.dim').forEach((e) => e.remove());
    this.dimLabels = [[new THREE.Vector3(-L / 2 + 0.3, 0.01, z), `Length ${mm(L)}`], [new THREE.Vector3((I.xf + I.xr) / 2, 0.01, z - 0.3), `Wheelbase ${mm(wb)}`], [new THREE.Vector3(x, 0.01, 0), `Width ${mm(W)}`], [new THREE.Vector3(-x, H / 2, 0), `Height ${mm(H)}`]]
      .map(([pos, text]) => { const el = document.createElement('div'); el.className = 'dim'; el.textContent = text; overlay.appendChild(el); return { pos, el }; });
  },

  // ----- chrome -----
  setMode(m) {
    if (this.mode === m) return;
    modes[this.mode]?.leave?.(this);
    this.runId++; narrator.stop();
    this.mode = m; store.set('mode', m);
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
    this.setHotspots([]); this.select(null); if (this.isolated) this.isolate(null);
    $('#panel').dataset.mode = m;
    modes[m].enter(this);
  },
  render(html) { const b = $('#panelBody'); b.innerHTML = html; b.scrollTop = 0; b.classList.remove('in'); void b.offsetWidth; b.classList.add('in'); },
  toast(msg, kind = '') { const t = $('#toast'); t.textContent = msg; t.className = 'show ' + kind; clearTimeout(this._tt); this._tt = setTimeout(() => (t.className = ''), 2600); },
  modal(html, cls = '') { const m = $('#modal'); m.hidden = false; const c = m.firstElementChild; c.className = 'modal-card ' + cls; c.innerHTML = html; return c; },
  closeModal() { $('#modal').hidden = true; },
  hint(text) { $('#hint').innerHTML = text; },
};
window.app = app;

// ---------------- events ----------------
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-mode]'); if (b) app.setMode(b.dataset.mode); });
$('#vehChip').addEventListener('click', () => garage.open(app));
$('#rail').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.tool) nav.setTool(b.dataset.tool);
  else if (b.dataset.toggle) app.toggle(b.dataset.toggle);
  else if (b.dataset.view === 'reset') app.home();
});
const HINTS = {
  orbit: '<b>Orbit</b> · drag to rotate around the focus point · right-drag to pan · scroll to zoom',
  pan: '<b>Pan</b> · drag to slide the view · right-drag to orbit',
  zoom: '<b>Zoom / Dolly</b> · drag up to move closer, down to move away',
  roll: '<b>Roll</b> · drag around the screen centre to rotate the view · press 0 to level',
  look: '<b>Look</b> · drag to turn your head in place',
};
nav.onToolChange = (t) => {
  document.querySelectorAll('#tools button').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
  app.hint(`${HINTS[t]} <span class="keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move · <kbd>Q</kbd><kbd>E</kbd> down/up · <kbd>Shift</kbd> faster</span>`);
};
nav.setTool('orbit');
$('#explode').addEventListener('input', (e) => { const t = +e.target.value; app.veh.setExplode(t); $('#explodeVal').textContent = Math.round(t * 100) + '%'; });
$('#panel').addEventListener('click', (e) => { const el = e.target.closest('[data-act]'); if (el) modes[app.mode]?.on?.(el.dataset.act, el, app, e); });
$('#panel').addEventListener('input', (e) => { const el = e.target.closest('[data-input]'); if (el) modes[app.mode]?.input?.(el.dataset.input, el, app); });
$('#modal').addEventListener('click', (e) => { const el = e.target.closest('[data-act]'); if (el) modes[app.mode]?.on?.(el.dataset.act, el, app, e); else if (e.target.id === 'modal' && !$('#modal .modal-card').classList.contains('sticky')) app.closeModal(); });
const voiceBtn = $('#voiceBtn');
const syncVoice = () => { voiceBtn.innerHTML = icon(narrator.enabled ? 'sound' : 'mute'); voiceBtn.classList.toggle('on', narrator.enabled); };
voiceBtn.addEventListener('click', () => { narrator.setEnabled(!narrator.enabled); syncVoice(); app.toast(narrator.enabled ? 'Voice-over on' : 'Voice-over muted'); });
narrator.onState((s) => voiceBtn.classList.toggle('speaking', s));
syncVoice();
$('#helpBtn').addEventListener('click', () => {
  app.modal(`<h2>Controls</h2><div class="help-grid">
    <div><h4>Mouse tools</h4><p><kbd>1</kbd> <b>Orbit</b> — rotate around the point of interest</p><p><kbd>2</kbd> <b>Pan</b> — slide the view across the screen plane</p><p><kbd>3</kbd> <b>Zoom / Dolly</b> — move closer or farther</p><p><kbd>4</kbd> <b>Roll</b> — rotate around the line of sight (<kbd>0</kbd> levels)</p><p><kbd>5</kbd> <b>Look</b> — turn in place</p><p>Scroll wheel always zooms. Right-drag pans (or orbits when another tool is active). Shift-drag pans.</p></div>
    <div><h4>Keyboard</h4><p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> fly forward / left / back / right</p><p><kbd>Q</kbd><kbd>E</kbd> down / up · <kbd>Shift</kbd> move faster</p><p><kbd>B</kbd> blueprint · <kbd>X</kbd> x-ray · <kbd>H</kbd> hood · <kbd>L</kbd> lift</p><p><kbd>Home</kbd> reset view · <kbd>Esc</kbd> clear selection</p><h4>Parts</h4><p>Click any part to select it. Click a glowing hotspot for narrated information.</p></div></div>
    <div class="row end"><button class="btn primary" onclick="app.closeModal()">Got it</button></div>`);
});
window.addEventListener('keydown', (e) => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.metaKey || e.ctrlKey) return;
  if (!$('#garage').hidden) return;
  const k = e.key.toLowerCase();
  if (k === 'b') app.toggle('blueprint'); else if (k === 'x') app.toggle('xray'); else if (k === 'h') app.toggle('hood'); else if (k === 'l') app.toggle('lift');
  else if (k === 'home') app.home(); else if (k === 'escape') { if (!$('#modal').hidden) app.closeModal(); else { if (app.isolated) app.isolate(null); app.select(null); } }
});

// picking
function pick(e) {
  const r = stage.renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), stage.camera);
  const veh = app.veh;
  for (const hit of ray.intersectObject(veh.root, true)) {
    let vis = true; for (let o = hit.object; o; o = o.parent) if (!o.visible) { vis = false; break; }
    if (!vis || !hit.object.isMesh) continue;
    const id = veh.partOf(hit.object); if (!id) continue;
    const p = veh.parts.get(id);
    if (app.flags.xray && (p.cat === 'Body' || id === 'windshield')) continue;
    return id;
  }
  return null;
}
nav.onClick = (e) => { const id = pick(e); app.select(id, { fly: false }); };
let hoverEvt = null;
nav.onHover = (e) => { hoverEvt = e; };
const tip = $('#tooltip');
function doHover() {
  if (!hoverEvt || !app.veh) return;
  const e = hoverEvt; hoverEvt = null;
  const id = pick(e);
  if (id !== app.hover) {
    if (app.hover && app.hover !== app.selected) app.veh.highlight(app.hover, false);
    app.hover = id;
    if (id) app.veh.highlight(id, true);
  }
  if (id) { tip.textContent = partInfo(app.veh.parts.get(id)).name; tip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 16}px)`; tip.classList.add('show'); } else tip.classList.remove('show');
}
stage.renderer.domElement.addEventListener('pointerleave', () => tip.classList.remove('show'));

// ---------------- loop ----------------
const clock = new THREE.Clock(), v3 = new THREE.Vector3();
let viewOff = 0;
const togEls = Object.fromEntries([...document.querySelectorAll('#toggles button')].map((b) => [b.dataset.toggle, b]));
function place(el, world) {
  v3.copy(world).project(stage.camera);
  const ok = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
  el.style.display = ok ? '' : 'none';
  if (ok) el.style.transform = `translate(${((v3.x + 1) / 2) * innerWidth}px, ${((1 - v3.y) / 2) * innerHeight}px)`;
}
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  updateTweens(dt);
  const inGarage = !$('#garage').hidden;
  if (inGarage) nav.g.yaw += dt * 0.1;
  const wantOff = innerWidth < 820 ? 0 : inGarage ? -innerWidth * 0.2 : 170;
  viewOff += (wantOff - viewOff) * (1 - Math.exp(-dt * 5));
  if (Math.abs(viewOff) > 0.5) stage.camera.setViewOffset(innerWidth, innerHeight, viewOff, 0, innerWidth, innerHeight); else stage.camera.clearViewOffset();
  nav.update(dt);
  const veh = app.veh;
  if (veh) {
    veh.update(clock.elapsedTime);
    doHover();
    for (const h of app.hotspots) {
      const show = !h.when || h.when(app);
      if (!show) { h.el.style.display = 'none'; continue; }
      place(h.el, veh.center(h.part, v3.clone()));
    }
    for (const d of app.dimLabels) { if (app.flags.blueprint) place(d.el, d.pos); else d.el.style.display = 'none'; }
    togEls.hood.classList.toggle('on', veh.hoodOpen); togEls.lift.classList.toggle('on', veh.lifted);
    togEls.xray.classList.toggle('on', app.flags.xray); togEls.blueprint.classList.toggle('on', app.flags.blueprint);
  }
  stage.render();
}

// ---------------- boot ----------------
const saved = store.get('vehicle');
app.loadVehicle(saved?.id || 'camry', saved?.year, saved?.paint);
app.home(true);
const q = new URLSearchParams(location.search);
if (q.get('skip') || (saved && store.get('entered'))) { $('#garage').hidden = true; app.setMode(q.get('mode') || store.get('mode', 'explore')); } else garage.open(app, true);
loop();
