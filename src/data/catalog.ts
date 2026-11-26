import {
  CalculatedCarStats,
  CarBuildConfig,
  CarCatalogItem,
  CarId,
  PaintFinish,
  RimStyle,
  SpoilerType,
  BodykitType,
  StorePackage,
  TrackDefinition,
  UpgradeTierInfo,
} from '../types/game';

export const CAR_CATALOG: CarCatalogItem[] = [
  // --- 1. KELAS ROOKIE / PEMULA ---
  {
    id: 'carry_futura',
    name: 'Suzuki Carry / Futura Pick-up',
    subtitle: 'Budget Drift Pick-up',
    carClass: 'Rookie',
    silhouette: 'pickup',
    era: '1997 Lokal',
    drivetrain: 'FR',
    engineSoundType: 'kei',
    baseHp: 92,
    baseTorque: 128,
    baseWeightKg: 810,
    baseMaxSpeed: 158,
    coinPrice: 0,
    creditPrice: 0,
    defaultPaint: '#254b8c',
    thumbnailUrl: '/assets/aistudio/3D_illustration_of_pick-up_truck_05a066b1_aeef393a.jpg',
    description:
      'Favorit latihan pemula di Indonesia. Bobot bak belakang yang sangat ringan membuat ban belakang mudah kehilangan traksi untuk belajar donut & figure-8.',
  },
  {
    id: 'kijang_super',
    name: 'Toyota Kijang Super',
    subtitle: 'Boxy Grassroots MPV',
    carClass: 'Rookie',
    silhouette: 'mpv',
    era: '1992 Legend',
    drivetrain: 'FR',
    engineSoundType: 'i4',
    baseHp: 108,
    baseTorque: 148,
    baseWeightKg: 1120,
    baseMaxSpeed: 162,
    coinPrice: 850,
    creditPrice: 45,
    defaultPaint: '#2b4c7e',
    thumbnailUrl: '/assets/aistudio/Toyota_Kijang_Super_illustration_866e1ef2_f019d793.jpg',
    description:
      'MPV klasik ikonik dengan strip samping merah-putih. Suku cadang melimpah dan mudah diajak melatih transisi dasar serta kontrol sudut.',
  },
  {
    id: 'kijang_kapsul',
    name: 'Toyota Kijang Kapsul',
    subtitle: 'Two-Tone Drift MPV',
    carClass: 'Rookie',
    silhouette: 'mpv_kapsul',
    era: '1997 Legend',
    drivetrain: 'FR',
    engineSoundType: 'i4',
    baseHp: 120,
    baseTorque: 165,
    baseWeightKg: 1175,
    baseMaxSpeed: 170,
    coinPrice: 1150,
    creditPrice: 60,
    defaultPaint: '#2d5a3c',
    thumbnailUrl: '/assets/aistudio/Toyota_Kijang_Kapsul_3D_illustra__6a749b4c_3b36f5a8.jpg',
    description:
      'Versi kapsul dengan over-fender two-tone dan wheel-track lebar. Stabil saat latihan donut, figure-8, hingga entry tikungan panjang.',
  },
  {
    id: 'corolla_dx',
    name: 'Toyota Corolla DX (KE70)',
    subtitle: 'Legenda Grassroots',
    carClass: 'Rookie',
    silhouette: 'boxy_sedan',
    era: '1982 JDM',
    drivetrain: 'FR',
    engineSoundType: 'i4',
    baseHp: 118,
    baseTorque: 148,
    baseWeightKg: 895,
    baseMaxSpeed: 174,
    coinPrice: 1400,
    creditPrice: 75,
    defaultPaint: '#1d63dc',
    thumbnailUrl: '/assets/aistudio/Low-poly_3D_car_illustration_2ed7b750_3049de80.jpg',
    description:
      'Bobot di bawah 1 ton dengan dimensi kompak. Sangat responsif dan mudah dikendalikan untuk membaca sudut (angle) drift.',
  },
  {
    id: 'bmw_e36',
    name: 'BMW Seri 3 E36',
    subtitle: 'Raja Drift Pemula-Menengah',
    carClass: 'Rookie',
    silhouette: 'euro_coupe',
    era: '1995 Euro',
    drivetrain: 'FR',
    engineSoundType: 'i4',
    baseHp: 185,
    baseTorque: 240,
    baseWeightKg: 1290,
    baseMaxSpeed: 196,
    coinPrice: 2100,
    creditPrice: 110,
    defaultPaint: '#1e3d6b',
    thumbnailUrl: '/assets/aistudio/Low-poly_BMW_E36_illustration_fe08285e_21aa3904.jpg',
    description:
      'Distribusi bobot mendekati 50:50 dengan sasis kaku dan presisi. Siap di-upgrade ke mesin stroker M52/M54 atau swap 1JZ/2JZ saat naik kelas.',
  },

  // --- 2. KELAS AM / SEMI-PRO ---
  {
    id: 'cefiro_a31',
    name: 'Nissan Cefiro (A31)',
    subtitle: 'Long-Wheelbase Sweeper',
    carClass: 'Am / Semi-Pro',
    silhouette: 'jdm_sedan',
    era: '1991 JDM',
    drivetrain: 'FR',
    engineSoundType: 'i4',
    baseHp: 215,
    baseTorque: 270,
    baseWeightKg: 1320,
    baseMaxSpeed: 205,
    coinPrice: 3200,
    creditPrice: 160,
    defaultPaint: '#f1f5f9',
    description:
      'Berbagi platform dengan Silvia & Skyline. Wheelbase panjangnya membuat transisi drift super mulus dan tidak mudah melintir (spin).',
  },
  {
    id: 'cressida_mx83',
    name: 'Toyota Cressida / Mark II (MX83)',
    subtitle: 'Inline-6 Cruiser',
    carClass: 'Am / Semi-Pro',
    silhouette: 'jdm_sedan',
    era: '1990 JDM',
    drivetrain: 'FR',
    engineSoundType: 'i4',
    baseHp: 225,
    baseTorque: 285,
    baseWeightKg: 1360,
    baseMaxSpeed: 208,
    coinPrice: 3800,
    creditPrice: 190,
    defaultPaint: '#1e293b',
    description:
      'Mesin 6-silinder segaris bertenaga dengan ruang mesin lega untuk swap 1JZ/2JZ tanpa banyak memotong sasis.',
  },
  {
    id: 'miata_mx5',
    name: 'Mazda Miata (MX-5)',
    subtitle: 'Nimble Roadster',
    carClass: 'Am / Semi-Pro',
    silhouette: 'roadster',
    era: '1994 Roadster',
    drivetrain: 'FR',
    engineSoundType: 'i4',
    baseHp: 170,
    baseTorque: 195,
    baseWeightKg: 960,
    baseMaxSpeed: 194,
    coinPrice: 4100,
    creditPrice: 200,
    defaultPaint: '#ef4444',
    description:
      'Sasis roadster ringan dengan handling luar biasa. Wheelbase pendek menuntut refleks cepat dan sangat lincah setelah swap SR20/K-Series.',
  },
  {
    id: 'rx7_fc3s',
    name: 'Mazda RX-7 (FC3S)',
    subtitle: 'Rotary Semi-Pro',
    carClass: 'Am / Semi-Pro',
    silhouette: 'popup_coupe',
    era: '1989 Rotary',
    drivetrain: 'FR',
    engineSoundType: 'rotary',
    baseHp: 245,
    baseTorque: 280,
    baseWeightKg: 1210,
    baseMaxSpeed: 214,
    coinPrice: 4600,
    creditPrice: 225,
    defaultPaint: '#f8fafc',
    description:
      'Coupe rotary ikonik dengan sasis seimbang dan putaran mesin tinggi untuk mempertahankan entry speed di tikungan panjang.',
  },

  // --- 3. KELAS PRO (KOMPETISI UTAMA) ---
  {
    id: 'silvia_s15',
    name: 'Nissan Silvia (S15 Spec-R)',
    subtitle: 'Gold Standard Drifting',
    carClass: 'Pro',
    silhouette: 'silvia_coupe',
    era: '2000 Pro Spec',
    drivetrain: 'FR',
    engineSoundType: 'i4',
    baseHp: 310,
    baseTorque: 365,
    baseWeightKg: 1230,
    baseMaxSpeed: 228,
    coinPrice: 6800,
    creditPrice: 320,
    defaultPaint: '#06b6d4',
    description:
      'Standar emas dunia drifting dengan geometri suspensi belakang multi-link ideal. Siap dibangun hingga 1.000+ HP dengan swap SR20/RB26/2JZ.',
  },
  {
    id: 'sx_180',
    name: 'Nissan 180SX / 240SX',
    subtitle: 'Pop-up Pro Chassis',
    carClass: 'Pro',
    silhouette: 'popup_coupe',
    era: '1996 Pro Spec',
    drivetrain: 'FR',
    engineSoundType: 'i4',
    baseHp: 295,
    baseTorque: 350,
    baseWeightKg: 1195,
    baseMaxSpeed: 225,
    coinPrice: 7200,
    creditPrice: 340,
    defaultPaint: '#ec4899',
    description:
      'Saudara kembar Silvia dengan dukungan komponen kompetisi tak terbatas dan karakter meluncur menyamping yang sangat agresif.',
  },
  {
    id: 'skyline_r34',
    name: 'Nissan Skyline R34 (RWD)',
    subtitle: 'High-Speed Pro Chassis',
    carClass: 'Pro',
    silhouette: 'skyline_coupe',
    era: '1999 Pro Spec',
    drivetrain: 'FR',
    engineSoundType: 'rotary',
    baseHp: 365,
    baseTorque: 440,
    baseWeightKg: 1360,
    baseMaxSpeed: 242,
    coinPrice: 8800,
    creditPrice: 410,
    defaultPaint: '#2563eb',
    description:
      'Konversi RWD murni dengan sasis kokoh dan jarak sumbu roda ideal untuk kecepatan tinggi serta tandem agresif di trek besar.',
  },
  {
    id: 'chaser_jzx100',
    name: 'Toyota Chaser (JZX100)',
    subtitle: '1JZ-GTE Tandem King',
    carClass: 'Pro',
    silhouette: 'jdm_sedan',
    era: '1998 Pro Spec',
    drivetrain: 'FR',
    engineSoundType: 'i4',
    baseHp: 350,
    baseTorque: 430,
    baseWeightKg: 1380,
    baseMaxSpeed: 238,
    coinPrice: 9400,
    creditPrice: 440,
    defaultPaint: '#10b981',
    description:
      'Favorit kelas Pro dengan mesin legendaris 1JZ-GTE dan stabilitas luar biasa saat melakukan tandem kecepatan tinggi.',
  },
  {
    id: 'gr86_pro',
    name: 'Toyota GR86 / BRZ Pro',
    subtitle: 'Modern D1GP & FD Spec',
    carClass: 'Pro',
    silhouette: 'supra_coupe',
    era: '2023 Pro Spec',
    drivetrain: 'FR',
    engineSoundType: 'hyper',
    baseHp: 325,
    baseTorque: 360,
    baseWeightKg: 1185,
    baseMaxSpeed: 236,
    coinPrice: 10200,
    creditPrice: 470,
    defaultPaint: '#ef4444',
    description:
      'Sasis ringan dengan pusat gravitasi rendah dan aerodinamika modern. Wajib di-swap ke 2JZ-GTE, VR38DETT, atau V8 LS untuk dominasi Pro.',
  },
  {
    id: 'supra_a90',
    name: 'Toyota GR Supra (A90)',
    subtitle: 'World Pro Primadona',
    carClass: 'Pro',
    silhouette: 'supra_coupe',
    era: '2024 Pro Spec',
    drivetrain: 'FR',
    engineSoundType: 'hyper',
    baseHp: 415,
    baseTorque: 510,
    baseWeightKg: 1290,
    baseMaxSpeed: 252,
    coinPrice: 11500,
    creditPrice: 520,
    defaultPaint: '#f59e0b',
    description:
      'Primadona Formula Drift dan D1GP modern dengan jarak sumbu roda kompak dan respons torsi sangat cepat di setiap perpindahan gigi.',
  },
  {
    id: 'mustang_v8',
    name: 'Ford Mustang V8 Formula Spec',
    subtitle: '1000HP V8 Torque Monster',
    carClass: 'Pro',
    silhouette: 'muscle',
    era: '2024 FD Pro',
    drivetrain: 'FR',
    engineSoundType: 'v8',
    baseHp: 480,
    baseTorque: 620,
    baseWeightKg: 1410,
    baseMaxSpeed: 256,
    coinPrice: 12500,
    creditPrice: 560,
    defaultPaint: '#eab308',
    description:
      'Dominan di Formula Drift berkat mesin V8 berkapasitas besar dengan torsi instan dari putaran bawah tanpa turbo lag.',
  },
];

