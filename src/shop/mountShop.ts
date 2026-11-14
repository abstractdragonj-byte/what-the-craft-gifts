import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { productById, spots } from "./catalog";
import type { ControlsProbe } from "./probe";

export type ShopApi = {
  onFocused: (key: string | null) => void;
  onBuy: (key: string) => void;
  onEngage?: () => void;
};

export type ShopHandle = {
  start: () => void;
  setPaused: (paused: boolean) => void;
  setAnalog: (x: number, y: number) => void;
  setLook: (dx: number, dy: number) => void;
  clearFocus: () => void;
  requestMouseLook: () => void;
  setSold: (keys: string[]) => void;
  dispose: () => void;
};

type Solid = { minX: number; maxX: number; minZ: number; maxZ: number };

const RADIUS = 0.28;

export function mountShop(host: HTMLElement, api: ShopApi): ShopHandle {
  host.replaceChildren();
  host.style.position = "absolute";
  host.style.inset = "0";
  host.style.width = "100%";
  host.style.height = "100%";
  host.style.overflow = "hidden";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd5e6f2);
  scene.fog = new THREE.Fog(0xc5d8ea, 13, 26);

  const camera = new THREE.PerspectiveCamera(64, 1, 0.08, 40);
  camera.rotation.order = "YXZ";

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  host.appendChild(renderer.domElement);
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.inset = "0";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  renderer.domElement.style.touchAction = "none";

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;

  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const solids: Solid[] = [];
  const productMeshes: THREE.Object3D[] = [];
  const placed = new Map<string, THREE.Group>();
  let sharedCorbel: THREE.BufferGeometry | null = null;
  let sharedLeg: THREE.BufferGeometry | null = null;

  const wallMat = material(new THREE.MeshStandardMaterial({ color: 0xc5d8ea, roughness: 0.9, metalness: 0 }));
  const nicheMat = material(new THREE.MeshStandardMaterial({ color: 0xb7cde2, roughness: 0.92, metalness: 0 }));
  const distressTex = distressedTexture();
  textures.push(distressTex);
  const shelfMat = material(
    new THREE.MeshStandardMaterial({ map: distressTex, color: 0xffffff, roughness: 0.72, metalness: 0.02 }),
  );
  const trimMat = shelfMat;
  const whiteTrim = material(new THREE.MeshStandardMaterial({ color: 0xf7f4ef, roughness: 0.46, metalness: 0.02 }));
  const brassMat = material(new THREE.MeshStandardMaterial({ color: 0x8c6a3d, roughness: 0.34, metalness: 0.78 }));
  const yardMat = material(new THREE.MeshStandardMaterial({ color: 0xc9d3c4, roughness: 1 }));
  const leafMat = material(new THREE.MeshStandardMaterial({ color: 0x7f9778, roughness: 0.9 }));
  const trunkMat = material(new THREE.MeshStandardMaterial({ color: 0x8d7360, roughness: 0.95 }));

  const floorTex = woodTexture();
  textures.push(floorTex);
  const floorMat = material(
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.58, metalness: 0.04, color: 0xffffff }),
  );

  const shadowTex = contactShadow();
  textures.push(shadowTex);
  const shadowMat = material(
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  );

  const yard = new THREE.Mesh(geometry(new THREE.CircleGeometry(22, 48)), yardMat);
  yard.rotation.x = -Math.PI / 2;
  yard.position.y = -0.05;
  yard.receiveShadow = true;
  scene.add(yard);

  // Shell. Inner floor is y=0. Walkable inner faces: x ±4.35, z -5.45 .. 5.2
  add(box(9.05, 0.1, 10.9, floorMat), 0, -0.05, -0.12);
  add(box(9.05, 0.1, 10.9, whiteTrim), 0, 3.1, -0.12);
  add(box(0.28, 3.05, 11.05, wallMat), -4.49, 1.525, -0.12);
  add(box(0.28, 3.05, 11.05, wallMat), 4.49, 1.525, -0.12);
  add(box(9.35, 3.05, 0.28, wallMat), 0, 1.525, -5.59);
  add(box(3.7, 3.05, 0.22, wallMat), -2.78, 1.525, 5.31);
  add(box(3.7, 3.05, 0.22, wallMat), 2.78, 1.525, 5.31);
  add(box(1.75, 0.85, 0.22, wallMat), 0, 2.625, 5.31);

  solids.push(
    { minX: -6, maxX: -4.35, minZ: -6.2, maxZ: 5.8 },
    { minX: 4.35, maxX: 6, minZ: -6.2, maxZ: 5.8 },
    { minX: -6, maxX: 6, minZ: -6.2, maxZ: -5.45 },
    { minX: -6, maxX: 6, minZ: 5.2, maxZ: 5.9 },
  );
  crownAndBase();

  const glassMat = material(
    new THREE.MeshStandardMaterial({
      color: 0xe9f2f5,
      transparent: true,
      opacity: 0.22,
      roughness: 0.05,
      metalness: 0,
      depthWrite: false,
    }),
  );
  const door = new THREE.Mesh(geometry(new THREE.PlaneGeometry(1.55, 2.15)), glassMat);
  door.position.set(0, 1.08, 5.2);
  scene.add(door);
  const sideWin = new THREE.Mesh(geometry(new THREE.PlaneGeometry(1.45, 1.35)), glassMat);
  sideWin.position.set(-4.34, 1.72, 2.25);
  sideWin.rotation.y = Math.PI / 2;
  scene.add(sideWin);

  const sky = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(8, 4.2)),
    material(new THREE.MeshBasicMaterial({ color: 0xd5e4ee })),
  );
  sky.position.set(-6.4, 1.8, 2.25);
  sky.rotation.y = Math.PI / 2;
  scene.add(sky);

  const trunk = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.08, 0.1, 1.4, 8)), trunkMat);
  trunk.position.set(-5.7, 0.7, 2.5);
  scene.add(trunk);
  for (const [x, y, z, s] of [
    [-5.85, 1.55, 2.35, 0.42],
    [-5.5, 1.7, 2.65, 0.5],
    [-5.75, 1.95, 2.5, 0.38],
  ] as const) {
    const leaf = new THREE.Mesh(geometry(new THREE.SphereGeometry(s, 16, 12)), leafMat);
    leaf.position.set(x, y, z);
    scene.add(leaf);
  }

  nicheX(-4.35, 1, -2.15, 1.9);
  nicheX(4.35, -1, -2.15, 1.9);
  nicheZ(-5.45, 1, 0, 2.35);
  backShelf(-2.7, 1.2);
  backShelf(2.7, 1.2);
  displayStand(-2.45, 2.55);
  displayStand(2.45, 2.55);
  displayStand(3.05, 0.35);

  // Distressed island with carved legs
  add(box(2.28, 0.07, 1.16, shelfMat), 0, 0.765, 0, true);
  add(box(2.02, 0.06, 0.9, shelfMat), 0, 0.7, 0, true);
  for (const [x, z] of [
    [-0.9, -0.38],
    [0.9, -0.38],
    [-0.9, 0.38],
    [0.9, 0.38],
  ] as const) {
    const leg = new THREE.Mesh(carvedLeg(), shelfMat);
    leg.position.set(x, 0, z);
    leg.castShadow = true;
    leg.receiveShadow = true;
    scene.add(leg);
  }
  placeCorbel(-0.42, 0.44, 0.4, -Math.PI / 2);
  placeCorbel(0.42, 0.44, 0.4, -Math.PI / 2);
  placeCorbel(-0.42, 0.44, -0.4, Math.PI / 2);
  placeCorbel(0.42, 0.44, -0.4, Math.PI / 2);
  solids.push({ minX: -1.18, maxX: 1.18, minZ: -0.62, maxZ: 0.62 });

  // Window bench
  add(box(0.5, 0.07, 1.7, shelfMat), -4.06, 0.48, 2.25, true);
  placeCorbel(-4.32, 0.16, 1.7, 0);
  placeCorbel(-4.32, 0.16, 2.8, 0);
  solids.push({ minX: -4.4, maxX: -3.78, minZ: 1.35, maxZ: 3.15 });

  addBookcase(4.16, 2.15);
  solids.push({ minX: 3.92, maxX: 4.4, minZ: 1.72, maxZ: 2.58 });

  // Color chips on the school-colors shelf
  for (const [i, color] of [0x1e2d52, 0x8e3a3a, 0xc6a15a, 0x1f4d38, 0xc7b6de].entries()) {
    const chip = new THREE.Mesh(
      geometry(new THREE.CylinderGeometry(0.045, 0.045, 0.025, 16)),
      material(new THREE.MeshStandardMaterial({ color, roughness: 0.7 })),
    );
    chip.position.set(-3.78, 1.05, -2.72 + i * 0.18);
    scene.add(chip);
  }

  const hero = wallWords("Mona's", "READY NOW");
  const heroMesh = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(2.5, 0.7)),
    material(new THREE.MeshBasicMaterial({ map: hero, transparent: true })),
  );
  heroMesh.position.set(0, 2.52, -5.42);
  scene.add(heroMesh);

  const rug = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(1.55, 3.3)),
    material(new THREE.MeshStandardMaterial({ color: 0xe5d5c2, roughness: 1 })),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.012, 1.85);
  rug.receiveShadow = true;
  scene.add(rug);

  const poolMat = material(
    new THREE.MeshBasicMaterial({
      color: 0xfff4e2,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const pool = new THREE.Mesh(geometry(new THREE.CircleGeometry(1.15, 32)), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(-3.15, 0.02, 2.25);
  scene.add(pool);

  const track = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.012, 0.012, 7.2, 8)), brassMat);
  track.rotation.x = Math.PI / 2;
  track.position.set(0, 2.98, -1.1);
  scene.add(track);

  spot(-0.15, 2.92, 0.55, 0, 0.9, 0);
  spot(-3.35, 2.92, -2.15, -3.95, 1.25, -2.15);
  spot(3.35, 2.92, -2.15, 3.95, 1.25, -2.15);
  spot(0, 2.92, -4.45, 0, 1.25, -5.05);

  const hemi = new THREE.HemisphereLight(0xfff6ec, 0xc5d8ea, 0.78);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xfff8f1, 0.28);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff3e4, 2.35);
  sun.position.set(-3.2, 7.2, 4.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 22;
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  for (const spotDef of spots) placePiece(spotDef);

  const pos = new THREE.Vector3(0, 0, 3.55);
  let yaw = 0;
  let pitch = -0.12;
  let speed = 0;
  let started = false;
  let paused = false;
  let attract = 0;
  let analogX = 0;
  let analogY = 0;
  let steer = 0;
  let focused: string | null = null;
  let pinned: string | null = null;
  let pinAnchor: { x: number; z: number } | null = null;
  let dismissed: string | null = null;
  const keys = new Set<string>();

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let drag: { x: number; y: number; moved: number } | null = null;

  const timer = new THREE.Timer();
  timer.connect(document);

  function frame(timestamp?: number) {
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 0.05);
    const beforeX = pos.x;
    const beforeZ = pos.z;

    if (!started) {
      attract += dt;
      yaw = Math.sin(attract * 0.28) * 0.16;
      pitch = -0.11 + Math.sin(attract * 0.2) * 0.015;
      pos.set(0.05, 0, 3.45);
      speed = 0;
    } else if (!paused) {
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      const rx = Math.cos(yaw);
      const rz = -Math.sin(yaw);
      let fwd = 0;
      let str = 0;
      if (keys.has("KeyW") || keys.has("ArrowUp")) fwd += 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) fwd -= 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) str += 1;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) str -= 1;
      str -= steer;
      let ix = fx * fwd + rx * str + rx * analogX + fx * analogY;
      let iz = fz * fwd + rz * str + rz * analogX + fz * analogY;
      const len = Math.hypot(ix, iz);
      if (len > 1) {
        ix /= len;
        iz /= len;
      }
      const moving = len > 0.04;
      const stepX = (moving ? ix : 0) * 2.15 * dt;
      const stepZ = (moving ? iz : 0) * 2.15 * dt;
      tryMove(stepX, stepZ);
      const moved = Math.hypot(pos.x - beforeX, pos.z - beforeZ);
      speed = dt > 0 ? moved / dt : 0;
      updateFocus();
    } else {
      speed = 0;
    }

    camera.position.set(pos.x, 1.58, pos.z);
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(frame);
  resize();
  requestAnimationFrame(resize);
  const observer = new ResizeObserver(() => resize());
  observer.observe(host);
  window.visualViewport?.addEventListener("resize", resize);

  function onKeyDown(e: KeyboardEvent) {
    if (e.code === "KeyE" && !e.repeat && focused && started && !paused) api.onBuy(focused);
    keys.add(e.code);
    if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
  }
  function onBlur() {
    keys.clear();
  }
  function onPointerDown(e: PointerEvent) {
    if (!started) api.onEngage?.();
    if (!started || paused || e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
    try {
      renderer.domElement.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  }
  function onPointerMove(e: PointerEvent) {
    if (document.pointerLockElement === renderer.domElement && started && !paused) {
      yaw -= e.movementX * 0.0022;
      pitch = clampPitch(pitch - e.movementY * 0.0022);
      return;
    }
    if (!drag || paused) return;
    yaw -= e.movementX * 0.0042;
    pitch = clampPitch(pitch - e.movementY * 0.0042);
    drag.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
  }
  function onPointerUp(e: PointerEvent) {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    if (moved > 14 || !started) return;
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(productMeshes, false).find((item) => item.object.visible && item.object.parent?.visible !== false);
    const key = hit?.object.userData.spotKey as string | undefined;
    if (key) pin(key);
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointercancel", () => {
    drag = null;
  });

  const probe: ControlsProbe = {
    getYaw: () => yaw,
    getSpeed: () => speed,
    getX: () => pos.x,
    getZ: () => pos.z,
    setPose: (x: number, z: number, nextYaw: number) => {
      pos.set(x, 0, z);
      yaw = nextYaw;
      pitch = -0.06;
    },
    setKeys: (codes) => {
      keys.clear();
      for (const code of codes) keys.add(code);
    },
    setSteer: (v) => {
      steer = v;
    },
  };
  window.__controlsTest = probe;

  return {
    start: () => {
      started = true;
    },
    setPaused: (next) => {
      paused = next;
      if (next) {
        keys.clear();
        analogX = 0;
        analogY = 0;
        steer = 0;
        if (document.pointerLockElement) document.exitPointerLock();
      }
    },
    setAnalog: (x, y) => {
      analogX = x;
      analogY = y;
    },
    setLook: (dx, dy) => {
      if (!started || paused) return;
      yaw -= dx * 0.005;
      pitch = clampPitch(pitch - dy * 0.005);
    },
    clearFocus: () => {
      dismissed = pinned ?? focused;
      pinned = null;
      pinAnchor = null;
      if (focused) {
        focused = null;
        api.onFocused(null);
      }
    },
    requestMouseLook: () => {
      if (!started) return;
      const pending = renderer.domElement.requestPointerLock?.();
      void Promise.resolve(pending).catch(() => {});
    },
    setSold: (keys) => {
      const taken = new Set(keys);
      for (const [key, group] of placed) group.visible = !taken.has(key);
      if (focused && taken.has(focused)) {
        focused = null;
        pinned = null;
        pinAnchor = null;
        api.onFocused(null);
      }
    },
    dispose: () => {
      renderer.setAnimationLoop(null);
      timer.dispose();
      observer.disconnect();
      window.visualViewport?.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      if (window.__controlsTest === probe) delete window.__controlsTest;
      scene.environment?.dispose();
      pmrem.dispose();
      for (const t of textures) t.dispose();
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
      renderer.dispose();
      host.replaceChildren();
    },
  };

  function placePiece(spotDef: (typeof spots)[number]) {
    const product = productById(spotDef.productId);
    if (!product) return;
    const group = new THREE.Group();
    group.position.set(spotDef.x, spotDef.y, spotDef.z);
    group.rotation.y = spotDef.rotY;
    scene.add(group);
    placed.set(spotDef.key, group);

    loader.load(product.cutout, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.premultiplyAlpha = false;
      textures.push(tex);
      const image = tex.image as HTMLImageElement;
      const aspect = image.width / Math.max(1, image.height);
      const h = spotDef.height;
      const w = h * aspect;
      const matP = material(
        new THREE.MeshStandardMaterial({
          map: tex,
          transparent: true,
          alphaTest: 0.18,
          roughness: 1,
          metalness: 0,
          side: THREE.DoubleSide,
          depthWrite: true,
          envMapIntensity: 0.15,
        }),
      );
      const mesh = new THREE.Mesh(geometry(new THREE.PlaneGeometry(w, h)), matP);
      mesh.position.y = h / 2 + 0.004;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.spotKey = spotDef.key;
      group.add(mesh);
      productMeshes.push(mesh);

      const shade = new THREE.Mesh(geometry(new THREE.CircleGeometry(Math.max(0.16, w * 0.42), 20)), shadowMat);
      shade.rotation.x = -Math.PI / 2;
      shade.position.y = 0.008;
      group.add(shade);

      const arm = new THREE.Vector3(w * 0.26, h * 0.55, 0.01);
      const drop = new THREE.Vector3(w * 0.42, h * 0.3, 0.07);
      const stringMat = material(new THREE.MeshStandardMaterial({ color: 0x6b5344, roughness: 0.7 }));
      const span = drop.clone().sub(arm);
      const length = span.length();
      const cord = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.0016, 0.0016, length, 5)), stringMat);
      cord.position.copy(arm).add(drop).multiplyScalar(0.5);
      cord.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.clone().normalize());
      group.add(cord);

      const tag = new THREE.Mesh(
        geometry(new THREE.PlaneGeometry(0.048, 0.068)),
        material(
          new THREE.MeshStandardMaterial({
            map: tagTexture(product.price),
            roughness: 0.82,
            metalness: 0,
            side: THREE.DoubleSide,
          }),
        ),
      );
      tag.position.copy(drop);
      tag.rotation.z = -0.14;
      tag.rotation.y = -0.25;
      group.add(tag);
    });
  }

  function updateFocus() {
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    let best: { key: string; d: number } | null = null;
    for (const spotDef of spots) {
      const group = placed.get(spotDef.key);
      if (group && !group.visible) continue;
      const dx = spotDef.x - pos.x;
      const dz = spotDef.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 2.15) continue;
      const dot = (dx * fx + dz * fz) / (dist || 1);
      if (dist > 1.35 && dot < 0.2) continue;
      if (!best || dist < best.d) best = { key: spotDef.key, d: dist };
    }
    if (pinned) {
      const group = placed.get(pinned);
      const anchorFar = pinAnchor && Math.hypot(pos.x - pinAnchor.x, pos.z - pinAnchor.z) > 0.85;
      if (!group || !group.visible || anchorFar) {
        pinned = null;
        pinAnchor = null;
      }
    }
    const key = pinned ?? best?.key ?? null;
    let next = key;
    if (dismissed) {
      if (next === dismissed) next = null;
      else if (next) dismissed = null;
      else {
        const away = spots.find((spot) => spot.key === dismissed);
        if (!away || Math.hypot(away.x - pos.x, away.z - pos.z) > 2.4) dismissed = null;
      }
    }
    if (next !== focused) {
      focused = next;
      api.onFocused(next);
    }
  }

  function pin(id: string) {
    dismissed = null;
    pinned = id;
    pinAnchor = { x: pos.x, z: pos.z };
    if (focused !== id) {
      focused = id;
      api.onFocused(id);
    }
  }

  function tryMove(dx: number, dz: number) {
    if (!hits(pos.x + dx, pos.z)) pos.x += dx;
    if (!hits(pos.x, pos.z + dz)) pos.z += dz;
  }

  function hits(x: number, z: number) {
    for (const solid of solids) {
      const cx = Math.max(solid.minX, Math.min(x, solid.maxX));
      const cz = Math.max(solid.minZ, Math.min(z, solid.maxZ));
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz < RADIUS * RADIUS) return true;
    }
    return false;
  }

  function nicheX(wallX: number, into: number, z: number, width: number) {
    const depth = 0.5;
    const headTop = 2.02;
    const headBot = 1.9;
    const shelfTop = 1.02;
    const z0 = z - width / 2;
    const z1 = z + width / 2;
    const midX = wallX + into * (depth / 2);
    add(box(0.04, headTop - 0.35, width - 0.04, nicheMat), wallX + into * 0.035, (headTop + 0.35) / 2, z);
    add(box(depth, 0.055, width - 0.12, shelfMat), midX, shelfTop - 0.028, z, true);
    add(box(depth, headTop, 0.07, shelfMat), midX, headTop / 2, z0);
    add(box(depth, headTop, 0.07, shelfMat), midX, headTop / 2, z1);
    add(box(depth, headTop - headBot, width, shelfMat), midX, (headTop + headBot) / 2, z);
    const rot = into > 0 ? 0 : Math.PI;
    const cx = wallX + into * 0.02;
    placeCorbel(cx, shelfTop - 0.34, z - 0.48, rot);
    placeCorbel(cx, shelfTop - 0.34, z + 0.48, rot);
    solids.push({
      minX: Math.min(wallX, wallX + into * depth) - 0.02,
      maxX: Math.max(wallX, wallX + into * depth) + 0.02,
      minZ: z0 - 0.02,
      maxZ: z1 + 0.02,
    });
  }

  function nicheZ(wallZ: number, into: number, x: number, width: number) {
    const depth = 0.5;
    const headTop = 2.02;
    const headBot = 1.9;
    const shelfTop = 1.02;
    const x0 = x - width / 2;
    const x1 = x + width / 2;
    const midZ = wallZ + into * (depth / 2);
    add(box(width - 0.04, headTop - 0.35, 0.04, nicheMat), x, (headTop + 0.35) / 2, wallZ + into * 0.035);
    add(box(width - 0.12, 0.055, depth, shelfMat), x, shelfTop - 0.028, midZ, true);
    add(box(0.07, headTop, depth, shelfMat), x0, headTop / 2, midZ);
    add(box(0.07, headTop, depth, shelfMat), x1, headTop / 2, midZ);
    add(box(width, headTop - headBot, depth, shelfMat), x, (headTop + headBot) / 2, midZ);
    placeCorbel(x - 0.62, shelfTop - 0.34, wallZ + into * 0.02, -Math.PI / 2);
    placeCorbel(x + 0.62, shelfTop - 0.34, wallZ + into * 0.02, -Math.PI / 2);
    solids.push({
      minX: x0 - 0.02,
      maxX: x1 + 0.02,
      minZ: Math.min(wallZ, wallZ + into * depth) - 0.02,
      maxZ: Math.max(wallZ, wallZ + into * depth) + 0.02,
    });
  }

  function spot(x: number, y: number, z: number, tx: number, ty: number, tz: number) {
    const light = new THREE.SpotLight(0xfff6ea, 28, 7.5, 0.62, 0.55, 1.4);
    light.position.set(x, y, z);
    light.target.position.set(tx, ty, tz);
    scene.add(light, light.target);
    const can = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.035, 0.055, 0.07, 12)), brassMat);
    can.position.set(x, 3.02, z);
    scene.add(can);
  }

  function add(mesh: THREE.Mesh, x: number, y: number, z: number, cast = false) {
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function box(w: number, h: number, d: number, mat: THREE.Material) {
    return new THREE.Mesh(geometry(new THREE.BoxGeometry(w, h, d)), mat);
  }

  function geometry<T extends THREE.BufferGeometry>(g: T): T {
    geos.push(g);
    return g;
  }

  function material<T extends THREE.Material>(m: T): T {
    mats.push(m);
    return m;
  }

  function resize() {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
  }

  function crownAndBase() {
    const runZ = 10.55;
    const runX = 8.7;
    add(box(0.12, 0.07, runZ, whiteTrim), -4.27, 2.96, -0.12);
    add(box(0.07, 0.045, runZ, whiteTrim), -4.2, 2.9, -0.12);
    add(box(0.12, 0.07, runZ, whiteTrim), 4.27, 2.96, -0.12);
    add(box(0.07, 0.045, runZ, whiteTrim), 4.2, 2.9, -0.12);
    add(box(runX, 0.07, 0.12, whiteTrim), 0, 2.96, -5.37);
    add(box(runX, 0.045, 0.07, whiteTrim), 0, 2.9, -5.3);
    add(box(runX, 0.07, 0.1, whiteTrim), 0, 2.96, 5.14);
    add(box(runX, 0.045, 0.06, whiteTrim), 0, 2.9, 5.08);
    add(box(0.045, 0.12, runZ, whiteTrim), -4.32, 0.06, -0.12);
    add(box(0.045, 0.12, runZ, whiteTrim), 4.32, 0.06, -0.12);
    add(box(runX, 0.12, 0.045, whiteTrim), 0, 0.06, -5.42);
    add(box(runX, 0.12, 0.04, whiteTrim), 0, 0.06, 5.17);
  }

  function addBookcase(x: number, z: number) {
    const W = 0.7;
    const D = 0.34;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = -Math.PI / 2;
    const side = (sx: number) => {
      const m = box(0.035, 1.98, D, shelfMat);
      m.position.set(sx, 0.99, 0);
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
    };
    side(-W / 2 + 0.018);
    side(W / 2 - 0.018);
    const back = box(W, 1.98, 0.02, nicheMat);
    back.position.set(0, 0.99, -D / 2 + 0.01);
    back.receiveShadow = true;
    group.add(back);
    const header = box(W, 0.16, D, shelfMat);
    header.position.set(0, 1.9, 0);
    header.castShadow = true;
    group.add(header);
    const crest = box(0.28, 0.06, 0.02, whiteTrim);
    crest.position.set(0, 1.9, D / 2 - 0.01);
    group.add(crest);
    for (const y of [0.42, 0.82, 1.2, 1.55]) {
      const shelf = box(W - 0.07, 0.035, D - 0.04, shelfMat);
      shelf.position.set(0, y, 0.01);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      group.add(shelf);
    }
    const cab = box(W - 0.08, 0.38, D - 0.03, shelfMat);
    cab.position.set(0, 0.2, 0.01);
    cab.castShadow = true;
    group.add(cab);
    for (const sx of [-0.1, 0.1]) {
      const knob = new THREE.Mesh(geometry(new THREE.SphereGeometry(0.018, 10, 8)), brassMat);
      knob.position.set(sx, 0.22, D / 2);
      group.add(knob);
    }
    scene.add(group);
    const yarn = [0x1e2d52, 0x8e3a3a, 0xf4f1ea, 0xc7b6de, 0xb7d4ea, 0xc6a15a];
    yarn.forEach((color, i) => {
      const ball = new THREE.Mesh(
        geometry(new THREE.SphereGeometry(0.07, 16, 12)),
        material(new THREE.MeshStandardMaterial({ color, roughness: 0.95 })),
      );
      const col = i % 3;
      const row = Math.floor(i / 3);
      ball.position.set(x - 0.12, row === 0 ? 0.9 : 1.28, z - 0.18 + col * 0.18);
      ball.castShadow = true;
      scene.add(ball);
    });
  }

  function placeCorbel(x: number, y: number, z: number, rotY: number) {
    if (!sharedCorbel) sharedCorbel = geometry(buildCorbel());
    const mesh = new THREE.Mesh(sharedCorbel, shelfMat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  function buildCorbel() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.06, 0);
    shape.bezierCurveTo(0.1, 0.03, 0.08, 0.09, 0.14, 0.12);
    shape.bezierCurveTo(0.22, 0.16, 0.18, 0.22, 0.1, 0.24);
    shape.bezierCurveTo(0.16, 0.27, 0.24, 0.3, 0.26, 0.34);
    shape.lineTo(0, 0.34);
    shape.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.01,
      bevelSegments: 2,
      curveSegments: 10,
    });
    geo.translate(0, 0, -0.05);
    geo.computeVertexNormals();
    return geo;
  }

  function carvedLeg() {
    if (!sharedLeg) {
      const pts = [
        new THREE.Vector2(0.055, 0),
        new THREE.Vector2(0.07, 0.04),
        new THREE.Vector2(0.04, 0.14),
        new THREE.Vector2(0.055, 0.28),
        new THREE.Vector2(0.032, 0.46),
        new THREE.Vector2(0.05, 0.62),
        new THREE.Vector2(0.065, 0.72),
      ];
      sharedLeg = geometry(new THREE.LatheGeometry(pts, 10));
    }
    return sharedLeg;
  }

  function woodTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const g = canvas.getContext("2d");
    if (!g) return new THREE.CanvasTexture(canvas);
    const rand = mulberry32(11);
    g.fillStyle = "#8a5a32";
    g.fillRect(0, 0, 1024, 1024);
    const plank = 84;
    let y = 0;
    let row = 0;
    while (y < 1024) {
      const tone = 132 + Math.floor(rand() * 48);
      const warm = tone + 28;
      g.fillStyle = `rgb(${warm}, ${tone}, ${tone - 48})`;
      g.fillRect(0, y, 1024, plank - 3);
      const offset = (row % 2) * 180;
      for (let x = -offset; x < 1024; x += 340 + rand() * 80) {
        g.fillStyle = `rgba(70,40,18,0.35)`;
        g.fillRect(x, y, 3, plank - 3);
      }
      for (let i = 0; i < 14; i++) {
        const gy = y + 6 + rand() * (plank - 14);
        g.strokeStyle = `rgba(90,50,20,${0.15 + rand() * 0.25})`;
        g.beginPath();
        g.moveTo(0, gy);
        g.bezierCurveTo(200, gy + (rand() - 0.5) * 8, 600, gy + (rand() - 0.5) * 6, 1024, gy);
        g.stroke();
      }
      if (rand() > 0.72) {
        const kx = 40 + rand() * 940;
        const ky = y + plank * 0.5;
        g.fillStyle = "rgba(70,38,16,0.45)";
        g.beginPath();
        g.ellipse(kx, ky, 7 + rand() * 6, 4 + rand() * 3, rand(), 0, Math.PI * 2);
        g.fill();
      }
      y += plank;
      row += 1;
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2.2, 3.4);
    tex.anisotropy = 8;
    return tex;
  }

  function distressedTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const g = canvas.getContext("2d");
    if (!g) return new THREE.CanvasTexture(canvas);
    const rand = mulberry32(21);
    g.fillStyle = "#f3efe6";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 90; i++) {
      const x = rand() * 512;
      const y = rand() * 512;
      const w = 8 + rand() * 36;
      const h = 2 + rand() * 8;
      g.fillStyle = `rgba(${150 + rand() * 40}, ${110 + rand() * 30}, ${70 + rand() * 20}, ${0.25 + rand() * 0.45})`;
      g.fillRect(x, y, w, h);
    }
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(120,90,60,${0.08 + rand() * 0.12})`;
      g.beginPath();
      const y = rand() * 512;
      g.moveTo(0, y);
      g.lineTo(512, y + (rand() - 0.5) * 10);
      g.stroke();
    }
    g.strokeStyle = "rgba(120,86,52,0.55)";
    g.lineWidth = 6;
    g.strokeRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1.4, 1.4);
    tex.anisotropy = 4;
    return tex;
  }

  function contactShadow() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const g = canvas.getContext("2d");
    if (!g) return new THREE.CanvasTexture(canvas);
    const grd = g.createRadialGradient(64, 64, 10, 64, 64, 62);
    grd.addColorStop(0, "rgba(70,54,40,0.38)");
    grd.addColorStop(1, "rgba(70,54,40,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  function backShelf(x: number, width: number) {
    const depth = 0.42;
    const y = 0.998;
    const z = -5.2;
    add(box(width, 0.05, depth, shelfMat), x, y, z, true);
    placeCorbel(x - width * 0.28, y - 0.34, -5.4, -Math.PI / 2);
    placeCorbel(x + width * 0.28, y - 0.34, -5.4, -Math.PI / 2);
    solids.push({ minX: x - width / 2, maxX: x + width / 2, minZ: -5.48, maxZ: -4.96 });
  }

  function displayStand(x: number, z: number) {
    const w = 0.86;
    const d = 0.5;
    add(box(w, 0.05, d, shelfMat), x, 0.72, z, true);
    add(box(w - 0.14, 0.045, d - 0.1, shelfMat), x, 0.66, z);
    for (const [sx, sz] of [
      [-0.3, -0.15],
      [0.3, -0.15],
      [-0.3, 0.15],
      [0.3, 0.15],
    ] as const) {
      const leg = new THREE.Mesh(carvedLeg(), shelfMat);
      leg.scale.set(0.82, 0.96, 0.82);
      leg.position.set(x + sx, 0, z + sz);
      leg.castShadow = true;
      scene.add(leg);
    }
    solids.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  const tagTextures = new Map<number, THREE.Texture>();
  function tagTexture(price: number) {
    const cached = tagTextures.get(price);
    if (cached) return cached;
    const tex = paint(128, 180, (g) => {
      g.fillStyle = "#f4efe4";
      g.fillRect(0, 0, 128, 180);
      g.strokeStyle = "#c4b49a";
      g.lineWidth = 4;
      g.strokeRect(4, 4, 120, 172);
      g.fillStyle = "#f7f4ef";
      g.beginPath();
      g.arc(64, 22, 5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#6b5344";
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = "#2c2622";
      g.font = "600 36px Georgia, serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(`$${price}`, 64, 104);
    });
    tagTextures.set(price, tex);
    return tex;
  }

  function wallWords(a: string, b: string) {
    return paint(1024, 320, (g) => {
      g.clearRect(0, 0, 1024, 320);
      g.fillStyle = "#2c2622";
      g.font = "600 140px Georgia, serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(a, 512, 130);
      g.fillStyle = "#8c6a3d";
      g.font = "500 42px Georgia, serif";
      g.fillText(b, 512, 230);
    });
  }

  function paint(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext("2d");
    if (g) draw(g);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    textures.push(tex);
    return tex;
  }
}

function clampPitch(v: number) {
  return Math.max(-1.05, Math.min(1.05, v));
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
