import * as THREE from 'three';

/**
 * Bright low-poly garage environment for the Workshop showroom.
 * Everything is built from flat-shaded primitives, no external assets.
 * The garage sits behind the turntable (relative to the default camera)
 * and faces the car.
 */

function makeRng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const flat = (color: number, roughness = 0.85, metalness = 0.04) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });

function box(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function makeTire(mat: THREE.Material, x: number, y: number, z: number, lying = true): THREE.Mesh {
  const t = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.13, 6, 14), mat);
  if (lying) t.rotation.x = Math.PI / 2;
  t.position.set(x, y, z);
  return t;
}

function makeSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#8a5a2e';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#6f4522';
    for (const y of [0, 84, 170, 252]) ctx.fillRect(0, y, 512, 4);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 88px Arial, Helvetica, sans-serif';
    ctx.fillStyle = 'rgba(60,32,12,0.55)';
    ctx.fillText('BENGKEL', 260, 90);
    ctx.fillText('GARASI', 260, 190);
    ctx.fillStyle = '#fbf1dc';
    ctx.fillText('BENGKEL', 256, 84);
    ctx.fillText('GARASI', 256, 184);
  }
  const tex = new THREE.CanvasTexture(ctx ? canvas : canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function buildGarage(): THREE.Group {
  const g = new THREE.Group();
  const W = 8;
  const D = 6;
  const WH = 3.6;
  const T = 0.3;
  const ROOF_H = 2.2;

  const wall = flat(0xe9ddc6, 0.9, 0);
  const trim = flat(0xcdbd9f, 0.9, 0);
  const roofMat = flat(0xc4552d, 0.8, 0.02);
  const roofRidge = flat(0x8c3b1e, 0.8, 0.02);
  const concrete = flat(0xa8a8a2, 0.95, 0);
  const wood = flat(0xa9773f, 0.9, 0);
  const tireMat = flat(0x2b2b30, 0.95, 0);
  const redMat = flat(0xcc2f2a, 0.5, 0.25);
  const blueMat = flat(0x2563b8, 0.5, 0.25);
  const metal = flat(0x8b95a1, 0.4, 0.6);

  // Walls
  g.add(box(W, WH, T, wall, 0, WH / 2, -D / 2 + T / 2));
  g.add(box(T, WH, D, wall, -(W / 2 - T / 2), WH / 2, 0));
  g.add(box(T, WH, D, wall, W / 2 - T / 2, WH / 2, 0));
  const opening = 5;
  const pillarW = (W - opening) / 2;
  g.add(box(pillarW, WH, T, wall, -(opening / 2 + pillarW / 2), WH / 2, D / 2 - T / 2));
  g.add(box(pillarW, WH, T, wall, opening / 2 + pillarW / 2, WH / 2, D / 2 - T / 2));
  g.add(box(opening, WH - 3, T, wall, 0, 3 + (WH - 3) / 2, D / 2 - T / 2));
  // Door header trim + rolled shutter box
  g.add(box(opening + 0.4, 0.22, 0.4, trim, 0, 3.05, D / 2 + 0.05));

  // Gable triangles (front and back)
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-W / 2, 0);
  gableShape.lineTo(W / 2, 0);
  gableShape.lineTo(0, ROOF_H);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: T, bevelEnabled: false });
  const gableFront = new THREE.Mesh(gableGeo, wall);
  gableFront.position.set(0, WH, D / 2 - T);
  const gableBack = new THREE.Mesh(gableGeo, wall);
  gableBack.position.set(0, WH, -D / 2);
  g.add(gableFront, gableBack);

  // Roof panels (ridge runs along z)
  const slope = Math.atan2(ROOF_H, W / 2);
  const panelLen = Math.hypot(W / 2, ROOF_H) + 0.6;
  const panelDepth = D + 0.8;
  const roofL = box(panelLen, 0.18, panelDepth, roofMat, -W / 4 - 0.1, WH + ROOF_H / 2 + 0.12, 0);
  roofL.rotation.z = slope;
  const roofR = box(panelLen, 0.18, panelDepth, roofMat, W / 4 + 0.1, WH + ROOF_H / 2 + 0.12, 0);
  roofR.rotation.z = -slope;
  g.add(roofL, roofR);
  g.add(box(0.35, 0.22, panelDepth, roofRidge, 0, WH + ROOF_H + 0.14, 0));
  // Tile ribs for the low-poly roof look
  for (let i = 0; i < 9; i++) {
    const z = -panelDepth / 2 + 0.4 + (i * (panelDepth - 0.8)) / 8;
    const ribL = box(panelLen, 0.07, 0.12, roofRidge, -W / 4 - 0.1, WH + ROOF_H / 2 + 0.24, z);
    ribL.rotation.z = slope;
    const ribR = box(panelLen, 0.07, 0.12, roofRidge, W / 4 + 0.1, WH + ROOF_H / 2 + 0.24, z);
    ribR.rotation.z = -slope;
    g.add(ribL, ribR);
  }

  // Wooden sign on the gable
  const signTex = makeSignTexture();
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.7),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.85 }),
  );
  sign.position.set(0, WH + 0.95, D / 2 + 0.06);
  g.add(sign);
  g.add(box(3.5, 1.8, 0.06, wood, 0, WH + 0.95, D / 2 + 0.01));

  // Floors
  g.add(box(W - 0.6, 0.05, D, concrete, 0, 0.025, 0));
  g.add(box(opening + 2, 0.04, 7, flat(0xbdbdb6, 0.95, 0), 0, 0.02, D / 2 + 3.5));

  // Interior: pegboard with tools
  g.add(box(2.4, 1.3, 0.06, flat(0x4c78a8, 0.8, 0.05), -1.9, 2.0, -D / 2 + T + 0.03));
  for (let i = 0; i < 6; i++) {
    g.add(box(0.06, 0.55, 0.05, metal, -2.8 + i * 0.36, 2.0, -D / 2 + T + 0.09));
  }
  // Workbench
  g.add(box(2.6, 0.12, 0.8, wood, -1.9, 0.95, -D / 2 + T + 0.5));
  g.add(box(0.1, 0.95, 0.7, wood, -3.1, 0.47, -D / 2 + T + 0.5));
  g.add(box(0.1, 0.95, 0.7, wood, -0.7, 0.47, -D / 2 + T + 0.5));
  // Red air compressor
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.0, 10), redMat);
  tank.rotation.z = Math.PI / 2;
  tank.position.set(0.7, 0.5, -D / 2 + T + 0.5);
  g.add(tank);
  // Red + blue tool chests
  g.add(box(0.9, 1.35, 0.65, redMat, 2.1, 0.68, -D / 2 + T + 0.45));
  g.add(box(0.95, 0.2, 0.7, flat(0xa82420, 0.5, 0.25), 2.1, 1.43, -D / 2 + T + 0.45));
  g.add(box(0.85, 0.95, 0.65, blueMat, 3.05, 0.48, -D / 2 + T + 0.45));
  // Tire shelf on the right wall
  for (const y of [0.45, 1.25, 2.05]) {
    g.add(box(0.7, 0.07, 3.2, wood, W / 2 - T - 0.4, y, 0.2));
    for (let i = 0; i < 3; i++) {
      g.add(makeTire(tireMat, W / 2 - T - 0.4, y + 0.2, -0.9 + i * 1.0));
    }
  }
  for (const z of [-1.4, 1.8]) {
    g.add(box(0.08, 2.4, 0.08, metal, W / 2 - T - 0.4, 1.2, z));
  }

  // Outside: tire stacks along the side of the building
  for (let s = 0; s < 3; s++) {
    for (let i = 0; i < 4 - s; i++) {
      g.add(makeTire(tireMat, -W / 2 - 1.2 - s * 0.75, 0.13 + i * 0.26, 1.2 + s * 0.35));
    }
  }
  g.add(makeTire(tireMat, -W / 2 - 0.9, 0.3, 3.0, false));

  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