export const UPGRADE_PART_TIERS: Record<
  'engineTier' | 'turboTier' | 'diffTier' | 'tireTier' | 'suspensionTier' | 'brakeTier',
  { label: string; category: 'mesin' | 'performa'; tiers: UpgradeTierInfo[] }
> = {
  engineTier: {
    label: 'Mesin & Engine Swap',
    category: 'mesin',
    tiers: [
      { tier: 0, name: 'Stock Factory Engine', detail: 'Standar bawaan pabrik, cocok latihan dasar', coinCost: 0, creditCost: 0 },
      { tier: 1, name: 'Stroker / SR20DET Built', detail: '+85 HP, respons gas tajam untuk kelas Am', coinCost: 750, creditCost: 40 },
      { tier: 2, name: 'Swap 1JZ-GTE / 2JZ-GTE', detail: '+240 HP, limit RPM tinggi & backfire agresif', coinCost: 1950, creditCost: 95 },
      { tier: 3, name: 'Swap VR38 / LS V8 Pro (1000+ HP)', detail: '+450 HP, tenaga kompetisi Pro Kejurnas/FD', coinCost: 4200, creditCost: 195 },
    ],
  },
  turboTier: {
    label: 'Induksi Paksa (Turbo / Supercharger)',
    category: 'mesin',
    tiers: [
      { tier: 0, name: 'Naturally Aspirated', detail: 'Tanpa turbo, penyaluran tenaga halus', coinCost: 0, creditCost: 0 },
      { tier: 1, name: 'Single Ball-Bearing Turbo', detail: '+90 HP, boost mid-range & suara spool', coinCost: 1100, creditCost: 60 },
      { tier: 2, name: 'Garrett Pro Twin-Scroll + Anti-Lag', detail: '+210 HP, boost instan tanpa turbo lag', coinCost: 2700, creditCost: 135 },
    ],
  },
  diffTier: {
    label: 'Differential (Kunci Gardan)',
    category: 'mesin',
    tiers: [
      { tier: 0, name: 'Stock Open Diff', detail: 'Sulit menahan slide panjang (understeer)', coinCost: 0, creditCost: 0 },
      { tier: 1, name: 'Welded Drift Diff', detail: 'Murah & efektif untuk pemula mengunci roda belakang', coinCost: 550, creditCost: 30 },
      { tier: 2, name: '2-Way Pro Drift LSD', detail: 'Transisi super halus & kontrol gas presisi tinggi', coinCost: 1650, creditCost: 85 },
    ],
  },
  tireTier: {
    label: 'Kompon Ban',
    category: 'performa',
    tiers: [
      { tier: 0, name: 'Stock Street Eco', detail: 'Grip kaku, mudah kehilangan kendali saat slide', coinCost: 0, creditCost: 0 },
      { tier: 1, name: 'Sport Semi-Drift', detail: 'Traksi seimbang untuk belajar entry & figure-8', coinCost: 600, creditCost: 35 },
      { tier: 2, name: 'Semi-Slick Pro Drift (Wide)', detail: 'Daya cengkeram tinggi saat meluncur menyamping', coinCost: 1600, creditCost: 80 },
    ],
  },
  suspensionTier: {
    label: 'Coilover & Angle Kit',
    category: 'performa',
    tiers: [
      { tier: 0, name: 'Stock Struts (34° Lock)', detail: 'Sudut belok terbatas, rawan spin-out', coinCost: 0, creditCost: 0 },
      { tier: 1, name: 'Drift Coilover (50° Lock)', detail: 'Lebih ceper, counter-steer jauh lebih dalam', coinCost: 850, creditCost: 45 },
      { tier: 2, name: 'Extreme Pro Angle Kit (70° Lock)', detail: 'Sudut belok 70° ekstrem, anti spin-out di Pro spec', coinCost: 2200, creditCost: 110 },
    ],
  },
  brakeTier: {
    label: 'Rem & Hydraulic Handbrake',
    category: 'performa',
    tiers: [
      { tier: 0, name: 'Stock Cable Brake', detail: 'Inisiasi handbrake lambat', coinCost: 0, creditCost: 0 },
      { tier: 1, name: 'Slotted Sport Disc', detail: 'Pengereman tajam sebelum masuk tikungan', coinCost: 550, creditCost: 30 },
      { tier: 2, name: 'Hydraulic Drift Handbrake', detail: 'Kunci roda belakang instan untuk entry agresif', coinCost: 1400, creditCost: 70 },
    ],
  },
};

