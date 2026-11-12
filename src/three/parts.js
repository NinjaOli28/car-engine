import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------- primitive helpers ----------
const sh = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
export const box = (w, h, d, mat) => sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
export const rbox = (w, h, d, mat, r = 0.012) => sh(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.01, h / 2.01, d / 2.01)), mat));
export function cyl(r, len, mat, axis = 'y', seg = 28, r2 = r) {
  const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(r2, r, len, seg), mat));
  if (axis === 'x') m.rotation.z = -Math.PI / 2; else if (axis === 'z') m.rotation.x = Math.PI / 2;
  return m;
}
export function tube(pts, r, mat, closed = false, seg = 48) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))), closed, 'catmullrom', 0.5);
  return sh(new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, 10, closed), mat));
}
export const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
export const grp = (...kids) => { const g = new THREE.Group(); kids.forEach((k) => k && g.add(k)); return g; };
const sphere = (r, mat, sx = 1, sy = 1, sz = 1) => { const m = sh(new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), mat)); m.scale.set(sx, sy, sz); return m; };
export { sphere };

// ---------- wheel assembly ----------
export function buildWheel(M, tireR, reg, tag) {
  const hub = new THREE.Group();
  const tw = Math.min(0.3, tireR * 0.68), rimR = tireR * 0.64;
  // tyre profile (radius, axial)
  const prof = [];
  const hwid = tw / 2;
  for (let i = 0; i <= 6; i++) { const t = i / 6; prof.push(new THREE.Vector2(rimR + (tireR - 0.018 - rimR) * Math.sin(t * Math.PI / 2) ** 0.8, -hwid + 0.012 - 0.012 * Math.sin(t * Math.PI) + 0.02 * t * t)); }
  for (let i = 0; i <= 12; i++) { const t = i / 12; prof.push(new THREE.Vector2(tireR - 0.006 * Math.pow(Math.abs(t - 0.5) * 2, 3), -hwid + 0.04 + (tw - 0.08) * t)); }
  for (let i = 6; i >= 0; i--) { const t = i / 6; prof.push(new THREE.Vector2(rimR + (tireR - 0.018 - rimR) * Math.sin(t * Math.PI / 2) ** 0.8, hwid - 0.012 + 0.012 * Math.sin(t * Math.PI) - 0.02 * t * t)); }
  const tg = new THREE.LatheGeometry(prof, 72); tg.rotateX(Math.PI / 2);
  const tire = sh(new THREE.Mesh(tg, M.rubber));

  const rim = new THREE.Group();
  const barrel = sh(new THREE.Mesh(new THREE.CylinderGeometry(rimR, rimR * 0.96, tw * 0.92, 48, 1, true), M.alloy)); barrel.rotation.x = Math.PI / 2; barrel.material = M.alloy.clone(); barrel.material.side = THREE.DoubleSide;
  rim.add(barrel);
  const zf = hwid * 0.62;
  for (const z of [hwid * 0.9, -hwid * 0.9]) rim.add(at(sh(new THREE.Mesh(new THREE.TorusGeometry(rimR, 0.011, 10, 64), M.alloy)), 0, 0, z));
  rim.add(at(cyl(0.075, 0.035, M.alloy, 'z'), 0, 0, zf));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
    for (const off of [-0.16, 0.16]) {
      const sp = rbox(rimR - 0.035, 0.026, 0.022, M.alloy, 0.008);
      sp.position.set(Math.cos(a) * (rimR + 0.03) / 2, Math.sin(a) * (rimR + 0.03) / 2, zf - 0.01);
      sp.rotation.z = a + off * 0.9; sp.rotation.y = 0.12;
      rim.add(sp);
    }
  }
  rim.add(at(cyl(0.03, 0.012, M.chrome, 'z'), 0, 0, zf + 0.02));
  const valve = at(cyl(0.004, 0.035, M.blackPlastic, 'y'), 0, -(rimR - 0.02), hwid * 0.7); valve.rotation.x = Math.PI / 2 - 0.5; valve.name = 'valve';
  rim.add(valve);
  const wheel = grp(tire, rim);
  reg(`wheel_${tag}`, wheel, { cat: 'Wheels & brakes', explode: [0.6, 0, 0.7] });
  hub.add(wheel);

  const lugs = new THREE.Group();
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + Math.PI / 2 + 0.628; lugs.add(at(cyl(0.0115, 0.026, M.chrome, 'z', 6), Math.cos(a) * 0.052, Math.sin(a) * 0.052, zf + 0.022)); }
  reg(`lugs_${tag}`, lugs, { cat: 'Wheels & brakes', explode: [0.6, 0, 0.98], spin: 'z' });
  hub.add(lugs);

  const dr = rimR * 0.86;
  const disc = grp(at(cyl(dr, 0.024, M.disc, 'z', 48), 0, 0, -0.03), at(cyl(dr * 0.5, 0.05, M.darkSteel, 'z', 32), 0, 0, -0.005));
  reg(`disc_${tag}`, disc, { cat: 'Wheels & brakes', explode: [0, 0, 0.38] });
  hub.add(disc);

  const ca = Math.PI * 0.78, cr = dr * 0.8;
  const caliper = grp(rbox(0.07, 0.15, 0.085, M.caliper, 0.02));
  caliper.position.set(Math.cos(ca) * cr, Math.sin(ca) * cr, -0.03); caliper.rotation.z = ca;
  reg(`caliper_${tag}`, caliper, { cat: 'Wheels & brakes', explode: [-0.18, 0.2, 0.1] });
  hub.add(caliper);

  const pads = grp(at(box(0.05, 0.11, 0.012, M.pad), 0, 0, 0.02), at(box(0.05, 0.11, 0.012, M.pad), 0, 0, -0.02),
    at(box(0.052, 0.115, 0.004, M.steel), 0, 0, 0.028), at(box(0.052, 0.115, 0.004, M.steel), 0, 0, -0.028));
  pads.position.set(Math.cos(ca) * cr * 0.98, Math.sin(ca) * cr * 0.98, -0.03); pads.rotation.z = ca;
  reg(`pads_${tag}`, pads, { cat: 'Wheels & brakes', explode: [-0.34, 0.34, 0.16] });
  hub.add(pads);
  return hub;
}