function buildPine(rand: () => number): THREE.Group {
  const t = new THREE.Group();
  const h = 3 + rand() * 3;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, h * 0.3, 5), flat(0x6b4a2c));
  trunk.position.y = h * 0.15;
  t.add(trunk);
  const green = rand() > 0.5 ? 0x3f7a35 : 0x4d8a3a;
  for (let i = 0; i < 3; i++) {
    const r = (1.5 - i * 0.38) * (0.8 + rand() * 0.3);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h * 0.42, 6), flat(green));
    cone.position.y = h * 0.3 + i * h * 0.22 + h * 0.18;
    t.add(cone);
  }
  t.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return t;
}

function buildRoundTree(rand: () => number): THREE.Group {
  const t = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.8, 5), flat(0x7a5533));
  trunk.position.y = 0.9;
  t.add(trunk);
  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.5 + rand() * 0.6, 0),
    flat(rand() > 0.5 ? 0x9aa83a : 0x7fa13f),
  );
  crown.position.y = 2.7;
  t.add(crown);
  t.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return t;
}

function buildCloud(rand: () => number): THREE.Group {
  const c = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    flatShading: true,
    emissive: 0xdfe9f5,
    emissiveIntensity: 0.35,
  });
  const puffs = 4 + Math.floor(rand() * 3);
  for (let i = 0; i < puffs; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + rand() * 3, 0), mat);
    m.position.set(i * 4.2 - puffs * 2, rand() * 1.6, rand() * 3 - 1.5);
    m.scale.y = 0.6;
    c.add(m);
  }
  return c;
}