export const PAINT_PALETTE: { name: string; hex: string; creditCost: number }[] = [
  { name: 'Racing Coral', hex: '#ef4444', creditCost: 0 },
  { name: 'Cobalt Rush', hex: '#2563eb', creditCost: 0 },
  { name: 'Sunburst Gold', hex: '#f59e0b', creditCost: 0 },
  { name: 'Ivory Cream', hex: '#f1f5f9', creditCost: 0 },
  { name: 'Obsidian Night', hex: '#1e293b', creditCost: 0 },
  { name: 'Emerald Track', hex: '#10b981', creditCost: 25 },
  { name: 'Sakura Blossom', hex: '#ec4899', creditCost: 35 },
  { name: 'Electric Cyan', hex: '#06b6d4', creditCost: 35 },
];

export const PAINT_FINISHES: { id: PaintFinish; name: string; coinCost: number }[] = [
  { id: 'gloss', name: 'Glossy Clearcoat', coinCost: 0 },
  { id: 'metallic', name: 'Metallic Flake', coinCost: 350 },
  { id: 'matte', name: 'Satin Matte', coinCost: 450 },
];

export const BODYKIT_OPTIONS: { id: BodykitType; name: string; coinCost: number; creditCost: number }[] = [
  { id: 'stock', name: 'Stock Body', coinCost: 0, creditCost: 0 },
  { id: 'street', name: 'Street Aero Lip', coinCost: 650, creditCost: 35 },
  { id: 'widebody', name: 'Widebody Drift Flares', coinCost: 1800, creditCost: 90 },
];