// ---------- spark plug ----------
function sparkPlug(M) {
  const pts = [[0, 0], [0.004, 0], [0.004, 0.012], [0.0065, 0.014], [0.0065, 0.034], [0.0085, 0.036], [0.0105, 0.04], [0.0105, 0.05], [0.007, 0.052], [0.0062, 0.075], [0.0045, 0.078], [0.0045, 0.086], [0, 0.086]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.Group();
  const metal = sh(new THREE.Mesh(new THREE.LatheGeometry(pts.slice(0, 9), 14), M.steel));
  const cer = sh(new THREE.Mesh(new THREE.LatheGeometry(pts.slice(8, 11), 14), M.ceramic));
  const tip = sh(new THREE.Mesh(new THREE.LatheGeometry(pts.slice(10), 12), M.chrome));
  const hex = at(cyl(0.0105, 0.01, M.steel, 'y', 6), 0, 0.045, 0);
  const elec = at(box(0.002, 0.006, 0.002, M.copper), 0.003, -0.003, 0); const elec2 = at(box(0.007, 0.0015, 0.002, M.copper), 0.0005, -0.006, 0);
  g.add(metal, cer, tip, hex, elec, elec2);
  return g;
}

// ---------- engine ----------
export function buildEngine(M, v, reg) {
  const eng = new THREE.Group(); eng.name = 'engine';
  const isV = v.engine.layout === 'V6';
  const perBank = isV ? 3 : 4, pitch = 0.094;
  const len = perBank * pitch + 0.07;
  const C = 'Engine';

  const pan = grp(at(rbox(isV ? 0.3 : 0.3, 0.1, len - 0.02, M.darkSteel, 0.03), 0, -0.13, 0), at(rbox(0.26, 0.07, len * 0.55, M.darkSteel, 0.03), 0, -0.19, -len * 0.18));
  reg('oil_pan', pan, { cat: C, explode: [0, -0.45, 0] }); eng.add(pan);
  const plug = grp(cyl(0.014, 0.012, M.steel, 'x', 6), at(cyl(0.02, 0.004, M.copper, 'x', 20), 0.008, 0, 0));
  plug.position.set(-0.137, -0.195, -len * 0.18);
  reg('drain_plug', plug, { cat: C, explode: [-0.3, -0.12, 0], spin: 'x' }); eng.add(plug);

  const block = grp(at(rbox(isV ? 0.4 : 0.34, 0.28, len, M.cast, 0.02), 0, 0.06, 0));
  for (let i = 0; i < 5; i++) block.add(at(box(isV ? 0.41 : 0.35, 0.012, len * 0.9, M.cast), 0, -0.03 + i * 0.045, 0));
  reg('block', block, { cat: C, explode: [0, 0, 0] }); eng.add(block);

  let cylNo = 0;
  const bank = (angle, baseY, side) => {
    const b = new THREE.Group(); b.rotation.z = angle;
    const head = grp(at(rbox(0.3, 0.12, len, M.cast, 0.015), 0, baseY + 0.06, 0));
    reg(isV ? `cylhead_${side}` : 'cylhead', head, { cat: C, explode: [0, 0.18, 0], base: 'head_eng' }); b.add(head);
    const cover = grp(at(rbox(0.26, 0.07, len - 0.02, M.blackPlastic, 0.025), 0, baseY + 0.155, 0));
    for (let i = 0; i < perBank; i++) {
      const z = (i - (perBank - 1) / 2) * pitch;
      const well = at(cyl(0.024, 0.074, M.under, 'y', 16), -0.02, baseY + 0.156, z); cover.add(well);
    }
    reg(isV ? `valve_cover_${side}` : 'valve_cover', cover, { cat: C, explode: [0, 0.55, 0], base: 'valve_cover' }); b.add(cover);
    for (let i = 0; i < perBank; i++) {
      const z = (i - (perBank - 1) / 2) * pitch; cylNo++;
      const sp = sparkPlug(M); sp.position.set(-0.02, baseY + 0.045, z);
      reg(`plug_${cylNo}`, sp, { cat: 'Ignition', explode: [0, 0.3, 0], spin: 'y', base: 'plug' }); b.add(sp);
      const coil = grp(at(rbox(0.05, 0.035, 0.062, M.greyPlastic, 0.008), 0, 0.02, 0), at(rbox(0.03, 0.022, 0.03, M.blackPlastic, 0.005), 0.035, 0.022, 0),
        at(cyl(0.0125, 0.11, M.hose, 'y', 14), 0, -0.05, 0), at(cyl(0.006, 0.01, M.chrome, 'y', 6), -0.015, 0.04, 0.02));
      coil.position.set(-0.02, baseY + 0.195, z);
      reg(`coil_${cylNo}`, coil, { cat: 'Ignition', explode: [0, 0.48, 0], base: 'coil' }); b.add(coil);
    }
    eng.add(b); return b;
  };

  let capHost, topY;
  if (isV) {
    bank(-0.56, 0.13, 'r'); capHost = bank(0.56, 0.13, 'l'); topY = 0.4;
    const man = grp(at(rbox(0.2, 0.09, len - 0.04, M.greyPlastic, 0.03), 0, 0.33, 0));
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) man.add(tube([[0, 0.32, (i - 1) * pitch], [s * 0.09, 0.33, (i - 1) * pitch], [s * 0.13, 0.26, (i - 1) * pitch]], 0.022, M.greyPlastic, false, 12));
    reg('intake_manifold', man, { cat: 'Air & fuel', explode: [0, 0.75, 0] }); eng.add(man);
    const tb = grp(at(cyl(0.04, 0.07, M.cast, 'z'), 0, 0.33, len / 2 + 0.01));
    reg('throttle_body', tb, { cat: 'Air & fuel', explode: [0, 0.75, 0.2] }); eng.add(tb);
    for (const s of [-1, 1]) {
      const ex = new THREE.Group();
      for (let i = 0; i < 3; i++) ex.add(tube([[s * 0.27, 0.2, (i - 1) * pitch], [s * 0.32, 0.14, (i - 1) * pitch], [s * 0.31, 0.04, (i - 1) * pitch * 0.5 - 0.03]], 0.02, M.steel, false, 12));
      ex.add(tube([[s * 0.31, 0.05, 0.02], [s * 0.3, -0.04, -0.1], [s * 0.24, -0.1, -len / 2 - 0.05]], 0.028, M.steel, false, 16));
      reg(`exhaust_manifold_${s > 0 ? 'l' : 'r'}`, ex, { cat: 'Exhaust', explode: [s * 0.45, 0, 0], base: 'exhaust_manifold' }); eng.add(ex);
    }
  } else {
    capHost = bank(0, 0.2, ''); topY = 0.44;
    const man = grp(at(cyl(0.055, len - 0.05, M.greyPlastic, 'z'), 0.28, 0.24, 0));
    for (let i = 0; i < 4; i++) { const z = (i - 1.5) * pitch; man.add(tube([[0.15, 0.27, z], [0.2, 0.34, z], [0.29, 0.33, z], [0.3, 0.25, z]], 0.021, M.greyPlastic, false, 16)); }
    reg('intake_manifold', man, { cat: 'Air & fuel', explode: [0.5, 0.2, 0] }); eng.add(man);
    const tb = grp(at(cyl(0.04, 0.07, M.cast, 'z'), 0.28, 0.24, -len / 2 - 0.005));
    reg('throttle_body', tb, { cat: 'Air & fuel', explode: [0.5, 0.2, -0.2] }); eng.add(tb);
    const ex = new THREE.Group();
    for (let i = 0; i < 4; i++) { const z = (i - 1.5) * pitch; ex.add(tube([[-0.15, 0.25, z], [-0.22, 0.23, z], [-0.25, 0.12, z * 0.5], [-0.25, 0.02, z * 0.15]], 0.02, M.steel, false, 14)); }
    ex.add(at(cyl(0.04, 0.12, M.steel, 'y'), -0.25, -0.03, 0));
    reg('exhaust_manifold', ex, { cat: 'Exhaust', explode: [-0.5, 0.05, 0] }); eng.add(ex);
  }

  // oil filler cap (in the bank's local frame so it sits on the cover)
  const capY = (isV ? 0.13 : 0.2) + 0.19;
  const cap = grp(cyl(0.03, 0.022, M.blackPlastic, 'y', 20), at(cyl(0.022, 0.004, M.yellow, 'y', 20), 0, 0.012, 0), at(box(0.05, 0.012, 0.012, M.blackPlastic), 0, 0.016, 0));
  cap.position.set(0.075, capY + 0.008, len / 2 - 0.075);
  reg('oil_cap', cap, { cat: C, explode: [0, 0.3, 0], spin: 'y' }); capHost.add(cap);

  // oil filter + dipstick on the front face
  const fx = isV ? 0.17 : 0.2;
  const cart = v.specs.filter.startsWith('cartridge');
  const filt = cart ? grp(cyl(0.042, 0.085, M.blackPlastic, 'x', 24), at(cyl(0.02, 0.012, M.blackPlastic, 'x', 6), 0.048, 0, 0))
    : grp(cyl(0.04, 0.09, M.blue, 'x', 28), at(cyl(0.036, 0.012, M.darkSteel, 'x', 12), 0.05, 0, 0));
  filt.position.set(fx + 0.02, -0.04, isV ? 0.02 : 0.1);
  reg('oil_filter', filt, { cat: C, explode: [0.38, -0.12, 0], spin: 'x' }); eng.add(filt);
  const dzp = isV ? -0.1 : -0.13, dx = isV ? 0.215 : 0.185;
  const dip = grp(tube([[dx - 0.02, -0.05, dzp], [dx, 0.2, dzp], [dx + 0.01, topY - 0.04, dzp]], 0.0035, M.steel, false, 16),
    at(sh(new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 8, 20), M.yellow)), dx + 0.01, topY - 0.022, dzp));
  reg('dipstick', dip, { cat: C, explode: [0.03, 0.5, 0] }); eng.add(dip);
  eng.add(tube([[dx - 0.02, -0.05, dzp], [dx, 0.2, dzp], [dx + 0.009, topY - 0.07, dzp]], 0.006, M.darkSteel, false, 12));

  // accessory drive on the +z end
  const zb = len / 2 + 0.035;
  const pul = [[0, 0, 0.075], [0.2, -0.07, 0.05], [0.22, 0.16, 0.033], [0.03, 0.2, 0.04], [-0.13, 0.08, 0.035]];
  const pulleys = new THREE.Group();
  pul.forEach(([x, y, r]) => pulleys.add(at(cyl(r, 0.028, M.darkSteel, 'z', 28), x, y, zb), at(cyl(r * 0.35, 0.034, M.steel, 'z', 12), x, y, zb)));
  reg('pulleys', pulleys, { cat: 'Accessory drive', explode: [0, 0, 0.3] }); eng.add(pulleys);
  const cx = 0.064, cy = 0.074, bp = [];
  pul.forEach(([x, y, r]) => { const a0 = Math.atan2(y - cy, x - cx); for (const da of [-0.7, 0, 0.7]) bp.push([x + Math.cos(a0 + da) * (r + 0.004), y + Math.sin(a0 + da) * (r + 0.004), zb]); });
  bp.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  const belt = tube(bp, 0.0055, M.hose, true, 120); belt.scale.z = 1; belt.geometry.scale(1, 1, 3.2); belt.geometry.translate(0, 0, -zb * 2.2);
  reg('belt', grp(belt), { cat: 'Accessory drive', explode: [0, 0, 0.55] }); eng.add(belt.parent);
  const alt = grp(at(cyl(0.062, 0.11, M.cast, 'z', 24), 0.22, 0.16, zb - 0.085), at(cyl(0.064, 0.02, M.darkSteel, 'z', 24), 0.22, 0.16, zb - 0.085));
  reg('alternator', alt, { cat: 'Electrical', explode: [0.4, 0.25, 0.1] }); eng.add(alt);
  const ac = grp(at(cyl(0.055, 0.14, M.cast, 'z', 24), 0.2, -0.07, zb - 0.1));
  reg('ac_compressor', ac, { cat: 'Accessory drive', explode: [0.45, -0.1, 0.1] }); eng.add(ac);

  const tr = grp(at(cyl(0.19, 0.1, M.cast, 'z', 32, 0.15), 0, 0.02, -len / 2 - 0.05), at(rbox(0.28, 0.28, isV ? 0.5 : 0.26, M.cast, 0.05), 0, 0, -len / 2 - (isV ? 0.34 : 0.22)));
  reg('transmission', tr, { cat: 'Drivetrain', explode: [0, 0, -0.7] }); eng.add(tr);

  eng.userData = { topY, len, isV, bottomY: -0.225 };
  return eng;
}

