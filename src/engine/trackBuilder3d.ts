import * as THREE from 'three';
import { TrackDefinition } from '../types/game';

export interface TrackSamplePoint {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  t: number;
}

export interface ClipZoneMarker {
  pos: THREE.Vector3;
  t: number;
  radius: number;
  zoneType: 'inner' | 'outer';
}

export interface TrackWorld {
  group: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  samples: TrackSamplePoint[];
  clipZoneCenters: ClipZoneMarker[];
  startPosition: THREE.Vector3;
  startHeading: number;
  getTrackInfo: (x: number, z: number) => {
    distFromCenter: number;
    closestPoint: THREE.Vector3;
    tangent: THREE.Vector3;
    t: number;
    activeClipZoneIndex: number;
    activeClipZoneType: 'inner' | 'outer' | null;
  };
  update: (elapsed: number, dt: number) => void;
  dispose: () => void;
}

interface ThemePalette {
  skyZenith: number;
  skyHorizon: number;
  roadMode: 'dirt' | 'tarmac';
  roadBase: string;
  roadRut: string;
  roadEdge: string;
  cliffColor: number;
  hillColor: number;
  distantHillColor: number;
  bushColor: number;
  pineColor: number;
  oakColor: number;
  trunkColor: number;
  fenceWoodColor: number;
  pebbleColor: number;
  dustColor: number;
  moteColor: number;
}

function getThemePalette(theme: TrackDefinition['propTheme']): ThemePalette {
  switch (theme) {
    case 'canyon':
      return {
        skyZenith: 0xd96b43,
        skyHorizon: 0xfad29c,
        roadMode: 'tarmac',
        roadBase: '#2f333f',
        roadRut: '#212530',
        roadEdge: '#474c5c',
        cliffColor: 0xb45c36,
        hillColor: 0xc27746,
        distantHillColor: 0xd6966b,
        bushColor: 0x7c862e,
        pineColor: 0x526925,
        oakColor: 0x948d32,
        trunkColor: 0x6b3d24,
        fenceWoodColor: 0x704126,
        pebbleColor: 0x9e714c,
        dustColor: 0xf0c79e,
        moteColor: 0xfde68a,
      };
    case 'sakura':
      return {
        skyZenith: 0x3b4e8c,
        skyHorizon: 0xf6c5d8,
        roadMode: 'tarmac',
        roadBase: '#2d323e',
        roadRut: '#1e232e',
        roadEdge: '#475062',
        cliffColor: 0x78736e,
        hillColor: 0x587246,
        distantHillColor: 0x7a8596,
        bushColor: 0x5a7d34,
        pineColor: 0x38572d,
        oakColor: 0xf472b6,
        trunkColor: 0x54382a,
        fenceWoodColor: 0x66402a,
        pebbleColor: 0x9ca3af,
        dustColor: 0xfbcfe8,
        moteColor: 0xf9a8d4,
      };
    case 'neon':
      return {
        skyZenith: 0x0f2247,
        skyHorizon: 0x355f91,
        roadMode: 'tarmac',
        roadBase: '#222b3a',
        roadRut: '#151c28',
        roadEdge: '#364359',
        cliffColor: 0x475569,
        hillColor: 0x2a3b4e,
        distantHillColor: 0x213245,
        bushColor: 0x0d9488,
        pineColor: 0x1e3a5f,
        oakColor: 0x22d3ee,
        trunkColor: 0x334155,
        fenceWoodColor: 0x4b5563,
        pebbleColor: 0x64748b,
        dustColor: 0x7dd3fc,
        moteColor: 0x38bdf8,
      };
    case 'harbor':
    default:
      // Warm sunlit Pixar diorama with crisp dark-charcoal asphalt circuit
      return {
        skyZenith: 0x3f88d8,
        skyHorizon: 0xd0e9fc,
        roadMode: 'tarmac',
        roadBase: '#2b323e',
        roadRut: '#1e242f',
        roadEdge: '#414a5c',
        cliffColor: 0x9b8e7c,
        hillColor: 0x899842,
        distantHillColor: 0xb1be8a,
        bushColor: 0x738429,
        pineColor: 0x4c6821,
        oakColor: 0x8a9a31,
        trunkColor: 0x6e4126,
        fenceWoodColor: 0x7c4a2b,
        pebbleColor: 0x9c8971,
        dustColor: 0xe6d4b8,
        moteColor: 0xfef3c7,
      };
  }
}