export const SPOILER_OPTIONS: { id: SpoilerType; name: string; coinCost: number; creditCost: number }[] = [
  { id: 'none', name: 'Clean Trunk', coinCost: 0, creditCost: 0 },
  { id: 'ducktail', name: 'Retro Ducktail', coinCost: 450, creditCost: 25 },
  { id: 'gtwing', name: 'Carbon GT Wing', coinCost: 1100, creditCost: 55 },
  { id: 'chassis', name: 'Chassis-Mount Pro', coinCost: 1650, creditCost: 85 },
];

export const RIM_OPTIONS: { id: RimStyle; name: string; coinCost: number; creditCost: number }[] = [
  { id: 'steel', name: 'Stock Steelies', coinCost: 0, creditCost: 0 },
  { id: 'spoke5', name: '5-Spoke Concave', coinCost: 500, creditCost: 25 },
  { id: 'mesh', name: 'Deep-Dish Gold Mesh', coinCost: 950, creditCost: 50 },
  { id: 'turbofan', name: 'Aero Turbofan', coinCost: 1450, creditCost: 75 },
];

export const RIM_COLORS: { name: string; hex: string }[] = [
  { name: 'Alloy Silver', hex: '#cbd5e1' },
  { name: 'Bronze Gold', hex: '#d97706' },
  { name: 'Satin Black', hex: '#1e293b' },
  { name: 'Championship White', hex: '#f8fafc' },
  { name: 'Anodized Crimson', hex: '#dc2626' },
];

