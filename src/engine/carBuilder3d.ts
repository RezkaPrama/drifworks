import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { CAR_CATALOG } from '../data/catalog';
import { BodySilhouette, CarBuildConfig, CarId } from '../types/game';

export interface CarRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  chassisGroup: THREE.Group;
  baseChassisY: number;
  frontLeftSteerGroup: THREE.Group;
  frontRightSteerGroup: THREE.Group;
  frontLeftPivot: THREE.Group;
  frontRightPivot: THREE.Group;
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearLeftWheel: THREE.Group;
  rearRightWheel: THREE.Group;
  wheelMeshes: THREE.Group[];
  mudflaps: THREE.Mesh[];
  rearWheelOffsets: THREE.Vector3[];
  taillightMat: THREE.MeshStandardMaterial;
  exhaustFlames: THREE.Mesh[];
  underglowLight: THREE.PointLight | null;
  updateDamageVisual: (bodyIntegrity: number) => void;
  dispose: () => void;
}

const CAR_NUMBERS: Record<CarId, string> = {
  carry_futura: '5',
  kijang_super: '12',
  kijang_kapsul: '97',
  corolla_dx: '70',
  bmw_e36: '36',
  cefiro_a31: '31',
  cressida_mx83: '83',
  miata_mx5: '05',
  rx7_fc3s: '7',
  silvia_s15: '15',
  sx_180: '24',
  skyline_r34: '34',
  chaser_jzx100: '100',
  gr86_pro: '86',
  supra_a90: '90',
  mustang_v8: '77',
};

function createDoorNumberTexture(carNumber: string, accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(10, 10, 236, 172);
  ctx.fillStyle = accentHex;
  ctx.fillRect(10, 10, 236, 40);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 236, 172);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 98px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(carNumber, 128, 118);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSideSwooshTexture(accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 128);

  ctx.fillStyle = accentHex;
  ctx.beginPath();
  ctx.ellipse(72, 68, 56, 30, -0.1, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(95, 48 + i * 16);
    ctx.quadraticCurveTo(175, 22 + i * 15, 245, 46 + i * 18);
    ctx.quadraticCurveTo(175, 38 + i * 15, 95, 58 + i * 16);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#1e3a8a';
  [
    [54, 62, 11],
    [82, 54, 8],
    [86, 76, 8],
  ].forEach(([cx, cy, r]) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.28, cy - r * 0.28);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx + r * 0.28, cy + r * 0.28);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.28, cy + r * 0.28);
    ctx.lineTo(cx - r, cy);
    ctx.lineTo(cx - r * 0.28, cy - r * 0.28);
    ctx.closePath();
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface SilhouetteSpec {
  width: number;
  halfWheelbase: number;
  frontZ: number;
  rearZ: number;
  hoodY: number;
  roofY: number;
  trunkY: number;
  cabinCenterZ: number;
  cabinLength: number;
  wheelRadius: number;
  noseDrop: number;
  noseTaper: number;
  tailTaper: number;
  fenderFlare: number;
  tumblehome: number;
  wsBotZ: number;
  wsTopZ: number;
  rearTopZ: number;
  rearBotZ: number;
  cPillarWidth: number;
}

const SILHOUETTE_SPECS: Record<BodySilhouette, SilhouetteSpec> = {
  pickup: {
    width: 1.58,
    halfWheelbase: 1.24,
    frontZ: 2.0,
    rearZ: -2.06,
    hoodY: 0.9,
    roofY: 1.6,
    trunkY: 0.9,
    cabinCenterZ: 0.62,
    cabinLength: 1.22,
    wheelRadius: 0.38,
    noseDrop: 0.08,
    noseTaper: 0.94,
    tailTaper: 0.97,
    fenderFlare: 0.035,
    tumblehome: 0.09,
    wsBotZ: 1.72,
    wsTopZ: 1.18,
    rearTopZ: 0.22,
    rearBotZ: 0.16,
    cPillarWidth: 0.12,
  },
  mpv: {
    width: 1.68,
    halfWheelbase: 1.38,
    frontZ: 2.2,
    rearZ: -2.24,
    hoodY: 0.88,
    roofY: 1.6,
    trunkY: 0.92,
    cabinCenterZ: -0.35,
    cabinLength: 2.65,
    wheelRadius: 0.4,
    noseDrop: 0.09,
    noseTaper: 0.93,
    tailTaper: 0.95,
    fenderFlare: 0.04,
    tumblehome: 0.1,
    wsBotZ: 1.18,
    wsTopZ: 0.84,
    rearTopZ: -1.88,
    rearBotZ: -2.08,
    cPillarWidth: 0.13,
  },
  mpv_kapsul: {
    width: 1.7,
    halfWheelbase: 1.4,
    frontZ: 2.24,
    rearZ: -2.24,
    hoodY: 0.9,
    roofY: 1.58,
    trunkY: 0.94,
    cabinCenterZ: -0.34,
    cabinLength: 2.56,
    wheelRadius: 0.41,
    noseDrop: 0.12,
    noseTaper: 0.91,
    tailTaper: 0.94,
    fenderFlare: 0.055,
    tumblehome: 0.11,
    wsBotZ: 1.14,
    wsTopZ: 0.66,
    rearTopZ: -1.8,
    rearBotZ: -2.06,
    cPillarWidth: 0.13,
  },
  boxy_sedan: {
    width: 1.68,
    halfWheelbase: 1.34,
    frontZ: 2.16,
    rearZ: -2.14,
    hoodY: 0.78,
    roofY: 1.33,
    trunkY: 0.81,
    cabinCenterZ: -0.18,
    cabinLength: 1.82,
    wheelRadius: 0.39,
    noseDrop: 0.1,
    noseTaper: 0.92,
    tailTaper: 0.94,
    fenderFlare: 0.05,
    tumblehome: 0.13,
    wsBotZ: 0.92,
    wsTopZ: 0.44,
    rearTopZ: -0.74,
    rearBotZ: -1.24,
    cPillarWidth: 0.14,
  },
  euro_coupe: {
    width: 1.76,
    halfWheelbase: 1.42,
    frontZ: 2.28,
    rearZ: -2.22,
    hoodY: 0.78,
    roofY: 1.31,
    trunkY: 0.84,
    cabinCenterZ: -0.2,
    cabinLength: 1.88,
    wheelRadius: 0.4,
    noseDrop: 0.15,
    noseTaper: 0.89,
    tailTaper: 0.92,
    fenderFlare: 0.068,
    tumblehome: 0.16,
    wsBotZ: 0.98,
    wsTopZ: 0.38,
    rearTopZ: -0.74,
    rearBotZ: -1.36,
    cPillarWidth: 0.16,
  },
  jdm_sedan: {
    width: 1.78,
    halfWheelbase: 1.48,
    frontZ: 2.34,
    rearZ: -2.3,
    hoodY: 0.78,
    roofY: 1.31,
    trunkY: 0.84,
    cabinCenterZ: -0.18,
    cabinLength: 1.98,
    wheelRadius: 0.4,
    noseDrop: 0.14,
    noseTaper: 0.89,
    tailTaper: 0.92,
    fenderFlare: 0.062,
    tumblehome: 0.15,
    wsBotZ: 1.0,
    wsTopZ: 0.42,
    rearTopZ: -0.82,
    rearBotZ: -1.42,
    cPillarWidth: 0.15,
  },
  popup_coupe: {
    width: 1.76,
    halfWheelbase: 1.38,
    frontZ: 2.26,
    rearZ: -2.18,
    hoodY: 0.72,
    roofY: 1.25,
    trunkY: 0.82,
    cabinCenterZ: -0.24,
    cabinLength: 1.78,
    wheelRadius: 0.4,
    noseDrop: 0.18,
    noseTaper: 0.86,
    tailTaper: 0.9,
    fenderFlare: 0.072,
    tumblehome: 0.18,
    wsBotZ: 0.88,
    wsTopZ: 0.24,
    rearTopZ: -0.68,
    rearBotZ: -1.66,
    cPillarWidth: 0.16,
  },
  roadster: {
    width: 1.7,
    halfWheelbase: 1.3,
    frontZ: 2.1,
    rearZ: -2.04,
    hoodY: 0.7,
    roofY: 1.18,
    trunkY: 0.76,
    cabinCenterZ: -0.26,
    cabinLength: 1.35,
    wheelRadius: 0.39,
    noseDrop: 0.17,
    noseTaper: 0.86,
    tailTaper: 0.89,
    fenderFlare: 0.068,
    tumblehome: 0.15,
    wsBotZ: 0.76,
    wsTopZ: 0.34,
    rearTopZ: -0.62,
    rearBotZ: -1.12,
    cPillarWidth: 0.12,
  },
  silvia_coupe: {
    width: 1.78,
    halfWheelbase: 1.42,
    frontZ: 2.28,
    rearZ: -2.2,
    hoodY: 0.74,
    roofY: 1.27,
    trunkY: 0.83,
    cabinCenterZ: -0.22,
    cabinLength: 1.8,
    wheelRadius: 0.4,
    noseDrop: 0.16,
    noseTaper: 0.87,
    tailTaper: 0.91,
    fenderFlare: 0.075,
    tumblehome: 0.17,
    wsBotZ: 0.92,
    wsTopZ: 0.28,
    rearTopZ: -0.74,
    rearBotZ: -1.44,
    cPillarWidth: 0.16,
  },
  skyline_coupe: {
    width: 1.82,
    halfWheelbase: 1.46,
    frontZ: 2.34,
    rearZ: -2.28,
    hoodY: 0.78,
    roofY: 1.31,
    trunkY: 0.86,
    cabinCenterZ: -0.2,
    cabinLength: 1.88,
    wheelRadius: 0.41,
    noseDrop: 0.15,
    noseTaper: 0.89,
    tailTaper: 0.93,
    fenderFlare: 0.078,
    tumblehome: 0.16,
    wsBotZ: 0.96,
    wsTopZ: 0.34,
    rearTopZ: -0.78,
    rearBotZ: -1.42,
    cPillarWidth: 0.17,
  },
  supra_coupe: {
    width: 1.86,
    halfWheelbase: 1.42,
    frontZ: 2.32,
    rearZ: -2.22,
    hoodY: 0.73,
    roofY: 1.26,
    trunkY: 0.86,
    cabinCenterZ: -0.24,
    cabinLength: 1.74,
    wheelRadius: 0.41,
    noseDrop: 0.17,
    noseTaper: 0.85,
    tailTaper: 0.9,
    fenderFlare: 0.09,
    tumblehome: 0.19,
    wsBotZ: 0.86,
    wsTopZ: 0.22,
    rearTopZ: -0.72,
    rearBotZ: -1.56,
    cPillarWidth: 0.17,
  },
  muscle: {
    width: 1.88,
    halfWheelbase: 1.48,
    frontZ: 2.38,
    rearZ: -2.34,
    hoodY: 0.86,
    roofY: 1.33,
    trunkY: 0.9,
    cabinCenterZ: -0.24,
    cabinLength: 1.84,
    wheelRadius: 0.42,
    noseDrop: 0.1,
    noseTaper: 0.9,
    tailTaper: 0.93,
    fenderFlare: 0.082,
    tumblehome: 0.16,
    wsBotZ: 0.92,
    wsTopZ: 0.3,
    rearTopZ: -0.76,
    rearBotZ: -1.58,
    cPillarWidth: 0.18,
  },
};

