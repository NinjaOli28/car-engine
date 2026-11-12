import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { textures } from './materials.js';

/** Renderer, studio-garage environment, lights and the blueprint backdrop. */
export class Stage {
  constructor(canvas) {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.95;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = (this.scene = new THREE.Scene());
    this.bgStudio = new THREE.Color(0x0e1014);
    this.bgBlue = new THREE.Color(0x0a2c5e);
    scene.background = this.bgStudio.clone();
    scene.fog = new THREE.Fog(0x0e1014, 16, 42);
    const pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture;
    scene.environmentIntensity = 0.85;

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.04, 120);

    // studio set
    const set = (this.set = new THREE.Group());
    const t = textures();
    const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x5b5e63, map: t.concrete, roughness: 0.42, metalness: 0.0, envMapIntensity: 0.6 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; set.add(floor);
    const lineM = new THREE.MeshStandardMaterial({ color: 0xe0b020, roughness: 0.7 });
    for (const [w, d, x, z] of [[7.4, 0.08, 0, 2.3], [7.4, 0.08, 0, -2.3], [0.08, 4.68, 3.7, 0], [0.08, 4.68, -3.7, 0]]) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineM); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.003, z); l.receiveShadow = true; set.add(l);
    }
    // back wall with light bars
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 9, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.9, side: THREE.BackSide }));
    wall.position.y = 4.5; set.add(wall);
    const barM = new THREE.MeshBasicMaterial({ color: 0xfff6e8 });
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(5, 0.05, 0.35), barM);
      b.position.set((i % 2 ? 1 : -1) * 3.2, 6.2, (Math.floor(i / 2) - 1) * 4.5); set.add(b);
    }
    scene.add(set);

    const key = (this.key = new THREE.DirectionalLight(0xfff4e6, 1.9));
    key.position.set(5, 9, 4); key.castShadow = true;
    key.shadow.mapSize.set(4096, 4096);
    const sc = key.shadow.camera; sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5; sc.near = 1; sc.far = 25;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
    const fill = new THREE.DirectionalLight(0xbfd4ff, 0.7); fill.position.set(-6, 4, -5);
    const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x30302c, 0.5);
    this.lights = new THREE.Group(); this.lights.add(key, fill, hemi); scene.add(this.lights);

    // blueprint backdrop
    const bp = (this.bp = new THREE.Group());
    const g1 = new THREE.GridHelper(40, 400, 0x2f6fc4, 0x154a94); g1.material.transparent = true; g1.material.opacity = 0.35;
    const g2 = new THREE.GridHelper(40, 40, 0x6fb0ff, 0x3f86e0); g2.material.transparent = true; g2.material.opacity = 0.55; g2.position.y = 0.001;
    bp.add(g1, g2); bp.visible = false; scene.add(bp);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setBlueprint(on) {
    this.set.visible = !on; this.bp.visible = on;
    this.scene.background.copy(on ? this.bgBlue : this.bgStudio);
    this.scene.fog.color.copy(this.scene.background);
    this.scene.fog.near = on ? 30 : 16; this.scene.fog.far = on ? 80 : 42;
  }

  resize() {
    const c = this.renderer.domElement, w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  render() { this.renderer.render(this.scene, this.camera); }
}