export const SMOKE_COLORS: { id: string; name: string; hex: string; creditCost: number }[] = [
  { id: 'white', name: 'Classic Tire Smoke', hex: '#e2e8f0', creditCost: 0 },
  { id: 'amber', name: 'Sunset Amber', hex: '#fbbf24', creditCost: 30 },
  { id: 'cyan', name: 'Nitro Cyan', hex: '#22d3ee', creditCost: 40 },
  { id: 'pink', name: 'Sakura Rose', hex: '#f472b6', creditCost: 40 },
];

export const UNDERGLOW_OPTIONS: { id: string; name: string; hex: string; creditCost: number }[] = [
  { id: 'none', name: 'Off', hex: 'none', creditCost: 0 },
  { id: '#f59e0b', name: 'Warm Amber', hex: '#f59e0b', creditCost: 35 },
  { id: '#06b6d4', name: 'Ice Cyan', hex: '#06b6d4', creditCost: 35 },
  { id: '#ec4899', name: 'Sakura Glow', hex: '#ec4899', creditCost: 45 },
];

export function createDefaultBuild(carId: CarId): CarBuildConfig {
  const car = CAR_CATALOG.find((c) => c.id === carId) ?? CAR_CATALOG[0];
  const defaultRimStyle: RimStyle =
    carId === 'kijang_kapsul' ? 'spoke5' : carId === 'bmw_e36' ? 'mesh' : 'steel';
  return {
    carId,
    engineTier: 0,
    turboTier: 0,
    diffTier: 0,
    tireTier: 0,
    suspensionTier: 0,
    brakeTier: 0,
    unlockedParts: [
      'engineTier_0',
      'turboTier_0',
      'diffTier_0',
      'tireTier_0',
      'suspensionTier_0',
      'brakeTier_0',
      'kit_stock',
      'wing_none',
      `rim_${defaultRimStyle}`,
      'rim_steel',
      'finish_gloss',
      'smoke_white',
      'glow_none',
    ],
    paintHex: car.defaultPaint,
    paintFinish: 'gloss',
    rimColorHex: '#cbd5e1',
    rimStyle: defaultRimStyle,
    bodykit: 'stock',
    spoiler: 'none',
    smokeColorHex: '#e2e8f0',
    underglowHex: 'none',
    rideHeight: 0,
    camber: 1.5,
    gearRatio: 1.0,
    brakeBias: 0.55,
    steerSensitivity: 0.7,
    bodyIntegrity: 100,
    tireHealth: 100,
    autoCounterSteer: true,
  };
}