/**
 * Generates a cohesive, multi-station lofted automotive body shell with
 * carved wheel-arch cutouts, integrated fender flares, tapered nose/tail,
 * side character shoulder line, and crowned hood/trunk surfaces.
 */
function createLoftedSectionGeometry(
  stations: { z: number; points: [number, number][] }[],
  creaseAngleDeg = 38,
): THREE.BufferGeometry {
  const numStations = stations.length;
  const ringCount = stations[0].points.length;

  const positions: number[] = [];
  const indices: number[] = [];

  for (let s = 0; s < numStations; s++) {
    const st = stations[s];
    for (let p = 0; p < ringCount; p++) {
      positions.push(st.points[p][0], st.points[p][1], st.z);
    }
  }

  for (let s = 0; s < numStations - 1; s++) {
    const rowA = s * ringCount;
    const rowB = (s + 1) * ringCount;
    for (let p = 0; p < ringCount; p++) {
      const nextP = (p + 1) % ringCount;
      const a0 = rowA + p;
      const a1 = rowA + nextP;
      const b0 = rowB + p;
      const b1 = rowB + nextP;
      indices.push(a0, a1, b1);
      indices.push(a0, b1, b0);
    }
  }

  // Cap rear end (s = 0, facing -Z)
  const rearCenterIdx = positions.length / 3;
  let rcx = 0;
  let rcy = 0;
  for (let p = 0; p < ringCount; p++) {
    rcx += stations[0].points[p][0];
    rcy += stations[0].points[p][1];
  }
  positions.push(rcx / ringCount, rcy / ringCount, stations[0].z);
  for (let p = 0; p < ringCount; p++) {
    const nextP = (p + 1) % ringCount;
    indices.push(rearCenterIdx, nextP, p);
  }

  // Cap front end (s = last, facing +Z)
  const frontCenterIdx = positions.length / 3;
  let fcx = 0;
  let fcy = 0;
  const lastSt = stations[numStations - 1];
  for (let p = 0; p < ringCount; p++) {
    fcx += lastSt.points[p][0];
    fcy += lastSt.points[p][1];
  }
  positions.push(fcx / ringCount, fcy / ringCount, lastSt.z);
  const lastRow = (numStations - 1) * ringCount;
  for (let p = 0; p < ringCount; p++) {
    const nextP = (p + 1) % ringCount;
    indices.push(frontCenterIdx, lastRow + p, lastRow + nextP);
  }

  const rawGeo = new THREE.BufferGeometry();
  rawGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  rawGeo.setIndex(indices);
  rawGeo.computeVertexNormals();

  const creased = toCreasedNormals(rawGeo, THREE.MathUtils.degToRad(creaseAngleDeg));
  rawGeo.dispose();
  return creased;
}

function getPlanScale(z: number, spec: SilhouetteSpec): number {
  if (z > spec.wsBotZ) {
    const u = Math.min(1, (z - spec.wsBotZ) / Math.max(0.2, spec.frontZ - spec.wsBotZ));
    return 1 - (1 - spec.noseTaper) * Math.pow(u, 1.45);
  }
  if (z < spec.rearBotZ) {
    const u = Math.min(1, (spec.rearBotZ - z) / Math.max(0.2, spec.rearBotZ - spec.rearZ));
    return 1 - (1 - spec.tailTaper) * Math.pow(u, 1.35);
  }
  return 1.0;
}

function getFenderFlare(z: number, spec: SilhouetteSpec, extraWide: number): number {
  const flareMax = spec.fenderFlare + extraWide;
  const archSpan = spec.wheelRadius + 0.24;
  let f = 0;
  const df = Math.abs(z - spec.halfWheelbase);
  if (df < archSpan) {
    f = Math.max(f, flareMax * Math.cos((df / archSpan) * (Math.PI * 0.5)));
  }
  const dr = Math.abs(z + spec.halfWheelbase);
  if (dr < archSpan) {
    f = Math.max(f, flareMax * 1.12 * Math.cos((dr / archSpan) * (Math.PI * 0.5)));
  }
  return f;
}

function getArchCutHeight(z: number, spec: SilhouetteSpec): number {
  const archR = spec.wheelRadius + 0.085;
  const baseSill = 0.21;
  const df = Math.abs(z - spec.halfWheelbase);
  if (df < archR) {
    const h = spec.wheelRadius + Math.sqrt(Math.max(0, archR * archR - df * df)) * 0.88;
    return Math.max(baseSill, h);
  }
  const dr = Math.abs(z + spec.halfWheelbase);
  if (dr < archR) {
    const h = spec.wheelRadius + Math.sqrt(Math.max(0, archR * archR - dr * dr)) * 0.88;
    return Math.max(baseSill, h);
  }
  return baseSill;
}

function getBeltHeight(z: number, silhouette: BodySilhouette, spec: SilhouetteSpec): number {
  if (silhouette === 'pickup') {
    if (z > spec.wsBotZ - 0.15) {
      const u = (z - (spec.wsBotZ - 0.15)) / Math.max(0.2, spec.frontZ - (spec.wsBotZ - 0.15));
      return spec.hoodY - spec.noseDrop * u;
    }
    return spec.hoodY;
  }

  // Smooth wedge beltline rising subtly from hood nose up toward rear quarter deck
  if (z >= spec.wsBotZ) {
    const u = (z - spec.wsBotZ) / Math.max(0.2, spec.frontZ - spec.wsBotZ);
    return spec.hoodY - spec.noseDrop * Math.pow(u, 1.35);
  }
  if (z >= spec.rearBotZ) {
    const u = (spec.wsBotZ - z) / Math.max(0.2, spec.wsBotZ - spec.rearBotZ);
    return THREE.MathUtils.lerp(spec.hoodY, spec.trunkY, u);
  }
  const u = (spec.rearBotZ - z) / Math.max(0.2, spec.rearBotZ - spec.rearZ);
  return spec.trunkY - 0.03 * u;
}

function createSculptedLowerBody(
  silhouette: BodySilhouette,
  spec: SilhouetteSpec,
  extraWide: number,
): THREE.BufferGeometry {
  const bodyZStart = spec.rearZ + 0.08;
  const bodyZEnd = spec.frontZ - 0.08;
  const archR = spec.wheelRadius + 0.085;

  // Build sorted Z stations densely around both wheel arches + hood/trunk transitions
  const rawZ: number[] = [
    bodyZStart,
    bodyZStart + 0.18,
    -spec.halfWheelbase - archR - 0.14,
    -spec.halfWheelbase - archR * 0.96,
    -spec.halfWheelbase - archR * 0.62,
    -spec.halfWheelbase,
    -spec.halfWheelbase + archR * 0.62,
    -spec.halfWheelbase + archR * 0.96,
    -spec.halfWheelbase + archR + 0.16,
    -0.35,
    0.35,
    spec.halfWheelbase - archR - 0.16,
    spec.halfWheelbase - archR * 0.96,
    spec.halfWheelbase - archR * 0.62,
    spec.halfWheelbase,
    spec.halfWheelbase + archR * 0.62,
    spec.halfWheelbase + archR * 0.96,
    spec.halfWheelbase + archR + 0.14,
    bodyZEnd - 0.16,
    bodyZEnd,
  ];

  const sortedZ = rawZ
    .filter((z) => z >= bodyZStart && z <= bodyZEnd)
    .sort((a, b) => a - b);

  // Deduplicate closely spaced Z stations
  const zList: number[] = [];
  for (const z of sortedZ) {
    if (zList.length === 0 || z - zList[zList.length - 1] > 0.025) {
      zList.push(z);
    }
  }
  if (zList[zList.length - 1] < bodyZEnd - 0.01) zList.push(bodyZEnd);

  const halfW = spec.width * 0.5;
  const stations = zList.map((z) => {
    const plan = getPlanScale(z, spec);
    const flare = getFenderFlare(z, spec, extraWide);
    const archY = getArchCutHeight(z, spec);
    const beltY = getBeltHeight(z, silhouette, spec);

    const wBottom = halfW * plan * 0.92 + flare * 0.45;
    const wFlank = halfW * plan * 0.99 + flare;
    const wShoulder = halfW * plan * 0.97 + flare * 0.72;
    const wBelt = halfW * plan * 0.89 + flare * 0.25;

    const shoulderY = Math.max(archY + 0.06, beltY - 0.16);
    const lowerFlankY = Math.min(shoulderY - 0.04, Math.max(archY + 0.02, 0.42));

    // Crowned hood / deck height (extra power bulge on long-hood sport coupes)
    const isHoodZone = z > spec.wsBotZ + 0.08 && z < bodyZEnd - 0.08;
    const hoodDome =
      isHoodZone && (silhouette === 'euro_coupe' || silhouette === 'muscle' || silhouette === 'supra_coupe')
        ? 0.042
        : 0.024;
    const crownY = beltY + hoodDome;

    // Cross-section ring ordered counter-clockwise when viewed from +Z (outward normals)
    // Bottom-center -> Bottom-right -> Right-flank -> Right-shoulder -> Right-belt -> Center-crown -> Left-belt -> Left-shoulder -> Left-flank -> Bottom-left
    const points: [number, number][] = [
      [0, Math.min(0.22, archY)],
      [wBottom, archY],
      [wFlank, lowerFlankY],
      [wShoulder, shoulderY],
      [wBelt, beltY],
      [0, crownY],
      [-wBelt, beltY],
      [-wShoulder, shoulderY],
      [-wFlank, lowerFlankY],
      [-wBottom, archY],
    ];
    return { z, points };
  });

  return createLoftedSectionGeometry(stations, 42);
}

function createWrapBumperGeometry(
  width: number,
  zInner: number,
  zOuter: number,
  topY: number,
  botY: number,
  cornerTaper = 0.86,
): THREE.BufferGeometry {
  const hw = width * 0.5;
  const hwTip = hw * cornerTaper;
  const stations: { z: number; points: [number, number][] }[] = [
    {
      z: zInner,
      points: [
        [0, botY],
        [hw, botY],
        [hw * 1.02, (botY + topY) * 0.5],
        [hw * 0.96, topY],
        [0, topY + 0.015],
        [-hw * 0.96, topY],
        [-hw * 1.02, (botY + topY) * 0.5],
        [-hw, botY],
      ],
    },
    {
      z: (zInner + zOuter) * 0.5,
      points: [
        [0, botY],
        [hw * 0.96, botY + 0.01],
        [hw * 0.98, (botY + topY) * 0.5],
        [hw * 0.93, topY],
        [0, topY + 0.012],
        [-hw * 0.93, topY],
        [-hw * 0.98, (botY + topY) * 0.5],
        [-hw * 0.96, botY + 0.01],
      ],
    },
    {
      z: zOuter,
      points: [
        [0, botY + 0.02],
        [hwTip, botY + 0.03],
        [hwTip * 1.01, (botY + topY) * 0.52],
        [hwTip * 0.94, topY - 0.01],
        [0, topY],
        [-hwTip * 0.94, topY - 0.01],
        [-hwTip * 1.01, (botY + topY) * 0.52],
        [-hwTip, botY + 0.03],
      ],
    },
  ];
  // Ensure ascending Z order for outward normals
  if (zOuter < zInner) stations.reverse();
  return createLoftedSectionGeometry(stations, 36);
}