export interface WorkshopEnvironment {
  group: THREE.Group;
}

export function createWorkshopEnvironment(): WorkshopEnvironment {
  const group = new THREE.Group();
  const rand = makeRng(20260);

  // Big grassy ground under everything
  const grass = new THREE.Mesh(new THREE.CircleGeometry(140, 40), flat(0x86b34f, 1, 0));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.06;
  grass.receiveShadow = true;
  group.add(grass);

  // Garage behind the turntable, facing the car
  const garage = buildGarage();
  const gx = -11;
  const gz = -13.5;
  garage.position.set(gx, 0, gz);
  garage.rotation.y = Math.atan2(-gx, -gz);
  garage.scale.setScalar(1.2);
  group.add(garage);

  // Trees in a loose ring, keeping clear of the car area and the garage
  for (let i = 0; i < 34; i++) {
    const ang = rand() * Math.PI * 2;
    const rad = 16 + rand() * 20;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    if (Math.hypot(x - gx, z - gz) < 9) continue;
    const tree = rand() > 0.35 ? buildPine(rand) : buildRoundTree(rand);
    tree.position.set(x, 0, z);
    tree.rotation.y = rand() * Math.PI * 2;
    group.add(tree);
  }

  // Low-poly mountains and hills far away
  const rockMat = flat(0x9a8f7d, 0.95, 0);
  const hillMat = flat(0x6f9a47, 1, 0);
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + rand() * 0.3;
    const rad = 85 + rand() * 25;
    const isRock = i % 2 === 0;
    const mh = 16 + rand() * 18;
    const peak = new THREE.Mesh(
      new THREE.ConeGeometry(16 + rand() * 12, mh, 6),
      isRock ? rockMat : hillMat,
    );
    peak.position.set(Math.cos(ang) * rad, mh / 2 - 0.5, Math.sin(ang) * rad);
    peak.rotation.y = rand() * Math.PI;
    group.add(peak);
  }

  // Clouds
  for (let i = 0; i < 9; i++) {
    const cloud = buildCloud(rand);
    const ang = rand() * Math.PI * 2;
    const rad = 50 + rand() * 50;
    cloud.position.set(Math.cos(ang) * rad, 32 + rand() * 14, Math.sin(ang) * rad);
    cloud.rotation.y = rand() * Math.PI;
    group.add(cloud);
  }

  return { group };
}
