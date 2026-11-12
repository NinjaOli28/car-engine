import * as THREE from 'three';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sstep = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

function kf(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0]);
  return (x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0] || 1));
    }
    return pts[pts.length - 1][1];
  };
}
function smoothArr(a, passes) {
  for (let p = 0; p < passes; p++) {
    const b = a.slice();
    for (let i = 1; i < a.length - 1; i++) a[i] = (b[i - 1] + 2 * b[i] + b[i + 1]) / 4;
  }
}

// Half-section layout (z >= 0), from bottom centre round to top centre.
const nA = 7, nB = 4, nC = 10, nD = 5, nE = 8, nF = 4, nG = 8;
const A0 = 0, B0 = A0 + nA, C0 = B0 + nB, D0 = C0 + nC, E0 = D0 + nD, F0 = E0 + nE, G0 = F0 + nF;
const NH = G0 + nG; // 46
const NR = 2 * NH - 2; // full ring

const STYLE = {
  sedan: { gc: 0.16, hood: 0.555, cowl: 0.655, deck: 0.69, tail: 0.63, roofW: 0.74, trim: 1, cowlBack: 0.42, ws: 0.78 },
  coupe: { gc: 0.14, hood: 0.6, cowl: 0.68, deck: 0.7, tail: 0.64, roofW: 0.7, trim: 1, cowlBack: 0.62, ws: 0.72 },
  hatch: { gc: 0.15, hood: 0.585, cowl: 0.675, deck: 0.68, tail: 0.66, roofW: 0.76, trim: 1, cowlBack: 0.36, ws: 0.7 },
  suv: { gc: 0.2, hood: 0.6, cowl: 0.665, deck: 0.66, tail: 0.65, roofW: 0.8, trim: 3, cowlBack: 0.38, ws: 0.62 },
  pickup: { gc: 0.24, hood: 0.61, cowl: 0.66, deck: 0.64, tail: 0.64, roofW: 0.82, trim: 2, cowlBack: 0.42, ws: 0.5 },
};

/**
 * Builds a lofted car body shell. Every panel (hood, glass, cladding…) is a patch
 * of one shared vertex grid so the surface shades continuously across panel gaps.
 */
