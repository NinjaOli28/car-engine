import * as THREE from 'three';
import { buildBody } from './carBody.js';
import { makeMaterials } from './materials.js';
import { buildWheel, buildEngine, reservoir, coilSpring, box, rbox, cyl, tube, at, grp, sphere } from './parts.js';
import { tween, ease, wait } from '../lib/tween.js';

const HL = new THREE.Color(0x2f9bff);

const bpMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
  uniforms: { c1: { value: new THREE.Color(0x1d6fd6) }, c2: { value: new THREE.Color(0xd8ecff) } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'uniform vec3 c1; uniform vec3 c2; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2); gl_FragColor = vec4(mix(c1, c2, f), 0.05 + f*0.55); }',
});
const bpLine = new THREE.LineBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.75 });
const bpLineSel = new THREE.LineBasicMaterial({ color: 0xffb020 });

export class Vehicle {
  constructor(v, paintHex) {
    this.v = v;
    this.M = makeMaterials(paintHex);
    this.M.paint.userData.isPaint = true;
    this.group = new THREE.Group();      // scene node
    this.root = new THREE.Group();       // rises on the lift
    this.fx = new THREE.Group();         // stays on the floor
    this.group.add(this.root, this.fx);
    this.parts = new Map();
    this.lamps = {};
    this.fluids = {};
    this.state = { hood: 0, lift: 0, explode: 0, xray: false, blueprint: false };
    this._build();
    this._finalize();
  }

  reg = (id, obj, o = {}) => {
    obj.userData.partId = id;
    this.parts.set(id, { id, obj, cat: o.cat || 'Body', base: o.base || id.replace(/_(fl|fr|rl|rr|l|r|\d+)$/, ''),
      explode: new THREE.Vector3(...(o.explode || [0, 0, 0])), spin: o.spin, pulled: 0, t: 0, order: this.parts.size });
    return obj;
  };