function createGreenhouseGlassGeometry(spec: SilhouetteSpec): THREE.BufferGeometry {
  const halfBaseW = spec.width * 0.44;
  const halfRoofW = halfBaseW - spec.tumblehome;
  const beltFrontY = spec.hoodY - 0.01;
  const beltRearY = spec.trunkY - 0.01;
  const roofY = spec.roofY - 0.025;

  const stations: { z: number; points: [number, number][] }[] = [
    {
      z: spec.rearBotZ,
      points: [
        [0, beltRearY],
        [halfBaseW * 0.94, beltRearY],
        [halfBaseW * 0.91, beltRearY + 0.04],
        [0, beltRearY + 0.05],
        [-halfBaseW * 0.91, beltRearY + 0.04],
        [-halfBaseW * 0.94, beltRearY],
      ],
    },
    {
      z: spec.rearTopZ,
      points: [
        [0, beltRearY],
        [halfBaseW * 0.95, beltRearY],
        [halfRoofW * 0.96, roofY - 0.01],
        [0, roofY + 0.02],
        [-halfRoofW * 0.96, roofY - 0.01],
        [-halfBaseW * 0.95, beltRearY],
      ],
    },
    {
      z: spec.wsTopZ,
      points: [
        [0, beltFrontY],
        [halfBaseW * 0.96, beltFrontY],
        [halfRoofW * 0.97, roofY - 0.01],
        [0, roofY + 0.02],
        [-halfRoofW * 0.97, roofY - 0.01],
        [-halfBaseW * 0.96, beltFrontY],
      ],
    },
    {
      z: spec.wsBotZ,
      points: [
        [0, beltFrontY],
        [halfBaseW * 0.97, beltFrontY],
        [halfBaseW * 0.93, beltFrontY + 0.04],
        [0, beltFrontY + 0.055],
        [-halfBaseW * 0.93, beltFrontY + 0.04],
        [-halfBaseW * 0.97, beltFrontY],
      ],
    },
  ];
  return createLoftedSectionGeometry(stations, 34);
}

function createCrownedRoofGeometry(spec: SilhouetteSpec): THREE.BufferGeometry {
  const halfRoofW = spec.width * 0.44 - spec.tumblehome + 0.025;
  const rY = spec.roofY - 0.04;
  const topY = spec.roofY + 0.022;
  const zBack = spec.rearTopZ - 0.04;
  const zFront = spec.wsTopZ + 0.04;

  const stations: { z: number; points: [number, number][] }[] = [
    {
      z: zBack,
      points: [
        [0, rY],
        [halfRoofW * 0.96, rY],
        [halfRoofW * 0.93, topY - 0.018],
        [0, topY],
        [-halfRoofW * 0.93, topY - 0.018],
        [-halfRoofW * 0.96, rY],
      ],
    },
    {
      z: (zBack + zFront) * 0.5,
      points: [
        [0, rY],
        [halfRoofW, rY],
        [halfRoofW * 0.96, topY - 0.01],
        [0, topY + 0.015],
        [-halfRoofW * 0.96, topY - 0.01],
        [-halfRoofW, rY],
      ],
    },
    {
      z: zFront,
      points: [
        [0, rY],
        [halfRoofW * 0.97, rY],
        [halfRoofW * 0.94, topY - 0.018],
        [0, topY],
        [-halfRoofW * 0.94, topY - 0.018],
        [-halfRoofW * 0.97, rY],
      ],
    },
  ];
  return createLoftedSectionGeometry(stations, 40);
}

function createSideMirrorMesh(
  side: -1 | 1,
  paintMat: THREE.Material,
  trimMat: THREE.Material,
  chromeMat: THREE.Material,
  track: <T extends { dispose: () => void }>(item: T) => T,
): THREE.Group {
  const mirrorGroup = new THREE.Group();

  // Angled mounting stalk
  const stalk = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.11, 0.04, 0.065)),
    trimMat,
  );
  stalk.position.set(side * 0.045, -0.01, 0);
  stalk.rotation.z = side * 0.35;
  mirrorGroup.add(stalk);

  // Aerodynamic tapered mirror cap
  const capShape = new THREE.Shape();
  capShape.moveTo(-0.08, -0.042);
  capShape.lineTo(0.06, -0.048);
  capShape.quadraticCurveTo(0.11, 0, 0.06, 0.048);
  capShape.lineTo(-0.08, 0.038);
  capShape.quadraticCurveTo(-0.11, 0, -0.08, -0.042);

  const capGeo = track(
    new THREE.ExtrudeGeometry(capShape, {
      depth: 0.11,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.015,
      bevelSegments: 2,
    }),
  );
  capGeo.translate(0, 0, -0.055);
  const cap = new THREE.Mesh(capGeo, paintMat);
  cap.position.set(side * 0.11, 0.02, -0.02);
  cap.rotation.y = side * -0.18;
  cap.castShadow = true;
  mirrorGroup.add(cap);

  // Reflective mirror glass inset facing rear
  const face = new THREE.Mesh(
    track(new THREE.PlaneGeometry(0.13, 0.068)),
    chromeMat,
  );
  face.position.set(side * 0.11, 0.02, -0.092);
  face.rotation.y = Math.PI + side * -0.18;
  mirrorGroup.add(face);

  return mirrorGroup;
}

function buildWheelMesh(
  rimStyle: CarBuildConfig['rimStyle'],
  rimMat: THREE.Material,
  tireMat: THREE.Material,
  caliperMat: THREE.Material,
  discMat: THREE.Material,
  chromeMat: THREE.Material,
  stripeMat: THREE.Material,
  tireRadius: number,
  isWide: boolean,
  isProTire: boolean,
  track: <T extends { dispose: () => void }>(item: T) => T,
): THREE.Group {
  const wheelGroup = new THREE.Group();
  const tireWidth = isWide ? 0.34 : 0.28;
  const segs = 28;

  // Smooth matte dark rubber tire carcass + sculpted shoulder sidewalls
  const tireGeo = track(new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, segs));
  tireGeo.rotateZ(Math.PI / 2);
  const tireMesh = new THREE.Mesh(tireGeo, tireMat);
  tireMesh.castShadow = true;
  tireMesh.receiveShadow = true;
  wheelGroup.add(tireMesh);

  const sidewallGeo = track(new THREE.TorusGeometry(tireRadius * 0.78, 0.078, 10, segs));
  sidewallGeo.rotateY(Math.PI / 2);
  const outerSidewall = new THREE.Mesh(sidewallGeo, tireMat);
  outerSidewall.position.x = tireWidth * 0.34;
  wheelGroup.add(outerSidewall);

  const innerSidewall = new THREE.Mesh(sidewallGeo, tireMat);
  innerSidewall.position.x = -tireWidth * 0.34;
  wheelGroup.add(innerSidewall);

  if (isProTire) {
    const stripeGeo = track(new THREE.RingGeometry(tireRadius * 0.79, tireRadius * 0.85, segs));
    stripeGeo.rotateY(Math.PI / 2);
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.x = tireWidth * 0.49;
    wheelGroup.add(stripe);
  }

  // Polished outer rim lip + deep alloy barrel
  const lipGeo = track(new THREE.TorusGeometry(tireRadius * 0.65, 0.028, 10, 26));
  lipGeo.rotateY(Math.PI / 2);
  const lip = new THREE.Mesh(lipGeo, chromeMat);
  lip.position.x = tireWidth * 0.45;
  wheelGroup.add(lip);

  const barrelGeo = track(new THREE.CylinderGeometry(tireRadius * 0.65, tireRadius * 0.65, tireWidth * 0.88, segs));
  barrelGeo.rotateZ(Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, rimMat);
  wheelGroup.add(barrel);

  // Dark inner recess behind spokes
  const recessGeo = track(new THREE.CylinderGeometry(tireRadius * 0.58, tireRadius * 0.58, tireWidth * 0.9, segs));
  recessGeo.rotateZ(Math.PI / 2);
  const recess = new THREE.Mesh(recessGeo, discMat);
  wheelGroup.add(recess);

  // Ventilated brake rotor + performance caliper
  const discGeo = track(new THREE.CylinderGeometry(tireRadius * 0.47, tireRadius * 0.47, 0.04, 20));
  discGeo.rotateZ(Math.PI / 2);
  const disc = new THREE.Mesh(discGeo, discMat);
  wheelGroup.add(disc);

  const caliperGeo = track(new THREE.BoxGeometry(0.08, 0.16, 0.11));
  const caliper = new THREE.Mesh(caliperGeo, caliperMat);
  caliper.position.set(0.03, 0.12, 0.1);
  wheelGroup.add(caliper);

  // Rim face spokes
  const faceX = tireWidth * 0.4;
  if (rimStyle === 'turbofan') {
    const fanGeo = track(new THREE.CylinderGeometry(tireRadius * 0.62, tireRadius * 0.64, 0.04, 24));
    fanGeo.rotateZ(Math.PI / 2);
    const fan = new THREE.Mesh(fanGeo, rimMat);
    fan.position.x = faceX;
    wheelGroup.add(fan);

    const finGeo = track(new THREE.BoxGeometry(0.045, tireRadius * 0.5, 0.03));
    for (let i = 0; i < 6; i++) {
      const fin = new THREE.Mesh(finGeo, chromeMat);
      const a = (i * Math.PI) / 3;
      fin.position.set(faceX + 0.012, Math.cos(a) * tireRadius * 0.34, Math.sin(a) * tireRadius * 0.34);
      fin.rotation.x = -a;
      wheelGroup.add(fin);
    }
  } else if (rimStyle === 'mesh') {
    const spokeGeo = track(new THREE.BoxGeometry(0.04, tireRadius * 1.16, 0.034));
    for (let i = 0; i < 10; i++) {
      const spoke = new THREE.Mesh(spokeGeo, rimMat);
      spoke.position.x = faceX;
      spoke.rotation.x = (i * Math.PI) / 10;
      wheelGroup.add(spoke);
    }
  } else if (rimStyle === 'spoke5') {
    const spokeGeo = track(new THREE.BoxGeometry(0.048, tireRadius * 0.64, 0.075));
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(spokeGeo, rimMat);
      const angle = (i * Math.PI * 2) / 5;
      spoke.position.set(faceX, Math.cos(angle) * tireRadius * 0.32, Math.sin(angle) * tireRadius * 0.32);
      spoke.rotation.x = -angle;
      wheelGroup.add(spoke);
    }
  } else {
    const dishGeo = track(new THREE.CylinderGeometry(tireRadius * 0.42, tireRadius * 0.52, 0.055, 18));
    dishGeo.rotateZ(Math.PI / 2);
    const dish = new THREE.Mesh(dishGeo, rimMat);
    dish.position.x = faceX;
    wheelGroup.add(dish);
  }

  // Center hub & lug nut ring
  const hubGeo = track(new THREE.CylinderGeometry(0.072, 0.072, 0.08, 14));
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, chromeMat);
  hub.position.x = faceX + 0.015;
  wheelGroup.add(hub);

  return wheelGroup;
}