export function buildBody(v, mats) {
  const { L, W, H, wb, tireR } = v.dims;
  const st = STYLE[v.style];
  const gc = st.gc, hw = W / 2;
  const xN = L / 2, xT = -L / 2;
  const fo = (L - wb) * (v.style === 'pickup' ? 0.4 : 0.44);
  const xf = xN - fo, xr = xf - wb;
  const Ra = tireR + 0.065;

  // greenhouse key stations
  const xc = xf - st.cowlBack;          // cowl / windshield base
  const xr1 = xc - st.ws;               // roof start
  let xr2, xg;                          // roof end, rear glass base
  if (v.style === 'sedan') { xr2 = xr + 0.3; xg = xr - 0.42; }
  else if (v.style === 'coupe') { xr2 = xr + 0.75; xg = xr - 0.45; }
  else if (v.style === 'hatch') { xr2 = xr - 0.15; xg = xT + 0.16; }
  else if (v.style === 'suv') { xr2 = xT + 0.5; xg = xT + 0.13; }
  else { xr2 = xr1 - 1.35; xg = xr2 - 0.14; }

  const beltKF = kf([[xT, st.tail * H], [xg, st.deck * H], [xc, st.cowl * H], [xN - 0.2, st.hood * H], [xN, (st.hood - 0.045) * H]]);
  const roofKF = kf([[xg, beltKF(xg)], [xr2, 0.985 * H], [(xr1 + xr2) / 2, H], [xr1, 0.985 * H], [xc, beltKF(xc)]]);

  // stations
  const ez = 0.3, nEnd = 12;
  const xs = [];
  for (let i = nEnd; i >= 1; i--) xs.push(xT + ez - ez * Math.sin((i / nEnd) * Math.PI / 2));
  const nMain = Math.round((L - 2 * ez) / 0.034);
  for (let i = 0; i <= nMain; i++) xs.push(lerp(xT + ez, xN - ez, i / nMain));
  for (let i = 1; i <= nEnd; i++) xs.push(xN - ez + ez * Math.sin((i / nEnd) * Math.PI / 2));
  const NS = xs.length;

  const yBelt = xs.map(beltKF);
  const yRoof = xs.map((x, i) => (x > xg && x < xc ? Math.max(yBelt[i], roofKF(x)) : yBelt[i]));
  smoothArr(yBelt, 3); smoothArr(yRoof, 3);
  const hMax = H - st.cowl * H;
  const wAt = (x) => hw * (1 - 0.2 * Math.pow(clamp((x - (xN - 1.0)) / 1.0, 0, 1), 2.4) - 0.12 * Math.pow(clamp((xT + 0.8 - x) / 0.8, 0, 1), 2.4));
  const ybAt = (x) => gc + 0.13 * Math.pow(clamp((x - (xN - 0.5)) / 0.5, 0, 1), 2) + 0.16 * Math.pow(clamp((xT + 0.55 - x) / 0.55, 0, 1), 2);

  const pos = new Float32Array((NS * NR + 2) * 3);
  const half = new Float32Array(NH * 2);
  const rb = 0.07, rs = 0.06;
  const aFrac = [0, 0.22, 0.42, 0.6, 0.74, 0.88, 1];

  for (let i = 0; i < NS; i++) {
    const x = xs[i], w = wAt(x), yb = ybAt(x), yB = yBelt[i];
    let h = yRoof[i] - yB; if (h < 0.006) h = 0;
    const set = (j, z, y) => { half[j * 2] = z; half[j * 2 + 1] = y; };
    for (let k = 0; k < nA; k++) set(A0 + k, (w - rb) * aFrac[k], yb);
    for (let k = 0; k < nB; k++) { const a = (-90 + 90 * (k + 1) / nB) * Math.PI / 180; set(B0 + k, w - rb + rb * Math.cos(a), yb + rb + rb * Math.sin(a)); }
    for (let k = 0; k < nC; k++) { const s = (k + 1) / nC; set(C0 + k, w * (1 - 0.03 * s * s) + 0.012 * Math.sin(Math.PI * Math.min(1, s * 1.4)), lerp(yb + rb, yB - rs, s)); }
    const zs = w * 0.97;
    for (let k = 0; k < nD; k++) { const a = ((k + 1) / nD) * Math.PI / 2; set(D0 + k, zs - rs + rs * Math.cos(a), yB - rs + rs * Math.sin(a)); }
    const z0 = zs - rs;
    let zt = z0, yt = yB;
    if (h > 0) {
      const hf = sstep(h / hMax);
      const wr = lerp(z0 - 0.015, hw * st.roofW, hf);
      const rr = Math.min(0.085, h * 0.45);
      for (let k = 0; k < nE; k++) { const s = (k + 1) / nE; set(E0 + k, lerp(z0, wr, s) + 0.02 * Math.sin(Math.PI * s) * hf, lerp(yB, yB + h - rr, s)); }
      for (let k = 0; k < nF; k++) { const a = ((k + 1) / nF) * Math.PI / 2; set(F0 + k, wr - rr + rr * Math.cos(a), yB + h - rr + rr * Math.sin(a)); }
      zt = wr - rr; yt = yB + h;
    } else {
      for (let k = E0; k < G0; k++) set(k, z0, yB);
    }
    const crown = 0.03;
    for (let k = 0; k < nG; k++) { const s = (k + 1) / nG; set(G0 + k, zt * (1 - s), yt + crown * (1 - (1 - s) * (1 - s))); }

    // rounded nose / tail
    const d = Math.max(0, x - (xN - ez), (xT + ez) - x) / ez;
    const ks = 0.7 + 0.3 * Math.pow(Math.max(0, 1 - d * d), 0.45);
    const ym = (yb + yt) / 2;
    for (let j = 0; j < NH; j++) {
      const z = half[j * 2] * (0.25 + 0.75 * ks), y = ym + (half[j * 2 + 1] - ym) * ks;
      const kR = j, kL = (NR - j) % NR;
      pos.set([x, y, z], (i * NR + kR) * 3);
      if (j > 0 && j < NH - 1) pos.set([x, y, -z], (i * NR + kL) * 3);
    }
  }
  const halfOf = (k) => (k < NH ? k : NR - k);
  const vid = (i, k) => i * NR + ((k + NR) % NR);

  // ---- wheel-arch cut ----
  const inside = new Uint8Array(NS * NR);
  for (let i = 0; i < NS; i++) for (let k = 0; k < NR; k++) {
    const j = halfOf(k); if (j >= D0) continue;
    const p = vid(i, k) * 3;
    if (Math.abs(pos[p + 2]) < wAt(xs[i]) - 0.33) continue;
    for (const [wi, xw] of [[1, xf], [2, xr]]) if (Math.hypot(pos[p] - xw, pos[p + 1] - tireR) < Ra) inside[vid(i, k)] = wi;
  }
  const dropped = (i, k) => { const a = inside[vid(i, k)]; return a && inside[vid(i + 1, k)] === a && inside[vid(i, k + 1)] === a && inside[vid(i + 1, k + 1)] === a; };
  const snapped = new Uint8Array(NS * NR);
  for (let i = 0; i < NS - 1; i++) for (let k = 0; k < NR; k++) {
    if (dropped(i, k)) continue;
    for (const id of [vid(i, k), vid(i + 1, k), vid(i, k + 1), vid(i + 1, k + 1)]) {
      if (!inside[id] || snapped[id] || halfOf(id % NR) < B0) continue;
      snapped[id] = 1;
      const xw = inside[id] === 1 ? xf : xr, p = id * 3;
      const dx = pos[p] - xw, dy = pos[p + 1] - tireR, r = Math.hypot(dx, dy) || 1;
      pos[p] = xw + (dx / r) * Ra; pos[p + 1] = tireR + (dy / r) * Ra;
    }
  }

  // ---- classify quads into panels ----
  const groups = { paint: [], trim: [], under: [], hood: [], windshield: [], rearGlass: [], sideGlass: [], head_l: [], head_r: [], ind_fl: [], ind_fr: [], tail_l: [], tail_r: [], brake_l: [], brake_r: [], ind_rl: [], ind_rr: [] };
  const tall = v.style === 'suv' || v.style === 'pickup';
  const hoodX0 = xc + 0.015, hoodX1 = xN - 0.2;
  const sgMin = v.style === 'suv' ? xg + 0.32 : v.style === 'pickup' ? xr2 + 0.1 : lerp(xg, xr2, v.style === 'hatch' ? 0.5 : 0.42);
  const sgMax = lerp(xc, xr1, 0.22);
  const pillars = [xr1 - (v.style === 'coupe' ? 0.95 : 0.55)];
  if (v.style === 'suv' || v.style === 'hatch') pillars.push(xr + 0.12);
  if (v.style === 'pickup') pillars.push(xr2 + 0.55);
  const bayX0 = xc + 0.06, bayX1 = xN - 0.3;
  const info = { xf, xr, xc, xr1, xr2, xg, xN, xT, gc, hw, Ra, tireR, H, L, W, bayX0, bayX1, pillars, sgMin, sgMax };

  for (let i = 0; i < NS - 1; i++) {
    const xm = (xs[i] + xs[i + 1]) / 2;
    const hm = Math.min(yRoof[i] - yBelt[i], yRoof[i + 1] - yBelt[i + 1]);
    for (let k = 0; k < NR; k++) {
      if (dropped(i, k)) continue;
      const jq = Math.min(halfOf(k), halfOf((k + 1) % NR));
      let g = 'paint';
      if (jq < B0) {
        if (xm > bayX0 && xm < bayX1 && jq < 3) continue; // open underside below the engine
        g = 'under';
      } else if (jq < C0 + st.trim) g = 'trim';
      else if (xm > xN - 0.3 && jq >= C0 + (tall ? 5 : 7) && jq <= D0 + 2) g = 'head_' + (k < NH ? 'r' : 'l');
      else if (xm > xN - 0.2 && jq >= C0 + (tall ? 3 : 5) && jq < C0 + (tall ? 5 : 7)) g = 'ind_f' + (k < NH ? 'r' : 'l');
      else if (xm < xT + 0.07 && jq >= C0 + (tall ? 3 : 6) && jq <= D0 + 2) g = 'brake_' + (k < NH ? 'r' : 'l');
      else if (xm < xT + 0.27 && jq >= C0 + (tall ? 3 : 6) && jq <= D0 + 2) g = 'tail_' + (k < NH ? 'r' : 'l');
      else if (xm < xT + 0.2 && jq >= C0 + (tall ? 1 : 4) && jq < C0 + (tall ? 3 : 6)) g = 'ind_r' + (k < NH ? 'r' : 'l');
      else if (jq >= G0) {
        if (xm > hoodX0 && xm < hoodX1) g = 'hood';
        else if (xm > xr1 + 0.04 && xm < xc - 0.03) g = 'windshield';
        else if (xm > xg + 0.05 && xm < xr2 - 0.04 && hm > 0.02) g = 'rearGlass';
      } else if (jq > E0 && jq < F0 - 1) {
        if (xm > sgMin && xm < sgMax && hm > 0.16 && !pillars.some((p) => Math.abs(xm - p) < 0.05)) g = 'sideGlass';
      }
      const a = vid(i, k), b = vid(i + 1, k), c = vid(i + 1, k + 1), d = vid(i, k + 1);
      groups[g].push(a, b, c, a, c, d);
    }
  }
  // end caps
  for (const [i, ci, flip] of [[0, NS * NR, false], [NS - 1, NS * NR + 1, true]]) {
    let sy = 0; for (let k = 0; k < NR; k++) sy += pos[vid(i, k) * 3 + 1];
    pos.set([xs[i], sy / NR, 0], ci * 3);
    for (let k = 0; k < NR; k++) flip ? groups.paint.push(ci, vid(i, k), vid(i, k + 1)) : groups.paint.push(ci, vid(i, k + 1), vid(i, k));
  }

  // ---- normals from the uncut grid ----
  const full = [];
  for (let i = 0; i < NS - 1; i++) for (let k = 0; k < NR; k++) { const a = vid(i, k), b = vid(i + 1, k), c = vid(i + 1, k + 1), d = vid(i, k + 1); full.push(a, b, c, a, c, d); }
  for (let k = 0; k < NR; k++) { full.push(NS * NR, vid(0, k + 1), vid(0, k)); full.push(NS * NR + 1, vid(NS - 1, k), vid(NS - 1, k + 1)); }
  const posAttr = new THREE.BufferAttribute(pos, 3);
  const tmp = new THREE.BufferGeometry(); tmp.setAttribute('position', posAttr); tmp.setIndex(full); tmp.computeVertexNormals();
  const nrm = tmp.getAttribute('normal');
  // orientation check: top-centre normal must point up
  const probe = vid(Math.floor(NS / 2), NH - 1);
  const flipAll = nrm.getY(probe) < 0;
  if (flipAll) for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, -nrm.getX(i), -nrm.getY(i), -nrm.getZ(i));
  // collapsed greenhouse vertices have no area: borrow neighbours' normals
  const n3 = new THREE.Vector3(), m3 = new THREE.Vector3();
  for (let i = 0; i < NS; i++) for (let k = 0; k < NR; k++) {
    const id = vid(i, k); n3.fromBufferAttribute(nrm, id);
    if (n3.lengthSq() > 0.25) continue;
    const j = halfOf(k), right = k < NH;
    const ka = right ? D0 + nD - 1 : NR - (D0 + nD - 1), kb = right ? G0 : NR - G0;
    n3.fromBufferAttribute(nrm, vid(i, ka)); m3.fromBufferAttribute(nrm, vid(i, kb));
    n3.add(m3).normalize(); if (j) nrm.setXYZ(id, n3.x, n3.y, n3.z);
  }

  const mk = (idx, mat, name) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', posAttr); g.setAttribute('normal', nrm);
    if (flipAll) { for (let t = 0; t < idx.length; t += 3) { const q = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = q; } }
    g.setIndex(idx);
    // bounds from the indexed subset only
    const bb = new THREE.Box3(); const p = new THREE.Vector3();
    for (const id of idx) bb.expandByPoint(p.fromBufferAttribute(posAttr, id));
    g.boundingBox = bb; g.boundingSphere = bb.getBoundingSphere(new THREE.Sphere());
    const m = new THREE.Mesh(g, mat); m.name = name; m.castShadow = true; m.receiveShadow = true;
    return m;
  };

  const shell = new THREE.Group(); shell.name = 'shell';
  shell.add(mk(groups.paint, mats.paint, 'paint'), mk(groups.trim, mats.plastic, 'trim'), mk(groups.under, mats.under, 'under'));
  const glass = new THREE.Group(); glass.name = 'glass';
  const windshield = mk(groups.windshield, mats.glass, 'windshield');
  glass.add(mk(groups.sideGlass, mats.glass, 'sideGlass'), mk(groups.rearGlass, mats.glass, 'rearGlass'));

  // hood on a hinge pivot at the cowl
  const iC = xs.findIndex((x) => x >= hoodX0);
  const hinge = new THREE.Vector3(xs[iC], yBelt[iC], 0);
  const hoodPivot = new THREE.Group(); hoodPivot.name = 'hood'; hoodPivot.position.copy(hinge);
  const hoodMesh = mk(groups.hood, mats.paint, 'hoodPanel'); hoodMesh.position.copy(hinge).negate();
  hoodPivot.add(hoodMesh);

  // ---- shut lines ----
  const linePts = [];
  const nearest = (x) => { let b = 0; for (let i = 1; i < NS; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[b] - x)) b = i; return b; };
  const doorLine = (x, j0, j1) => {
    const i = nearest(x);
    for (const sgn of [1, -1]) for (let j = j0; j < j1; j++) {
      for (const jj of [j, j + 1]) {
        const id = vid(i, sgn > 0 ? jj : NR - jj);
        if (inside[id]) { linePts.length -= linePts.length % 6; break; }
        linePts.push(pos[id * 3] + nrm.getX(id) * 0.002, pos[id * 3 + 1] + nrm.getY(id) * 0.002, pos[id * 3 + 2] + nrm.getZ(id) * 0.002);
      }
    }
  };
  const xDoorF = Math.min(xc + 0.08, xf - Ra - 0.07);
  const xDoorR = v.style === 'pickup' ? xr2 + 0.02 : v.style === 'coupe' ? pillars[0] - 0.02 : xr + Ra + 0.05;
  doorLine(xDoorF, C0, D0 + 2); doorLine(pillars[0], C0, F0); doorLine(xDoorR, C0, v.style === 'coupe' ? D0 + 2 : F0 - 2);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(linePts, 3));
  const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.85 }));
  lines.name = 'shutlines'; lines.userData.noBlueprint = true;
  shell.add(lines);

  const lamps = {};
  for (const id of ['head_l', 'head_r', 'ind_fl', 'ind_fr', 'tail_l', 'tail_r', 'brake_l', 'brake_r', 'ind_rl', 'ind_rr']) lamps[id] = mk(groups[id], null, id);
  const faceAt = (i) => { const x = xs[i], yb = ybAt(x), yt = yBelt[i] + 0.03, ym = (yb + yt) / 2, hh = (yt - yb) / 2 * 0.7; return { z: wAt(x) * 0.775, y0: ym - hh, y1: ym + hh }; };
  info.faceF = faceAt(NS - 1); info.faceR = faceAt(0);
  const surf = (x, j, side = 1) => { const id = vid(nearest(x), side > 0 ? j : NR - j); return new THREE.Vector3(pos[id * 3], pos[id * 3 + 1], pos[id * 3 + 2]); };
  Object.assign(info, {
    hinge, xDoorF, xDoorR,
    beltY: (x) => yBelt[nearest(x)], roofY: (x) => yRoof[nearest(x)], wAt, ybAt, surf,
    J: { A0, B0, C0, D0, E0, F0, G0, NH },
  });
  return { shell, glass, windshield, hoodPivot, lamps, info };
}