  _build() {
    const { v, M, reg, root } = this;
    const body = buildBody(v, M);
    const I = (this.info = body.info);
    const { xf, xr, xc, xN, xT, gc, hw, Ra, tireR, H, bayX0, bayX1 } = I;
    const sv = v.style;

    // ---------- body shell + fixed details ----------
    const shell = body.shell;
    const bw = hw - 0.36; this.bw = bw;
    for (const x of [xf, xr]) for (const s of [1, -1]) {
      const depth = 0.33;
      const liner = new THREE.Mesh(new THREE.CylinderGeometry(Ra + 0.004, Ra + 0.004, depth, 36, 1, true, (65 * Math.PI) / 180, (230 * Math.PI) / 180), M.under);
      liner.rotation.x = Math.PI / 2; liner.position.set(x, tireR, s * (hw - 0.02 - depth / 2));
      const wall = new THREE.Mesh(new THREE.CircleGeometry(Ra + 0.004, 36, 0, Math.PI), M.under);
      wall.position.set(x, tireR, s * (hw - 0.02 - depth)); if (s < 0) wall.rotation.y = Math.PI;
      shell.add(liner, wall);
    }
    const hyF = I.beltY(bayX1), hyR = I.beltY(bayX0);
    shell.add(at(box(0.02, hyR - gc - 0.06, 2 * (hw - 0.37), M.under), bayX0 - 0.012, (hyR + gc) / 2, 0));
    for (const s of [1, -1]) shell.add(at(box(bayX1 - bayX0 + 0.2, hyF - gc - 0.16, 0.015, M.under), (bayX0 + bayX1) / 2 + 0.1, (hyF + gc) / 2 + 0.02, s * (hw - 0.352)));
    // grille + intake + plate
    const yNose = I.beltY(xN - 0.1), fw = I.faceF.z, F = I.faceF, R = I.faceR;
    const big = sv === 'pickup' || sv === 'suv';
    const fh = F.y1 - F.y0;
    shell.add(at(rbox(0.06, fh * 0.36, fw * 1.5, M.grille, 0.025), xN - 0.022, F.y1 - fh * 0.27, 0));
    shell.add(at(rbox(0.06, fh * 0.3, fw * 1.7, M.grille, 0.025), xN - 0.024, F.y0 + fh * 0.2, 0));
    shell.add(at(rbox(0.03, 0.045, 0.1, M.chrome, 0.015), xN + 0.002, F.y1 - fh * 0.27, 0));
    const yTail = I.beltY(xT + 0.1), rh = R.y1 - R.y0;
    shell.add(at(rbox(0.02, 0.115, 0.34, M.white, 0.006), xT - 0.002, R.y0 + rh * 0.42, 0));
    shell.add(at(rbox(0.04, rh * 0.16, R.z * 1.7, M.plastic, 0.015), xT + 0.012, R.y0 + rh * 0.1, 0));
    // mirrors + handles
    for (const s of [1, -1]) {
      const wz = I.wAt(xc);
      const mir = grp(at(sphere(1, M.paint, 0.07, 0.055, 0.1), 0, 0, s * 0.1), at(box(0.03, 0.02, 0.1, M.blackPlastic), 0, -0.02, s * 0.04));
      mir.position.set(xc - 0.1, I.beltY(xc) + 0.06, s * (wz * 0.93)); shell.add(mir);
      const hy = I.beltY(I.pillars[0]) - 0.1;
      shell.add(at(rbox(0.16, 0.028, 0.03, M.paint, 0.012), I.pillars[0] + 0.14, hy, s * (I.wAt(0) * 0.985)));
      if (sv !== 'coupe') shell.add(at(rbox(0.16, 0.028, 0.03, M.paint, 0.012), I.xDoorR + 0.14 + (sv === 'pickup' ? 0.02 : 0), hy, s * (I.wAt(0) * 0.985)));
    }
    reg('body', shell, { cat: 'Body', explode: [0, 1.5, 0] }); root.add(shell);
    reg('glass', body.glass, { cat: 'Body', explode: [0, 2.0, 0] }); root.add(body.glass);
    reg('windshield', grp(body.windshield), { cat: 'Body', explode: [0.5, 2.0, 0] }); root.add(body.windshield.parent);
    this.hoodPivot = body.hoodPivot;
    reg('hood', body.hoodPivot, { cat: 'Body', explode: [0.5, 1.6, 0] }); root.add(body.hoodPivot);

    // wipers
    const wip = new THREE.Group();
    const J = I.J;
    for (const [s, j0, j1] of [[-1, J.G0, J.G0 + 5], [1, J.G0 + 1, J.G0 + 7]]) {
      const xw = xc - 0.09, a = I.surf(xw, j0, s), b = I.surf(xw, j1, s);
      if (s > 0) { a.z *= 1; } // passenger blade reaches to centre
      const mid = a.clone().add(b).multiplyScalar(0.5); mid.y += 0.022;
      const blade = grp(box(0.014, 0.012, a.distanceTo(b), M.hose), at(box(0.01, 0.008, a.distanceTo(b) * 0.8, M.blackPlastic), 0, 0.012, 0));
      blade.position.copy(mid); blade.lookAt(b.x, b.y + 0.022, b.z);
      wip.add(blade);
    }
    reg('wipers', wip, { cat: 'Visibility', explode: [0.25, 0.55, 0] }); root.add(wip);

    // interior
    const cab0 = Math.max(I.xg + 0.25, xr + Ra + 0.06), by = I.beltY(I.xr1);
    const int = new THREE.Group();
    int.add(at(box(xc - cab0, 0.3, 2 * (hw - 0.12), M.under), (xc + cab0) / 2, gc + 0.2, 0));
    int.add(at(rbox(0.3, 0.2, 2 * (hw - 0.16), M.seat, 0.06), xc - 0.22, by - 0.1, 0));
    const sw = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.016, 10, 32), M.blackPlastic); sw.rotation.y = Math.PI / 2 - 0.35; sw.rotation.order = 'YXZ';
    int.add(at(sw, xc - 0.48, by - 0.02, -hw * 0.42));
    const seatX = [I.xr1 - 0.42]; if (I.xr1 - 1.3 > cab0 + 0.2 && sv !== 'coupe') seatX.push(I.xr1 - 1.32);
    for (const sx of seatX) for (const s of [1, -1]) {
      int.add(at(rbox(0.5, 0.14, 0.5, M.seat, 0.05), sx, gc + 0.4, s * hw * 0.42));
      const back = rbox(0.14, 0.62, 0.48, M.seat, 0.05); back.rotation.z = 0.22; int.add(at(back, sx - 0.3, gc + 0.72, s * hw * 0.42));
      int.add(at(rbox(0.1, 0.16, 0.24, M.seat, 0.04), sx - 0.38, gc + 1.08, s * hw * 0.42));
    }
    reg('interior', int, { cat: 'Body', explode: [0, 0.75, 0] }); root.add(int);

    // ---------- lamps ----------
    const lamp = (id, mesh, color, emissive, power, cat = 'Lighting', ex = [0, 0, 0]) => {
      mesh.material = M.lens(color, emissive); mesh.material.side = THREE.DoubleSide; mesh.material.userData.lamp = true; mesh.castShadow = false;
      this.lamps[id] = { mesh, power, on: false };
      reg(id, grp(mesh), { cat, explode: ex, base: id === 'brake_c' ? 'brake_c' : undefined }); root.add(mesh.parent);
    };
    for (const n of ['l', 'r']) {
      const sg = n === 'l' ? -1 : 1;
      lamp(`head_${n}`, body.lamps[`head_${n}`], 0xe8edf2, 0xfff3d6, 5, 'Lighting', [0.5, 0.1, sg * 0.25]);
      lamp(`ind_f${n}`, body.lamps[`ind_f${n}`], 0xd98a1a, 0xff8a00, 4, 'Lighting', [0.5, -0.05, sg * 0.3]);
      lamp(`tail_${n}`, body.lamps[`tail_${n}`], 0x6a0508, 0xff0000, 1.0, 'Lighting', [-0.5, 0.1, sg * 0.25]);
      lamp(`brake_${n}`, body.lamps[`brake_${n}`], 0x9a070b, 0xff0000, 3.2, 'Lighting', [-0.7, 0.1, sg * 0.15]);
      lamp(`ind_r${n}`, body.lamps[`ind_r${n}`], 0xc9781a, 0xff8a00, 4, 'Lighting', [-0.5, -0.05, sg * 0.3]);
    }
    lamp('brake_c', at(rbox(0.03, 0.022, 0.26, null, 0.008), sv === 'sedan' || sv === 'coupe' ? I.xg + 0.12 : I.xr2 - 0.06, sv === 'sedan' || sv === 'coupe' ? I.roofY(I.xg + 0.12) + 0.035 : I.roofY(I.xr2 - 0.06) + 0.02, 0), 0x7a0508, 0xff0000, 3.2, 'Lighting', [-0.3, 0.4, 0]);
    lamp('plate_lamp', at(rbox(0.03, 0.02, 0.12, null, 0.006), xT - 0.004, R.y0 + rh * 0.42 + 0.075, 0), 0xdddddd, 0xffffff, 4, 'Lighting', [-0.4, 0, 0]);

    // ---------- wheels ----------
    this.wheelPos = {};
    for (const [tag, x, s] of [['fl', xf, -1], ['fr', xf, 1], ['rl', xr, -1], ['rr', xr, 1]]) {
      const hub = buildWheel(M, tireR, reg, tag);
      hub.position.set(x, tireR, s * (hw - 0.135)); if (s < 0) hub.rotation.y = Math.PI;
      root.add(hub); this.wheelPos[tag] = hub.position;
    }

    // ---------- engine ----------
    const eng = buildEngine(M, v, reg);
    const long = v.engine.mount === 'longitudinal';
    const ex = long ? Math.min(bayX1 - 0.52, (bayX0 + bayX1) / 2 + 0.12) : (bayX0 + bayX1) / 2 - 0.03;
    const hoodAt = (x) => I.beltY(x);
    const ey = Math.min(hoodAt(ex), hoodAt(ex + 0.25)) - 0.085 - eng.userData.topY;
    eng.position.set(ex, ey, long ? 0 : 0.07); if (long) eng.rotation.y = Math.PI / 2;
    root.add(eng); this.engine = eng;

    // ---------- bay components ----------
    const C = 'Under the hood';
    const top = (x) => hoodAt(x) - 0.075;
    const sL = long ? 1 : 1; // layout sign hook
    // battery
    const bx = bayX1 - 0.3, bz = -(bw - 0.12) * sL;
    const bat = grp(rbox(0.25, 0.18, 0.17, M.blackPlastic, 0.012), at(rbox(0.252, 0.03, 0.172, M.greyPlastic, 0.01), 0, 0.08, 0), at(box(0.12, 0.06, 0.002, M.white), 0, 0, 0.086));
    bat.position.set(bx, top(bx) - 0.11, bz);
    reg('battery', bat, { cat: 'Electrical', explode: [0, 0.6, 0] }); root.add(bat);
    const term = (id, dx, mat) => {
      const t = grp(cyl(0.011, 0.022, M.steel, 'y', 12), at(rbox(0.04, 0.03, 0.035, mat, 0.008), 0.006, 0.012, 0), tube([[0.02, 0.01, 0], [0.06, 0.0, 0.02], [0.08, -0.06, 0.05]], 0.007, mat, false, 10));
      t.position.set(bx + dx, top(bx) - 0.005, bz + 0.045); reg(id, t, { cat: 'Electrical', explode: [0, 0.3, 0.22] }); root.add(t);
    };
    term('battery_neg', -0.08, M.blackPlastic); term('battery_pos', 0.08, M.red);
    const clamp = grp(box(0.03, 0.012, 0.2, M.steel), at(cyl(0.004, 0.2, M.steel), 0, -0.1, 0.095), at(cyl(0.004, 0.2, M.steel), 0, -0.1, -0.095));
    clamp.position.set(bx, top(bx) - 0.012, bz); reg('battery_clamp', clamp, { cat: 'Electrical', explode: [0.25, 0.42, 0] }); root.add(clamp);
    // air box
    const ax = bayX0 + 0.33, az = -(bw - 0.19), ay = top(ax) - 0.19;
    const abox = grp(rbox(0.3, 0.14, 0.26, M.blackPlastic, 0.02)); abox.position.set(ax, ay, az);
    reg('airbox', abox, { cat: 'Air & fuel', explode: [0, 0, 0] }); root.add(abox);
    const filt = grp(box(0.26, 0.04, 0.22, M.pleats), at(rbox(0.275, 0.012, 0.235, M.orange, 0.004), 0, 0.02, 0)); filt.position.set(ax, ay + 0.085, az);
    reg('air_filter', filt, { cat: 'Air & fuel', explode: [0, 0.32, 0] }); root.add(filt);
    const lid = grp(rbox(0.3, 0.07, 0.26, M.blackPlastic, 0.025), at(box(0.02, 0.05, 0.03, M.steel), 0.15, -0.03, 0.07), at(box(0.02, 0.05, 0.03, M.steel), 0.15, -0.03, -0.07));
    lid.position.set(ax, ay + 0.135, az); reg('airbox_lid', lid, { cat: 'Air & fuel', explode: [-0.05, 0.6, 0] }); root.add(lid);
    const engTop = ey + eng.userData.topY;
    const duct = grp(tube([[ax, ay + 0.15, az + 0.13], [ax + 0.02, ay + 0.16, az + 0.24], [ex + (long ? 0.2 : 0.2), engTop - 0.14, long ? -0.12 : eng.position.z - eng.userData.len / 2 - 0.09]], 0.036, M.hose, false, 20));
    reg('intake_duct', duct, { cat: 'Air & fuel', explode: [-0.1, 0.7, -0.1] }); root.add(duct);
    // reservoirs
    const res = (id, x, z, w, h, d, fl, capM, key) => {
      const r = reservoir(M, w, h, d, fl, capM); r.position.set(x, top(x) - h / 2 - 0.03, z);
      this.fluids[key] = r.userData.setLevel; reg(id, r, { cat: C, explode: [0, 0.55, 0] }); root.add(r); return r;
    };
    res('coolant_res', bayX1 - 0.24, bw - 0.1, 0.16, 0.16, 0.14, M.coolant, M.blackPlastic, 'coolant');
    res('washer_res', bayX0 + 0.2, bw - 0.09, 0.14, 0.16, 0.13, M.washer, M.blue, 'washer');
    const br = grp(at(cyl(0.11, 0.07, M.blackPlastic, 'x', 28), 0.035, -0.03, 0), at(cyl(0.022, 0.13, M.cast, 'x', 16), 0.13, -0.03, 0));
    const brt = reservoir(M, 0.1, 0.06, 0.07, M.brakeFluid, M.yellow); brt.position.set(0.14, 0.03, 0); br.add(brt);
    this.fluids.brake = brt.userData.setLevel;
    br.position.set(bayX0, top(bayX0 + 0.1) - 0.09, -(bw - 0.2)); reg('brake_res', br, { cat: C, explode: [0.15, 0.55, 0] }); root.add(br);
    // radiator
    const rx = bayX1 + 0.06, radH = Math.min(0.46, hoodAt(rx) - gc - 0.2);
    const rad = grp(box(0.035, radH, 2 * bw - 0.1, M.fins), at(box(0.045, 0.035, 2 * bw - 0.08, M.blackPlastic), 0, radH / 2, 0), at(box(0.045, 0.035, 2 * bw - 0.08, M.blackPlastic), 0, -radH / 2, 0),
      at(cyl(0.022, 0.02, M.steel, 'y', 16), 0, radH / 2 + 0.025, bw * 0.5), at(rbox(0.03, radH * 0.9, 0.5, M.blackPlastic, 0.01), -0.035, 0, 0));
    rad.position.set(rx, hoodAt(rx) - 0.11 - radH / 2, 0); reg('radiator', rad, { cat: 'Cooling', explode: [0.7, 0, 0] }); root.add(rad);
    const hose = grp(tube([[rx - 0.03, hoodAt(rx) - 0.16, bw * 0.3], [rx - 0.15, hoodAt(rx) - 0.14, bw * 0.3], [ex + 0.15, engTop - 0.18, long ? 0.1 : eng.position.z + eng.userData.len / 2 - 0.02]], 0.02, M.hose, false, 20));
    reg('radiator_hose', hose, { cat: 'Cooling', explode: [0.3, 0.55, 0.15] }); root.add(hose);
    const fuse = grp(rbox(0.18, 0.08, 0.12, M.blackPlastic, 0.015)); fuse.position.set((bayX0 + bayX1) / 2 + 0.05, top(bayX0 + 0.3) - 0.07, bw - 0.08);
    reg('fuse_box', fuse, { cat: 'Electrical', explode: [0, 0.5, 0.15] }); root.add(fuse);

    // ---------- chassis ----------
    const CH = 'Chassis';
    for (const [tag, x, s, front] of [['fl', xf, -1, 1], ['fr', xf, 1, 1], ['rl', xr, -1, 0], ['rr', xr, 1, 0]]) {
      const z = s * (hw - 0.33), topY = front ? hoodAt(xf) - 0.12 : tireR + 0.5;
      const strut = grp(at(cyl(0.024, topY - tireR, M.darkSteel), 0, (topY - tireR) / 2, 0), at(cyl(0.012, 0.2, M.chrome), 0, topY - tireR - 0.12, 0),
        at(coilSpring(0.055, (topY - tireR) * 0.55, 6, 0.007, M.red), 0, (topY - tireR) * 0.4, 0), at(cyl(0.07, 0.015, M.darkSteel), 0, topY - tireR - 0.01, 0));
      strut.position.set(x - 0.02, tireR + 0.02, z); strut.rotation.x = -s * 0.1;
      reg(`strut_${tag}`, strut, { cat: CH, explode: [0, 0.2, -s * 0.0], base: 'strut' }); root.add(strut);
      const arm = grp(at(rbox(0.3, 0.03, 0.34, M.darkSteel, 0.012), 0, 0, -s * 0.13), at(sphere(0.025, M.steel), 0, 0.01, s * 0.05));
      arm.position.set(x, tireR - 0.13, s * (hw - 0.3)); reg(`arm_${tag}`, arm, { cat: CH, explode: [0, -0.35, 0], base: 'arm' }); root.add(arm);
    }
    const rack = grp(cyl(0.024, 2 * (hw - 0.5), M.steel, 'z', 16), at(cyl(0.012, 2 * (hw - 0.26), M.darkSteel, 'z', 10), 0, 0, 0),
      at(cyl(0.035, 0.14, M.hose, 'z', 14), 0, 0, hw - 0.47), at(cyl(0.035, 0.14, M.hose, 'z', 14), 0, 0, -(hw - 0.47)));
    rack.position.set(xf - 0.17, tireR - 0.03, 0); reg('steering_rack', rack, { cat: CH, explode: [0, -0.55, 0] }); root.add(rack);
    if (!long) {
      const cv = grp(cyl(0.016, 2 * (hw - 0.3), M.steel, 'z', 12), at(cyl(0.04, 0.09, M.hose, 'z', 14, 0.025), 0, 0, hw - 0.42), at(cyl(0.025, 0.09, M.hose, 'z', 14, 0.04), 0, 0, -(hw - 0.42)));
      cv.position.set(xf, tireR, 0); reg('cv_axle', cv, { cat: 'Drivetrain', explode: [0, -0.45, 0] }); root.add(cv);
    } else {
      const ds = grp(at(cyl(0.035, ex - 0.9 - xr, M.steel, 'x', 16), (ex - 0.9 + xr) / 2, 0, 0), at(sphere(0.13, M.cast, 1, 1, 0.9), xr, 0, 0), at(cyl(0.035, 2 * (hw - 0.3), M.darkSteel, 'z', 14), xr, 0, 0));
      ds.position.y = tireR; reg('driveshaft', ds, { cat: 'Drivetrain', explode: [0, -0.45, 0] }); root.add(ds);
    }
    const uy = gc + 0.045, ez0 = long ? 0.26 : 0.0, exs = long ? ex - 0.5 : ex - 0.3;
    const exh = grp(tube([[exs, ey - 0.06, ez0 * 0.6], [exs - 0.25, uy + 0.02, ez0 || 0.1], [xc - 0.6, uy, 0.16], [xr + 0.7, uy, 0.16], [xr + 0.2, uy + 0.12, 0.3], [xr - 0.25, uy + 0.1, 0.34]], 0.028, M.steel, false, 80));
    reg('exhaust', exh, { cat: 'Exhaust', explode: [0, -0.5, 0] }); root.add(exh);
    const cat = grp(cyl(0.065, 0.3, M.steel, 'x', 20)); cat.scale.y = 0.8; cat.position.set(xc - 0.75, uy, 0.16); reg('catalytic', cat, { cat: 'Exhaust', explode: [0, -0.7, 0] }); root.add(cat);
    const muf = grp(rbox(0.5, 0.14, 0.26, M.steel, 0.06), at(cyl(0.03, 0.22, M.chrome, 'x', 16), -0.34, 0, 0.04));
    muf.position.set(Math.max(xT + 0.5, xr - 0.48), uy + 0.11, 0.34); reg('muffler', muf, { cat: 'Exhaust', explode: [-0.2, -0.7, 0] }); root.add(muf);
    const tank = grp(rbox(0.6, 0.16, 0.9, M.blackPlastic, 0.05)); tank.position.set(xr + 0.62, gc + 0.07, -0.12); reg('fuel_tank', tank, { cat: 'Air & fuel', explode: [0, -0.8, 0] }); root.add(tank);

    // ---------- service lift & FX props ----------
    const liftG = new THREE.Group();
    const post = new THREE.MeshStandardMaterial({ color: 0x1b4fa8, metalness: 0.5, roughness: 0.45 });
    for (const s of [1, -1]) {
      liftG.add(at(box(0.22, 2.9, 0.18, post), (xf + xr) / 2, 1.45, s * (hw + 0.42)));
      liftG.add(at(box(0.5, 0.03, 0.5, M.darkSteel), (xf + xr) / 2, 0.015, s * (hw + 0.42)));
    }
    this.fx.add(liftG); liftG.visible = false; this.liftPosts = liftG;
    const arms = new THREE.Group();
    for (const s of [1, -1]) for (const dx of [-1, 1]) {
      const px = (xf + xr) / 2, z0 = s * (hw + 0.34), x1 = px + dx * v.dims.wb * 0.3, z1 = s * (hw - 0.2);
      const len = Math.hypot(x1 - px, z1 - z0);
      const a = box(len, 0.05, 0.08, M.darkSteel); a.position.set((px + x1) / 2, gc - 0.07, (z0 + z1) / 2); a.rotation.y = -Math.atan2(z1 - z0, x1 - px);
      arms.add(a, at(cyl(0.055, 0.035, M.hose), x1, gc - 0.03, z1));
    }
    root.add(arms); arms.userData.noPick = true; arms.visible = false; this.liftArms = arms;

    // drain pan + oil streams
    const dpan = grp(cyl(0.26, 0.1, M.blackPlastic, 'y', 32, 0.28), at(cyl(0.25, 0.005, M.oilOld, 'y', 32), 0, 0.02, 0));
    dpan.visible = false; this.fx.add(dpan); this.drainPan = dpan; this.panOil = dpan.children[1];
    const stream = cyl(0.007, 1, M.oilOld, 'y', 10); stream.visible = false; this.fx.add(stream); this.drainStream = stream;
    const pour = cyl(0.006, 1, M.oil, 'y', 10); pour.visible = false; root.add(pour); this.pourStream = pour;
    const bottle = grp(rbox(0.1, 0.2, 0.06, M.yellow, 0.02), at(cyl(0.016, 0.05, M.yellow), 0.03, 0.12, 0)); bottle.visible = false; root.add(bottle); this.bottle = bottle;
    // work lights
    const bay = new THREE.PointLight(0xfff1dd, 0, 3.2, 1.6); bay.position.set((bayX0 + bayX1) / 2, hoodAt(bayX0) + 0.55, 0); root.add(bay); this.bayLight = bay;
    const ul = new THREE.PointLight(0xfff1dd, 0, 5, 1.5); ul.position.set(xf - 0.4, 0.25, 0); this.fx.add(ul); this.underLight = ul;
  }

  _finalize() {
    // per-part material clones so highlight / fade never bleed between parts
    this.paintMats = [];
    for (const p of this.parts.values()) {
      const map = new Map();
      p.meshes = [];
      p.obj.traverse((m) => {
        if (!m.isMesh) return;
        if (!map.has(m.material)) { const c = m.material.clone(); c.userData = { ...m.material.userData, e0: c.emissive ? c.emissive.getHex() : 0, i0: c.emissiveIntensity, o0: c.opacity, t0: c.transparent, d0: c.depthWrite }; map.set(m.material, c); if (c.userData.isPaint) this.paintMats.push(c); }
        m.material = map.get(m.material); p.meshes.push(m);
      });
      p.mats = [...map.values()];
      p.basePos = p.obj.position.clone();
      p.baseQuat = p.obj.quaternion.clone();
    }
    this.root.updateMatrixWorld(true);
    for (const p of this.parts.values()) {
      const bb = new THREE.Box3().setFromObject(p.obj);
      p.radius = Math.max(0.04, bb.getSize(new THREE.Vector3()).length() / 2);
      p.localCenter = p.obj.worldToLocal(bb.getCenter(new THREE.Vector3()));
    }
    Object.values(this.fluids).forEach((f) => f(0.8));
  }

  // ---------- queries ----------
  partOf(object) { let o = object; while (o) { if (o.userData.partId) return o.userData.partId; if (o.userData.noPick) return null; o = o.parent; } return null; }
  center(id, out = new THREE.Vector3()) { const p = this.parts.get(id); if (!p) return out.set(0, 1, 0); p.obj.updateWorldMatrix(true, false); return p.obj.localToWorld(out.copy(p.localCenter)); }
  radius(id) { return this.parts.get(id)?.radius ?? 1; }
  pickables() { return this.root; }

  // ---------- appearance ----------
  setPaint(hex) { this.paintMats.forEach((m) => m.color.setHex(hex)); }

  highlight(id, on) {
    const p = this.parts.get(id); if (!p) return;
    for (const m of p.mats) {
      if (m.userData.lamp || !m.emissive) continue;
      if (on) { m.emissive.copy(HL); m.emissiveIntensity = 0.55; } else { m.emissive.setHex(m.userData.e0); m.emissiveIntensity = m.userData.i0; }
    }
    p.obj.traverse((o) => { if (o.userData.isEdge) o.material = on ? bpLineSel : bpLine; });
  }

  setXray(on) {
    this.state.xray = on;
    for (const p of this.parts.values()) {
      if (p.cat !== 'Body' && p.id !== 'windshield') continue;
      if (p.id === 'interior') { p.obj.visible = !on && !p.hidden; p.xhide = on; continue; }
      for (const m of p.mats) {
        tween({ from: m.opacity, to: on ? Math.min(0.1, m.userData.o0) : m.userData.o0, dur: 0.5, key: m.uuid, onUpdate: (v) => { m.opacity = v; } });
        m.transparent = on ? true : m.userData.t0; m.depthWrite = on ? false : m.userData.d0; m.needsUpdate = true;
      }
    }
  }

  setBlueprint(on) {
    this.state.blueprint = on;
    this.root.traverse((m) => {
      if (m.userData.isEdge) { m.visible = on; return; }
      if (!m.isMesh) return;
      if (on) {
        m.userData.mat0 = m.material; m.material = bpMat;
        if (!m.userData.edged) {
          m.userData.edged = true;
          const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), bpLine);
          e.userData.isEdge = true; e.raycast = () => {}; m.add(e);
        }
      } else if (m.userData.mat0) { m.material = m.userData.mat0; }
    });
    this.root.traverse((m) => { if (m.userData.isEdge) m.visible = on; });
    this.fx.visible = !on;
  }

  // ---------- mechanisms ----------
  setHood(open, dur = 1.1) {
    const to = open ? 1 : 0; if (this.state.hoodGoal === to) return Promise.resolve();
    this.state.hoodGoal = to;
    return tween({ from: this.state.hood, to, dur, key: 'hood', easing: open ? ease.back : ease.inOut, onUpdate: (t) => { this.state.hood = t; this.hoodPivot.rotation.z = t * 1.02; this.bayLight.intensity = t * 2.2; } });
  }
  setLift(up, dur = 2.2) {
    const to = up ? 1 : 0; if (this.state.liftGoal === to) return Promise.resolve();
    this.state.liftGoal = to;
    return tween({ from: this.state.lift, to, dur, key: 'lift', onUpdate: (t) => { this.state.lift = t; this.liftPosts.visible = this.liftArms.visible = t > 0.001; this.liftPosts.scale.y = Math.min(1, 0.25 + t * 3); this.root.position.y = t * 1.55; this.underLight.intensity = t * 3; this.underLight.position.y = 0.25 + t * 0.4; } });
  }
  get hoodOpen() { return this.state.hoodGoal === 1; }
  get lifted() { return this.state.liftGoal === 1; }

  _apply(p) {
    const t = Math.max(p.pulled, this.state.explode * (0.55 + 0.45 * Math.min(1, p.explode.length())));
    p.t = t;
    p.obj.position.copy(p.basePos).addScaledVector(p.explode, t);
  }
  setExplode(t) { this.state.explode = t; for (const p of this.parts.values()) if (p.id !== 'hood' || true) this._apply(p); }
  animateExplode(to, dur = 1.4) { return tween({ from: this.state.explode, to, dur, key: 'explode', onUpdate: (t) => this.setExplode(t) }); }

  /** Pull a part out along its removal path (or refit it). Threaded parts spin as they go. */
  pull(id, out = true, dur = 1.0) {
    const p = this.parts.get(id); if (!p) return Promise.resolve();
    const to = out ? 1 : 0; if (p.pullGoal === to) return Promise.resolve();
    p.pullGoal = to;
    const axis = p.spin ? new THREE.Vector3(p.spin === 'x' ? 1 : 0, p.spin === 'y' ? 1 : 0, p.spin === 'z' ? 1 : 0) : null;
    const q = new THREE.Quaternion();
    return tween({ from: p.pulled, to, dur, key: 'pull' + id, onUpdate: (t) => {
      p.pulled = t; this._apply(p);
      if (axis) p.obj.quaternion.copy(p.baseQuat).multiply(q.setFromAxisAngle(axis, Math.min(1, t * 2.5) * Math.PI * 6));
    } });
  }
  isPulled(id) { return this.parts.get(id)?.pullGoal === 1; }

  isolate(id) {
    for (const p of this.parts.values()) { p.hidden = id ? p.id !== id : false; p.obj.visible = !p.hidden && !(p.xhide); }
    this.fx.visible = !id && !this.state.blueprint;
  }

  setLamp(id, on) {
    const l = this.lamps[id]; if (!l) return; l.on = on;
    const m = l.mesh.material;
    tween({ from: m.emissiveIntensity, to: on ? l.power : 0, dur: 0.18, key: 'lamp' + id, onUpdate: (v) => { m.emissiveIntensity = v; } });
  }
  lampsOff() { this.blinkers = {}; Object.keys(this.lamps).forEach((k) => this.setLamp(k, false)); }
  blink(id, period = 0.42) { (this.blinkers ||= {})[id] = period; }
  update(time) {
    if (!this.blinkers) return;
    for (const [id, per] of Object.entries(this.blinkers)) { const l = this.lamps[id]; if (l) l.mesh.material.emissiveIntensity = (time % (per * 2)) < per ? l.power : 0; }
  }
  setFluid(key, f) { this.fluids[key]?.(f); }

  // ---------- FX ----------
  async drainOil() {
    const p = this.center('drain_plug'); const pb = this.parts.get('drain_plug');
    const src = this.center('oil_pan'); src.y -= this.radius('oil_pan') * 0.35; src.x = p.x - pb.explode.x * pb.t; src.z = p.z;
    this.drainPan.position.set(src.x, 0.05, src.z); this.drainPan.visible = true; this.panOil.scale.set(0.2, 1, 0.2);
    const s = this.drainStream; s.visible = true;
    const h = src.y - 0.08; s.position.set(src.x, 0.08 + h / 2, src.z);
    await tween({ dur: 0.35, onUpdate: (t) => { s.scale.set(1, h * t, 1); s.position.y = src.y - (h * t) / 2; } });
    await tween({ dur: 3.2, easing: ease.linear, onUpdate: (t) => { const k = 1 - t * 0.85; s.scale.set(k, h, k); this.panOil.scale.set(0.2 + 0.8 * t, 1, 0.2 + 0.8 * t); this.panOil.position.y = 0.02 + t * 0.02; } });
    s.visible = false;
  }
  async pourOil() {
    const c = this.root.worldToLocal(this.center('oil_cap'));
    const cap = this.parts.get('oil_cap');
    c.y -= cap.explode.y * cap.t;
    const b = this.bottle, s = this.pourStream;
    b.visible = true; b.position.set(c.x + 0.1, c.y + 0.32, c.z); b.rotation.z = 0;
    await tween({ dur: 0.5, onUpdate: (t) => { b.rotation.z = t * 2.1; } });
    s.visible = true; s.scale.set(1, 0.24, 1); s.position.set(c.x, c.y + 0.13, c.z);
    await wait(2.6);
    s.visible = false;
    await tween({ dur: 0.4, onUpdate: (t) => { b.rotation.z = (1 - t) * 2.1; } });
    b.visible = false;
  }
  hideFx() { this.drainPan.visible = false; this.drainStream.visible = false; this.pourStream.visible = false; this.bottle.visible = false; }

  /** Return everything to the as-parked state. */
  async reset(fast = false) {
    const d = fast ? 0 : 0.6;
    this.hideFx(); this.lampsOff(); this.isolate(null);
    for (const p of this.parts.values()) if (p.pullGoal === 1 || p.pulled > 0) this.pull(p.id, false, d);
    if (this.state.explode > 0) this.animateExplode(0, d);
    await Promise.all([this.setHood(false, d), this.setLift(false, d)]);
  }

  dispose() {
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    for (const p of this.parts.values()) p.mats.forEach((m) => m.dispose());
  }
}