export function buildPixarCar(
  carId: CarId,
  build: CarBuildConfig,
  options: { isSoftwareGl?: boolean } = {},
): CarRig {
  const carMeta = CAR_CATALOG.find((c) => c.id === carId) ?? CAR_CATALOG[0];
  const silhouette = carMeta.silhouette;
  const spec = SILHOUETTE_SPECS[silhouette];

  // Clear animation hierarchy:
  // root -> bodyGroup (roll, squat/pitch, suspension bounce)
  // root -> frontLeftSteerGroup -> camber -> frontLeftWheel (steer Y, spin X)
  // root -> frontRightSteerGroup -> camber -> frontRightWheel (steer Y, spin X)
  // root -> rearLeftMount -> camber -> rearLeftWheel (spin X + smoke/skid origin)
  // root -> rearRightMount -> camber -> rearRightWheel (spin X + smoke/skid origin)
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'bodyGroup';
  root.add(bodyGroup);

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const isRookieAsset =
    silhouette === 'pickup' ||
    silhouette === 'mpv' ||
    silhouette === 'mpv_kapsul' ||
    silhouette === 'boxy_sedan' ||
    silhouette === 'euro_coupe';

  // Calibrated PBR materials: rich body reflections without blown-out glare
  const bodyRoughness =
    build.paintFinish === 'matte'
      ? 0.58
      : build.paintFinish === 'metallic'
        ? 0.25
        : 0.17;
  const bodyMetalness =
    build.paintFinish === 'metallic'
      ? 0.68
      : build.paintFinish === 'matte'
        ? 0.12
        : 0.24;

  const paintMat = track(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(build.paintHex),
      roughness: bodyRoughness,
      metalness: bodyMetalness,
      clearcoat: build.paintFinish === 'matte' ? 0.08 : 0.92,
      clearcoatRoughness: build.paintFinish === 'matte' ? 0.55 : 0.12,
      envMapIntensity: build.paintFinish === 'matte' ? 0.42 : 0.72,
    }),
  );

  // Semi-transparent tinted glass with subtle clearcoat sky/studio reflection
  const glassMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x101c2e,
      roughness: 0.05,
      metalness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.25,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );

  const headlightLensMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      roughness: 0.06,
      metalness: 0.1,
      clearcoat: 1.0,
      envMapIntensity: 1.1,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    }),
  );

  const trimMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1b2028,
      roughness: 0.76,
      metalness: 0.1,
      envMapIntensity: 0.35,
    }),
  );

  const carbonMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x202530,
      roughness: 0.34,
      metalness: 0.46,
      envMapIntensity: 0.65,
    }),
  );

  const chromeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xdbe4ef,
      roughness: 0.16,
      metalness: 0.9,
      envMapIntensity: 0.95,
    }),
  );

  const rimMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(build.rimColorHex),
      roughness: 0.22,
      metalness: 0.84,
      envMapIntensity: 0.92,
    }),
  );

  // Deep matte dark rubber tires
  const tireMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x15171c,
      roughness: 0.91,
      metalness: 0.03,
      envMapIntensity: 0.24,
    }),
  );

  const discMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.8,
      roughness: 0.32,
      envMapIntensity: 0.75,
    }),
  );

  const caliperColor =
    build.brakeTier === 2 ? 0xef4444 : build.brakeTier === 1 ? 0xf59e0b : 0x64748b;
  const caliperMat = track(
    new THREE.MeshStandardMaterial({
      color: caliperColor,
      roughness: 0.34,
      metalness: 0.62,
    }),
  );

  const headlightMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff3c4,
      emissiveIntensity: 1.35,
      roughness: 0.14,
    }),
  );

  const taillightMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.1,
      roughness: 0.18,
    }),
  );

  const amberMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.45,
      roughness: 0.2,
    }),
  );

  const silverTrimMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.36,
      metalness: 0.48,
      envMapIntensity: 0.68,
    }),
  );

  const bodyWidth = spec.width;
  const halfWheelbase = spec.halfWheelbase;
  const frontZ = spec.frontZ;
  const rearZ = spec.rearZ;
  const extraWide = build.bodykit === 'widebody' ? 0.045 : 0;

  const rideOffsetY = -build.rideHeight * 0.07 - build.suspensionTier * 0.032;
  bodyGroup.position.y = rideOffsetY;

  // 1. Primary Sculpted Lofted Body Shell (hood, fenders, doors, rear quarters unified)
  const lowerBodyGeo = track(createSculptedLowerBody(silhouette, spec, extraWide));
  const lowerBodyMesh = new THREE.Mesh(lowerBodyGeo, paintMat);
  lowerBodyMesh.castShadow = true;
  lowerBodyMesh.receiveShadow = true;
  bodyGroup.add(lowerBodyMesh);

  // Underbody chassis pan
  const panGeo = track(new THREE.BoxGeometry(bodyWidth * 0.82, 0.07, frontZ - rearZ - 0.38));
  const pan = new THREE.Mesh(panGeo, trimMat);
  pan.position.set(0, 0.19, (frontZ + rearZ) * 0.5);
  bodyGroup.add(pan);

  // 2. Dark Matte Inner Wheel-Well Liners & Subtle Integrated Arch Lips
  const archWellGeo = track(
    new THREE.CylinderGeometry(spec.wheelRadius + 0.065, spec.wheelRadius + 0.065, 0.28, 20, 1, false, 0, Math.PI),
  );
  archWellGeo.rotateZ(Math.PI / 2);
  archWellGeo.rotateX(Math.PI / 2);

  const archLipGeo = track(new THREE.TorusGeometry(spec.wheelRadius + 0.082, 0.028, 8, 22, Math.PI));
  archLipGeo.rotateY(Math.PI / 2);

  const archOffsetX = bodyWidth * 0.42;
  [
    [-1, halfWheelbase],
    [1, halfWheelbase],
    [-1, -halfWheelbase],
    [1, -halfWheelbase],
  ].forEach(([side, az]) => {
    const liner = new THREE.Mesh(archWellGeo, trimMat);
    liner.position.set(side * archOffsetX, spec.wheelRadius + 0.02, az);
    bodyGroup.add(liner);

    const zFlare = getFenderFlare(az, spec, extraWide);
    const lip = new THREE.Mesh(archLipGeo, paintMat);
    lip.position.set(side * (bodyWidth * 0.5 + zFlare * 0.82), spec.wheelRadius + 0.02, az);
    bodyGroup.add(lip);
  });

  // Helper to build angled structural pillars aligned with cabin tumblehome
  const addTaperedPillar = (
    side: -1 | 1,
    y1: number,
    z1: number,
    y2: number,
    z2: number,
    thicknessX: number,
    depthZ: number,
    mat: THREE.Material,
  ) => {
    const x1 = side * (bodyWidth * 0.435);
    const x2 = side * (bodyWidth * 0.435 - spec.tumblehome);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dy, dz);

    const mesh = new THREE.Mesh(track(new THREE.BoxGeometry(thicknessX, len, depthZ)), mat);
    mesh.position.set((x1 + x2) * 0.5, (y1 + y2) * 0.5, (z1 + z2) * 0.5);

    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    mesh.castShadow = true;
    bodyGroup.add(mesh);
    return mesh;
  };

  const addCabinInterior = (
    dashZ: number,
    frontSeatZ: number,
    rearSeatZ: number | null,
    seatBaseY: number,
  ) => {
    const intSeatMat = track(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }));
    const dashMat = track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.84 }));

    const tub = new THREE.Mesh(
      track(new THREE.BoxGeometry(bodyWidth * 0.78, 0.08, rearSeatZ !== null ? 1.8 : 0.95)),
      dashMat,
    );
    tub.position.set(0, seatBaseY - 0.07, rearSeatZ !== null ? (frontSeatZ + rearSeatZ) * 0.5 : frontSeatZ + 0.05);
    bodyGroup.add(tub);

    const dash = new THREE.Mesh(
      track(new THREE.BoxGeometry(bodyWidth * 0.78, 0.16, 0.24)),
      dashMat,
    );
    dash.position.set(0, seatBaseY + 0.17, dashZ);
    bodyGroup.add(dash);

    const wheelRim = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.125, 0.02, 8, 16)),
      trimMat,
    );
    wheelRim.position.set(-0.31, seatBaseY + 0.24, dashZ - 0.15);
    wheelRim.rotation.x = 0.45;
    bodyGroup.add(wheelRim);

    const cushionGeo = track(new THREE.BoxGeometry(0.38, 0.11, 0.4));
    const backGeo = track(new THREE.BoxGeometry(0.36, 0.42, 0.11));
    const headGeo = track(new THREE.BoxGeometry(0.2, 0.14, 0.09));
    [-0.31, 0.31].forEach((sx) => {
      const cushion = new THREE.Mesh(cushionGeo, intSeatMat);
      cushion.position.set(sx, seatBaseY, frontSeatZ);
      bodyGroup.add(cushion);

      const back = new THREE.Mesh(backGeo, intSeatMat);
      back.position.set(sx, seatBaseY + 0.22, frontSeatZ - 0.16);
      back.rotation.x = -0.2;
      bodyGroup.add(back);

      const head = new THREE.Mesh(headGeo, intSeatMat);
      head.position.set(sx, seatBaseY + 0.46, frontSeatZ - 0.2);
      bodyGroup.add(head);
    });

    if (rearSeatZ !== null) {
      const bench = new THREE.Mesh(
        track(new THREE.BoxGeometry(bodyWidth * 0.74, 0.34, 0.24)),
        intSeatMat,
      );
      bench.position.set(0, seatBaseY + 0.14, rearSeatZ);
      bench.rotation.x = -0.15;
      bodyGroup.add(bench);
    }
  };

  // 3. Enclosed Greenhouse, Sloped Windshield/Rear Glass, Pillars & Interior
  if (silhouette === 'roadster') {
    const wsW = bodyWidth * 0.78;
    const wsGlass = new THREE.Mesh(track(new THREE.BoxGeometry(wsW, 0.42, 0.06)), glassMat);
    wsGlass.position.set(0, 0.94, 0.5);
    wsGlass.rotation.x = -0.64;
    bodyGroup.add(wsGlass);

    const wsFrame = new THREE.Mesh(track(new THREE.BoxGeometry(wsW + 0.06, 0.055, 0.09)), paintMat);
    wsFrame.position.set(0, 1.11, 0.38);
    bodyGroup.add(wsFrame);

    [-1, 1].forEach((side) => {
      addTaperedPillar(side as -1 | 1, spec.hoodY, 0.65, 1.11, 0.38, 0.06, 0.07, paintMat);
    });

    addCabinInterior(0.54, -0.35, null, 0.66);

    const hoopGeo = track(new THREE.TorusGeometry(0.18, 0.032, 8, 16, Math.PI));
    [-0.33, 0.33].forEach((sx) => {
      const hoop = new THREE.Mesh(hoopGeo, chromeMat);
      hoop.position.set(sx, 1.0, -0.66);
      bodyGroup.add(hoop);
    });
  } else if (silhouette === 'pickup') {
    addCabinInterior(1.36, 0.82, null, 0.84);
    const glassShell = new THREE.Mesh(track(createGreenhouseGlassGeometry(spec)), glassMat);
    glassShell.renderOrder = 2;
    bodyGroup.add(glassShell);

    const roofPanel = new THREE.Mesh(
      track(createCrownedRoofGeometry(spec)),
      build.engineTier === 3 ? carbonMat : paintMat,
    );
    roofPanel.castShadow = true;
    bodyGroup.add(roofPanel);

    [-1, 1].forEach((side) => {
      addTaperedPillar(side as -1 | 1, spec.hoodY - 0.02, spec.wsBotZ, spec.roofY - 0.02, spec.wsTopZ, 0.07, 0.08, paintMat);
      addTaperedPillar(side as -1 | 1, spec.hoodY - 0.02, spec.rearBotZ, spec.roofY - 0.02, spec.rearTopZ, 0.09, 0.12, paintMat);
    });

    const bedFloor = new THREE.Mesh(
      track(new THREE.BoxGeometry(bodyWidth * 0.8, 0.04, 1.82)),
      trimMat,
    );
    bedFloor.position.set(0, 0.88, -0.96);
    bodyGroup.add(bedFloor);

    const railTopGeo = track(new THREE.BoxGeometry(0.065, 0.06, 1.88));
    [-bodyWidth * 0.44, bodyWidth * 0.44].forEach((rx) => {
      const topRail = new THREE.Mesh(railTopGeo, paintMat);
      topRail.position.set(rx, 0.93, -0.96);
      bodyGroup.add(topRail);
    });

    if (build.bodykit !== 'stock' || build.engineTier >= 1) {
      const rollGeo = track(new THREE.TorusGeometry(bodyWidth * 0.36, 0.04, 8, 18, Math.PI));
      const rollBar = new THREE.Mesh(rollGeo, trimMat);
      rollBar.position.set(0, 0.98, -0.32);
      bodyGroup.add(rollBar);
    }
  } else {
    // All enclosed coupes, sedans & MPVs get sculpted tumblehome greenhouse + interior + A/B/C pillars
    const seatBaseY = silhouette === 'mpv' || silhouette === 'mpv_kapsul' ? 0.78 : 0.64;
    const frontSeatZ = silhouette === 'mpv' || silhouette === 'mpv_kapsul' ? 0.32 : 0.06;
    const rearSeatZ = silhouette === 'mpv' || silhouette === 'mpv_kapsul' ? -0.78 : -0.72;
    addCabinInterior(spec.wsBotZ - 0.16, frontSeatZ, rearSeatZ, seatBaseY);

    // Sculpted semi-transparent tinted glass shell
    const glassShell = new THREE.Mesh(track(createGreenhouseGlassGeometry(spec)), glassMat);
    glassShell.renderOrder = 2;
    bodyGroup.add(glassShell);

    // Crowned body-colored (or carbon) roof
    const roofPanel = new THREE.Mesh(
      track(createCrownedRoofGeometry(spec)),
      build.engineTier === 3 ? carbonMat : paintMat,
    );
    roofPanel.castShadow = true;
    roofPanel.receiveShadow = true;
    bodyGroup.add(roofPanel);

    // Structural A-Pillars, satin B-Pillars & swept C-Pillars
    [-1, 1].forEach((side) => {
      const s = side as -1 | 1;
      addTaperedPillar(s, spec.hoodY - 0.02, spec.wsBotZ, spec.roofY - 0.025, spec.wsTopZ, 0.068, 0.075, paintMat);
      addTaperedPillar(s, (spec.hoodY + spec.trunkY) * 0.5 - 0.02, spec.cabinCenterZ, spec.roofY - 0.025, spec.cabinCenterZ - 0.04, 0.052, 0.075, trimMat);
      addTaperedPillar(s, spec.trunkY - 0.02, spec.rearBotZ, spec.roofY - 0.025, spec.rearTopZ, 0.072, spec.cPillarWidth, paintMat);

      if (silhouette === 'mpv' || silhouette === 'mpv_kapsul') {
        addTaperedPillar(s, spec.trunkY - 0.02, -0.88, spec.roofY - 0.025, -0.88, 0.065, 0.09, paintMat);
      }
    });

    // Side door rub-strip molding & MPV trim accents
    if (silhouette === 'mpv_kapsul') {
      const railGeo = track(new THREE.BoxGeometry(0.05, 0.055, 1.88));
      [-bodyWidth * 0.31, bodyWidth * 0.31].forEach((rx) => {
        const rail = new THREE.Mesh(railGeo, silverTrimMat);
        rail.position.set(rx, spec.roofY + 0.04, -0.58);
        bodyGroup.add(rail);
      });
      const cladGeo = track(new THREE.BoxGeometry(0.045, 0.22, 1.9));
      [-1, 1].forEach((side) => {
        const clad = new THREE.Mesh(cladGeo, silverTrimMat);
        clad.position.set(side * (bodyWidth * 0.48), 0.38, 0.0);
        bodyGroup.add(clad);
      });
    } else if (silhouette === 'mpv') {
      const redMat = track(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.42 }));
      const whiteMat = track(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.42 }));
      const stripeGeo = track(new THREE.BoxGeometry(0.025, 0.07, 2.24));
      const pinGeo = track(new THREE.BoxGeometry(0.025, 0.028, 2.28));
      [-1, 1].forEach((side) => {
        const redStripe = new THREE.Mesh(stripeGeo, redMat);
        redStripe.position.set(side * (bodyWidth * 0.49), 0.42, -0.35);
        bodyGroup.add(redStripe);
        const whitePin = new THREE.Mesh(pinGeo, whiteMat);
        whitePin.position.set(side * (bodyWidth * 0.49), 0.47, -0.35);
        bodyGroup.add(whitePin);
      });
    } else if (silhouette === 'euro_coupe' || silhouette === 'boxy_sedan') {
      // Iconic BMW E36 / Corolla DX black protective side rub molding
      const rubGeo = track(new THREE.BoxGeometry(0.032, 0.05, halfWheelbase * 1.48));
      [-1, 1].forEach((side) => {
        const rub = new THREE.Mesh(rubGeo, trimMat);
        rub.position.set(side * (bodyWidth * 0.492), 0.5, -0.02);
        bodyGroup.add(rub);
      });
    }
  }

  // Windshield wipers + flush door handles
  if (silhouette !== 'roadster') {
    const wiperGeo = track(new THREE.BoxGeometry(0.38, 0.02, 0.025));
    const wiperZ = spec.wsBotZ + 0.04;
    const wiperY = spec.hoodY + 0.015;
    [-0.28, 0.22].forEach((wx) => {
      const wiper = new THREE.Mesh(wiperGeo, trimMat);
      wiper.position.set(wx, wiperY, wiperZ);
      wiper.rotation.z = 0.1;
      bodyGroup.add(wiper);
    });
  }

  const handleMat = silhouette === 'mpv_kapsul' ? silverTrimMat : trimMat;
  const handleGeo = track(new THREE.BoxGeometry(0.028, 0.035, 0.14));
  const handleZList =
    silhouette === 'pickup'
      ? [0.46]
      : silhouette === 'mpv' || silhouette === 'mpv_kapsul' || silhouette === 'boxy_sedan' || silhouette === 'jdm_sedan'
        ? [-0.08, -0.82]
        : [-0.22];
  const handleY = silhouette === 'pickup' ? 0.78 : spec.hoodY - 0.12;
  [-1, 1].forEach((side) => {
    handleZList.forEach((hz) => {
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.set(side * (bodyWidth * 0.488), handleY, hz);
      bodyGroup.add(handle);
    });
  });

  // Racing door number plate & side rally swoosh decals once tuned/modified
  const isDriftModified =
    build.bodykit !== 'stock' ||
    build.engineTier >= 1 ||
    build.diffTier >= 1 ||
    build.suspensionTier >= 1;
  if (isDriftModified) {
    const decalAccent =
      build.paintHex.toLowerCase() === '#f59e0b' || build.paintHex.toLowerCase() === '#eab308'
        ? '#f8fafc'
        : '#facc15';
    const numTex = track(createDoorNumberTexture(CAR_NUMBERS[carId] ?? '7', decalAccent));
    const numMat = track(
      new THREE.MeshBasicMaterial({
        map: numTex,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    const swooshTex = track(createSideSwooshTexture(decalAccent));
    const swooshMat = track(
      new THREE.MeshBasicMaterial({
        map: swooshTex,
        transparent: true,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    const doorPlaneGeo = track(new THREE.PlaneGeometry(0.44, 0.32));
    const swooshPlaneGeo = track(new THREE.PlaneGeometry(1.06, 0.42));
    const sideOffsetX = bodyWidth * 0.495;
    const decalY = spec.hoodY * 0.62;
    const doorZ = silhouette === 'pickup' ? 0.45 : 0.1;
    const swooshZ = silhouette === 'pickup' ? -0.92 : -0.62;

    [-1, 1].forEach((side) => {
      const doorPlate = new THREE.Mesh(doorPlaneGeo, numMat);
      doorPlate.position.set(side * sideOffsetX, decalY + 0.02, doorZ);
      doorPlate.rotation.y = side * (Math.PI / 2);
      bodyGroup.add(doorPlate);

      const swoosh = new THREE.Mesh(swooshPlaneGeo, swooshMat);
      swoosh.position.set(side * sideOffsetX, decalY - 0.02, swooshZ);
      swoosh.rotation.y = side * (Math.PI / 2);
      bodyGroup.add(swoosh);
    });
  }

  // 4. Contoured Side Mirrors mounted on A-Pillar base
  const mirrorZ = silhouette === 'pickup' ? 1.18 : spec.wsBotZ - 0.16;
  const mirrorY = spec.hoodY + 0.06;
  ([-1, 1] as const).forEach((side) => {
    const mirror = createSideMirrorMesh(side, paintMat, trimMat, chromeMat, track);
    mirror.position.set(side * (bodyWidth * 0.445), mirrorY, mirrorZ);
    bodyGroup.add(mirror);
  });

  // 5. Integrated Wrap-Around Front & Rear Bumpers + Iconic Headlights/Taillights
  const frontBumperGroup = new THREE.Group();
  const rearBumperGroup = new THREE.Group();
  bodyGroup.add(frontBumperGroup, rearBumperGroup);

  const isRookieBlackBumper =
    silhouette === 'pickup' || silhouette === 'mpv' || silhouette === 'boxy_sedan';
  const bumperMat =
    silhouette === 'mpv_kapsul'
      ? silverTrimMat
      : isRookieBlackBumper
        ? trimMat
        : paintMat;

  const frontBumperWidth = bodyWidth * spec.noseTaper + extraWide;
  const fBumperMesh = new THREE.Mesh(
    track(createWrapBumperGeometry(frontBumperWidth, frontZ - 0.24, frontZ + 0.06, 0.48, 0.22, 0.88)),
    bumperMat,
  );
  fBumperMesh.castShadow = true;
  frontBumperGroup.add(fBumperMesh);

  // Recessed lower front air dam + brake ducts
  const lowerAirDam = new THREE.Mesh(
    track(new THREE.BoxGeometry(frontBumperWidth * 0.56, 0.16, 0.08)),
    trimMat,
  );
  lowerAirDam.position.set(0, 0.33, frontZ + 0.03);
  frontBumperGroup.add(lowerAirDam);

  // Visible Turbo Intercooler inside lower grille when turboTier >= 1
  if (build.turboTier >= 1) {
    const ic = new THREE.Mesh(
      track(new THREE.BoxGeometry(frontBumperWidth * 0.46, 0.14, 0.09)),
      chromeMat,
    );
    ic.position.set(0, 0.33, frontZ + 0.04);
    frontBumperGroup.add(ic);

    if (build.turboTier === 2) {
      const pipeMat = track(
        new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.78, roughness: 0.24 }),
      );
      [-1, 1].forEach((side) => {
        const pipe = new THREE.Mesh(track(new THREE.BoxGeometry(0.07, 0.11, 0.1)), pipeMat);
        pipe.position.set(side * (frontBumperWidth * 0.25), 0.33, frontZ + 0.045);
        frontBumperGroup.add(pipe);
      });
    }
  }

  const rearBumperWidth = bodyWidth * spec.tailTaper + extraWide;
  const rBumperMesh = new THREE.Mesh(
    track(createWrapBumperGeometry(rearBumperWidth, rearZ + 0.24, rearZ - 0.05, 0.5, 0.23, 0.9)),
    bumperMat,
  );
  rBumperMesh.castShadow = true;
  rearBumperGroup.add(rBumperMesh);

  // Rear license recess panel
  const plateRecess = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.46, 0.14, 0.03)),
    trimMat,
  );
  plateRecess.position.set(0, 0.58, rearZ + 0.07);
  bodyGroup.add(plateRecess);

  const noseWidth = bodyWidth * spec.noseTaper;
  const fasciaZ = frontZ - 0.08;
  const noseUpperY = spec.hoodY - spec.noseDrop - 0.11;

  // Iconic Car-Specific Front Fascia & Recessed Headlight Housings
  if (silhouette === 'euro_coupe') {
    // BMW E36 Coupe: Twin chrome-framed kidney grilles + recessed black headlamp buckets + dual round projectors + clear glass lenses + amber corners
    [-0.125, 0.125].forEach((kx) => {
      const border = new THREE.Mesh(track(new THREE.BoxGeometry(0.21, 0.145, 0.045)), chromeMat);
      border.position.set(kx, noseUpperY + 0.03, fasciaZ + 0.01);
      bodyGroup.add(border);

      const kidney = new THREE.Mesh(track(new THREE.BoxGeometry(0.18, 0.115, 0.055)), trimMat);
      kidney.position.set(kx, noseUpperY + 0.03, fasciaZ + 0.015);
      bodyGroup.add(kidney);
    });

    const bucketGeo = track(new THREE.BoxGeometry(0.32, 0.135, 0.05));
    const lensGeo = track(new THREE.BoxGeometry(0.33, 0.14, 0.02));
    const eyeGeo = track(new THREE.CylinderGeometry(0.052, 0.052, 0.05, 16));
    eyeGeo.rotateX(Math.PI / 2);
    const cornerGeo = track(new THREE.BoxGeometry(0.095, 0.125, 0.09));

    [-1, 1].forEach((side) => {
      const bucket = new THREE.Mesh(bucketGeo, trimMat);
      bucket.position.set(side * (noseWidth * 0.31), noseUpperY + 0.03, fasciaZ);
      bucket.rotation.y = side * -0.07;
      bodyGroup.add(bucket);

      [0.255, 0.355].forEach((offsetRatio) => {
        const lamp = new THREE.Mesh(eyeGeo, headlightMat);
        lamp.position.set(side * (noseWidth * offsetRatio), noseUpperY + 0.03, fasciaZ + 0.01);
        bodyGroup.add(lamp);
      });

      const lens = new THREE.Mesh(lensGeo, headlightLensMat);
      lens.position.set(side * (noseWidth * 0.31), noseUpperY + 0.03, fasciaZ + 0.03);
      lens.rotation.y = side * -0.07;
      bodyGroup.add(lens);

      const corner = new THREE.Mesh(cornerGeo, amberMat);
      corner.position.set(side * (noseWidth * 0.455), noseUpperY + 0.03, fasciaZ - 0.03);
      corner.rotation.y = side * -0.18;
      bodyGroup.add(corner);
    });
  } else if (silhouette === 'boxy_sedan') {
    const grilleBar = new THREE.Mesh(
      track(new THREE.BoxGeometry(noseWidth * 0.54, 0.16, 0.06)),
      trimMat,
    );
    grilleBar.position.set(0, noseUpperY + 0.02, fasciaZ + 0.01);
    bodyGroup.add(grilleBar);

    const lampGeo = track(new THREE.CylinderGeometry(0.076, 0.076, 0.06, 16));
    lampGeo.rotateX(Math.PI / 2);
    const cornerGeo = track(new THREE.BoxGeometry(0.095, 0.14, 0.1));
    [-1, 1].forEach((side) => {
      const lamp = new THREE.Mesh(lampGeo, headlightMat);
      lamp.position.set(side * (noseWidth * 0.33), noseUpperY + 0.02, fasciaZ + 0.015);
      bodyGroup.add(lamp);

      const corner = new THREE.Mesh(cornerGeo, amberMat);
      corner.position.set(side * (noseWidth * 0.45), noseUpperY + 0.02, fasciaZ - 0.02);
      bodyGroup.add(corner);
    });
  } else if (silhouette === 'mpv' || silhouette === 'mpv_kapsul') {
    const isKapsul = silhouette === 'mpv_kapsul';
    const gFrame = new THREE.Mesh(
      track(new THREE.BoxGeometry(noseWidth * 0.44, 0.18, 0.05)),
      chromeMat,
    );
    gFrame.position.set(0, noseUpperY + 0.01, fasciaZ + 0.01);
    bodyGroup.add(gFrame);

    const gInner = new THREE.Mesh(
      track(new THREE.BoxGeometry(noseWidth * 0.4, 0.14, 0.06)),
      trimMat,
    );
    gInner.position.set(0, noseUpperY + 0.01, fasciaZ + 0.015);
    bodyGroup.add(gInner);

    const hlGeo = track(new THREE.BoxGeometry(isKapsul ? 0.32 : 0.25, 0.15, 0.07));
    [-1, 1].forEach((side) => {
      const hl = new THREE.Mesh(hlGeo, headlightMat);
      hl.position.set(side * (noseWidth * 0.33), noseUpperY + 0.01, fasciaZ);
      bodyGroup.add(hl);

      if (!isKapsul) {
        const corner = new THREE.Mesh(
          track(new THREE.BoxGeometry(0.1, 0.15, 0.09)),
          amberMat,
        );
        corner.position.set(side * (noseWidth * 0.45), noseUpperY + 0.01, fasciaZ - 0.02);
        bodyGroup.add(corner);
      } else {
        const fog = new THREE.Mesh(
          track(new THREE.BoxGeometry(0.14, 0.065, 0.06)),
          headlightMat,
        );
        fog.position.set(side * (noseWidth * 0.36), 0.32, frontZ + 0.05);
        frontBumperGroup.add(fog);
      }
    });
  } else if (silhouette === 'pickup') {
    const gFrame = new THREE.Mesh(
      track(new THREE.BoxGeometry(noseWidth * 0.44, 0.15, 0.05)),
      chromeMat,
    );
    gFrame.position.set(0, noseUpperY, fasciaZ + 0.015);
    bodyGroup.add(gFrame);

    const gInner = new THREE.Mesh(
      track(new THREE.BoxGeometry(noseWidth * 0.4, 0.11, 0.06)),
      trimMat,
    );
    gInner.position.set(0, noseUpperY, fasciaZ + 0.02);
    bodyGroup.add(gInner);

    const lampGeo = track(new THREE.BoxGeometry(0.3, 0.14, 0.07));
    [-1, 1].forEach((side) => {
      const lamp = new THREE.Mesh(lampGeo, headlightMat);
      lamp.position.set(side * (noseWidth * 0.35), noseUpperY, fasciaZ + 0.005);
      bodyGroup.add(lamp);
    });
  } else if (silhouette === 'popup_coupe') {
    const podGeo = track(new THREE.BoxGeometry(0.3, 0.095, 0.22));
    const slitGeo = track(new THREE.BoxGeometry(0.26, 0.055, 0.06));
    [-1, 1].forEach((side) => {
      const pod = new THREE.Mesh(podGeo, paintMat);
      pod.position.set(side * (noseWidth * 0.32), noseUpperY + 0.1, fasciaZ - 0.18);
      pod.rotation.x = -0.18;
      bodyGroup.add(pod);

      const slit = new THREE.Mesh(slitGeo, headlightMat);
      slit.position.set(side * (noseWidth * 0.32), noseUpperY + 0.08, fasciaZ - 0.07);
      bodyGroup.add(slit);
    });
  } else if (silhouette === 'roadster') {
    const roundEyeGeo = track(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 18));
    roundEyeGeo.rotateX(Math.PI / 2);
    [-1, 1].forEach((side) => {
      const lamp = new THREE.Mesh(roundEyeGeo, headlightMat);
      lamp.position.set(side * (noseWidth * 0.33), noseUpperY + 0.05, fasciaZ);
      bodyGroup.add(lamp);
    });
  } else {
    // Sleek sculpted recessed housings for S15, R34, Supra, GR86, Mustang, Cefiro, Cressida, Chaser
    const bucketGeo = track(new THREE.BoxGeometry(0.38, 0.11, 0.07));
    const innerGeo = track(new THREE.BoxGeometry(0.33, 0.08, 0.05));
    [-1, 1].forEach((side) => {
      const bucket = new THREE.Mesh(bucketGeo, trimMat);
      bucket.position.set(side * (noseWidth * 0.33), noseUpperY + 0.03, fasciaZ - 0.01);
      bucket.rotation.y = side * -0.15;
      bodyGroup.add(bucket);

      const hl = new THREE.Mesh(innerGeo, headlightMat);
      hl.position.set(side * (noseWidth * 0.33), noseUpperY + 0.03, fasciaZ + 0.01);
      hl.rotation.y = side * -0.15;
      bodyGroup.add(hl);
    });
  }

  // Rear Taillight Clusters
  const tailWidth = bodyWidth * spec.tailTaper;
  const tailZ = rearZ + 0.08;
  const tailY = spec.trunkY - 0.16;

  if (silhouette === 'skyline_coupe') {
    const ringGeo = track(new THREE.CylinderGeometry(0.105, 0.105, 0.06, 18));
    ringGeo.rotateX(Math.PI / 2);
    const innerRingGeo = track(new THREE.CylinderGeometry(0.072, 0.072, 0.06, 18));
    innerRingGeo.rotateX(Math.PI / 2);
    [-1, 1].forEach((side) => {
      const outer = new THREE.Mesh(ringGeo, taillightMat);
      outer.position.set(side * (tailWidth * 0.36), tailY, tailZ - 0.01);
      bodyGroup.add(outer);

      const inner = new THREE.Mesh(innerRingGeo, taillightMat);
      inner.position.set(side * (tailWidth * 0.21), tailY, tailZ - 0.01);
      bodyGroup.add(inner);
    });
  } else if (silhouette === 'muscle') {
    const deck = new THREE.Mesh(
      track(new THREE.BoxGeometry(tailWidth * 0.84, 0.2, 0.05)),
      trimMat,
    );
    deck.position.set(0, tailY, tailZ - 0.005);
    bodyGroup.add(deck);

    const barGeo = track(new THREE.BoxGeometry(0.07, 0.17, 0.06));
    [-1, 1].forEach((side) => {
      [0.24, 0.32, 0.4].forEach((r) => {
        const bar = new THREE.Mesh(barGeo, taillightMat);
        bar.position.set(side * (tailWidth * r), tailY, tailZ - 0.015);
        bodyGroup.add(bar);
      });
    });
  } else {
    // Segmented E36 / JDM rear taillight housing with amber indicator strip
    const housingGeo = track(new THREE.BoxGeometry(0.42, 0.14, 0.06));
    const amberStripGeo = track(new THREE.BoxGeometry(0.16, 0.05, 0.065));
    [-1, 1].forEach((side) => {
      const tl = new THREE.Mesh(housingGeo, taillightMat);
      tl.position.set(side * (tailWidth * 0.32), tailY, tailZ - 0.01);
      tl.rotation.y = side * 0.08;
      bodyGroup.add(tl);

      const ind = new THREE.Mesh(amberStripGeo, amberMat);
      ind.position.set(side * (tailWidth * 0.39), tailY + 0.038, tailZ - 0.012);
      ind.rotation.y = side * 0.08;
      bodyGroup.add(ind);
    });
  }

  // Hood bulge / Engine swap scoop when engineTier >= 2 or muscle
  if (silhouette === 'muscle' || build.engineTier >= 2) {
    const scoopH = build.engineTier === 3 ? 0.11 : 0.075;
    const scoop = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.52, scoopH, 0.72)),
      build.engineTier === 3 ? carbonMat : trimMat,
    );
    scoop.position.set(0, spec.hoodY + 0.02, 1.32);
    bodyGroup.add(scoop);
  }

  // 6. Bodykit & Aero Parts
  if (build.bodykit === 'street' || build.bodykit === 'widebody') {
    const lip = new THREE.Mesh(
      track(createWrapBumperGeometry(frontBumperWidth + 0.12, frontZ - 0.2, frontZ + 0.14, 0.22, 0.16, 0.9)),
      carbonMat,
    );
    lip.castShadow = true;
    frontBumperGroup.add(lip);

    const skirtGeo = track(new THREE.BoxGeometry(0.11, 0.08, halfWheelbase * 1.48));
    [-1, 1].forEach((side) => {
      const skirt = new THREE.Mesh(skirtGeo, carbonMat);
      skirt.position.set(side * (bodyWidth * 0.505 + extraWide), 0.2, 0);
      bodyGroup.add(skirt);
    });

    const diffuser = new THREE.Mesh(
      track(new THREE.BoxGeometry(rearBumperWidth * 0.78, 0.11, 0.22)),
      carbonMat,
    );
    diffuser.position.set(0, 0.22, rearZ + 0.01);
    rearBumperGroup.add(diffuser);
  }

  if (build.bodykit === 'widebody') {
    const flareGeo = track(
      new THREE.CylinderGeometry(spec.wheelRadius + 0.13, spec.wheelRadius + 0.13, 0.2, 20, 1, false, 0, Math.PI),
    );
    flareGeo.rotateZ(Math.PI / 2);
    flareGeo.rotateX(Math.PI / 2);
    const trackHalf = bodyWidth * 0.525 + extraWide;
    [
      [-trackHalf, spec.wheelRadius + 0.02, halfWheelbase],
      [trackHalf, spec.wheelRadius + 0.02, halfWheelbase],
      [-trackHalf, spec.wheelRadius + 0.02, -halfWheelbase],
      [trackHalf, spec.wheelRadius + 0.02, -halfWheelbase],
    ].forEach(([fx, fy, fz]) => {
      const flare = new THREE.Mesh(flareGeo, paintMat);
      flare.position.set(fx, fy, fz);
      flare.castShadow = true;
      bodyGroup.add(flare);
    });
  }

  // 7. Spoiler / GT Wing
  if (build.spoiler === 'ducktail') {
    const duckY = silhouette === 'mpv' || silhouette === 'mpv_kapsul' ? spec.roofY - 0.04 : spec.trunkY + 0.05;
    const duck = new THREE.Mesh(
      track(new THREE.BoxGeometry(tailWidth * 0.84, 0.12, 0.22)),
      paintMat,
    );
    duck.position.set(0, duckY, rearZ + 0.14);
    duck.rotation.x = -0.38;
    duck.castShadow = true;
    bodyGroup.add(duck);
  } else if (build.spoiler === 'gtwing' || build.spoiler === 'chassis') {
    const baseDeckY = silhouette === 'mpv' || silhouette === 'mpv_kapsul' ? spec.roofY - 0.02 : spec.trunkY;
    const wingY =
      build.spoiler === 'chassis' ? Math.max(1.36, baseDeckY + 0.42) : baseDeckY + 0.3;
    const wingW = build.spoiler === 'chassis' ? bodyWidth + 0.34 : bodyWidth + 0.12;

    const blade = new THREE.Mesh(
      track(new THREE.BoxGeometry(wingW, 0.05, 0.32)),
      carbonMat,
    );
    blade.position.set(0, wingY, rearZ + 0.08);
    blade.rotation.x = 0.12;
    blade.castShadow = true;
    bodyGroup.add(blade);

    const endplateGeo = track(new THREE.BoxGeometry(0.045, 0.22, 0.38));
    [-1, 1].forEach((side) => {
      const endplate = new THREE.Mesh(endplateGeo, paintMat);
      endplate.position.set(side * (wingW / 2), wingY, rearZ + 0.08);
      bodyGroup.add(endplate);

      const strutH = build.spoiler === 'chassis' ? wingY - 0.34 : 0.32;
      const strut = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.045, strutH, 0.12)),
        trimMat,
      );
      strut.position.set(
        side * 0.4,
        wingY - strutH / 2,
        build.spoiler === 'chassis' ? rearZ - 0.02 : rearZ + 0.16,
      );
      bodyGroup.add(strut);
    });
  }

  // 8. Exhaust Pipes & Backfire Flame Cones
  const exhaustFlames: THREE.Mesh[] = [];
  const flameMat = track(
    new THREE.MeshBasicMaterial({
      color: build.engineTier === 3 ? 0xf59e0b : 0x38bdf8,
      transparent: true,
      opacity: 0.88,
    }),
  );
  const flameGeo = track(new THREE.ConeGeometry(0.1, 0.52, 10));
  flameGeo.rotateX(-Math.PI / 2);

  const exhaustOffsets = build.engineTier >= 1 ? [-0.44, 0.44] : [-0.44];
  exhaustOffsets.forEach((ex) => {
    const pipeGeo = track(new THREE.CylinderGeometry(0.068, 0.072, 0.26, 14));
    pipeGeo.rotateX(Math.PI / 2);
    const pipe = new THREE.Mesh(pipeGeo, chromeMat);
    pipe.position.set(ex, 0.23, rearZ - 0.03);
    bodyGroup.add(pipe);

    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(ex, 0.23, rearZ - 0.35);
    flame.visible = false;
    bodyGroup.add(flame);
    exhaustFlames.push(flame);
  });

  // 9. Underglow Neon
  let underglowLight: THREE.PointLight | null = null;
  if (build.underglowHex !== 'none') {
    const glowColor = new THREE.Color(build.underglowHex);
    const barMat = track(new THREE.MeshBasicMaterial({ color: glowColor }));
    const bar = new THREE.Mesh(
      track(new THREE.BoxGeometry(bodyWidth * 0.7, 0.025, 2.1)),
      barMat,
    );
    bar.position.set(0, 0.15, 0);
    bodyGroup.add(bar);

    if (!options.isSoftwareGl) {
      underglowLight = new THREE.PointLight(glowColor, 3.2, 6.2, 1.5);
      underglowLight.position.set(0, 0.22, 0);
      root.add(underglowLight);
    }
  }

  // 10. Separated Wheel & Steering Hierarchy
  const wideOffset = build.bodykit === 'widebody' ? 0.095 : 0.015;
  const frontAngleTrackBoost = build.suspensionTier === 2 ? 0.055 : 0;
  const frontStanceX = bodyWidth * 0.495 + wideOffset + frontAngleTrackBoost;
  const rearStanceX = bodyWidth * 0.495 + wideOffset;
  const wheelY = spec.wheelRadius;
  const camberRad = THREE.MathUtils.degToRad(build.camber);
  const isProTire = build.tireTier === 2;

  const stripeMat = track(
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide }),
  );

  // Front Left: steerGroup (Y) -> camberGroup (Z + flip Y) -> frontLeftWheel (X spin)
  const frontLeftSteerGroup = new THREE.Group();
  frontLeftSteerGroup.name = 'frontLeftSteerGroup';
  frontLeftSteerGroup.position.set(-frontStanceX, wheelY, halfWheelbase);
  const flCamber = new THREE.Group();
  flCamber.rotation.y = Math.PI;
  flCamber.rotation.z = -camberRad;
  frontLeftSteerGroup.add(flCamber);
  const frontLeftWheel = buildWheelMesh(
    build.rimStyle,
    rimMat,
    tireMat,
    caliperMat,
    discMat,
    chromeMat,
    stripeMat,
    spec.wheelRadius,
    isProTire,
    isProTire,
    track,
  );
  frontLeftWheel.name = 'frontLeftWheel';
  flCamber.add(frontLeftWheel);

  // Front Right: steerGroup (Y) -> camberGroup (Z) -> frontRightWheel (X spin)
  const frontRightSteerGroup = new THREE.Group();
  frontRightSteerGroup.name = 'frontRightSteerGroup';
  frontRightSteerGroup.position.set(frontStanceX, wheelY, halfWheelbase);
  const frCamber = new THREE.Group();
  frCamber.rotation.z = camberRad;
  frontRightSteerGroup.add(frCamber);
  const frontRightWheel = buildWheelMesh(
    build.rimStyle,
    rimMat,
    tireMat,
    caliperMat,
    discMat,
    chromeMat,
    stripeMat,
    spec.wheelRadius,
    isProTire,
    isProTire,
    track,
  );
  frontRightWheel.name = 'frontRightWheel';
  frCamber.add(frontRightWheel);

  // Rear Left: mount -> camberGroup (Z + flip Y) -> rearLeftWheel (X spin)
  const rlMount = new THREE.Group();
  rlMount.position.set(-rearStanceX, wheelY, -halfWheelbase);
  const rlCamber = new THREE.Group();
  rlCamber.rotation.y = Math.PI;
  rlCamber.rotation.z = -camberRad * 0.85;
  rlMount.add(rlCamber);
  const rearLeftWheel = buildWheelMesh(
    build.rimStyle,
    rimMat,
    tireMat,
    caliperMat,
    discMat,
    chromeMat,
    stripeMat,
    spec.wheelRadius,
    build.tireTier >= 1,
    isProTire,
    track,
  );
  rearLeftWheel.name = 'rearLeftWheel';
  rlCamber.add(rearLeftWheel);

  // Rear Right: mount -> camberGroup (Z) -> rearRightWheel (X spin)
  const rrMount = new THREE.Group();
  rrMount.position.set(rearStanceX, wheelY, -halfWheelbase);
  const rrCamber = new THREE.Group();
  rrCamber.rotation.z = camberRad * 0.85;
  rrMount.add(rrCamber);
  const rearRightWheel = buildWheelMesh(
    build.rimStyle,
    rimMat,
    tireMat,
    caliperMat,
    discMat,
    chromeMat,
    stripeMat,
    spec.wheelRadius,
    build.tireTier >= 1,
    isProTire,
    track,
  );
  rearRightWheel.name = 'rearRightWheel';
  rrCamber.add(rearRightWheel);

  root.add(frontLeftSteerGroup, frontRightSteerGroup, rlMount, rrMount);

  // Rally mudflaps behind wheels when drift-modified
  const mudflaps: THREE.Mesh[] = [];
  const flapColor = build.paintHex.toLowerCase() === '#ef4444' ? 0xfacc15 : 0xdc2626;
  const flapMat = track(
    new THREE.MeshStandardMaterial({
      color: flapColor,
      roughness: 0.65,
      side: THREE.DoubleSide,
    }),
  );
  const flapGeo = track(new THREE.BoxGeometry(0.22, 0.2, 0.025));
  flapGeo.translate(0, -0.1, 0);
  if (isDriftModified || !isRookieAsset) {
    [
      [-rearStanceX + 0.02, 0.32, halfWheelbase - spec.wheelRadius - 0.05],
      [rearStanceX - 0.02, 0.32, halfWheelbase - spec.wheelRadius - 0.05],
      [-rearStanceX + 0.02, 0.32, -halfWheelbase - spec.wheelRadius - 0.05],
      [rearStanceX - 0.02, 0.32, -halfWheelbase - spec.wheelRadius - 0.05],
    ].forEach(([mx, my, mz]) => {
      const flap = new THREE.Mesh(flapGeo, flapMat);
      flap.position.set(mx, my, mz);
      bodyGroup.add(flap);
      mudflaps.push(flap);
    });
  }

  // Soft radial contact shadow directly beneath car
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d');
  if (sCtx) {
    const grad = sCtx.createRadialGradient(64, 64, 14, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0,0,0,0.68)');
    grad.addColorStop(0.65, 'rgba(0,0,0,0.28)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
  }
  const shadowTex = track(new THREE.CanvasTexture(shadowCanvas));
  const contactShadowMat = track(
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.7,
    }),
  );
  const contactShadow = new THREE.Mesh(
    track(new THREE.PlaneGeometry(bodyWidth * 1.44, frontZ - rearZ + 0.72)),
    contactShadowMat,
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.022;
  root.add(contactShadow);

  const updateDamageVisual = (bodyIntegrity: number) => {
    if (bodyIntegrity >= 80) {
      frontBumperGroup.visible = true;
      frontBumperGroup.position.set(0, 0, 0);
      frontBumperGroup.rotation.set(0, 0, 0);
      rearBumperGroup.visible = true;
      rearBumperGroup.position.set(0, 0, 0);
      rearBumperGroup.rotation.set(0, 0, 0);
    } else if (bodyIntegrity >= 40) {
      frontBumperGroup.visible = true;
      frontBumperGroup.position.set(0.02, -0.04, 0.03);
      frontBumperGroup.rotation.set(0.05, 0.03, 0.07);
      rearBumperGroup.visible = true;
      rearBumperGroup.position.set(-0.02, -0.04, -0.02);
      rearBumperGroup.rotation.set(-0.05, -0.03, -0.06);
    } else {
      frontBumperGroup.visible = false;
      rearBumperGroup.visible = true;
      rearBumperGroup.position.set(-0.04, -0.09, -0.05);
      rearBumperGroup.rotation.set(-0.1, -0.07, -0.15);
    }
  };

  updateDamageVisual(build.bodyIntegrity ?? 100);

  return {
    root,
    bodyGroup,
    chassisGroup: bodyGroup,
    baseChassisY: rideOffsetY,
    frontLeftSteerGroup,
    frontRightSteerGroup,
    frontLeftPivot: frontLeftSteerGroup,
    frontRightPivot: frontRightSteerGroup,
    frontLeftWheel,
    frontRightWheel,
    rearLeftWheel,
    rearRightWheel,
    wheelMeshes: [frontLeftWheel, frontRightWheel, rearLeftWheel, rearRightWheel],
    mudflaps,
    rearWheelOffsets: [
      new THREE.Vector3(-rearStanceX, 0.08, -halfWheelbase),
      new THREE.Vector3(rearStanceX, 0.08, -halfWheelbase),
    ],
    taillightMat,
    exhaustFlames,
    underglowLight,
    updateDamageVisual,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

// Shared GLTFLoader instance for optional external .glb / .gltf car assets
const sharedGltfLoader = new GLTFLoader();

function wrapMeshIntoGroup(target: THREE.Object3D, groupName: string): THREE.Group {
  if (target instanceof THREE.Group) {
    target.name = groupName;
    return target;
  }
  const parent = target.parent;
  const wrapper = new THREE.Group();
  wrapper.name = groupName;
  wrapper.position.copy(target.position);
  target.position.set(0, 0, 0);
  if (parent) {
    parent.add(wrapper);
  }
  wrapper.add(target);
  return wrapper;
}

/**
 * Loads an external .glb / .gltf car model when configured (via CarCatalogItem.modelUrl
 * or options.modelUrl) and maps bodyGroup + wheel steering/spin hierarchy,
 * automatically falling back to the detailed procedural 3D car rig if unavailable or on error.
 */
export async function loadCarRigWithFallback(
  carId: CarId,
  build: CarBuildConfig,
  options: { isSoftwareGl?: boolean; modelUrl?: string } = {},
): Promise<CarRig> {
  const carMeta = CAR_CATALOG.find((c) => c.id === carId) ?? CAR_CATALOG[0];
  const url = options.modelUrl ?? carMeta.modelUrl;

  if (!url) {
    return buildPixarCar(carId, build, options);
  }

  try {
    const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
      sharedGltfLoader.load(url, resolve, undefined, reject);
    });

    const modelRoot = gltf.scene;
    const spec = SILHOUETTE_SPECS[carMeta.silhouette];

    // Normalize imported model scale & ground bottom-center at y = 0
    const box = new THREE.Box3().setFromObject(modelRoot);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Jika sumbu terpanjang model ada di X (bukan Z), putar 90Â° agar panjang mobil sejajar sumbu Z game
    // Putaran tambahan per mobil (modelYawDeg di katalog) untuk mengoreksi arah hadap model
    const autoYaw = size.x > size.z * 1.05 ? Math.PI / 2 : 0;
    const extraYaw = THREE.MathUtils.degToRad(carMeta.modelYawDeg ?? 0);
    if (autoYaw !== 0 || extraYaw !== 0) {
      modelRoot.rotation.y = autoYaw + extraYaw;
      modelRoot.updateMatrixWorld(true);
      box.setFromObject(modelRoot);
      box.getSize(size);
      box.getCenter(center);
    }

    const targetLength = spec.frontZ - spec.rearZ;
    const scaleFactor = size.z > 0.01 ? targetLength / size.z : 1;
    modelRoot.scale.setScalar(scaleFactor);
    modelRoot.position.set(-center.x * scaleFactor, -box.min.y * scaleFactor, -center.z * scaleFactor);

    const disposables: { dispose: () => void }[] = [];
    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.1,
      roughness: 0.2,
    });
    disposables.push(taillightMat);

    modelRoot.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        disposables.push(child.geometry);
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => disposables.push(m));
        } else if (child.material) {
          disposables.push(child.material);
          if (/paint|body/i.test(child.name) && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.color.set(build.paintHex);
            child.material.envMapIntensity = 0.72;
          }
        }
      }
    });

    const root = new THREE.Group();
    // bodyGroup dipisah dari modelRoot: fisika menimpa bodyGroup.position.y,
    // sehingga offset tanah (modelRoot.position.y) harus berada di node anak agar tidak hilang.
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'bodyGroup';
    bodyGroup.add(modelRoot);
    root.add(bodyGroup);

    const findNode = (names: string[]) => {
      for (const n of names) {
        const obj = modelRoot.getObjectByName(n);
        if (obj) return obj;
      }
      return undefined;
    };

    const flObj = findNode(['frontLeftWheel', 'wheel_fl', 'Wheel_FL', 'FL_Wheel']);
    const frObj = findNode(['frontRightWheel', 'wheel_fr', 'Wheel_FR', 'FR_Wheel']);
    const rlObj = findNode(['rearLeftWheel', 'wheel_rl', 'Wheel_RL', 'RL_Wheel']);
    const rrObj = findNode(['rearRightWheel', 'wheel_rr', 'Wheel_RR', 'RR_Wheel']);

    const frontLeftWheel = flObj ? wrapMeshIntoGroup(flObj, 'frontLeftWheel') : new THREE.Group();
    const frontRightWheel = frObj ? wrapMeshIntoGroup(frObj, 'frontRightWheel') : new THREE.Group();
    const rearLeftWheel = rlObj ? wrapMeshIntoGroup(rlObj, 'rearLeftWheel') : new THREE.Group();
    const rearRightWheel = rrObj ? wrapMeshIntoGroup(rrObj, 'rearRightWheel') : new THREE.Group();

    const frontLeftSteerGroup = wrapMeshIntoGroup(frontLeftWheel, 'frontLeftSteerGroup');
    const frontRightSteerGroup = wrapMeshIntoGroup(frontRightWheel, 'frontRightSteerGroup');

    const rearStanceX = spec.width * 0.5;
    return {
      root,
      bodyGroup,
      chassisGroup: bodyGroup,
      baseChassisY: 0,
      frontLeftSteerGroup,
      frontRightSteerGroup,
      frontLeftPivot: frontLeftSteerGroup,
      frontRightPivot: frontRightSteerGroup,
      frontLeftWheel,
      frontRightWheel,
      rearLeftWheel,
      rearRightWheel,
      wheelMeshes: [frontLeftWheel, frontRightWheel, rearLeftWheel, rearRightWheel],
      mudflaps: [],
      rearWheelOffsets: [
        new THREE.Vector3(-rearStanceX, 0.08, -spec.halfWheelbase),
        new THREE.Vector3(rearStanceX, 0.08, -spec.halfWheelbase),
      ],
      taillightMat,
      exhaustFlames: [],
      underglowLight: null,
      updateDamageVisual: () => {},
      dispose: () => {
        disposables.forEach((d) => d.dispose());
      },
    };
  } catch (err) {
    console.warn(`[carBuilder3d] GLB/GLTF load failed for ${carId}, falling back to procedural car:`, err);
    return buildPixarCar(carId, build, options);
  }
}