export function calculateCarStats(
  car: CarCatalogItem,
  build: CarBuildConfig,
): CalculatedCarStats {
  const hpFromEngine = [0, 85, 240, 450][build.engineTier] ?? 0;
  const hpFromTurbo = [0, 90, 210][build.turboTier] ?? 0;
  const horsepower = Math.round(car.baseHp + hpFromEngine + hpFromTurbo);
  const torqueNm = Math.round(car.baseTorque + hpFromEngine * 1.05 + hpFromTurbo * 1.25);

  const weightMod =
    (build.bodykit === 'widebody' ? 16 : build.bodykit === 'street' ? 5 : 0) -
    build.engineTier * 12 -
    build.suspensionTier * 14;
  const weightKg = Math.max(720, car.baseWeightKg + weightMod);

  const maxSpeedKmh = Math.round(
    (car.baseMaxSpeed + build.engineTier * 14 + build.turboTier * 18) *
      (1 / Math.pow(build.gearRatio, 0.35)),
  );

  // Up to 70 deg extreme Pro angle kit!
  const steerAngleDeg = [34, 50, 70][build.suspensionTier] ?? 34;
  const diffScore = [10, 24, 34][build.diffTier] ?? 10;
  const tireScore = [10, 22, 32][build.tireTier] ?? 10;
  const suspScore = [8, 20, 28][build.suspensionTier] ?? 8;
  const powerBonus = Math.min(12, Math.round(horsepower / 90));
  const driftReadiness = Math.min(
    100,
    Math.max(20, diffScore + tireScore + suspScore + powerBonus),
  );

  let driftSpecLabel: CalculatedCarStats['driftSpecLabel'] = 'Stock Grip';
  if (driftReadiness >= 75) driftSpecLabel = 'Pro Drift Spec';
  else if (driftReadiness >= 45) driftSpecLabel = 'Street Drift';

  const powerFactor = Math.min(2.4, (horsepower / weightKg) * 3.8 * build.gearRatio);
  // Mesin lebih kuat = grip belakang lebih kecil (lebih mudah meluncur): tier 0..3 mengurangi 0 / 0.07 / 0.14 / 0.21
  const engineGripLoss = build.engineTier * 0.07;
  const lateralGrip = Math.max(
    0.6,
    ([1.18, 0.96, 0.85][build.tireTier] ?? 1.18) - build.camber * 0.01 - engineGripLoss,
  );
  const driftSlipFactor =
    ([0.38, 0.76, 1.04][build.diffTier] ?? 0.38) *
    ([0.62, 0.88, 1.08][build.tireTier] ?? 0.62);
  const handbrakePower = [0.62, 0.86, 1.15][build.brakeTier] ?? 0.62;
  const boostPower = 1.0 + build.turboTier * 0.28;

  return {
    horsepower,
    torqueNm,
    weightKg,
    maxSpeedKmh,
    steerAngleDeg,
    driftReadiness,
    driftSpecLabel,
    powerFactor,
    lateralGrip,
    driftSlipFactor,
    handbrakePower,
    boostPower,
  };
}

