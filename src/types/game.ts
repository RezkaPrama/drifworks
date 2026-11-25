export type CarId =
  | 'carry_futura'
  | 'kijang_super'
  | 'kijang_kapsul'
  | 'corolla_dx'
  | 'bmw_e36'
  | 'cefiro_a31'
  | 'cressida_mx83'
  | 'rx7_fc3s'
  | 'miata_mx5'
  | 'silvia_s15'
  | 'sx_180'
  | 'skyline_r34'
  | 'chaser_jzx100'
  | 'supra_a90'
  | 'gr86_pro'
  | 'mustang_v8';

export type CarClass = 'Rookie' | 'Am / Semi-Pro' | 'Pro';

export type BodySilhouette =
  | 'pickup'
  | 'mpv'
  | 'mpv_kapsul'
  | 'boxy_sedan'
  | 'euro_coupe'
  | 'jdm_sedan'
  | 'popup_coupe'
  | 'roadster'
  | 'silvia_coupe'
  | 'skyline_coupe'
  | 'supra_coupe'
  | 'muscle';

export type TrackId =
  | 'harbor_toybox'
  | 'sunset_canyon'
  | 'sakura_touge'
  | 'neon_docks';

export type PaintFinish = 'gloss' | 'metallic' | 'matte';
export type RimStyle = 'steel' | 'spoke5' | 'mesh' | 'turbofan';
export type BodykitType = 'stock' | 'street' | 'widebody';
export type SpoilerType = 'none' | 'ducktail' | 'gtwing' | 'chassis';
export type PaymentMethod = 'qris' | 'ewallet' | 'va' | 'card';

export interface CarCatalogItem {
  id: CarId;
  name: string;
  subtitle: string;
  carClass: CarClass;
  silhouette: BodySilhouette;
  era: string;
  drivetrain: 'FR' | 'MR';
  engineSoundType: 'i4' | 'kei' | 'rotary' | 'v8' | 'hyper';
  baseHp: number;
  baseTorque: number;
  baseWeightKg: number;
  baseMaxSpeed: number;
  coinPrice: number;
  creditPrice: number;
  defaultPaint: string;
  thumbnailUrl?: string;
  modelUrl?: string;
  description: string;
}

export interface CarBuildConfig {
  carId: CarId;
  engineTier: 0 | 1 | 2 | 3;
  turboTier: 0 | 1 | 2;
  diffTier: 0 | 1 | 2;
  tireTier: 0 | 1 | 2;
  suspensionTier: 0 | 1 | 2;
  brakeTier: 0 | 1 | 2;
  unlockedParts: string[];
  paintHex: string;
  paintFinish: PaintFinish;
  rimColorHex: string;
  rimStyle: RimStyle;
  bodykit: BodykitType;
  spoiler: SpoilerType;
  smokeColorHex: string;
  underglowHex: string; // 'none' or '#RRGGBB'
  rideHeight: number; // -1 to 1
  camber: number; // 0 to 8 degrees
  gearRatio: number; // 0.8 to 1.25
  brakeBias: number; // 0.3 to 0.8
  steerSensitivity: number; // 0.4 to 1.0
  bodyIntegrity: number; // 0 to 100
  tireHealth: number; // 0 to 100
  autoCounterSteer: boolean;
}

export type GameModeType = 'solo' | 'tandem';

export interface CalculatedCarStats {
  horsepower: number;
  torqueNm: number;
  weightKg: number;
  maxSpeedKmh: number;
  steerAngleDeg: number;
  driftReadiness: number; // 0..100
  driftSpecLabel: 'Stock Grip' | 'Street Drift' | 'Pro Drift Spec';
  powerFactor: number;
  lateralGrip: number;
  driftSlipFactor: number;
  handbrakePower: number;
  boostPower: number;
}

export interface UpgradeTierInfo {
  tier: 0 | 1 | 2 | 3;
  name: string;
  detail: string;
  coinCost: number;
  creditCost: number;
}

