import * as THREE from 'three';

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}
function noise(g, w, h, n, a, light = 255) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${light},${light},${light},${Math.random() * a})`;
    const s = Math.random() * 3 + 0.5;
    g.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
}

let cache;
export function textures() {
  if (cache) return cache;
  cache = {
    tread: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#000';
      // v runs across the profile: tread band occupies the middle
      for (const y of [0.36, 0.45, 0.55, 0.64]) g.fillRect(0, y * h - 3, w, 6);
      for (let x = 0; x < w; x += 32) { g.save(); g.translate(x, 0); g.rotate(0.0); g.fillRect(0, 0.28 * h, 5, 0.44 * h); g.fillRect(16, 0.22 * h, 4, 0.1 * h); g.fillRect(16, 0.68 * h, 4, 0.1 * h); g.restore(); }
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, 0.2 * h); g.fillRect(0, 0.8 * h, w, 0.2 * h);
    }, [10, 1]),
    concrete: canvasTex(1024, 1024, (g, w, h) => {
      g.fillStyle = '#6d7076'; g.fillRect(0, 0, w, h);
      noise(g, w, h, 60000, 0.06); noise(g, w, h, 60000, 0.07, 0);
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * w, y = Math.random() * h, r = 40 + Math.random() * 160;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(${Math.random() > 0.5 ? '255,255,255' : '0,0,0'},0.05)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
    }, [10, 10]),
    fins: canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = '#15171a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#5c6066'; for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1.5, h);
      g.fillStyle = '#2b2e33'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 2);
    }, [14, 5]),
    pleats: canvasTex(64, 16, (g, w, h) => {
      for (let x = 0; x < w; x += 8) { const gr = g.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, '#f2ead2'); gr.addColorStop(0.5, '#b9ae8c'); gr.addColorStop(1, '#f2ead2'); g.fillStyle = gr; g.fillRect(x, 0, 8, h); }
    }, [5, 1]),
    cast: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); noise(g, w, h, 30000, 0.35); noise(g, w, h, 30000, 0.35, 0); }, [3, 3]),
    grille: canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = '#050505'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2c30';
      for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 5);
    }, [1, 3]),
    disc: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#9a9da1'; g.fillRect(0, 0, w, h);
      for (let r = 10; r < 128; r += 1.5) { g.strokeStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},0.07)`; g.beginPath(); g.arc(128, 128, r, 0, 7); g.stroke(); }
    }),
  };
  cache.concrete.colorSpace = THREE.SRGBColorSpace; cache.fins.colorSpace = THREE.SRGBColorSpace;
  cache.pleats.colorSpace = THREE.SRGBColorSpace; cache.grille.colorSpace = THREE.SRGBColorSpace; cache.disc.colorSpace = THREE.SRGBColorSpace;
  return cache;
}

const P = (o) => new THREE.MeshPhysicalMaterial(o);
const S = (o) => new THREE.MeshStandardMaterial(o);

/** Fresh material set per vehicle (so highlight / x-ray never leak between cars). */
export function makeMaterials(paintHex) {
  const t = textures();
  return {
    paint: P({ color: paintHex, metalness: 0.6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide, envMapIntensity: 1.0 }),
    glass: P({ color: 0x0c1116, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.9, envMapIntensity: 1.5, side: THREE.DoubleSide, clearcoat: 1 }),
    plastic: S({ color: 0x121315, roughness: 0.62, metalness: 0.05, side: THREE.DoubleSide }),
    under: S({ color: 0x0c0d0e, roughness: 0.9, side: THREE.DoubleSide }),
    rubber: S({ color: 0x0d0d0d, roughness: 0.88, bumpMap: t.tread, bumpScale: 2.2 }),
    hose: S({ color: 0x0b0b0c, roughness: 0.75 }),
    alloy: S({ color: 0xc9ccd1, metalness: 1, roughness: 0.22 }),
    chrome: S({ color: 0xffffff, metalness: 1, roughness: 0.06 }),
    steel: S({ color: 0x8b8f94, metalness: 0.95, roughness: 0.38 }),
    darkSteel: S({ color: 0x2a2c30, metalness: 0.85, roughness: 0.5 }),
    cast: S({ color: 0xa9adb2, metalness: 0.85, roughness: 0.55, bumpMap: t.cast, bumpScale: 0.6 }),
    castDark: S({ color: 0x55585d, metalness: 0.8, roughness: 0.6, bumpMap: t.cast, bumpScale: 0.6 }),
    disc: S({ color: 0xffffff, metalness: 0.95, roughness: 0.3, map: t.disc }),
    caliper: P({ color: 0xb01218, metalness: 0.3, roughness: 0.4, clearcoat: 0.6 }),
    pad: S({ color: 0x2b2622, roughness: 0.95 }),
    blackPlastic: S({ color: 0x0f1012, roughness: 0.5, metalness: 0.05 }),
    greyPlastic: S({ color: 0x2c2f33, roughness: 0.6 }),
    ceramic: S({ color: 0xf1efe8, roughness: 0.25 }),
    copper: S({ color: 0xb87333, metalness: 1, roughness: 0.3 }),
    yellow: S({ color: 0xf2b705, roughness: 0.45 }),
    blue: S({ color: 0x1557c0, roughness: 0.45 }),
    red: S({ color: 0xc0181c, roughness: 0.45 }),
    orange: P({ color: 0xe86a10, roughness: 0.35, clearcoat: 0.5 }),
    white: S({ color: 0xe9e9e6, roughness: 0.5 }),
    fins: S({ color: 0xffffff, map: t.fins, metalness: 0.6, roughness: 0.5 }),
    pleats: S({ color: 0xffffff, map: t.pleats, roughness: 0.95 }),
    grille: S({ color: 0xffffff, map: t.grille, roughness: 0.45, metalness: 0.3 }),
    tank: P({ color: 0xf4f1e6, roughness: 0.35, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    oil: P({ color: 0x8a5a0a, roughness: 0.08, transparent: true, opacity: 0.9, clearcoat: 1 }),
    oilOld: P({ color: 0x120b04, roughness: 0.1, clearcoat: 1 }),
    coolant: P({ color: 0xff4f8b, roughness: 0.1, transparent: true, opacity: 0.85 }),
    washer: P({ color: 0x2f8cff, roughness: 0.1, transparent: true, opacity: 0.85 }),
    brakeFluid: P({ color: 0xd9a514, roughness: 0.1, transparent: true, opacity: 0.85 }),
    seat: S({ color: 0x1a1b1e, roughness: 0.85 }),
    lens: (color, emissive) => P({ color, emissive, emissiveIntensity: 0, roughness: 0.1, metalness: color > 0xd00000 && (color & 0xff) > 0xd0 ? 0.9 : 0.15, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 }),
  };
}