export const TRACKS: TrackDefinition[] = [
  {
    id: 'practice_yard',
    name: 'Practice Yard Arena',
    location: 'Lapangan Latihan Aspal Luas',
    difficulty: 'Pemula',
    requiredRep: 0,
    roadWidth: 190,
    durationSec: 150,
    starTargets: [2500, 6000, 12000],
    repRewards: [200, 450, 800],
    coinRewards: [300, 700, 1300],
    description:
      'Lapangan aspal bundar yang luas tanpa tembok di tengah, khusus latihan donut dan figure-8 dengan kerucut penanda. Ideal untuk melatih level steer, gas, dan rem.',
    imageUrl: '/src/assets/images/track_harbor_toybox_1795572834851.jpg',
    skyColor: '#5aa6e8',
    fogColor: '#bfe0f7',
    groundColor: '#7a9244',
    curbAccent: '#f59e0b',
    propTheme: 'harbor',
    layout: 'arena',
    arenaRadius: 95,
    waypoints: [
      [95, 0],
      [82, 48],
      [48, 82],
      [0, 95],
      [-48, 82],
      [-82, 48],
      [-95, 0],
      [-82, -48],
      [-48, -82],
      [0, -95],
      [48, -82],
      [82, -48],
    ],
    clipZones: [],
  },
  {
    id: 'harbor_toybox',
    name: 'Harbor Toybox Circuit',
    location: 'Sirkuit Aspal Teluk & Pegunungan',
    difficulty: 'Pemula',
    requiredRep: 0,
    roadWidth: 20,
    durationSec: 95,
    starTargets: [3000, 7500, 14500],
    repRewards: [450, 900, 1500],
    coinRewards: [600, 1200, 2200],
    description:
      'Sirkuit aspal lebar dengan tikungan panjang bersahabat, pagar kayu, tebing low-poly, dan penonton bersorak. Ideal untuk latihan donut dan drift pemula.',
    imageUrl: '/src/assets/images/track_harbor_toybox_1795572834851.jpg',
    skyColor: '#5aa6e8',
    fogColor: '#bfe0f7',
    groundColor: '#7a9244',
    curbAccent: '#ef4444',
    propTheme: 'harbor',
    waypoints: [
      [0, -110],
      [95, -105],
      [140, -50],
      [115, 25],
      [55, 40],
      [85, 105],
      [25, 145],
      [-75, 125],
      [-125, 65],
      [-90, 0],
      [-130, -65],
      [-80, -110],
    ],
    clipZones: [0.15, 0.38, 0.62, 0.85],
  },
  {
    id: 'sunset_canyon',
    name: 'Sunset Canyon Switchbacks',
    location: 'Ngarai Batu Merah',
    difficulty: 'Menengah',
    requiredRep: 1200,
    roadWidth: 17,
    durationSec: 105,
    starTargets: [6500, 14000, 24000],
    repRewards: [750, 1400, 2400],
    coinRewards: [950, 1800, 3200],
    description:
      'Lintasan ngarai senja kelas Am/Semi-Pro dengan kombinasi tikungan S-curve beruntun. Butuh angle kit & LSD untuk menjaga combo.',
    imageUrl: '/src/assets/images/track_sunset_canyon_1795572835491.jpg',
    skyColor: '#e88b5a',
    fogColor: '#f3b281',
    groundColor: '#c97848',
    curbAccent: '#f59e0b',
    propTheme: 'canyon',
    waypoints: [
      [0, -135],
      [110, -125],
      [165, -60],
      [105, -10],
      [155, 55],
      [110, 135],
      [15, 110],
      [-45, 150],
      [-145, 105],
      [-105, 30],
      [-160, -40],
      [-105, -125],
    ],
    clipZones: [0.16, 0.42, 0.67, 0.89],
  },
  {
    id: 'sakura_touge',
    name: 'Sakura Touge Pass',
    location: 'Pegunungan Senja',
    difficulty: 'Mahir',
    requiredRep: 3500,
    roadWidth: 15,
    durationSec: 115,
    starTargets: [10000, 21000, 35000],
    repRewards: [1200, 2200, 3600],
    coinRewards: [1400, 2800, 4600],
    description:
      'Jalur pegunungan sempit dengan tikungan tajam beruntun di bawah kelopak sakura. Membutuhkan kontrol gas dan counter-steer presisi tinggi.',
    imageUrl: '/src/assets/images/track_sakura_touge_1795572836423.jpg',
    skyColor: '#4c3e78',
    fogColor: '#7a5c8e',
    groundColor: '#37483d',
    curbAccent: '#ec4899',
    propTheme: 'sakura',
    waypoints: [
      [0, -150],
      [120, -140],
      [175, -80],
      [90, -40],
      [170, 20],
      [130, 115],
      [35, 85],
      [45, 165],
      [-70, 155],
      [-115, 75],
      [-55, 15],
      [-165, -25],
      [-125, -125],
    ],
    clipZones: [0.14, 0.34, 0.58, 0.82],
  },
  {
    id: 'neon_docks',
    name: 'Neon Docks Arena',
    location: 'Dermaga Kontainer Malam',
    difficulty: 'Pro',
    requiredRep: 7500,
    roadWidth: 16,
    durationSec: 120,
    starTargets: [15000, 30000, 48000],
    repRewards: [1900, 3400, 5200],
    coinRewards: [2200, 4000, 6800],
    description:
      'Arena malam kelas Pro dengan aspal licin, lampu sorot stadion, dan rangkaian gymkhana cepat. Hanya terbuka untuk drifter bereputasi tinggi.',
    imageUrl: '/src/assets/images/track_neon_docks_1795572836643.jpg',
    skyColor: '#0f172a',
    fogColor: '#172540',
    groundColor: '#1e293b',
    curbAccent: '#06b6d4',
    propTheme: 'neon',
    waypoints: [
      [0, -145],
      [135, -140],
      [180, -55],
      [115, 0],
      [175, 80],
      [95, 160],
      [0, 105],
      [-85, 165],
      [-175, 95],
      [-105, 25],
      [-180, -55],
      [-120, -135],
    ],
    clipZones: [0.12, 0.31, 0.54, 0.76, 0.91],
  },
];