export interface TrackDefinition {
  id: TrackId;
  name: string;
  location: string;
  difficulty: 'Pemula' | 'Menengah' | 'Mahir' | 'Pro';
  requiredRep: number;
  roadWidth: number;
  durationSec: number;
  starTargets: [number, number, number];
  repRewards: [number, number, number];
  coinRewards: [number, number, number];
  description: string;
  imageUrl: string;
  skyColor: string;
  fogColor: string;
  groundColor: string;
  curbAccent: string;
  propTheme: 'harbor' | 'canyon' | 'sakura' | 'neon';
  waypoints: [number, number][];
  clipZones: number[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  driftCoins: number;
  apexCredits: number;
  reputation: number;
  activeCarId: CarId;
  ownedCars: CarId[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LeaderboardEntry {
  userId: string;
  trackId: TrackId;
  driverName: string;
  carName: string;
  carSpec: string;
  score: number;
  maxCombo: number;
  horsepower: number;
  updatedAt?: unknown;
}

export interface StorePackage {
  id: string;
  name: string;
  tagline: string;
  priceIdr: number;
  priceUsd: string;
  creditsGranted: number;
  bonusCoins: number;
  unlockedCarId?: CarId;
  featured?: boolean;
  category: 'credits' | 'bundle';
}

export interface StorePurchase {
  id: string;
  ownerId: string;
  packageId: string;
  packageName: string;
  amountIdr: number;
  creditsGranted: number;
  unlockedCarId: string;
  paymentMethod: PaymentMethod;
  status: 'completed';
  createdAt?: unknown;
}

export interface TelemetryState {
  speedKmh: number;
  rpm: number;
  maxRpm: number;
  gear: number;
  slipAngleDeg: number;
  signedSlipDeg: number;
  driftDirection: 'LEFT' | 'RIGHT' | 'STRAIGHT' | 'TRANSITION' | 'SPINOUT';
  isDrifting: boolean;
  rearTraction: number; // 0 (lost traction / sliding) to 1 (full grip)
  driftPhase: 'GRIP' | 'INITIATE' | 'SLIDE' | 'BALANCE';
  bankedScore: number;
  liveDriftScore: number;
  comboMultiplier: number;
  comboGraceRatio: number;
  straightenRisk: number; // 0..1 warning ratio when close to straightening out
  oversteerRisk: number; // 0..1 warning ratio when close to spinning out (melintir)
  transitionProgress: number; // 0..1 hold-to-switch progress when transitioning left<->right
  driftCallout: string | null;
  maxCombo: number;
  zoneHits: number;
  activeZoneText: string | null;
  penaltyBanner: string | null;
  timeRemaining: number;
  nitro: number;
  carX: number;
  carZ: number;
  carHeading: number;
  bodyIntegrity: number;
  tireHealth: number;
  autoCounterSteer: boolean;
  gameMode: GameModeType;
  tandemRound: 1 | 2;
  tandemRole: 'lead' | 'chase';
  tandemLeadScore: number;
  tandemChaseScore: number;
  tandemAiScore: number;
  tandemDistanceM: number;
  tandemProximityLabel: string;
  tandemAngleMatchPct: number;
  tandemAiAngleDeg: number;
  tandemRadarDx: number;
  tandemRadarDz: number;
  gamepadConnected: boolean;
  gamepadName: string | null;
}

export interface TandemSummary {
  playerLead: number;
  playerChase: number;
  aiLead: number;
  aiChase: number;
  won: boolean;
}

export interface RunResult {
  trackId: TrackId;
  gameMode: GameModeType;
  totalScore: number;
  maxCombo: number;
  zoneHits: number;
  stars: 0 | 1 | 2 | 3;
  repEarned: number;
  coinsEarned: number;
  newlyUnlockedTracks: TrackId[];
  bodyIntegrityEnd: number;
  tireHealthEnd: number;
  tandemResult?: TandemSummary;
}
