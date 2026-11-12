import * as THREE from 'three';

const TOOLS = ['orbit', 'pan', 'zoom', 'roll', 'look'];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * Camera navigation: Orbit / Pan / Zoom-Dolly / Roll / Look tools on the mouse,
 * WASD+QE free movement on the keyboard, wheel dolly, smooth damping and fly-to.
 */
export class NavControls {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.tool = 'orbit';
    this.s = { target: new THREE.Vector3(0, 0.7, 0), yaw: 0.9, pitch: 0.3, dist: 8, roll: 0 };
    this.g = { target: this.s.target.clone(), yaw: 0.9, pitch: 0.3, dist: 8, roll: 0 };
    this.keys = new Set();
    this.drag = null;
    this.onClick = null;
    this.onHover = null;
    this.onToolChange = null;
    this.minDist = 0.15; this.maxDist = 40;
    this.damping = 9;
    this.enabled = true;

    dom.addEventListener('pointerdown', (e) => this._down(e));
    dom.addEventListener('pointermove', (e) => this._move(e));
    dom.addEventListener('pointerup', (e) => this._up(e));
    dom.addEventListener('pointercancel', (e) => this._up(e));
    dom.addEventListener('wheel', (e) => this._wheel(e), { passive: false });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this._key(e, true));
    window.addEventListener('keyup', (e) => this._key(e, false));
    window.addEventListener('blur', () => this.keys.clear());
    this.setTool('orbit');
  }

  setTool(t) {
    if (!TOOLS.includes(t)) return;
    this.tool = t;
    TOOLS.forEach((n) => this.dom.classList.toggle('cur-' + n, n === t));
    this.onToolChange?.(t);
  }

  _typing(e) {
    const el = e.target;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
  }

  _key(e, down) {
    if (this._typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (down) {
      const idx = ['1', '2', '3', '4', '5'].indexOf(k);
      if (idx >= 0) { this.setTool(TOOLS[idx]); return; }
      if (k === '0') { this.g.roll = 0; return; }
    }
    if (['w', 'a', 's', 'd', 'q', 'e', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      if (k.startsWith('arrow')) e.preventDefault();
      down ? this.keys.add(k) : this.keys.delete(k);
    }
  }

  _down(e) {
    if (!this.enabled) return;
    this.dom.setPointerCapture?.(e.pointerId);
    let mode = this.tool;
    if (e.button === 1) mode = 'pan';
    else if (e.button === 2) mode = this.tool === 'orbit' ? 'pan' : 'orbit';
    else if (e.shiftKey) mode = 'pan';
    const r = this.dom.getBoundingClientRect();
    this.drag = { mode, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: 0,
      ang: Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)), button: e.button };
    this.dom.classList.add('dragging');
  }

  _move(e) {
    if (!this.drag) { this.onHover?.(e); return; }
    const d = this.drag, g = this.g;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    d.x = e.clientX; d.y = e.clientY;
    d.moved += Math.abs(dx) + Math.abs(dy);
    const h = this.dom.clientHeight || 1;
    if (d.mode === 'orbit') {
      g.yaw += dx * 0.006;
      g.pitch = clamp(g.pitch + dy * 0.006, -1.5, 1.5);
    } else if (d.mode === 'pan') {
      const s = (2 * g.dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) / h;
      const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
      g.target.addScaledVector(right, -dx * s).addScaledVector(up, dy * s);
    } else if (d.mode === 'zoom') {
      g.dist = clamp(g.dist * Math.exp(dy * 0.006), this.minDist, this.maxDist);
    } else if (d.mode === 'roll') {
      const r = this.dom.getBoundingClientRect();
      const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
      let da = a - d.ang; d.ang = a;
      if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
      g.roll -= da;
    } else if (d.mode === 'look') {
      // rotate the view about the camera position (first-person look)
      const cam = this._camPos(g);
      g.yaw += dx * 0.004;
      g.pitch = clamp(g.pitch + dy * 0.004, -1.5, 1.5);
      g.target.copy(cam).sub(this._offset(g));
    }
  }

  _up(e) {
    const d = this.drag;
    this.drag = null;
    this.dom.classList.remove('dragging');
    if (d && d.moved < 5 && d.button === 0) this.onClick?.(e);
  }

  _wheel(e) {
    if (!this.enabled) return;
    e.preventDefault();
    const k = e.deltaMode === 1 ? 0.05 : 0.0012;
    this.g.dist = clamp(this.g.dist * Math.exp(e.deltaY * k), this.minDist, this.maxDist);
  }

  _offset(st) {
    const cp = Math.cos(st.pitch);
    return new THREE.Vector3(cp * Math.cos(st.yaw), Math.sin(st.pitch), cp * Math.sin(st.yaw)).multiplyScalar(st.dist);
  }
  _camPos(st) { return st.target.clone().add(this._offset(st)); }

  /** Smoothly move the camera. Any omitted field keeps its current goal value. */
  flyTo({ target, yaw, pitch, dist, roll }, instant = false) {
    const g = this.g;
    if (target) g.target.copy(target);
    if (yaw !== undefined) {
      // take the shortest way round
      let y = yaw; const cur = this.s.yaw;
      while (y - cur > Math.PI) y -= 2 * Math.PI;
      while (y - cur < -Math.PI) y += 2 * Math.PI;
      g.yaw = y;
    }
    if (pitch !== undefined) g.pitch = pitch;
    if (dist !== undefined) g.dist = clamp(dist, this.minDist, this.maxDist);
    if (roll !== undefined) g.roll = roll;
    if (instant) { const s = this.s; s.target.copy(g.target); s.yaw = g.yaw; s.pitch = g.pitch; s.dist = g.dist; s.roll = g.roll; }
  }

  update(dt) {
    const g = this.g, s = this.s, K = this.keys;
    if (K.size && this.enabled) {
      const fwd = new THREE.Vector3(); this.camera.getWorldDirection(fwd);
      const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
      const v = new THREE.Vector3();
      if (K.has('w') || K.has('arrowup')) v.add(fwd);
      if (K.has('s') || K.has('arrowdown')) v.sub(fwd);
      if (K.has('d') || K.has('arrowright')) v.add(right);
      if (K.has('a') || K.has('arrowleft')) v.sub(right);
      if (K.has('e')) v.y += 1;
      if (K.has('q')) v.y -= 1;
      if (v.lengthSq() > 0) {
        const speed = clamp(g.dist * 0.7, 0.8, 6) * (K.has('shift') ? 3 : 1);
        g.target.addScaledVector(v.normalize(), speed * dt);
      }
    }
    g.target.y = clamp(g.target.y, 0.02, 12);
    g.target.x = clamp(g.target.x, -14, 14); g.target.z = clamp(g.target.z, -14, 14);
    // keep the camera above the floor
    const minSin = (0.06 - g.target.y) / g.dist;
    if (minSin > -1 && minSin < 1) g.pitch = Math.max(g.pitch, Math.asin(minSin));

    const a = 1 - Math.exp(-dt * this.damping);
    s.target.lerp(g.target, a);
    s.yaw += (g.yaw - s.yaw) * a;
    s.pitch += (g.pitch - s.pitch) * a;
    s.dist += (g.dist - s.dist) * a;
    s.roll += (g.roll - s.roll) * a;

    this.camera.position.copy(this._camPos(s));
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(s.target);
    this.camera.rotateZ(s.roll);
    this.camera.updateMatrixWorld();
  }
}