export const STORE_PACKAGES: StorePackage[] = [
  {
    id: 'pack_starter_credits',
    name: 'Starter Tuner Pack',
    tagline: '150 Apex Credits + 1,500 Drift Coins untuk modifikasi awal',
    priceIdr: 19000,
    priceUsd: '$1.25',
    creditsGranted: 150,
    bonusCoins: 1500,
    category: 'credits',
  },
  {
    id: 'pack_builder_credits',
    name: 'Garage Builder Pack',
    tagline: '500 Apex Credits + 5,000 Drift Coins untuk engine swap & bodykit',
    priceIdr: 49000,
    priceUsd: '$3.20',
    creditsGranted: 500,
    bonusCoins: 5000,
    featured: true,
    category: 'credits',
  },
  {
    id: 'pack_pro_credits',
    name: 'Pro Drift Team Pack',
    tagline: '1,300 Apex Credits + 15,000 Drift Coins + Dukungan Dev',
    priceIdr: 99000,
    priceUsd: '$6.50',
    creditsGranted: 1300,
    bonusCoins: 15000,
    category: 'credits',
  },
  {
    id: 'bundle_skyline_r34',
    name: 'Nissan Skyline R34 Bundle',
    tagline: 'Buka langsung Skyline R34 RWD + 300 Apex Credits',
    priceIdr: 69000,
    priceUsd: '$4.50',
    creditsGranted: 300,
    bonusCoins: 2500,
    unlockedCarId: 'skyline_r34',
    category: 'bundle',
  },
  {
    id: 'bundle_mustang_v8',
    name: 'Mustang V8 Formula Pro Pack',
    tagline: 'Buka Ford Mustang V8 FD Spec + 700 Apex Credits',
    priceIdr: 129000,
    priceUsd: '$8.50',
    creditsGranted: 700,
    bonusCoins: 6000,
    unlockedCarId: 'mustang_v8',
    featured: true,
    category: 'bundle',
  },
];

export function getCareerRank(rep: number): { title: string; nextRep: number | null } {
  if (rep >= 12000) return { title: 'Drift Legend', nextRep: null };
  if (rep >= 7500) return { title: 'Pro Circuit Driver', nextRep: 12000 };
  if (rep >= 3500) return { title: 'Am / Semi-Pro Contender', nextRep: 7500 };
  if (rep >= 1200) return { title: 'Street Tuner', nextRep: 3500 };
  return { title: 'Rookie Drifter', nextRep: 1200 };
}

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}