// ---------- reservoir helper ----------
export function reservoir(M, w, h, d, fluidMat, capMat) {
  const g = new THREE.Group();
  const tank = rbox(w, h, d, M.tank, 0.025); tank.renderOrder = 2; tank.castShadow = false;
  const fluid = rbox(w * 0.9, h * 0.9, d * 0.9, fluidMat, 0.02); fluid.castShadow = false;
  const holder = new THREE.Group(); holder.position.y = -h * 0.45; fluid.position.y = h * 0.45; holder.add(fluid);
  const cap = at(cyl(Math.min(w, d) * 0.22, 0.025, capMat, 'y', 20), w * 0.15, h / 2 + 0.01, 0);
  const marks = grp(at(box(0.03, 0.003, 0.002, M.blackPlastic), -w * 0.2, h * 0.25, d / 2 + 0.001), at(box(0.03, 0.003, 0.002, M.blackPlastic), -w * 0.2, -h * 0.2, d / 2 + 0.001));
  g.add(holder, tank, cap, marks);
  g.userData.setLevel = (f) => { holder.scale.y = Math.max(0.02, f); };
  g.userData.cap = cap;
  return g;
}

export function coilSpring(r, h, turns, wire, mat) {
  const pts = [];
  for (let i = 0; i <= turns * 16; i++) { const a = (i / 16) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, (i / (turns * 16)) * h, Math.sin(a) * r)); }
  return sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 24, wire, 8), mat));
}