function createRallyRoadTexture(
  palette: ThemePalette,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = palette.roadBase;
  ctx.fillRect(0, 0, 512, 512);

  // Dark rubberized racing grooves along left & right drift lines
  [136, 376].forEach((cx) => {
    const groove = ctx.createLinearGradient(cx - 56, 0, cx + 56, 0);
    groove.addColorStop(0, 'rgba(0,0,0,0)');
    groove.addColorStop(0.5, palette.roadRut);
    groove.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = groove;
    ctx.fillRect(cx - 56, 0, 112, 512);
  });
  ctx.globalAlpha = 1.0;

  // Fine stylized asphalt aggregate grain
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle =
      Math.random() > 0.5 ? 'rgba(255,255,255,0.038)' : 'rgba(0,0,0,0.09)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Crisp white sidelines & subtle dashed centerline
  ctx.fillStyle = 'rgba(248,250,252,0.82)';
  ctx.fillRect(16, 0, 10, 512);
  ctx.fillRect(486, 0, 10, 512);

  ctx.fillStyle = 'rgba(251,191,36,0.45)';
  for (let y = 16; y < 512; y += 64) {
    ctx.fillRect(252, y, 8, 34);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createCurbTexture(
  accentHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 128, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function buildArenaWorld(track: TrackDefinition): TrackWorld {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const register = <T extends { dispose: () => void }>(d: T): T => {
    disposables.push(d);
    return d;
  };
  const palette = getThemePalette('harbor');
  const R = track.arenaRadius ?? track.roadWidth / 2;
  const up = new THREE.Vector3(0, 1, 0);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  const curve = new THREE.CatmullRomCurve3(
    track.waypoints.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    'catmullrom',
    0.5,
  );
  const sampleCount = 360;
  const samples: TrackSamplePoint[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleCount;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3().crossVectors(up, tangent).normalize();
    samples.push({ point, tangent, normal, t });
  }

  // Sky dome
  const skyMat = register(
    new THREE.ShaderMaterial({
      uniforms: {
        uZenith: { value: new THREE.Color(palette.skyZenith) },
        uHorizon: { value: new THREE.Color(palette.skyHorizon) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        varying vec3 vWorldPos;
        void main() {
          float h = clamp(normalize(vWorldPos).y * 2.2, 0.0, 1.0);
          gl_FragColor = vec4(mix(uHorizon, uZenith, pow(h, 0.72)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  group.add(new THREE.Mesh(register(new THREE.SphereGeometry(680, 24, 16)), skyMat));

  // Ground + asphalt disc + curb ring
  const ground = new THREE.Mesh(
    register(new THREE.PlaneGeometry(1800, 1800)),
    register(new THREE.MeshStandardMaterial({ color: palette.hillColor, roughness: 0.94 })),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.06;
  ground.receiveShadow = true;
  group.add(ground);

  const asphalt = new THREE.Mesh(
    register(new THREE.CircleGeometry(R + 0.5, 96)),
    register(new THREE.MeshStandardMaterial({ color: 0x2b323e, roughness: 0.55, metalness: 0.08 })),
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.y = 0.02;
  asphalt.receiveShadow = true;
  group.add(asphalt);

  const curbRing = new THREE.Mesh(
    register(new THREE.RingGeometry(R + 0.5, R + 2.6, 96)),
    register(new THREE.MeshStandardMaterial({ color: new THREE.Color(track.curbAccent), roughness: 0.65 })),
  );
  curbRing.rotation.x = -Math.PI / 2;
  curbRing.position.y = 0.03;
  group.add(curbRing);

  // Painted guide lines: figure-8 (two touching rings on the Z axis) + donut pad
  const paintMat = register(
    new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  const f8R = 22;
  const addPaintRing = (cx: number, cz: number, r: number, w: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(register(new THREE.RingGeometry(r - w / 2, r + w / 2, 72)), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(cx, 0.045, cz);
    group.add(m);
  };
  addPaintRing(0, -f8R, f8R, 0.35, paintMat);
  addPaintRing(0, f8R, f8R, 0.35, paintMat);
  const donutMat = register(
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  );
  const donutX = -62;
  addPaintRing(donutX, 0, 9, 0.5, donutMat);
  addPaintRing(donutX, 0, 15, 0.35, donutMat);

  // Traffic cones along both figure-8 rings, plus the donut center cone
  const coneGeo = register(new THREE.ConeGeometry(0.42, 1.0, 8));
  const coneMat = register(new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6, flatShading: true }));
  const coneCount = 36 + 1;
  const coneInst = new THREE.InstancedMesh(coneGeo, coneMat, coneCount);
  coneInst.castShadow = true;
  let ci = 0;
  [-f8R, f8R].forEach((cz) => {
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * f8R, 0.5, cz + Math.sin(a) * f8R);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      coneInst.setMatrixAt(ci++, dummy.matrix);
    }
  });
  dummy.position.set(donutX, 0.5, 0);
  dummy.updateMatrix();
  coneInst.setMatrixAt(ci++, dummy.matrix);
  coneInst.instanceMatrix.needsUpdate = true;
  coneInst.computeBoundingSphere();
  group.add(coneInst);

  // Wooden post-and-rail fence ring
  const fenceR = R + 3.4;
  const postCount = 220;
  const woodMat = register(
    new THREE.MeshStandardMaterial({ color: palette.fenceWoodColor, roughness: 0.88, flatShading: true }),
  );
  const postInst = new THREE.InstancedMesh(register(new THREE.BoxGeometry(0.24, 1.38, 0.24)), woodMat, postCount);
  postInst.castShadow = true;
  for (let i = 0; i < postCount; i++) {
    const a = (i / postCount) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * fenceR, 0.68, Math.sin(a) * fenceR);
    dummy.rotation.set(0, -a, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    postInst.setMatrixAt(i, dummy.matrix);
  }
  postInst.instanceMatrix.needsUpdate = true;
  postInst.computeBoundingSphere();
  group.add(postInst);
  const railGeo = register(new THREE.TorusGeometry(fenceR, 0.07, 6, 160));
  [1.08, 0.56].forEach((y) => {
    const rail = new THREE.Mesh(railGeo, woodMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = y;
    group.add(rail);
  });

  // Cheering spectators behind the fence
  const specCount = 72;
  const shirtPalette = [0xef4444, 0x2563eb, 0xf59e0b, 0x10b981, 0xf8fafc, 0xf97316];
  const torsoInst = new THREE.InstancedMesh(
    register(new THREE.BoxGeometry(0.48, 0.9, 0.28)),
    register(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, flatShading: true })),
    specCount,
  );
  const headInst = new THREE.InstancedMesh(
    register(new THREE.IcosahedronGeometry(0.21, 0)),
    register(new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.75, flatShading: true })),
    specCount,
  );
  torsoInst.frustumCulled = false;
  headInst.frustumCulled = false;
  const specs: { x: number; z: number; yaw: number; phase: number }[] = [];
  for (let i = 0; i < specCount; i++) {
    const cluster = Math.floor(i / 12);
    const a = (cluster / 6) * Math.PI * 2 + 0.3 + ((i % 12) - 6) * 0.018;
    const r = fenceR + 1.9 + (i % 2) * 0.6;
    specs.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, yaw: -a + Math.PI / 2, phase: i * 0.72 });
    tint.setHex(shirtPalette[i % shirtPalette.length]);
    torsoInst.setColorAt(i, tint);
  }
  if (torsoInst.instanceColor) torsoInst.instanceColor.needsUpdate = true;
  group.add(torsoInst, headInst);

  // Pines, cliffs and mountains outside the arena
  const trunkGeo = register(new THREE.CylinderGeometry(0.36, 0.56, 3.6, 6));
  const trunkMat = register(new THREE.MeshStandardMaterial({ color: palette.trunkColor, roughness: 0.9, flatShading: true }));
  const pineMat = register(new THREE.MeshStandardMaterial({ color: palette.pineColor, roughness: 0.82, flatShading: true }));
  const pineGeos = [
    register(new THREE.ConeGeometry(2.6, 3.8, 7)),
    register(new THREE.ConeGeometry(2.05, 3.4, 7)),
    register(new THREE.ConeGeometry(1.45, 2.9, 7)),
  ];
  const pineCount = 70;
  const pineTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, pineCount);
  const pineTiers = pineGeos.map((g) => new THREE.InstancedMesh(g, pineMat, pineCount));
  const tierY = [4.0, 6.1, 7.9];
  for (let i = 0; i < pineCount; i++) {
    const a = (i / pineCount) * Math.PI * 2 + (i % 3) * 0.04;
    const r = fenceR + 18 + (i % 5) * 9;
    const px = Math.cos(a) * r;
    const pz = Math.sin(a) * r;
    const sc = 0.9 + ((i * 31) % 9) * 0.08;
    dummy.position.set(px, 1.8 * sc, pz);
    dummy.rotation.set(0, i * 0.9, 0);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    pineTrunks.setMatrixAt(i, dummy.matrix);
    pineTiers.forEach((tier, ti) => {
      dummy.position.set(px, tierY[ti] * sc, pz);
      dummy.updateMatrix();
      tier.setMatrixAt(i, dummy.matrix);
    });
  }
  [pineTrunks, ...pineTiers].forEach((m) => {
    m.instanceMatrix.needsUpdate = true;
    m.castShadow = true;
    m.frustumCulled = false;
    group.add(m);
  });

  const cliffCount = 26;
  const cliffInst = new THREE.InstancedMesh(
    register(new THREE.DodecahedronGeometry(1, 0)),
    register(new THREE.MeshStandardMaterial({ color: palette.cliffColor, roughness: 0.92, flatShading: true })),
    cliffCount,
  );
  cliffInst.castShadow = true;
  for (let i = 0; i < cliffCount; i++) {
    const a = (i / cliffCount) * Math.PI * 1.1 - 0.2;
    const r = fenceR + 24 + (i % 3) * 7;
    const w = 9 + ((i * 19) % 7) * 1.5;
    const h = 10 + ((i * 23) % 9) * 2.0;
    dummy.position.set(Math.cos(a) * r, h * 0.42, Math.sin(a) * r);
    dummy.rotation.set((i % 3) * 0.12, i * 0.7, ((i + 1) % 3) * 0.08);
    dummy.scale.set(w, h, w * 1.1);
    dummy.updateMatrix();
    cliffInst.setMatrixAt(i, dummy.matrix);
    tint.setHex(palette.cliffColor).offsetHSL(0, 0, ((i % 4) - 1.5) * 0.035);
    cliffInst.setColorAt(i, tint);
  }
  cliffInst.instanceMatrix.needsUpdate = true;
  if (cliffInst.instanceColor) cliffInst.instanceColor.needsUpdate = true;
  cliffInst.computeBoundingSphere();
  group.add(cliffInst);

  const mountainCount = 24;
  const mountainInst = new THREE.InstancedMesh(
    register(new THREE.ConeGeometry(68, 72, 6)),
    register(new THREE.MeshStandardMaterial({ color: palette.distantHillColor, roughness: 0.96, flatShading: true })),
    mountainCount,
  );
  for (let m = 0; m < mountainCount; m++) {
    const ang = (m / mountainCount) * Math.PI * 2;
    const rad = 330 + (m % 3) * 55;
    const sc = 0.9 + (m % 4) * 0.35;
    dummy.position.set(Math.cos(ang) * rad, 28 * sc, Math.sin(ang) * rad);
    dummy.rotation.set(0, m * 0.8, 0);
    dummy.scale.set(sc * 1.35, sc, sc * 1.2);
    dummy.updateMatrix();
    mountainInst.setMatrixAt(m, dummy.matrix);
  }
  mountainInst.instanceMatrix.needsUpdate = true;
  mountainInst.computeBoundingSphere();
  group.add(mountainInst);

  // Faceted low-poly clouds
  const cloudPuffGeo = register(new THREE.IcosahedronGeometry(13, 0));
  const cloudMat = register(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.92, flatShading: true }));
  const cloudItems: { mesh: THREE.Group; baseX: number; baseY: number; speed: number }[] = [];
  for (let c = 0; c < 22; c++) {
    const cg = new THREE.Group();
    const angle = (c / 22) * Math.PI * 2;
    const rad = 220 + (c % 3) * 85;
    for (let p = 0; p < 4; p++) {
      const puff = new THREE.Mesh(cloudPuffGeo, cloudMat);
      puff.position.set((p - 1.5) * 12, p === 1 || p === 2 ? 4.5 : 0, (p % 2) * 5);
      puff.scale.set(1.3 - Math.abs(p - 1.5) * 0.16, 0.72, 0.9);
      cg.add(puff);
    }
    const bx = Math.cos(angle) * rad;
    const by = 68 + (c % 4) * 14;
    cg.position.set(bx, by, Math.sin(angle) * rad);
    group.add(cg);
    cloudItems.push({ mesh: cg, baseX: bx, baseY: by, speed: 1.8 + (c % 4) * 0.65 });
  }

  const update = (elapsed: number) => {
    for (let i = 0; i < specs.length; i++) {
      const sp = specs[i];
      const jump = Math.abs(Math.sin(elapsed * 4.8 + sp.phase)) * 0.2;
      dummy.position.set(sp.x, 0.73 + jump, sp.z);
      dummy.rotation.set(0, sp.yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      torsoInst.setMatrixAt(i, dummy.matrix);
      dummy.position.set(sp.x, 1.42 + jump, sp.z);
      dummy.updateMatrix();
      headInst.setMatrixAt(i, dummy.matrix);
    }
    torsoInst.instanceMatrix.needsUpdate = true;
    headInst.instanceMatrix.needsUpdate = true;
    for (let c = 0; c < cloudItems.length; c++) {
      const it = cloudItems[c];
      it.mesh.position.x = it.baseX + Math.sin(elapsed * 0.04 * it.speed + c) * 36;
      it.mesh.position.y = it.baseY + Math.sin(elapsed * 0.25 + c) * 1.6;
    }
  };
  update(0);

  const centerPoint = new THREE.Vector3(0, 0, 0);
  return {
    group,
    curve,
    samples,
    clipZoneCenters: [],
    startPosition: new THREE.Vector3(0, 0, -(R - 28)),
    startHeading: 0,
    getTrackInfo: (x: number, z: number) => {
      const dist = Math.hypot(x, z);
      const nx = dist > 0.0001 ? x / dist : 1;
      const nz = dist > 0.0001 ? z / dist : 0;
      // 'closestPoint' = the arena center, so wall push-back (toward closestPoint) acts radially inward
      // 'tangent' = counter-clockwise tangent at the car's angle around the arena
      const tx = -nz;
      const tz = nx;
      const ang = Math.atan2(z, x);
      return {
        distFromCenter: dist,
        closestPoint: centerPoint,
        tangent: new THREE.Vector3(tx, 0, tz),
        t: ((ang / (Math.PI * 2)) + 1) % 1,
        activeClipZoneIndex: -1,
        activeClipZoneType: null,
      };
    },
    update,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

export function buildTrackWorld(
  track: TrackDefinition,
  maxAnisotropy: number,
): TrackWorld {
  if (track.layout === 'arena') {
    return buildArenaWorld(track);
  }
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const register = <T extends { dispose: () => void }>(d: T): T => {
    disposables.push(d);
    return d;
  };

  const palette = getThemePalette(track.propTheme);
  const controlPts = track.waypoints.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(controlPts, true, 'catmullrom', 0.5);

  const sampleCount = 360;
  const samples: TrackSamplePoint[] = [];
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleCount;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3().crossVectors(up, tangent).normalize();
    samples.push({ point, tangent, normal, t });
  }

  // Helper: check minimum squared distance from any point to track centerline
  const isClearOfRoad = (x: number, z: number, minClearance: number): boolean => {
    const cSq = minClearance * minClearance;
    for (let j = 0; j < sampleCount; j += 4) {
      const dx = x - samples[j].point.x;
      const dz = z - samples[j].point.z;
      if (dx * dx + dz * dz < cSq) return false;
    }
    return true;
  };

  // 0. Pixar Gradient Sky Dome
  const skyGeo = register(new THREE.SphereGeometry(680, 24, 16));
  const skyMat = register(
    new THREE.ShaderMaterial({
      uniforms: {
        uZenith: { value: new THREE.Color(palette.skyZenith) },
        uHorizon: { value: new THREE.Color(palette.skyHorizon) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        varying vec3 vWorldPos;
        void main() {
          float h = clamp(normalize(vWorldPos).y * 2.2, 0.0, 1.0);
          vec3 col = mix(uHorizon, uZenith, pow(h, 0.72));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  group.add(skyDome);

  // 1. Extended Ground Terrain
  const groundGeo = register(new THREE.PlaneGeometry(1800, 1800));
  const groundMat = register(
    new THREE.MeshStandardMaterial({
      color: palette.hillColor,
      roughness: 0.94,
      metalness: 0.02,
    }),
  );
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.06;
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // 2. Road Ribbon Geometry + Natural Shoulder / Curbs (CCW facing +Y UPWARD)
  const roadHalfW = track.roadWidth / 2;
  const curbW = 1.95;
  const roadPositions: number[] = [];
  const roadNormals: number[] = [];
  const roadUvs: number[] = [];
  const roadIndices: number[] = [];

  const curbPositions: number[] = [];
  const curbNormals: number[] = [];
  const curbUvs: number[] = [];
  const curbIndices: number[] = [];

  const totalLen = curve.getLength();

  for (let i = 0; i <= sampleCount; i++) {
    const s = samples[i % sampleCount];
    const vCoord = (i / sampleCount) * (totalLen / 18);

    const left = s.point.clone().addScaledVector(s.normal, -roadHalfW);
    const right = s.point.clone().addScaledVector(s.normal, roadHalfW);
    roadPositions.push(left.x, 0.02, left.z, right.x, 0.02, right.z);
    roadNormals.push(0, 1, 0, 0, 1, 0);
    roadUvs.push(0, vCoord, 1, vCoord);

    const lOut = s.point.clone().addScaledVector(s.normal, -(roadHalfW + curbW));
    const lIn = s.point.clone().addScaledVector(s.normal, -roadHalfW);
    const rIn = s.point.clone().addScaledVector(s.normal, roadHalfW);
    const rOut = s.point.clone().addScaledVector(s.normal, roadHalfW + curbW);

    curbPositions.push(
      lOut.x, 0.03, lOut.z,
      lIn.x, 0.035, lIn.z,
      rIn.x, 0.035, rIn.z,
      rOut.x, 0.03, rOut.z,
    );
    curbNormals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    const cv = (i / sampleCount) * (totalLen / 6);
    curbUvs.push(0, cv, 1, cv, 0, cv, 1, cv);

    if (i < sampleCount) {
      const rBase = i * 2;
      roadIndices.push(rBase, rBase + 2, rBase + 1, rBase + 1, rBase + 2, rBase + 3);

      const cBase = i * 4;
      curbIndices.push(cBase, cBase + 4, cBase + 1, cBase + 1, cBase + 4, cBase + 5);
      curbIndices.push(cBase + 2, cBase + 6, cBase + 3, cBase + 3, cBase + 6, cBase + 7);
    }
  }

  const roadGeo = register(new THREE.BufferGeometry());
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
  roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  roadGeo.setIndex(roadIndices);

  const roadTex = register(createRallyRoadTexture(palette, maxAnisotropy));
  const roadMat = register(
    new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.46,
      metalness: 0.12,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  const curbGeo = register(new THREE.BufferGeometry());
  curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbPositions, 3));
  curbGeo.setAttribute('normal', new THREE.Float32BufferAttribute(curbNormals, 3));
  curbGeo.setAttribute('uv', new THREE.Float32BufferAttribute(curbUvs, 2));
  curbGeo.setIndex(curbIndices);

  const curbTex = register(createCurbTexture(track.curbAccent, maxAnisotropy));
  const curbMat = register(
    new THREE.MeshStandardMaterial({
      map: curbTex,
      roughness: 0.65,
      side: THREE.DoubleSide,
    }),
  );
  const curbMesh = new THREE.Mesh(curbGeo, curbMat);
  curbMesh.receiveShadow = true;
  group.add(curbMesh);

  // 2b. Scattered Low-Poly Shoulder Pebbles (strictly outside asphalt curbs!)
  const roadPebbleCount = 180;
  const roadPebbleGeo = register(new THREE.DodecahedronGeometry(0.16, 0));
  const roadPebbleMat = register(
    new THREE.MeshStandardMaterial({
      color: palette.pebbleColor,
      roughness: 0.9,
      flatShading: true,
    }),
  );
  const roadPebbleInst = new THREE.InstancedMesh(
    roadPebbleGeo,
    roadPebbleMat,
    roadPebbleCount,
  );
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  for (let i = 0; i < roadPebbleCount; i++) {
    const s = samples[Math.floor((i / roadPebbleCount) * sampleCount) % sampleCount];
    const sideSign = i % 2 === 0 ? 1 : -1;
    const shoulderOffset = roadHalfW + curbW + 0.45 + ((i * 37) % 100) * 0.025;
    const px = s.point.x + s.normal.x * sideSign * shoulderOffset;
    const pz = s.point.z + s.normal.z * sideSign * shoulderOffset;
    const sc = 0.55 + ((i * 29) % 10) * 0.11;
    dummy.position.set(px, 0.04, pz);
    dummy.rotation.set(i * 0.4, i * 1.1, i * 0.3);
    dummy.scale.set(sc * 1.3, sc * 0.55, sc);
    dummy.updateMatrix();
    roadPebbleInst.setMatrixAt(i, dummy.matrix);
    tint.setHex(palette.pebbleColor).offsetHSL(0, 0, ((i % 5) - 2) * 0.04);
    roadPebbleInst.setColorAt(i, tint);
  }
  roadPebbleInst.instanceMatrix.needsUpdate = true;
  if (roadPebbleInst.instanceColor) roadPebbleInst.instanceColor.needsUpdate = true;
  roadPebbleInst.computeBoundingSphere();
  group.add(roadPebbleInst);

  // 3. Continuous Wooden Post-and-Rail Fences + Red/White Apex Corner Barriers
  const fenceSampleStep = 1; // Continuous ~3m segment spacing along both sides!
  const fenceSlots = Math.floor(sampleCount / fenceSampleStep) * 2;
  const segLen = (totalLen / sampleCount) * fenceSampleStep + 0.35;

  const postGeo = register(new THREE.BoxGeometry(0.24, 1.38, 0.24));
  const railGeo = register(new THREE.BoxGeometry(0.11, 0.14, segLen));
  const woodMat = register(
    new THREE.MeshStandardMaterial({
      color: palette.fenceWoodColor,
      roughness: 0.88,
      flatShading: true,
    }),
  );

  const barrierGeo = register(new THREE.BoxGeometry(0.68, 0.78, segLen * 0.92));
  const barrierMat = register(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.48,
      metalness: 0.06,
      flatShading: true,
    }),
  );

  const fencePostInst = new THREE.InstancedMesh(postGeo, woodMat, fenceSlots);
  const fenceTopRailInst = new THREE.InstancedMesh(railGeo, woodMat, fenceSlots);
  const fenceBotRailInst = new THREE.InstancedMesh(railGeo, woodMat, fenceSlots);
  const barrierInst = new THREE.InstancedMesh(barrierGeo, barrierMat, fenceSlots);

  fencePostInst.castShadow = true;
  barrierInst.castShadow = true;

  const accentColor = new THREE.Color(track.curbAccent);
  const whiteColor = new THREE.Color(0xf8fafc);

  for (let i = 0; i < fenceSlots; i++) {
    const sIdx = Math.floor(i / 2) * fenceSampleStep;
    const s = samples[sIdx % sampleCount];
    const side = i % 2 === 0 ? 1 : -1;
    const offset = roadHalfW + curbW + 0.85;
    const pos = s.point.clone().addScaledVector(s.normal, side * offset);

    // Prevent intersecting adjacent road bends
    let overlap = false;
    for (let j = 0; j < sampleCount; j += 6) {
      if (Math.abs(j - sIdx) < 10 || Math.abs(j - sIdx) > sampleCount - 10) continue;
      if (pos.distanceToSquared(samples[j].point) < (roadHalfW + 2.4) * (roadHalfW + 2.4)) {
        overlap = true;
        break;
      }
    }

    if (overlap) {
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      fencePostInst.setMatrixAt(i, dummy.matrix);
      fenceTopRailInst.setMatrixAt(i, dummy.matrix);
      fenceBotRailInst.setMatrixAt(i, dummy.matrix);
      barrierInst.setMatrixAt(i, dummy.matrix);
      continue;
    }

    const yaw = Math.atan2(s.tangent.x, s.tangent.z);
    let nearZone = false;
    for (let z = 0; z < track.clipZones.length; z++) {
      const dT = Math.abs(s.t - track.clipZones[z]);
      if (dT < 0.038 || dT > 0.962) {
        nearZone = true;
        break;
      }
    }

    if (nearZone && side === 1) {
      // Corner red/white barrier along apex turn!
      dummy.position.set(pos.x, 0.39, pos.z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      barrierInst.setMatrixAt(i, dummy.matrix);
      tint.copy(Math.floor(i / 2) % 2 === 0 ? accentColor : whiteColor);
      barrierInst.setColorAt(i, tint);

      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      fencePostInst.setMatrixAt(i, dummy.matrix);
      fenceTopRailInst.setMatrixAt(i, dummy.matrix);
      fenceBotRailInst.setMatrixAt(i, dummy.matrix);
    } else {
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      barrierInst.setMatrixAt(i, dummy.matrix);

      // Vertical fence post
      dummy.position.set(pos.x, 0.68, pos.z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      fencePostInst.setMatrixAt(i, dummy.matrix);

      // Dual horizontal wooden rails
      dummy.position.set(pos.x, 1.08, pos.z);
      dummy.updateMatrix();
      fenceTopRailInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(pos.x, 0.56, pos.z);
      dummy.updateMatrix();
      fenceBotRailInst.setMatrixAt(i, dummy.matrix);
    }
  }

  fencePostInst.instanceMatrix.needsUpdate = true;
  fenceTopRailInst.instanceMatrix.needsUpdate = true;
  fenceBotRailInst.instanceMatrix.needsUpdate = true;
  barrierInst.instanceMatrix.needsUpdate = true;
  if (barrierInst.instanceColor) barrierInst.instanceColor.needsUpdate = true;
  fencePostInst.computeBoundingSphere();
  fenceTopRailInst.computeBoundingSphere();
  fenceBotRailInst.computeBoundingSphere();
  barrierInst.computeBoundingSphere();
  group.add(fencePostInst, fenceTopRailInst, fenceBotRailInst, barrierInst);

  // 4. Start/Finish Rally Gantry Arch
  const startPt = curve.getPointAt(0);
  const startTan = curve.getTangentAt(0).normalize();
  const startHeading = Math.atan2(startTan.x, startTan.z);

  const gantryGroup = new THREE.Group();
  gantryGroup.position.copy(startPt);
  gantryGroup.rotation.y = startHeading;

  const pillarGeo = register(new THREE.CylinderGeometry(0.42, 0.54, 7.2, 8));
  const pillarMat = register(
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45, flatShading: true }),
  );
  const bannerGeo = register(new THREE.BoxGeometry(track.roadWidth + 4.4, 1.85, 1.1));
  const bannerMat = register(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(track.curbAccent),
      roughness: 0.35,
      flatShading: true,
    }),
  );

  [-1, 1].forEach((side) => {
    const p = new THREE.Mesh(pillarGeo, pillarMat);
    p.position.set(side * (roadHalfW + 2.1), 3.6, 0);
    p.castShadow = true;
    gantryGroup.add(p);
  });
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.set(0, 7.0, 0);
  banner.castShadow = true;
  gantryGroup.add(banner);
  group.add(gantryGroup);

  // 5. FR-Legends Style Inner Clip & Outer Zone Markers
  const clipZoneCenters: TrackWorld['clipZoneCenters'] = [];
  const innerPadGeo = register(new THREE.PlaneGeometry(3.8, 7.6));
  const outerPadGeo = register(new THREE.PlaneGeometry(4.4, 9.6));
  const innerZoneColor = 0xfbbf24; // Gold/Amber for Inner Clip (Nose)
  const outerZoneColor = 0x22d3ee; // Cyan for Outer Sweep Zone (Rear Bumper)

  const innerPadMat = register(
    new THREE.MeshBasicMaterial({
      color: innerZoneColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    }),
  );
  const outerPadMat = register(
    new THREE.MeshBasicMaterial({
      color: outerZoneColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    }),
  );
  const pylonGeo = register(new THREE.CylinderGeometry(0.22, 0.3, 3.6, 8));
  const innerPylonMat = register(
    new THREE.MeshStandardMaterial({
      color: innerZoneColor,
      emissive: innerZoneColor,
      emissiveIntensity: 0.72,
      roughness: 0.3,
      flatShading: true,
    }),
  );
  const outerPylonMat = register(
    new THREE.MeshStandardMaterial({
      color: outerZoneColor,
      emissive: outerZoneColor,
      emissiveIntensity: 0.72,
      roughness: 0.3,
      flatShading: true,
    }),
  );
  const beaconGeo = register(new THREE.OctahedronGeometry(0.45, 0));

  track.clipZones.forEach((tVal, idx) => {
    const pos = curve.getPointAt(tVal);
    const tan = curve.getTangentAt(tVal).normalize();
    const tanPrev = curve.getTangentAt((tVal - 0.02 + 1) % 1).normalize();
    const tanNext = curve.getTangentAt((tVal + 0.02) % 1).normalize();
    const norm = new THREE.Vector3().crossVectors(up, tan).normalize();

    // Determine inside vs outside of the corner using cross product Y
    const bendCrossY = tanPrev.z * tanNext.x - tanPrev.x * tanNext.z;
    const insideSign = bendCrossY >= 0 ? 1 : -1;
    const zoneType: 'inner' | 'outer' = idx % 2 === 0 ? 'inner' : 'outer';
    const sideSign = zoneType === 'inner' ? insideSign : -insideSign;
    const latOffset =
      zoneType === 'inner'
        ? roadHalfW - 1.9
        : roadHalfW - 1.6;

    const zoneCenter = pos.clone().addScaledVector(norm, sideSign * latOffset);
    const yaw = Math.atan2(tan.x, tan.z);

    const pad = new THREE.Mesh(
      zoneType === 'inner' ? innerPadGeo : outerPadGeo,
      zoneType === 'inner' ? innerPadMat : outerPadMat,
    );
    pad.position.set(zoneCenter.x, 0.055, zoneCenter.z);
    pad.rotation.order = 'YXZ';
    pad.rotation.y = yaw;
    pad.rotation.x = -Math.PI / 2;
    group.add(pad);

    // Pylon + glowing floating diamond on road edge beside zone
    const edgePos = pos.clone().addScaledVector(norm, sideSign * (roadHalfW + 0.95));
    const pMat = zoneType === 'inner' ? innerPylonMat : outerPylonMat;
    [-3.4, 3.4].forEach((along) => {
      const pylon = new THREE.Mesh(pylonGeo, pMat);
      pylon.position.copy(edgePos).addScaledVector(tan, along);
      pylon.position.y = 1.8;
      group.add(pylon);
    });

    const beacon = new THREE.Mesh(beaconGeo, pMat);
    beacon.position.set(edgePos.x, 4.1, edgePos.z);
    group.add(beacon);

    clipZoneCenters.push({
      pos: zoneCenter,
      t: tVal,
      radius: zoneType === 'inner' ? 4.4 : 4.9,
      zoneType,
    });
  });

  // 6. Sculpted Roadside Low-Poly Cliffs, Mountain Ridges & Mossy Bushes
  const cliffBlockGeo = register(new THREE.DodecahedronGeometry(1, 0));
  const cliffMat = register(
    new THREE.MeshStandardMaterial({
      color: palette.cliffColor,
      roughness: 0.92,
      flatShading: true,
    }),
  );
  const cliffCount = 92;
  const cliffInst = new THREE.InstancedMesh(cliffBlockGeo, cliffMat, cliffCount);
  cliffInst.castShadow = true;
  cliffInst.receiveShadow = true;

  const bushGeo = register(new THREE.IcosahedronGeometry(1, 0));
  const bushMat = register(
    new THREE.MeshStandardMaterial({
      color: palette.bushColor,
      roughness: 0.85,
      flatShading: true,
    }),
  );
  const bushCount = 140;
  const bushInst = new THREE.InstancedMesh(bushGeo, bushMat, bushCount);
  bushInst.castShadow = true;

  interface CliffSpot {
    x: number;
    yTop: number;
    z: number;
  }
  const cliffTopSpots: CliffSpot[] = [];

  for (let i = 0; i < cliffCount; i++) {
    const sIdx = Math.floor((i / cliffCount) * sampleCount);
    const s = samples[sIdx];
    // Favor one side (right cliff wall) plus dramatic outer turns
    const side = i % 5 === 0 ? -1 : 1;
    const dist = roadHalfW + curbW + 12 + (i % 4) * 5.2;
    const px = s.point.x + s.normal.x * side * dist;
    const pz = s.point.z + s.normal.z * side * dist;

    if (!isClearOfRoad(px, pz, roadHalfW + 10.5)) {
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      cliffInst.setMatrixAt(i, dummy.matrix);
      continue;
    }

    const w = 7.5 + ((i * 19) % 7) * 1.4;
    const h = 8.0 + ((i * 23) % 9) * 1.9;
    const d = 8.0 + ((i * 13) % 6) * 1.5;
    dummy.position.set(px, h * 0.42, pz);
    dummy.rotation.set((i % 3) * 0.12, i * 0.7, ((i + 1) % 3) * 0.08);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    cliffInst.setMatrixAt(i, dummy.matrix);
    tint.setHex(palette.cliffColor).offsetHSL(0, 0, ((i % 4) - 1.5) * 0.035);
    cliffInst.setColorAt(i, tint);

    if (i % 2 === 0) {
      cliffTopSpots.push({ x: px, yTop: h * 0.82, z: pz });
    }
  }
  cliffInst.instanceMatrix.needsUpdate = true;
  if (cliffInst.instanceColor) cliffInst.instanceColor.needsUpdate = true;
  cliffInst.computeBoundingSphere();
  group.add(cliffInst);

  for (let i = 0; i < bushCount; i++) {
    const s = samples[Math.floor((i / bushCount) * sampleCount) % sampleCount];
    const side = i % 2 === 0 ? 1 : -1;
    const dist = roadHalfW + curbW + 3.4 + (i % 6) * 1.6;
    const px = s.point.x + s.normal.x * side * dist;
    const pz = s.point.z + s.normal.z * side * dist;

    if (!isClearOfRoad(px, pz, roadHalfW + 3.2)) {
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      bushInst.setMatrixAt(i, dummy.matrix);
      continue;
    }

    const sc = 0.85 + ((i * 17) % 8) * 0.18;
    dummy.position.set(px, sc * 0.55, pz);
    dummy.rotation.set(i * 0.5, i * 1.2, 0);
    dummy.scale.set(sc * 1.3, sc * 0.85, sc * 1.15);
    dummy.updateMatrix();
    bushInst.setMatrixAt(i, dummy.matrix);
    tint.setHex(palette.bushColor).offsetHSL(((i % 3) - 1) * 0.02, 0, ((i % 4) - 1.5) * 0.035);
    bushInst.setColorAt(i, tint);
  }
  bushInst.instanceMatrix.needsUpdate = true;
  if (bushInst.instanceColor) bushInst.instanceColor.needsUpdate = true;
  bushInst.computeBoundingSphere();
  group.add(bushInst);

  // Distant Rolling Mountains Ring
  const mountainGeo = register(new THREE.ConeGeometry(68, 72, 6));
  const mountainMat = register(
    new THREE.MeshStandardMaterial({
      color: palette.distantHillColor,
      roughness: 0.96,
      flatShading: true,
    }),
  );
  const mountainCount = 24;
  const mountainInst = new THREE.InstancedMesh(mountainGeo, mountainMat, mountainCount);
  for (let m = 0; m < mountainCount; m++) {
    const ang = (m / mountainCount) * Math.PI * 2;
    const rad = 310 + (m % 3) * 55;
    const mx = Math.cos(ang) * rad;
    const mz = Math.sin(ang) * rad;
    const sc = 0.9 + (m % 4) * 0.35;
    dummy.position.set(mx, 28 * sc, mz);
    dummy.rotation.set(0, m * 0.8, 0);
    dummy.scale.set(sc * 1.35, sc, sc * 1.2);
    dummy.updateMatrix();
    mountainInst.setMatrixAt(m, dummy.matrix);
  }
  mountainInst.instanceMatrix.needsUpdate = true;
  mountainInst.computeBoundingSphere();
  group.add(mountainInst);

  // 7. Two Distinct Swaying Low-Poly Tree Types (3-Tier Pines + Rounded Broadleaf Oaks)
  const trunkGeo = register(new THREE.CylinderGeometry(0.36, 0.56, 3.6, 6));
  const trunkMat = register(
    new THREE.MeshStandardMaterial({
      color: palette.trunkColor,
      roughness: 0.9,
      flatShading: true,
    }),
  );

  // 7a. 3-Tier Pines (on hills & cliff ledges)
  const pineCount = 110;
  const pineTier1Geo = register(new THREE.ConeGeometry(2.6, 3.8, 7));
  const pineTier2Geo = register(new THREE.ConeGeometry(2.05, 3.4, 7));
  const pineTier3Geo = register(new THREE.ConeGeometry(1.45, 2.9, 7));
  const pineMat = register(
    new THREE.MeshStandardMaterial({
      color: palette.pineColor,
      roughness: 0.82,
      flatShading: true,
    }),
  );

  const pineTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, pineCount);
  const pineTier1 = new THREE.InstancedMesh(pineTier1Geo, pineMat, pineCount);
  const pineTier2 = new THREE.InstancedMesh(pineTier2Geo, pineMat, pineCount);
  const pineTier3 = new THREE.InstancedMesh(pineTier3Geo, pineMat, pineCount);
  pineTrunks.castShadow = true;
  pineTier1.castShadow = true;
  pineTier2.castShadow = true;
  pineTier3.castShadow = true;
  pineTier1.frustumCulled = false;
  pineTier2.frustumCulled = false;
  pineTier3.frustumCulled = false;

  interface SwayTreeEntry {
    x: number;
    y: number;
    z: number;
    scale: number;
    phase: number;
    active: boolean;
  }
  const pineEntries: SwayTreeEntry[] = [];

  for (let i = 0; i < pineCount; i++) {
    let px: number;
    let py = 0;
    let pz: number;
    let valid = true;

    if (i < cliffTopSpots.length && i % 2 === 0) {
      const spot = cliffTopSpots[i];
      px = spot.x;
      py = spot.yTop * 0.72;
      pz = spot.z;
    } else {
      const s = samples[Math.floor((i / pineCount) * sampleCount) % sampleCount];
      const side = i % 2 === 0 ? 1 : -1;
      const dist = roadHalfW + curbW + 10.5 + (i % 5) * 4.5;
      px = s.point.x + s.normal.x * side * dist;
      pz = s.point.z + s.normal.z * side * dist;
      valid = isClearOfRoad(px, pz, roadHalfW + 8.0);
    }

    const scale = 0.88 + ((i * 31) % 9) * 0.08;
    pineEntries.push({
      x: px,
      y: py,
      z: pz,
      scale,
      phase: i * 0.65,
      active: valid,
    });

    if (!valid) {
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      pineTrunks.setMatrixAt(i, dummy.matrix);
    } else {
      dummy.position.set(px, py + 1.8 * scale, pz);
      dummy.rotation.set(0, i * 0.9, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      pineTrunks.setMatrixAt(i, dummy.matrix);
      tint.setHex(palette.pineColor).offsetHSL(0, 0, ((i % 4) - 1.5) * 0.04);
      pineTier1.setColorAt(i, tint);
      pineTier2.setColorAt(i, tint);
      pineTier3.setColorAt(i, tint);
    }
  }
  pineTrunks.instanceMatrix.needsUpdate = true;
  if (pineTier1.instanceColor) pineTier1.instanceColor.needsUpdate = true;
  if (pineTier2.instanceColor) pineTier2.instanceColor.needsUpdate = true;
  if (pineTier3.instanceColor) pineTier3.instanceColor.needsUpdate = true;
  pineTrunks.computeBoundingSphere();
  group.add(pineTrunks, pineTier1, pineTier2, pineTier3);

  // 7b. Chunky Rounded Broadleaf / Oak Trees (behind wooden fences like reference left hillside)
  const oakCount = 58;
  const oakPuffGeo = register(new THREE.IcosahedronGeometry(2.1, 0));
  const oakMat = register(
    new THREE.MeshStandardMaterial({
      color: palette.oakColor,
      roughness: 0.78,
      flatShading: true,
    }),
  );
  const oakTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, oakCount);
  const oakPuffA = new THREE.InstancedMesh(oakPuffGeo, oakMat, oakCount);
  const oakPuffB = new THREE.InstancedMesh(oakPuffGeo, oakMat, oakCount);
  oakTrunks.castShadow = true;
  oakPuffA.castShadow = true;
  oakPuffB.castShadow = true;
  oakPuffA.frustumCulled = false;
  oakPuffB.frustumCulled = false;

  const oakEntries: SwayTreeEntry[] = [];
  for (let i = 0; i < oakCount; i++) {
    const s = samples[Math.floor((i / oakCount) * sampleCount) % sampleCount];
    const side = -1; // Favor left grassy hillside opposite cliffs
    const dist = roadHalfW + curbW + 6.5 + (i % 5) * 3.8;
    const px = s.point.x + s.normal.x * side * dist;
    const pz = s.point.z + s.normal.z * side * dist;
    const valid = isClearOfRoad(px, pz, roadHalfW + 5.8);
    const scale = 0.82 + ((i * 23) % 8) * 0.08;

    oakEntries.push({
      x: px,
      y: 0,
      z: pz,
      scale,
      phase: i * 1.15,
      active: valid,
    });

    if (!valid) {
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      oakTrunks.setMatrixAt(i, dummy.matrix);
    } else {
      dummy.position.set(px, 1.8 * scale, pz);
      dummy.rotation.set(0, i * 1.3, 0);
      dummy.scale.set(scale * 1.15, scale, scale * 1.15);
      dummy.updateMatrix();
      oakTrunks.setMatrixAt(i, dummy.matrix);
      tint.setHex(palette.oakColor).offsetHSL(((i % 3) - 1) * 0.015, 0, ((i % 4) - 1.5) * 0.035);
      oakPuffA.setColorAt(i, tint);
      oakPuffB.setColorAt(i, tint);
    }
  }
  oakTrunks.instanceMatrix.needsUpdate = true;
  if (oakPuffA.instanceColor) oakPuffA.instanceColor.needsUpdate = true;
  if (oakPuffB.instanceColor) oakPuffB.instanceColor.needsUpdate = true;
  oakTrunks.computeBoundingSphere();
  group.add(oakTrunks, oakPuffA, oakPuffB);

  // 8. Dense Animated Cheering Spectators & 3-Segment Rippling Flags
  interface SpectatorEntry {
    x: number;
    z: number;
    yaw: number;
    phase: number;
    hasFlag: boolean;
  }
  const spectators: SpectatorEntry[] = [];
  const specTs = [
    0.025,
    0.085,
    ...track.clipZones,
    (track.clipZones[0] + 0.07) % 1,
    (track.clipZones[2] + 0.06) % 1,
  ];
  specTs.forEach((tCenter, gIdx) => {
    const side = gIdx % 2 === 0 ? -1 : 1;
    for (let k = -4; k <= 4; k++) {
      const tVal = (tCenter + k * 0.0052 + 1) % 1;
      const p = curve.getPointAt(tVal);
      const tan = curve.getTangentAt(tVal).normalize();
      const norm = new THREE.Vector3().crossVectors(up, tan).normalize();
      const sPos = p
        .clone()
        .addScaledVector(norm, side * (roadHalfW + curbW + 2.35 + (Math.abs(k) % 2) * 0.45));

      if (isClearOfRoad(sPos.x, sPos.z, roadHalfW + 2.1)) {
        spectators.push({
          x: sPos.x,
          z: sPos.z,
          yaw: Math.atan2(-side * norm.x, -side * norm.z),
          phase: gIdx * 1.9 + k * 0.72,
          hasFlag: k === -2 || k === 0 || k === 2,
        });
      }
    }
  });

  const specCount = Math.max(1, spectators.length);
  const legGeo = register(new THREE.BoxGeometry(0.42, 0.56, 0.24));
  const torsoGeo = register(new THREE.BoxGeometry(0.48, 0.62, 0.28));
  const headGeo = register(new THREE.IcosahedronGeometry(0.21, 0));
  const armGeo = register(new THREE.BoxGeometry(0.13, 0.5, 0.13));
  armGeo.translate(0, 0.22, 0);

  const poleGeo = register(new THREE.CylinderGeometry(0.03, 0.03, 1.55, 6));
  poleGeo.translate(0, 0.75, 0);
  const flagSegGeo = register(new THREE.BoxGeometry(0.03, 0.48, 0.28));

  const specLegMat = register(
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, flatShading: true }),
  );
  const specBodyMat = register(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, flatShading: true }),
  );
  const specHeadMat = register(
    new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.75, flatShading: true }),
  );
  const poleMat = register(
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8, flatShading: true }),
  );
  const specFlagMat = register(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, flatShading: true }),
  );

  const specLegs = new THREE.InstancedMesh(legGeo, specLegMat, specCount);
  const specBodies = new THREE.InstancedMesh(torsoGeo, specBodyMat, specCount);
  const specHeads = new THREE.InstancedMesh(headGeo, specHeadMat, specCount);
  const specArmsL = new THREE.InstancedMesh(armGeo, specBodyMat, specCount);
  const specArmsR = new THREE.InstancedMesh(armGeo, specBodyMat, specCount);
  const specPoles = new THREE.InstancedMesh(poleGeo, poleMat, specCount);
  const specFlagS1 = new THREE.InstancedMesh(flagSegGeo, specFlagMat, specCount);
  const specFlagS2 = new THREE.InstancedMesh(flagSegGeo, specFlagMat, specCount);
  const specFlagS3 = new THREE.InstancedMesh(flagSegGeo, specFlagMat, specCount);

  [
    specLegs,
    specBodies,
    specHeads,
    specArmsL,
    specArmsR,
    specPoles,
    specFlagS1,
    specFlagS2,
    specFlagS3,
  ].forEach((m) => {
    m.frustumCulled = false;
  });

  const shirtPalette = [0xef4444, 0x2563eb, 0xf59e0b, 0x10b981, 0xf8fafc, 0xf97316];
  spectators.forEach((_sp, idx) => {
    tint.setHex(shirtPalette[idx % shirtPalette.length]);
    specBodies.setColorAt(idx, tint);
    specArmsL.setColorAt(idx, tint);
    specArmsR.setColorAt(idx, tint);

    const isBlueRed = idx % 2 === 0;
    specFlagS1.setColorAt(idx, tint.setHex(isBlueRed ? 0x2563eb : 0xef4444));
    specFlagS2.setColorAt(idx, tint.setHex(isBlueRed ? 0xef4444 : 0xf8fafc));
    specFlagS3.setColorAt(idx, tint.setHex(isBlueRed ? 0xf8fafc : 0xef4444));
  });
  [specBodies, specArmsL, specArmsR, specFlagS1, specFlagS2, specFlagS3].forEach((m) => {
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  if (spectators.length > 0) {
    group.add(
      specLegs,
      specBodies,
      specHeads,
      specArmsL,
      specArmsR,
      specPoles,
      specFlagS1,
      specFlagS2,
      specFlagS3,
    );
  }

  // 9. Animated Corner Dust Plumes + Windblown Sunlit Motes / Sakura Petals
  const cornerDustCount = 36;
  const cornerDustGeo = register(new THREE.IcosahedronGeometry(0.95, 0));
  const cornerDustMat = register(
    new THREE.MeshStandardMaterial({
      color: palette.dustColor,
      roughness: 0.95,
      flatShading: true,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    }),
  );
  const cornerDustInst = new THREE.InstancedMesh(
    cornerDustGeo,
    cornerDustMat,
    cornerDustCount,
  );
  cornerDustInst.frustumCulled = false;

  const cornerDustAnchors = Array.from({ length: cornerDustCount }, (_, i) => {
    const zIdx = i % track.clipZones.length;
    const tBase = (track.clipZones[zIdx] + ((i % 9) - 4) * 0.006 + 1) % 1;
    const p = curve.getPointAt(tBase);
    const tan = curve.getTangentAt(tBase).normalize();
    const norm = new THREE.Vector3().crossVectors(up, tan).normalize();
    return {
      x: p.x + norm.x * (roadHalfW * 0.85),
      z: p.z + norm.z * (roadHalfW * 0.85),
      vx: tan.x * 2.2 + norm.x * 0.6,
      vz: tan.z * 2.2 + norm.z * 0.6,
      phase: i * 0.43,
    };
  });
  group.add(cornerDustInst);

  const moteCount = 120;
  const moteGeo = register(
    track.propTheme === 'sakura'
      ? new THREE.BoxGeometry(0.18, 0.03, 0.14)
      : new THREE.DodecahedronGeometry(0.09, 0),
  );
  const moteMat = register(
    new THREE.MeshBasicMaterial({
      color: palette.moteColor,
      transparent: true,
      opacity: 0.72,
    }),
  );
  const moteInst = new THREE.InstancedMesh(moteGeo, moteMat, moteCount);
  moteInst.frustumCulled = false;
  const motes = Array.from({ length: moteCount }, (_, i) => {
    const s = samples[Math.floor((i / moteCount) * sampleCount) % sampleCount];
    const lat = ((i % 7) - 3) * (roadHalfW * 0.45);
    return {
      baseX: s.point.x + s.normal.x * lat,
      baseY: 1.2 + (i % 5) * 1.4,
      baseZ: s.point.z + s.normal.z * lat,
      phase: i * 0.7,
    };
  });
  group.add(moteInst);

  // 10. Low-Poly Faceted Clouds gliding & bobbing smoothly across the sky
  const cloudCount = 22;
  const cloudPuffGeo = register(new THREE.IcosahedronGeometry(13, 0));
  const cloudMat = register(
    new THREE.MeshStandardMaterial({
      color: track.propTheme === 'neon' ? 0x475569 : 0xf8fafc,
      roughness: 0.92,
      flatShading: true,
    }),
  );
  const cloudsGroup = new THREE.Group();
  const cloudItems: { mesh: THREE.Group; baseX: number; baseY: number; speed: number }[] = [];
  for (let c = 0; c < cloudCount; c++) {
    const cg = new THREE.Group();
    const angle = (c / cloudCount) * Math.PI * 2;
    const rad = 220 + (c % 3) * 85;
    const bx = Math.cos(angle) * rad;
    const bz = Math.sin(angle) * rad;
    const by = 68 + (c % 4) * 14;

    for (let p = 0; p < 4; p++) {
      const puff = new THREE.Mesh(cloudPuffGeo, cloudMat);
      puff.position.set((p - 1.5) * 12, p === 1 || p === 2 ? 4.5 : 0, (p % 2) * 5);
      puff.scale.set(1.3 - Math.abs(p - 1.5) * 0.16, 0.72, 0.9);
      cg.add(puff);
    }
    cg.position.set(bx, by, bz);
    cloudsGroup.add(cg);
    cloudItems.push({ mesh: cg, baseX: bx, baseY: by, speed: 1.8 + (c % 4) * 0.65 });
  }
  group.add(cloudsGroup);

  // Track-specific iconic landmarks
  if (track.propTheme === 'harbor') {
    const lhBase = new THREE.Mesh(
      register(new THREE.CylinderGeometry(4.2, 5.8, 28, 10)),
      register(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, flatShading: true })),
    );
    lhBase.position.set(0, 14, 240);
    const lhStripe = new THREE.Mesh(
      register(new THREE.CylinderGeometry(4.6, 5.1, 8, 10)),
      register(new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5, flatShading: true })),
    );
    lhStripe.position.set(0, 14, 240);
    group.add(lhBase, lhStripe);
  } else if (track.propTheme === 'sakura') {
    const mtGeo = register(new THREE.ConeGeometry(95, 78, 10));
    const mtMat = register(new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, flatShading: true }));
    const mt = new THREE.Mesh(mtGeo, mtMat);
    mt.position.set(0, 38, -320);
    const capGeo = register(new THREE.ConeGeometry(34, 28, 10));
    const capMat = register(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7, flatShading: true }));
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 64, -320);
    group.add(mt, cap);
  }

  // Zero-GC Animation Loop Update
  const animDummy = new THREE.Object3D();
  const update = (elapsed: number) => {
    // A. Swaying 3-Tier Pines
    for (let i = 0; i < pineEntries.length; i++) {
      const pe = pineEntries[i];
      if (!pe.active) {
        animDummy.scale.set(0, 0, 0);
        animDummy.updateMatrix();
        pineTier1.setMatrixAt(i, animDummy.matrix);
        pineTier2.setMatrixAt(i, animDummy.matrix);
        pineTier3.setMatrixAt(i, animDummy.matrix);
        continue;
      }
      const sway = Math.sin(elapsed * 1.45 + pe.phase) * 0.045;
      const swayZ = Math.cos(elapsed * 1.15 + pe.phase) * 0.032;

      animDummy.position.set(pe.x, pe.y + 4.0 * pe.scale, pe.z);
      animDummy.rotation.set(swayZ * 0.6, pe.phase, sway * 0.6);
      animDummy.scale.set(pe.scale, pe.scale, pe.scale);
      animDummy.updateMatrix();
      pineTier1.setMatrixAt(i, animDummy.matrix);

      animDummy.position.set(pe.x, pe.y + 6.1 * pe.scale, pe.z);
      animDummy.rotation.set(swayZ, pe.phase + 0.5, sway);
      animDummy.updateMatrix();
      pineTier2.setMatrixAt(i, animDummy.matrix);

      animDummy.position.set(pe.x, pe.y + 7.9 * pe.scale, pe.z);
      animDummy.rotation.set(swayZ * 1.35, pe.phase + 1.0, sway * 1.35);
      animDummy.updateMatrix();
      pineTier3.setMatrixAt(i, animDummy.matrix);
    }
    pineTier1.instanceMatrix.needsUpdate = true;
    pineTier2.instanceMatrix.needsUpdate = true;
    pineTier3.instanceMatrix.needsUpdate = true;

    // B. Swaying Rounded Broadleaf Oaks
    for (let i = 0; i < oakEntries.length; i++) {
      const oe = oakEntries[i];
      if (!oe.active) {
        animDummy.scale.set(0, 0, 0);
        animDummy.updateMatrix();
        oakPuffA.setMatrixAt(i, animDummy.matrix);
        oakPuffB.setMatrixAt(i, animDummy.matrix);
        continue;
      }
      const sway = Math.sin(elapsed * 1.3 + oe.phase) * 0.055;
      animDummy.position.set(oe.x, 4.3 * oe.scale, oe.z);
      animDummy.rotation.set(sway * 0.6, oe.phase, sway);
      animDummy.scale.set(oe.scale * 1.15, oe.scale * 0.86, oe.scale * 1.15);
      animDummy.updateMatrix();
      oakPuffA.setMatrixAt(i, animDummy.matrix);

      animDummy.position.set(
        oe.x + Math.cos(oe.phase) * 1.1 * oe.scale,
        5.1 * oe.scale,
        oe.z + Math.sin(oe.phase) * 1.1 * oe.scale,
      );
      animDummy.scale.set(oe.scale * 0.84, oe.scale * 0.72, oe.scale * 0.84);
      animDummy.updateMatrix();
      oakPuffB.setMatrixAt(i, animDummy.matrix);
    }
    oakPuffA.instanceMatrix.needsUpdate = true;
    oakPuffB.instanceMatrix.needsUpdate = true;

    // C. Cheering Spectators & 3-Segment Cloth-Rippling Flags
    for (let i = 0; i < spectators.length; i++) {
      const sp = spectators[i];
      const jump = Math.abs(Math.sin(elapsed * 4.8 + sp.phase)) * 0.22;
      const wave = Math.sin(elapsed * 7.5 + sp.phase) * 0.42;

      animDummy.position.set(sp.x, 0.28 + jump * 0.4, sp.z);
      animDummy.rotation.set(0, sp.yaw, 0);
      animDummy.scale.set(1, 1, 1);
      animDummy.updateMatrix();
      specLegs.setMatrixAt(i, animDummy.matrix);

      animDummy.position.set(sp.x, 0.84 + jump, sp.z);
      animDummy.updateMatrix();
      specBodies.setMatrixAt(i, animDummy.matrix);

      animDummy.position.set(sp.x, 1.36 + jump, sp.z);
      animDummy.updateMatrix();
      specHeads.setMatrixAt(i, animDummy.matrix);

      const cosY = Math.cos(sp.yaw);
      const sinY = Math.sin(sp.yaw);

      // Cheering arms
      animDummy.position.set(sp.x - cosY * 0.31, 1.04 + jump, sp.z + sinY * 0.31);
      animDummy.rotation.set(0, sp.yaw, 0.55 + wave * 0.42);
      animDummy.updateMatrix();
      specArmsL.setMatrixAt(i, animDummy.matrix);

      animDummy.position.set(sp.x + cosY * 0.31, 1.04 + jump, sp.z - sinY * 0.31);
      animDummy.rotation.set(0, sp.yaw, -0.55 - wave * 0.48);
      animDummy.updateMatrix();
      specArmsR.setMatrixAt(i, animDummy.matrix);

      if (sp.hasFlag) {
        const px = sp.x + cosY * 0.36;
        const pz = sp.z - sinY * 0.36;
        const py = 1.15 + jump;
        const poleTilt = -0.22 - wave * 0.18;

        animDummy.position.set(px, py, pz);
        animDummy.rotation.set(wave * 0.18, sp.yaw, poleTilt);
        animDummy.scale.set(1, 1, 1);
        animDummy.updateMatrix();
        specPoles.setMatrixAt(i, animDummy.matrix);

        // 3 articulated fluttering flag segments
        const r1 = Math.sin(elapsed * 9.0 + sp.phase) * 0.24;
        const r2 = Math.sin(elapsed * 9.0 + sp.phase - 0.85) * 0.34;
        const r3 = Math.sin(elapsed * 9.0 + sp.phase - 1.7) * 0.46;

        const topY = py + 1.28;
        animDummy.position.set(px + sinY * 0.16, topY, pz + cosY * 0.16);
        animDummy.rotation.set(0, sp.yaw + r1, poleTilt * 0.4);
        animDummy.updateMatrix();
        specFlagS1.setMatrixAt(i, animDummy.matrix);

        animDummy.position.set(px + sinY * 0.42, topY + r1 * 0.08, pz + cosY * 0.42);
        animDummy.rotation.set(0, sp.yaw + r2, poleTilt * 0.4);
        animDummy.updateMatrix();
        specFlagS2.setMatrixAt(i, animDummy.matrix);

        animDummy.position.set(px + sinY * 0.68, topY + r2 * 0.12, pz + cosY * 0.68);
        animDummy.rotation.set(0, sp.yaw + r3, poleTilt * 0.4);
        animDummy.updateMatrix();
        specFlagS3.setMatrixAt(i, animDummy.matrix);
      } else {
        animDummy.scale.set(0, 0, 0);
        animDummy.updateMatrix();
        specPoles.setMatrixAt(i, animDummy.matrix);
        specFlagS1.setMatrixAt(i, animDummy.matrix);
        specFlagS2.setMatrixAt(i, animDummy.matrix);
        specFlagS3.setMatrixAt(i, animDummy.matrix);
      }
    }

    if (spectators.length > 0) {
      specLegs.instanceMatrix.needsUpdate = true;
      specBodies.instanceMatrix.needsUpdate = true;
      specHeads.instanceMatrix.needsUpdate = true;
      specArmsL.instanceMatrix.needsUpdate = true;
      specArmsR.instanceMatrix.needsUpdate = true;
      specPoles.instanceMatrix.needsUpdate = true;
      specFlagS1.instanceMatrix.needsUpdate = true;
      specFlagS2.instanceMatrix.needsUpdate = true;
      specFlagS3.instanceMatrix.needsUpdate = true;
    }

    // D. Looping Swirling Corner Dust Haze along drift turns
    for (let i = 0; i < cornerDustCount; i++) {
      const a = cornerDustAnchors[i];
      const life = ((elapsed * 0.55 + a.phase) % 1);
      const s = Math.sin(life * Math.PI) * 1.45;
      animDummy.position.set(
        a.x + a.vx * life * 2.2,
        0.5 + life * 2.4,
        a.z + a.vz * life * 2.2,
      );
      animDummy.rotation.set(life * 2, life * 1.5, 0);
      animDummy.scale.set(s, s * 0.72, s);
      animDummy.updateMatrix();
      cornerDustInst.setMatrixAt(i, animDummy.matrix);
    }
    cornerDustInst.instanceMatrix.needsUpdate = true;

    // E. Windblown Dust Motes / Falling Sakura Petals
    for (let i = 0; i < moteCount; i++) {
      const m = motes[i];
      const driftX = Math.sin(elapsed * 0.7 + m.phase) * 3.5;
      const driftZ = Math.cos(elapsed * 0.6 + m.phase) * 3.5;
      const fallY =
        track.propTheme === 'sakura'
          ? ((m.baseY - elapsed * 0.8 + m.phase) % 6 + 6) % 6
          : m.baseY + Math.sin(elapsed * 1.3 + m.phase) * 0.45;
      animDummy.position.set(m.baseX + driftX, fallY + 0.25, m.baseZ + driftZ);
      animDummy.rotation.set(elapsed + m.phase, elapsed * 1.4, 0);
      animDummy.scale.set(1, 1, 1);
      animDummy.updateMatrix();
      moteInst.setMatrixAt(i, animDummy.matrix);
    }
    moteInst.instanceMatrix.needsUpdate = true;

    // F. Gliding & Bobbing Low-Poly Clouds
    for (let c = 0; c < cloudItems.length; c++) {
      const ci = cloudItems[c];
      ci.mesh.position.x = ci.baseX + Math.sin(elapsed * 0.04 * ci.speed + c) * 36;
      ci.mesh.position.y = ci.baseY + Math.sin(elapsed * 0.25 + c) * 1.6;
    }
  };

  update(0);

  return {
    group,
    curve,
    samples,
    clipZoneCenters,
    startPosition: new THREE.Vector3(startPt.x, 0, startPt.z),
    startHeading,
    getTrackInfo: (x: number, z: number) => {
      let bestDistSq = Infinity;
      let bestIdx = 0;
      for (let i = 0; i < samples.length; i++) {
        const dx = x - samples[i].point.x;
        const dz = z - samples[i].point.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = i;
        }
      }
      const best = samples[bestIdx];
      let activeClipZoneIndex = -1;
      let activeClipZoneType: 'inner' | 'outer' | null = null;
      for (let zIdx = 0; zIdx < clipZoneCenters.length; zIdx++) {
        const cz = clipZoneCenters[zIdx];
        const dx = x - cz.pos.x;
        const dz = z - cz.pos.z;
        if (dx * dx + dz * dz <= cz.radius * cz.radius) {
          activeClipZoneIndex = zIdx;
          activeClipZoneType = cz.zoneType;
          break;
        }
      }
      return {
        distFromCenter: Math.sqrt(bestDistSq),
        closestPoint: best.point,
        tangent: best.tangent,
        t: best.t,
        activeClipZoneIndex,
        activeClipZoneType,
      };
    },
    update,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
