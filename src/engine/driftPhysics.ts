import * as THREE from 'three';
import { CalculatedCarStats, CarBuildConfig } from '../types/game';
import { TrackWorld } from './trackBuilder3d';

export interface InputState {
  throttle: number; // 0..1
  brake: number; // 0..1
  steer: number; // -1 (right) to +1 (left)
  handbrake: boolean;
  clutchKick: boolean;
  boost: boolean;
  shiftUp: boolean;
  shiftDown: boolean;
  toggleTransmission: boolean;
  gamepadConnected: boolean;
  gamepadName: string | null;
}

const _toCenter = new THREE.Vector3();

export class DriftPhysicsCar {
  public position = new THREE.Vector3();
  public velocity = new THREE.Vector3();
  public heading = 0; // radians
  public angularVelocity = 0;

  public speedKmh = 0;
  public rpm = 1200;
  public maxRpm = 7800;
  public gear = 1;
  public slipAngleDeg = 0;
  public signedSlipDeg = 0;
  public driftDirection: 'LEFT' | 'RIGHT' | 'STRAIGHT' | 'TRANSITION' | 'SPINOUT' = 'STRAIGHT';
  public isDrifting = false;
  public rearTraction = 1.0; // 1.0 = full grip, 0.0 = broken loose / active slide
  public driftPhase: 'GRIP' | 'INITIATE' | 'SLIDE' | 'BALANCE' = 'GRIP';
  public steerVisualRad = 0;
  public bodyRollRad = 0;
  public bodyPitchRad = 0;
  public suspensionBounceY = 0;
  public wheelSpinRad = 0;
  public frontWheelSpinRad = 0;
  public rearWheelSpinRad = 0;
  public nitro = 1.0;
  public isBoosting = false;

  // Permukaan track: 'tarmac' = perilaku drift asli; 'dirt_dry' / 'mud_wet' = gaya berkendara rally
  public surface: 'tarmac' | 'dirt_dry' | 'mud_wet' = 'tarmac';

  // Level-based controls: steer -5 (kanan penuh) .. 0 (lurus) .. +5 (kiri penuh), throttle/brake 0..5
  public steerLevel = 0;
  public throttleLevel = 0;
  public brakeLevel = 0;
  public levelSteerValue = 0; // smoothed -1..1 value fed into the physics
  private steerLevelTimer = 0;
  private throttleLevelTimer = 0;
  private brakeLevelTimer = 0;
  private level10HoldTimer = 0;
  public throttlePump = 0; // 0..1, naik saat gas dikocok (tekan-lepas), turun perlahan jika gas ditahan
  private prevThrottleLevel = 0;

  // Transmisi: AUTO mengikuti kecepatan, MANUAL diatur pemain (X naik gigi, Z turun gigi, T ganti mode)
  public transmissionMode: 'AUTO' | 'MANUAL' = 'AUTO';
  private manualGear = 1;
  private autoShiftTimer = 0; // jeda ganti gigi AUTO (tenaga terputus sebentar)
  private autoShiftCooldown = 0; // cegah ganti gigi bolak-balik
  private prevShiftUp = false;
  private prevShiftDown = false;
  private prevToggleTransmission = false;

  // Vehicle condition
  public bodyIntegrity = 100;
  public tireHealth = 100;

  // Drift scoring & judge feedback state
  public bankedScore = 0;
  public liveDriftScore = 0;
  public comboMultiplier = 1.0;
  public maxCombo = 1.0;
  public driftGraceTimer = 0;
  public zoneHits = 0;
  public activeZoneBanner: string | null = null;
  public activeZoneBannerTimer = 0;
  public penaltyBanner: string | null = null;
  public penaltyBannerTimer = 0;
  public driftCallout: string | null = null;
  public straightenRisk = 0; // 0..1
  public oversteerRisk = 0; // 0..1
  public transitionProgress = 0; // 0..1

  private lastDriftSign = 0;
  private transitionCooldown = 0;
  private initBannerCooldown = 0;
  private clutchKickCooldown = 0;
  private clutchRpmFlare = 0;
  private offTrackTimer = 0;
  private wallHitCooldown = 0;
  private smoothedSteer = 0;
  private prevSteer = 0;
  private prevHandbrake = false;
  private prevClutchKick = false;
  private wasInSlide = false;
  private transitionHold = 0;
  private transitionBridgeTimer = 0;
  private transitionWhipVel = 0;
  private straightenFlatTimer = 0;
  private sustainedDriftTimer = 0;
  private spinOutTimer = 0;
  private spinOutDir = 1;
  private lastZoneCooldown: Record<number, number> = {};

  public resetToStart(trackWorld: TrackWorld, build?: CarBuildConfig) {
    this.position.copy(trackWorld.startPosition);
    this.heading = trackWorld.startHeading;
    this.velocity.set(0, 0, 0);
    this.angularVelocity = 0;
    this.speedKmh = 0;
    this.slipAngleDeg = 0;
    this.signedSlipDeg = 0;
    this.driftDirection = 'STRAIGHT';
    this.isDrifting = false;
    this.rearTraction = 1.0;
    this.driftPhase = 'GRIP';
    this.liveDriftScore = 0;
    this.comboMultiplier = 1.0;
    this.driftGraceTimer = 0;
    this.straightenRisk = 0;
    this.oversteerRisk = 0;
    this.transitionProgress = 0;
    this.nitro = 1.0;
    this.smoothedSteer = 0;
    this.prevSteer = 0;
    this.steerLevel = 0;
    this.throttleLevel = 0;
    this.brakeLevel = 0;
    this.levelSteerValue = 0;
    this.steerLevelTimer = 0;
    this.throttleLevelTimer = 0;
    this.brakeLevelTimer = 0;
    this.level10HoldTimer = 0;
    this.throttlePump = 0;
    this.prevThrottleLevel = 0;
    this.prevHandbrake = false;
    this.prevClutchKick = false;
    this.wasInSlide = false;
    this.transitionHold = 0;
    this.transitionBridgeTimer = 0;
    this.transitionWhipVel = 0;
    this.straightenFlatTimer = 0;
    this.sustainedDriftTimer = 0;
    this.spinOutTimer = 0;
    this.spinOutDir = 1;
    this.initBannerCooldown = 0;
    this.clutchKickCooldown = 0;
    this.clutchRpmFlare = 0;
    this.offTrackTimer = 0;
    this.wallHitCooldown = 0;
    this.activeZoneBanner = null;
    this.activeZoneBannerTimer = 0;
    this.penaltyBanner = null;
    this.penaltyBannerTimer = 0;
    this.lastZoneCooldown = {};
    if (build) {
      this.bodyIntegrity = build.bodyIntegrity ?? 100;
      this.tireHealth = build.tireHealth ?? 100;
    }
  }

  public recoverToTrack(trackWorld: TrackWorld) {
    const info = trackWorld.getTrackInfo(this.position.x, this.position.z);
    this.position.copy(info.closestPoint);
    this.heading = Math.atan2(info.tangent.x, info.tangent.z);
    this.velocity.set(0, 0, 0);
    this.angularVelocity = 0;
    this.rearTraction = 1.0;
    this.driftPhase = 'GRIP';
    this.wasInSlide = false;
    this.liveDriftScore = 0;
    this.comboMultiplier = 1.0;
    this.straightenRisk = 0;
    this.oversteerRisk = 0;
    this.transitionProgress = 0;
    this.transitionHold = 0;
    this.transitionBridgeTimer = 0;
    this.transitionWhipVel = 0;
    this.straightenFlatTimer = 0;
    this.sustainedDriftTimer = 0;
    this.spinOutTimer = 0;
    this.smoothedSteer = 0;
    this.offTrackTimer = 0;
  }

  public triggerPenalty(label: string, dropRatio = 0.5) {
    this.penaltyBanner = label;
    this.penaltyBannerTimer = 1.75;
    this.straightenRisk = 0;
    this.oversteerRisk = 0;
    this.transitionProgress = 0;
    this.transitionHold = 0;
    this.transitionBridgeTimer = 0;
    this.transitionWhipVel = 0;
    this.straightenFlatTimer = 0;
    this.sustainedDriftTimer = 0;
    if (this.liveDriftScore > 0) {
      if (dropRatio < 1) {
        this.bankedScore += Math.round(this.liveDriftScore * (1 - dropRatio));
      }
      this.liveDriftScore = 0;
      this.comboMultiplier = 1.0;
      this.driftGraceTimer = 0;
      this.lastDriftSign = 0;
      this.driftCallout = null;
    }
  }

  public bankPendingDrift(keepCombo = false) {
    if (this.liveDriftScore > 25) {
      this.bankedScore += Math.round(this.liveDriftScore * Math.min(2.2, 1 + (this.comboMultiplier - 1) * 0.25));
    }
    this.liveDriftScore = 0;
    if (!keepCombo) {
      this.comboMultiplier = 1.0;
      this.driftGraceTimer = 0;
    }
  }

  // Menggeser level satu langkah menuju target setiap interval tertentu.
  // intervalUp: waktu per langkah saat |level| bertambah, intervalDown: saat |level| berkurang (menuju 0).
  private advanceLevel(
    level: number,
    target: number,
    timer: number,
    dt: number,
    intervalUp: number,
    intervalDown: number,
  ): { level: number; timer: number } {
    if (level === target) return { level, timer: 0 };
    const dir = Math.sign(target - level);
    const growing = Math.abs(level + dir) > Math.abs(level);
    const interval = growing ? intervalUp : intervalDown;
    const nextTimer = timer + dt;
    if (nextTimer >= interval) {
      return { level: level + dir, timer: nextTimer - interval };
    }
    return { level, timer: nextTimer };
  }

  public step(
    dt: number,
    rawInput: InputState,
    stats: CalculatedCarStats,
    build: CarBuildConfig,
    trackWorld: TrackWorld,
    roadHalfWidth: number,
    onZoneHit?: () => void,
    onInitiateHit?: () => void,
    onPenaltyHit?: () => void,
  ) {
    const clampedDt = Math.min(dt, 0.05);

    // --- LEVEL-BASED CONTROLS (steer -5..+5, throttle 0..5, brake 0..5) ---
    // Steer: tiap tekan menggeser 1 level. Saat drift kanan di level -5, tekan kiri
    // hanya menurunkan ke -4, -3, ... sampai 0 (lurus), baru lanjut ke sisi kiri.
    const steerTarget = Math.round(THREE.MathUtils.clamp(rawInput.steer, -1, 1) * 10);
    // Saat drifting dan input dilepas (target 0 / kurang dari level saat ini, sisi sama), indikator steer
    // kembali ke 0 lebih lambat. Counter-steer ke sisi berlawanan dan kondisi grip tetap cepat.
    const releasingWhileDrifting =
      this.isDrifting && this.steerLevel * steerTarget >= 0 && Math.abs(steerTarget) < Math.abs(this.steerLevel);
    const steerIntervalDown = releasingWhileDrifting ? 0.9 : 0.05;
    const steerAdv = this.advanceLevel(this.steerLevel, steerTarget, this.steerLevelTimer, clampedDt, 0.06, steerIntervalDown);
    this.steerLevel = steerAdv.level;
    this.steerLevelTimer = steerAdv.timer;

    const throttleTarget = rawInput.throttle > 0.04 ? Math.ceil(Math.min(1, rawInput.throttle) * 5) : 0;
    const throttleAdv = this.advanceLevel(this.throttleLevel, throttleTarget, this.throttleLevelTimer, clampedDt, 0.1, 0.07);
    this.throttleLevel = throttleAdv.level;
    this.throttleLevelTimer = throttleAdv.timer;

    // Gas dikocok: tiap level gas turun (lepas gas) menambah pump; ditahan penuh -> pump meluruh ke 0
    if (this.throttleLevel < this.prevThrottleLevel && this.prevThrottleLevel >= 2) {
      this.throttlePump = Math.min(1, this.throttlePump + (this.prevThrottleLevel - this.throttleLevel) * 0.16);
    }
    this.throttlePump = Math.max(0, this.throttlePump - clampedDt * 0.55);
    this.prevThrottleLevel = this.throttleLevel;

    const brakeTarget = rawInput.brake > 0.04 ? Math.ceil(Math.min(1, rawInput.brake) * 5) : 0;
    const brakeAdv = this.advanceLevel(this.brakeLevel, brakeTarget, this.brakeLevelTimer, clampedDt, 0.09, 0.06);
    this.brakeLevel = brakeAdv.level;
    this.brakeLevelTimer = brakeAdv.timer;

    this.levelSteerValue = this.steerLevel / 10;
    const input: InputState = {
      ...rawInput,
      steer: this.levelSteerValue,
      throttle: this.throttleLevel / 5,
      brake: this.brakeLevel / 5,
    };

    // Efek level steer terhadap grip & kemiringan: level 0-3 grip penuh, makin tinggi makin licin (level 10 ~55%).
    // Level 8-9 = kemiringan ekstrem, level 10 = over-rotation (melintir).
    const absSteerLevel = Math.abs(this.steerLevel);
    const levelGripScale = absSteerLevel <= 3 ? 1.0 : 1.0 - (absSteerLevel - 3) * 0.065;
    const levelTiltBoost = absSteerLevel >= 8 ? 1 + (absSteerLevel - 7) * 0.22 : 1.0;

    // Local forward & right/left basis vectors (heading=0 faces +Z)
    const sinH = Math.sin(this.heading);
    const cosH = Math.cos(this.heading);
    const forwardX = sinH;
    const forwardZ = cosH;
    const rightX = cosH;
    const rightZ = -sinH;

    let forwardVel = this.velocity.x * forwardX + this.velocity.z * forwardZ;
    let lateralVel = this.velocity.x * rightX + this.velocity.z * rightZ;
    const totalSpeed = Math.hypot(forwardVel, lateralVel);
    const currentSpeedKmh = totalSpeed * 3.6;
    // Kecepatan badan sebelum heading berputar (dipakai untuk menjaga momentum samping saat drift)
    const bodyFwd0 = forwardVel;
    const bodyLat0 = lateralVel;
    const worldVx0 = this.velocity.x;
    const worldVz0 = this.velocity.z;

    if (this.clutchKickCooldown > 0) this.clutchKickCooldown -= clampedDt;
    if (this.clutchRpmFlare > 0) this.clutchRpmFlare = Math.max(0, this.clutchRpmFlare - clampedDt * 2900);
    if (this.wallHitCooldown > 0) this.wallHitCooldown -= clampedDt;
    if (this.transitionBridgeTimer > 0) this.transitionBridgeTimer = Math.max(0, this.transitionBridgeTimer - clampedDt);

    // Handle active spin-out ("MELINTIR!") state before normal steering
    const inSpinOut = this.spinOutTimer > 0;
    if (inSpinOut) {
      this.spinOutTimer = Math.max(0, this.spinOutTimer - clampedDt);
    }

    // Nitro boost
    this.isBoosting = !inSpinOut && input.boost && this.nitro > 0.04 && input.throttle > 0.1;
    if (this.isBoosting) {
      this.nitro = Math.max(0, this.nitro - clampedDt * 0.3);
    } else {
      this.nitro = Math.min(
        1,
        this.nitro + (this.isDrifting ? clampedDt * 0.17 : clampedDt * 0.05),
      );
    }

    // Mechanical & Tire Wear Multipliers
    const tireGripFactor = 0.72 + 0.28 * (this.tireHealth / 100);
    const stockGripPenalty = stats.driftReadiness < 42 ? 0.68 : 1.0;

    // Parameter permukaan: rally = grip-driving, drift hanya dipicu handbrake / clutch kick
    const isRally = this.surface !== 'tarmac';
    const isMud = this.surface === 'mud_wet';
    const surfGrip = isMud ? 0.55 : isRally ? 0.8 : 1.0; // pengali peluruhan gaya samping (kecil = lebih licin)
    const surfAccel = isMud ? 0.82 : isRally ? 0.95 : 1.0;
    const surfDrag = isMud ? 0.24 : isRally ? 0.1 : 0;
    const rallyInitScale = isMud ? 0.6 : isRally ? 0.45 : 1.0;
    const rallyRecover = isMud ? 0.5 : isRally ? 0.95 : 0;
    const wheelspinPower =
      (stats.powerFactor * 0.55 +
        build.engineTier * 0.26 +
        build.turboTier * 0.3 +
        Math.max(0, build.gearRatio - 1) * 0.65) *
      (1 - build.tireTier * 0.04) *
      stockGripPenalty;
    const diffHoldFactor = 0.46 + build.diffTier * 0.38;
    const camberEase = build.camber * 0.048;
    const rideHeightSnap = 1.0 - build.rideHeight * 0.08;

    // --- 1. DRIFT INITIATION, LOSS OF TRACTION & CLUTCH KICK ---
    if (this.initBannerCooldown > 0) this.initBannerCooldown -= clampedDt;
    const steerRate = Math.abs(input.steer - this.prevSteer) / Math.max(0.016, clampedDt);
    const freshHandbrake = input.handbrake && !this.prevHandbrake;
    const freshClutchKick = input.clutchKick && !this.prevClutchKick;

    const rawSlipSigned = Math.atan2(lateralVel, Math.abs(forwardVel) + 1.8);
    const absSlipRad = Math.abs(rawSlipSigned);
    const absSlipDegNow = THREE.MathUtils.radToDeg(absSlipRad);

    // Clutch Kick (E / LB): spikes RPM and breaks rear traction loose mid-sweeper
    if (!inSpinOut && freshClutchKick && this.clutchKickCooldown <= 0 && currentSpeedKmh > 16) {
      this.clutchKickCooldown = 0.52;
      this.clutchRpmFlare = 2400;
      this.rearTraction = Math.min(this.rearTraction, 0.14);
      this.tireHealth = Math.max(10, this.tireHealth - 0.55);
      const kickSign =
        Math.abs(input.steer) > 0.1
          ? Math.sign(input.steer)
          : absSlipRad > 0.08
            ? -Math.sign(rawSlipSigned)
            : 1;
      this.angularVelocity += kickSign * (0.95 + wheelspinPower * 0.55);
      forwardVel += 2.0 + stats.powerFactor * 1.3;
      if (!this.activeZoneBanner) {
        this.activeZoneBanner = 'CLUTCH KICK!';
        this.activeZoneBannerTimer = 0.85;
      }
      onInitiateHit?.();
    }

    let initiationImpulse = 0;
    if (!inSpinOut && currentSpeedKmh > 18) {
      if (input.handbrake) {
        initiationImpulse = Math.max(initiationImpulse, 3.0 + stats.handbrakePower * 1.85);
      }
      if (steerRate > 1.85 && currentSpeedKmh > 30) {
        initiationImpulse = Math.max(
          initiationImpulse,
          (1.35 + stats.driftSlipFactor * 1.15 + camberEase) * stockGripPenalty,
        );
      }
      if (
        input.throttle > 0.58 &&
        Math.abs(input.steer) > 0.34 &&
        (this.isBoosting || wheelspinPower > 0.65)
      ) {
        initiationImpulse = Math.max(
          initiationImpulse,
          1.0 + wheelspinPower * 1.35 + (this.isBoosting ? 1.1 : 0),
        );
      }
      if (input.brake > 0.35 && Math.abs(input.steer) > 0.38 && forwardVel > 7) {
        const rearBias = 1.25 - build.brakeBias;
        initiationImpulse = Math.max(initiationImpulse, 1.2 * rearBias);
      }
    }

    // Rally: steer cepat / gas tidak mudah melepas ban belakang, kecuali handbrake
    if (isRally && !input.handbrake) initiationImpulse *= rallyInitScale;

    if (inSpinOut) {
      this.rearTraction = 0.04;
    } else if (initiationImpulse > 0) {
      this.rearTraction = Math.max(
        0.04,
        this.rearTraction - initiationImpulse * clampedDt * 1.7,
      );
    }

    // Sustain continuous wild loss-of-traction slide while drifting or bridging transition
    if (!inSpinOut && this.rearTraction < 0.74 && currentSpeedKmh > 19) {
      if (
        input.throttle > 0.14 ||
        this.isBoosting ||
        input.handbrake ||
        input.clutchKick ||
        this.transitionBridgeTimer > 0
      ) {
        const sustainSpin =
          (0.64 + input.throttle * 0.9) *
          diffHoldFactor *
          (0.86 + wheelspinPower * 0.38 + camberEase) *
          (this.tireHealth < 35 ? 1.18 : 1.0);
        // Near 0 deg without active transition bridge, rear tires rapidly bite back -> straighten!
        const straightBitePenalty =
          absSlipDegNow < 11 && this.transitionBridgeTimer <= 0 ? 0.65 : 0;
        const naturalRecover = 0.76 - Math.min(0.56, absSlipRad * 0.65) + straightBitePenalty;
        this.rearTraction = THREE.MathUtils.clamp(
          this.rearTraction + (naturalRecover - sustainSpin) * clampedDt,
          0.03,
          1.0,
        );
      } else {
        const liftRecovery = 1.05 - build.diffTier * 0.15;
        this.rearTraction = Math.min(1.0, this.rearTraction + liftRecovery * clampedDt);
      }
    } else if (!inSpinOut) {
      this.rearTraction = Math.min(1.0, this.rearTraction + 1.35 * clampedDt);
    }

    // Rally: ban belakang cepat menggigit lagi (lumpur lebih lambat), jadi mobil tidak terus drift
    if (isRally && !inSpinOut && !input.handbrake) {
      this.rearTraction = Math.min(1.0, this.rearTraction + rallyRecover * clampedDt);
    }

    const slideLoose = 1.0 - this.rearTraction;

    if (slideLoose > 0.38 && currentSpeedKmh > 25) {
      const wearRate = (0.14 + slideLoose * 0.18) * (1 - build.tireTier * 0.12);
      this.tireHealth = Math.max(10, this.tireHealth - wearRate * clampedDt);
    }

    const inSlideNow = !inSpinOut && slideLoose > 0.42 && currentSpeedKmh >= 22;
    if (inSlideNow && !this.wasInSlide && this.initBannerCooldown <= 0) {
      this.initBannerCooldown = 2.0;
      this.nitro = Math.min(1.0, this.nitro + 0.06);
      if (!this.activeZoneBanner) {
        this.activeZoneBanner = 'TRACTION LOST · DRIFT!';
        this.activeZoneBannerTimer = 0.95;
      }
      onInitiateHit?.();
    }
    this.wasInSlide = inSlideNow;

    // --- 2. ENGINE ACCELERATION, REAR BURNOUT TRACTION LOSS & DRIFT SPEED CONTROL ---
    const maxSpeedMs = stats.maxSpeedKmh / 3.6;
    // Laju jalan lurus (grip) dibuat lebih lembut: stock ~60 km/h, swap mesin penuh ~125 km/h.
    // gripTopMs = kecepatan puncak alami saat tidak drift (tanpa nitro), dipakai juga untuk RPM & gigi.
    const straightAccel = 9 + stats.powerFactor * 6.5;
    const gripTopMs = straightAccel / (0.48 + (straightAccel * 0.82) / maxSpeedMs);
    const gripTopKmh = gripTopMs * 3.6;
    const boostMult = this.isBoosting ? 1.38 * stats.boostPower : 1.0;
    // Pengaruh gigi pada akselerasi (hanya mode MANUAL): gigi rendah = tarikan kuat, gigi tinggi = lemah,
    // gigi terlalu tinggi untuk kecepatan = lugging, gigi terlalu rendah = kena limiter.
    let gearAccelScale = 1.0;
    if (this.transmissionMode === 'MANUAL') {
      const speedNormNow = THREE.MathUtils.clamp(Math.max(0, forwardVel) / gripTopMs, 0, 1.2);
      const gearPos = speedNormNow * 5 - (this.manualGear - 1);
      const baseScale = [1.35, 1.15, 1.0, 0.85, 0.72][this.manualGear - 1] ?? 1.0;
      const lugPenalty = gearPos < 0 ? Math.max(0.45, 1 + gearPos * 0.55) : 1.0;
      const limiterPenalty = gearPos > 1 ? Math.max(0.15, 1 - (gearPos - 1) * 1.4) : 1.0;
      gearAccelScale = baseScale * lugPenalty * limiterPenalty;
    } else if (this.autoShiftTimer > 0) {
      // AUTO: tenaga terputus sebentar saat ganti gigi
      gearAccelScale = 0.35;
    }
    // Tarikan saat grip lebih lembut; saat ban belakang lepas (drift) kembali ke nilai asli agar karakter drift tidak berubah
    const driftAccel = 19 + stats.powerFactor * 13.0;
    const driveAccel =
      THREE.MathUtils.lerp(straightAccel, driftAccel, THREE.MathUtils.clamp(slideLoose * 1.6, 0, 1)) *
      boostMult *
      gearAccelScale *
      surfAccel;

    if (!inSpinOut && input.throttle > 0) {
      const speedRatio = Math.max(0, forwardVel / (maxSpeedMs * boostMult));
      const torqueCurve = Math.max(0.22, 1 - speedRatio * 0.82);

      // During an active drift slide, rear tires are in burnout & lose longitudinal forward grip!
      // Adding more gas spins the rear tires faster and sustains angle rather than rocketing forward.
      const angleLossFactor = THREE.MathUtils.clamp(absSlipRad / 0.85, 0, 1);
      const burnoutBite =
        (0.3 + build.tireTier * 0.065) *
        tireGripFactor *
        (1 - angleLossFactor * 0.34);
      // Gas dikocok (tekan-lepas): ban belakang sempat menggigit lagi -> bite naik, batas kecepatan drift longgar
      const pump = this.throttlePump;
      const forwardDriveScale = THREE.MathUtils.lerp(
        1.0,
        Math.max(0.14, burnoutBite + pump * 0.24),
        slideLoose,
      );

      // Gentle drift flow ceiling (~62-84 km/h depending on tires/boost) so drifting mirrors Tandem AI pace
      const driftFlowCapMs =
        (20.5 + stats.powerFactor * 4.2 + build.tireTier * 1.4) *
        (this.isBoosting ? 1.24 : 1.0) *
        (1 + pump * 0.28);
      forwardVel += pump * 3.2 * clampedDt;
      const burnoutCapFactor =
        slideLoose > 0.34 && forwardVel > driftFlowCapMs
          ? Math.max(0.12, 1 - (forwardVel - driftFlowCapMs) / 7.5)
          : 1.0;

      forwardVel +=
        input.throttle * driveAccel * torqueCurve * forwardDriveScale * burnoutCapFactor * clampedDt;
    }

    if (input.brake > 0) {
      if (forwardVel > 1.5) {
        forwardVel -= input.brake * (30 + build.brakeTier * 7) * clampedDt;
      } else {
        forwardVel = Math.max(-15, forwardVel - input.brake * 16 * clampedDt);
      }
    }

    // Sideways scrub drag increases naturally with slip angle & rear burnout so drift speed stays controllable
    const driftScrubDrag =
      slideLoose > 0.3 ? 0.4 + absSlipRad * 0.3 + slideLoose * 0.16 : 0.48;
    forwardVel *= Math.exp(-((inSpinOut ? 1.7 : driftScrubDrag) + surfDrag) * clampedDt);

    // --- 3. PROGRESSIVE TRANSITION LEVELS, COUNTER-STEER & OVER-ROTATION SPIN-OUT ---
    const sens = THREE.MathUtils.clamp(build.steerSensitivity ?? 0.7, 0.4, 1.0);
    const isSliding = slideLoose > 0.25 && totalSpeed > 5.0;
    const hasActiveAngle = absSlipRad > 0.17; // ~10 deg
    const isCounterSteerInput =
      hasActiveAngle && Math.abs(input.steer) > 0.12 && Math.sign(input.steer) === Math.sign(rawSlipSigned);
    const isPushingAngle =
      hasActiveAngle && Math.abs(input.steer) > 0.12 && Math.sign(input.steer) === -Math.sign(rawSlipSigned);

    const steerRampRate = isCounterSteerInput ? 7.5 + sens * 4.0 : 4.5 + sens * 3.8;
    this.smoothedSteer = THREE.MathUtils.damp(
      this.smoothedSteer,
      inSpinOut ? 0 : input.steer,
      steerRampRate,
      clampedDt,
    );

    const steerLimitRad = THREE.MathUtils.degToRad(stats.steerAngleDeg);
    const rawSlipForVisual = Math.atan2(lateralVel, Math.abs(forwardVel) + 2.2);

    // AI-style counter-steer wheel animation: front tires lock smoothly opposite the slide
    const aiStyleCounterVisual =
      totalSpeed > 5 && absSlipRad > 0.12
        ? THREE.MathUtils.clamp(
            rawSlipForVisual * 0.94,
            -steerLimitRad * 0.92,
            steerLimitRad * 0.92,
          )
        : 0;
    const playerSteerVisual = this.smoothedSteer * Math.min(0.92, steerLimitRad * 0.82);
    const targetVisualSteer =
      isSliding && absSlipRad > 0.14
        ? THREE.MathUtils.lerp(
            aiStyleCounterVisual,
            playerSteerVisual,
            isCounterSteerInput ? 0.35 : 0.18,
          )
        : playerSteerVisual;
    this.steerVisualRad = THREE.MathUtils.damp(
      this.steerVisualRad,
      targetVisualSteer,
      9.5,
      clampedDt,
    );

    const speedTurnFactor = Math.min(1, totalSpeed / 7.5);
    const highSpeedDamp = 1 / (1 + Math.max(0, currentSpeedKmh - 85) * 0.0028);
    const sensScale = 0.56 + sens * 0.62;
    const reverseSign = forwardVel >= -0.2 ? 1 : -1;

    const steerStrength =
      (1.42 + stats.driftSlipFactor * 0.66 + slideLoose * 0.34) *
      sensScale *
      highSpeedDamp *
      rideHeightSnap *
      speedTurnFactor *
      levelTiltBoost;

    // Progressive Hold-to-Switch Transition Levels weighted by speed, momentum, and suspension/steering kit
    const suspTransitionBonus = 1 + build.suspensionTier * 0.2 + build.diffTier * 0.08;
    const speedWeightInertia = THREE.MathUtils.clamp(currentSpeedKmh / 54, 0.78, 1.45);
    let effectiveSteerRatio = 1.0;
    if (!inSpinOut && isSliding && isCounterSteerInput && absSlipDegNow > 12) {
      // Player is holding opposite steer to gradually unwind & switch sides
      const holdRate =
        ((1.08 + sens * 0.48) * suspTransitionBonus * (Math.abs(input.steer) > 0.45 ? 1.0 : 0.42)) /
        speedWeightInertia;
      this.transitionHold = Math.min(1.0, this.transitionHold + holdRate * clampedDt);
      // Level 1: brief tap/early hold only catches/shallows angle; sustained hold unwinds toward switch
      effectiveSteerRatio =
        this.transitionHold < 0.34
          ? 0.24 + this.transitionHold * 0.85
          : 0.53 + (this.transitionHold - 0.34) * 1.18;
      // Once held past threshold as angle approaches 0 deg, prime whip bridge across center
      if (this.transitionHold >= 0.44 && absSlipDegNow < 24) {
        this.transitionBridgeTimer = 0.56;
        this.transitionWhipVel =
          Math.sign(input.steer) *
          (1.18 + wheelspinPower * 0.42 + (input.throttle > 0.3 ? 0.32 : 0)) *
          (0.92 + build.suspensionTier * 0.08);
      }
    } else if (!isCounterSteerInput) {
      if (this.transitionBridgeTimer <= 0) {
        this.transitionHold = Math.max(0, this.transitionHold - clampedDt * 2.4);
      }
      if (absSlipDegNow > 22 && this.transitionBridgeTimer <= 0) {
        this.transitionWhipVel = THREE.MathUtils.damp(this.transitionWhipVel, 0, 6, clampedDt);
      }
    }
    this.transitionProgress = THREE.MathUtils.clamp(
      isCounterSteerInput || this.transitionBridgeTimer > 0 ? this.transitionHold : 0,
      0,
      1,
    );

    let targetAngVel = this.smoothedSteer * steerStrength * effectiveSteerRatio * reverseSign;

    // Apply pendulum whip momentum across center during committed transition switch
    if (!inSpinOut && this.transitionBridgeTimer > 0 && Math.abs(input.steer) > 0.25) {
      targetAngVel += this.transitionWhipVel * 0.65;
    }

    // Handbrake initiation kick
    if (!inSpinOut && input.handbrake && totalSpeed > 4.5) {
      const kickDir =
        Math.abs(input.steer) > 0.08 ? Math.sign(input.steer) : -Math.sign(rawSlipSigned || 1);
      if (freshHandbrake) {
        this.angularVelocity += kickDir * (0.95 + stats.handbrakePower * 0.65);
      }
      targetAngVel = kickDir * steerStrength * (1.18 + stats.handbrakePower * 0.2);
      forwardVel *= Math.exp(-0.55 * clampedDt);
    }

    // Power-oversteer: holding throttle burns out rear tires and sustains AI-style drift angle
    const driftDir =
      absSlipRad > 0.08 ? -Math.sign(rawSlipSigned) : Math.sign(this.smoothedSteer);
    if (!inSpinOut && slideLoose > 0.28 && input.throttle > 0.2 && driftDir !== 0 && !input.handbrake) {
      const pushBoost = isPushingAngle ? 1.48 : 0.84;
      const throttleKick =
        input.throttle *
        driftDir *
        (0.6 + wheelspinPower * 0.48 + (this.isBoosting ? 0.32 : 0)) *
        slideLoose *
        pushBoost;
      targetAngVel += throttleKick;
    }

    // Auto Counter-Steer Assist vs Over-Rotation Spin-Out ("MELINTIR")
    const angleLimitRad = steerLimitRad * 1.02;
    let selfSteerAssist = 0;
    if (!inSpinOut) {
      if (build.autoCounterSteer) {
        const angleExcess = Math.max(0, absSlipRad - angleLimitRad * 0.78);
        const selfAlignStrength =
          (0.44 + build.suspensionTier * 0.44 + build.diffTier * 0.18) *
          (absSlipRad > 0.12 ? 1 : 0);
        // When player pushes too far ("terlalu over"), assist yields so spin-out can still occur!
        const overPushSuppression = isPushingAngle && absSlipDegNow > 62 ? 0.25 : 1.0;
        const overAngleCatch = angleExcess * 2.6 * Math.sign(rawSlipSigned) * overPushSuppression;
        selfSteerAssist =
          rawSlipSigned *
            selfAlignStrength *
            (Math.abs(this.smoothedSteer) < 0.15 ? 1.05 : 0.42) *
            overPushSuppression +
          overAngleCatch;
      } else {
        selfSteerAssist = absSlipRad > 0.18 ? rawSlipSigned * 0.12 : 0;
      }
    }

    // Oversteer / Spin-out ("MELINTIR") detection when pushing angle past catchable limit
    if (!inSpinOut && isSliding && currentSpeedKmh > 24) {
      const spinThresholdDeg = build.autoCounterSteer ? 77 : 71;
      const pushingOver = isPushingAngle || (this.transitionBridgeTimer > 0 && Math.abs(input.steer) > 0.5);
      if (absSlipDegNow >= 56 && pushingOver) {
        this.oversteerRisk = THREE.MathUtils.clamp(
          (absSlipDegNow - 54) / (spinThresholdDeg - 54),
          0.15,
          1.0,
        );
      } else if (absSlipDegNow >= 64) {
        this.oversteerRisk = THREE.MathUtils.clamp((absSlipDegNow - 60) / 18, 0.2, 0.95);
      } else {
        this.oversteerRisk = Math.max(0, this.oversteerRisk - clampedDt * 2.5);
      }

      // Level steer 10 ditahan = over-rotation: penghitung naik, lalu mobil melintir
      if (absSteerLevel >= 10 && slideLoose > 0.3 && currentSpeedKmh > 30) {
        this.level10HoldTimer += clampedDt;
        this.oversteerRisk = Math.max(
          this.oversteerRisk,
          THREE.MathUtils.clamp(this.level10HoldTimer / 0.5, 0.2, 1.0),
        );
      } else {
        this.level10HoldTimer = Math.max(0, this.level10HoldTimer - clampedDt * 3);
      }
      const level10Spin = this.level10HoldTimer >= 0.5;

      if (
        level10Spin ||
        (absSlipDegNow >= spinThresholdDeg && (pushingOver || absSlipDegNow >= 84)) ||
        (absSlipDegNow >= 68 && Math.abs(this.angularVelocity) > 2.45 && pushingOver)
      ) {
        this.level10HoldTimer = 0;
        this.spinOutTimer = 1.1;
        this.spinOutDir = driftDir !== 0 ? driftDir : Math.sign(this.angularVelocity || 1);
        this.angularVelocity = this.spinOutDir * 4.5;
        this.triggerPenalty('MELINTIR! SPIN-OUT - SKOR TERPUTUS', 1.0);
        onPenaltyHit?.();
      }
    } else if (!inSpinOut) {
      this.oversteerRisk = 0;
    }

    if (inSpinOut) {
      this.angularVelocity = THREE.MathUtils.damp(
        this.angularVelocity,
        this.spinOutDir * 2.4,
        2.5,
        clampedDt,
      );
    } else {
      // Lower damping while sliding gives real drift rotational inertia & smooth AI-like flow
      const yawDamp = isSliding ? 3.2 + build.suspensionTier * 0.45 : 8.8 + build.suspensionTier * 1.8;
      this.angularVelocity = THREE.MathUtils.damp(
        this.angularVelocity,
        targetAngVel + selfSteerAssist,
        yawDamp,
        clampedDt,
      );
    }

    this.heading += this.angularVelocity * clampedDt;

    // Momentum samping: saat ban belakang lepas, vektor gerak dunia tidak ikut berputar penuh bersama
    // hidung mobil, sehingga bagian belakang terlempar (slip angle terbentuk) dan mobil benar-benar ngeslide.
    if (!inSpinOut) {
      const hSin = Math.sin(this.heading);
      const hCos = Math.cos(this.heading);
      const projFwd = worldVx0 * hSin + worldVz0 * hCos;
      const projLat = worldVx0 * hCos - worldVz0 * hSin;
      // Efek penuh sampai sudut sedang (~20 deg), lalu mengecil agar sudut dalam tidak makin melebar/melintir
      const angleTaper = THREE.MathUtils.clamp(1 - (absSlipRad - 0.35) / 0.6, 0.25, 1);
      const slideCarry = THREE.MathUtils.clamp(slideLoose * 0.8, 0, 0.8) * angleTaper;
      forwardVel += (projFwd - bodyFwd0) * slideCarry;
      lateralVel += (projLat - bodyLat0) * slideCarry;
    }

    // --- 4. LATERAL SLIDE & BOUNDARY / WALL HIT DAMAGE ---
    const gripDecay = stats.lateralGrip * 4.95 * tireGripFactor * surfGrip;
    const transitionCarryScale =
      this.transitionBridgeTimer > 0 || (isCounterSteerInput && this.transitionHold > 0.2)
        ? 0.76
        : 1.0;
    const slideDecay =
      (0.36 + (1 - Math.min(0.85, stats.driftSlipFactor * 0.65)) * 0.42) *
      (input.handbrake ? 0.5 : 1.0) *
      transitionCarryScale;
    const lateralGripDecay =
      THREE.MathUtils.lerp(gripDecay, slideDecay, slideLoose) * levelGripScale;

    const nSinH = Math.sin(this.heading);
    const nCosH = Math.cos(this.heading);

    lateralVel *= Math.exp(-lateralGripDecay * clampedDt);

    this.velocity.x = nSinH * forwardVel + nCosH * lateralVel;
    this.velocity.z = nCosH * forwardVel - nSinH * lateralVel;

    const trackInfo = trackWorld.getTrackInfo(this.position.x, this.position.z);
    const offTrackThreshold = roadHalfWidth + 1.25;
    const wallLimit = roadHalfWidth + 2.45;

    if (trackInfo.distFromCenter > offTrackThreshold) {
      this.velocity.multiplyScalar(Math.exp(-1.45 * clampedDt));
      this.offTrackTimer += clampedDt;
      if (this.offTrackTimer > 0.65 && this.liveDriftScore > 60) {
        this.offTrackTimer = 0;
        this.triggerPenalty('OFF-TRACK! SKOR HILANG', 1.0);
        onPenaltyHit?.();
      }
    } else {
      this.offTrackTimer = 0;
    }

    this.position.x += this.velocity.x * clampedDt;
    this.position.z += this.velocity.z * clampedDt;

    const afterInfo = trackWorld.getTrackInfo(this.position.x, this.position.z);
    if (afterInfo.distFromCenter > wallLimit) {
      _toCenter
        .set(
          afterInfo.closestPoint.x - this.position.x,
          0,
          afterInfo.closestPoint.z - this.position.z,
        )
        .normalize();
      this.position.x = afterInfo.closestPoint.x - _toCenter.x * wallLimit;
      this.position.z = afterInfo.closestPoint.z - _toCenter.z * wallLimit;

      const impactSpeed = this.velocity.length() * 3.6;
      this.velocity.multiplyScalar(0.62);

      if (impactSpeed > 26 && this.wallHitCooldown <= 0) {
        this.wallHitCooldown = 0.9;
        const dmg = Math.min(22, Math.round(4 + impactSpeed * 0.14));
        this.bodyIntegrity = Math.max(0, this.bodyIntegrity - dmg);
        this.triggerPenalty(`WALL HIT! -${dmg}% BODI`, 0.85);
        onPenaltyHit?.();
      }
    }

    // --- 5. TELEMETRY, AI-STYLE BODY ROLL, SQUAT & RPM ---
    this.speedKmh = Math.round(this.velocity.length() * 3.6);
    const slipRad = Math.atan2(
      this.velocity.x * nCosH - this.velocity.z * nSinH,
      Math.max(1.5, Math.abs(this.velocity.x * nSinH + this.velocity.z * nCosH)),
    );
    this.signedSlipDeg = Math.round(THREE.MathUtils.radToDeg(-slipRad));
    this.slipAngleDeg = Math.abs(this.signedSlipDeg);

    // AI-style expressive body roll leaning cleanly with drift angle + lateral G
    const targetRoll = THREE.MathUtils.clamp(
      (slipRad * 0.16 + lateralVel * 0.011 + this.angularVelocity * 0.025) *
        (1 - build.suspensionTier * 0.08 + build.rideHeight * 0.1) *
        levelTiltBoost,
      -0.21 * levelTiltBoost,
      0.21 * levelTiltBoost,
    );
    const targetPitch = THREE.MathUtils.clamp(
      (input.brake * 0.075 -
        input.throttle * 0.052 -
        (slideLoose > 0.3 ? 0.022 : 0) -
        (this.isBoosting ? 0.035 : 0)) *
        (1 - build.suspensionTier * 0.1),
      -0.13,
      0.13,
    );
    // Keep asphalt posture planted and smooth like Tandem AI; rumble only on gravel shoulder!
    const roughSurfaceWave =
      totalSpeed > 4 && afterInfo.distFromCenter > roadHalfWidth
        ? Math.sin(performance.now() * 0.024) * 0.032
        : 0;
    const targetBounceY =
      roughSurfaceWave + (input.handbrake && totalSpeed > 5 ? -0.024 : 0);

    this.bodyRollRad = THREE.MathUtils.damp(this.bodyRollRad, targetRoll, 8.5, clampedDt);
    this.bodyPitchRad = THREE.MathUtils.damp(this.bodyPitchRad, targetPitch, 9.5, clampedDt);
    this.suspensionBounceY = THREE.MathUtils.damp(
      this.suspensionBounceY,
      targetBounceY,
      14,
      clampedDt,
    );
    const frontRollScale = input.brake > 0.2 ? 0.35 : 1.0;
    this.frontWheelSpinRad += ((forwardVel * frontRollScale) / 0.41) * clampedDt;

    const rearBurnoutExtra =
      !input.handbrake && slideLoose > 0.28 && input.throttle > 0.15
        ? (17.5 + wheelspinPower * 8.5) * input.throttle * slideLoose
        : 0;
    const rearClutchExtra = !input.handbrake && this.clutchRpmFlare > 350 ? 8.5 : 0;
    const rearEffectiveSpeed = input.handbrake ? 0 : forwardVel + rearBurnoutExtra + rearClutchExtra;
    this.rearWheelSpinRad += (rearEffectiveSpeed / 0.41) * clampedDt;
    this.wheelSpinRad = this.rearWheelSpinRad;

    this.maxRpm = 7200 + build.engineTier * 700;
    const speedNorm = Math.min(1, this.speedKmh / (gripTopKmh * 1.05));
    // Transmisi: T ganti mode, X naik gigi, Z turun gigi (satu tekanan = satu gigi)
    if (input.toggleTransmission && !this.prevToggleTransmission) {
      this.transmissionMode = this.transmissionMode === 'AUTO' ? 'MANUAL' : 'AUTO';
      if (this.transmissionMode === 'MANUAL') this.manualGear = this.gear;
      this.activeZoneBanner = `TRANSMISI: ${this.transmissionMode}`;
      this.activeZoneBannerTimer = 1.0;
    }
    if (this.transmissionMode === 'MANUAL') {
      if (input.shiftUp && !this.prevShiftUp) this.manualGear = Math.min(5, this.manualGear + 1);
      if (input.shiftDown && !this.prevShiftDown) this.manualGear = Math.max(1, this.manualGear - 1);
    }
    this.prevShiftUp = input.shiftUp;
    this.prevShiftDown = input.shiftDown;
    this.prevToggleTransmission = input.toggleTransmission;

    let gearFrac: number;
    if (this.transmissionMode === 'MANUAL') {
      this.gear = this.manualGear;
      // Posisi kecepatan di dalam rentang gigi terpilih: terlalu rendah = RPM jatuh, terlalu tinggi = mentok limiter
      gearFrac = THREE.MathUtils.clamp(speedNorm * 5 - (this.manualGear - 1), 0, 1);
    } else {
      // AUTO berbasis RPM + gas: naik gigi saat RPM mendekati limiter, turun gigi saat gas dilepas / RPM jatuh.
      // Ada jeda ganti gigi (tenaga terputus sebentar) dan cooldown agar tidak bolak-balik.
      const autoTopKmh = Math.max(40, gripTopKmh * 1.05);
      const gearSpanKmh = Math.max(12, autoTopKmh / 5);
      const ratioIn = (g: number) =>
        THREE.MathUtils.clamp(this.speedKmh / (gearSpanKmh * g * 1.1), 0, 1.4);

      if (this.autoShiftTimer > 0) this.autoShiftTimer -= clampedDt;
      if (this.autoShiftCooldown > 0) this.autoShiftCooldown -= clampedDt;

      if (this.autoShiftTimer <= 0 && this.autoShiftCooldown <= 0) {
        const curRatio = ratioIn(this.gear);
        const rpmFrac = this.rpm / Math.max(1, this.maxRpm);
        let shiftDir = 0;
        if (this.gear < 5) {
          const nextRatio = ratioIn(this.gear + 1);
          const geared = curRatio > 0.95;
          const flareFull = rpmFrac > 0.95 && input.throttle > 0.5 && nextRatio >= 0.5;
          if (geared || flareFull) shiftDir = 1;
        }
        if (shiftDir === 0 && this.gear > 1) {
          const prevRatio = ratioIn(this.gear - 1);
          const liftOff = input.throttle < 0.1 && prevRatio < 1.0 && curRatio < 0.85;
          const lowRpm = curRatio < 0.38 && prevRatio < 0.92;
          if (liftOff || lowRpm) shiftDir = -1;
        }
        if (shiftDir !== 0) {
          this.gear += shiftDir;
          this.autoShiftTimer = 0.22;
          this.autoShiftCooldown = 0.55;
          if (!this.activeZoneBanner) {
            this.activeZoneBanner = shiftDir > 0 ? 'UPSHIFT' : 'DOWNSHIFT';
            this.activeZoneBannerTimer = 0.5;
          }
        }
      }
      // Saat ganti gigi RPM turun sedikit supaya terasa
      gearFrac = Math.max(0, ratioIn(this.gear) - (this.autoShiftTimer > 0 ? 0.14 : 0));
    }
    const wheelspinFlare = slideLoose * input.throttle * 1950 + this.clutchRpmFlare;
    const targetRpm =
      1400 + (0.35 + gearFrac * 0.65) * (this.maxRpm - 1400) + wheelspinFlare;
    this.rpm = THREE.MathUtils.damp(
      this.rpm,
      Math.min(this.maxRpm, targetRpm),
      15,
      clampedDt,
    );

    // --- 6. REAL-TIME JUDGE SCORING, STRAIGHTEN LEVEL & CLIPPING ZONES ---
    const qualifiesDrift =
      !inSpinOut &&
      this.speedKmh >= 22 &&
      ((this.slipAngleDeg >= 11 && this.slipAngleDeg <= 80) ||
        (slideLoose > 0.45 && this.slipAngleDeg >= 9));
    this.isDrifting = qualifiesDrift;

    if (inSpinOut) {
      this.driftPhase = 'INITIATE';
    } else if (!qualifiesDrift) {
      this.driftPhase = slideLoose > 0.35 && this.speedKmh >= 18 ? 'INITIATE' : 'GRIP';
    } else if (this.initBannerCooldown > 1.25) {
      this.driftPhase = 'INITIATE';
    } else if (isCounterSteerInput) {
      this.driftPhase = 'BALANCE';
    } else {
      this.driftPhase = 'SLIDE';
    }

    if (this.transitionCooldown > 0) this.transitionCooldown -= clampedDt;

    if (qualifiesDrift) {
      this.driftGraceTimer = 1.15;
      this.straightenFlatTimer = 0;
      this.sustainedDriftTimer += clampedDt;
      const slipSigned = this.velocity.x * nCosH - this.velocity.z * nSinH;
      const driftSign = Math.sign(slipSigned);

      // Left <-> Right Hold Transition Switch! Banks previous corner score cleanly & keeps combo alive
      if (
        this.lastDriftSign !== 0 &&
        driftSign !== 0 &&
        driftSign !== this.lastDriftSign &&
        this.liveDriftScore > 55 &&
        this.transitionCooldown <= 0
      ) {
        this.bankPendingDrift(true);
        this.bankedScore += 320;
        this.comboMultiplier = Math.min(8.0, this.comboMultiplier + 0.45);
        this.nitro = Math.min(1.0, this.nitro + 0.08);
        this.activeZoneBanner = 'TRANSITION! +320';
        this.activeZoneBannerTimer = 1.25;
        this.transitionCooldown = 0.75;
        this.transitionHold = 0;
        this.sustainedDriftTimer = 0;
      }
      if (driftSign !== 0) this.lastDriftSign = driftSign;

      // Sustained clean drift checkpoint: locks accumulated chain safely every 2.8s without resetting combo
      if (this.sustainedDriftTimer >= 2.8 && this.liveDriftScore >= 180) {
        this.sustainedDriftTimer = 0;
        this.bankPendingDrift(true);
      }

      const angleBonus = Math.min(2.1, Math.max(0.6, this.slipAngleDeg / 28));
      const speedBonus = Math.min(2.15, Math.max(0.55, this.speedKmh / 62));

      // Check Front Nose & Rear Bumper against Inner Clip & Outer Zone markers
      const noseX = this.position.x + nSinH * 1.95;
      const noseZ = this.position.z + nCosH * 1.95;
      const tailX = this.position.x - nSinH * 1.95;
      const tailZ = this.position.z - nCosH * 1.95;

      let insideAnyZone = false;
      for (let zIdx = 0; zIdx < trackWorld.clipZoneCenters.length; zIdx++) {
        const cz = trackWorld.clipZoneCenters[zIdx];
        const targetX = cz.zoneType === 'inner' ? noseX : tailX;
        const targetZ = cz.zoneType === 'inner' ? noseZ : tailZ;
        const dTargetSq =
          (targetX - cz.pos.x) * (targetX - cz.pos.x) +
          (targetZ - cz.pos.z) * (targetZ - cz.pos.z);
        const dCenterSq =
          (this.position.x - cz.pos.x) * (this.position.x - cz.pos.x) +
          (this.position.z - cz.pos.z) * (this.position.z - cz.pos.z);
        const hitDistSq = Math.min(dTargetSq, dCenterSq);

        if (hitDistSq <= cz.radius * cz.radius) {
          insideAnyZone = true;
          const lastHit = this.lastZoneCooldown[zIdx] ?? -999;
          const now = performance.now() / 1000;
          if (now - lastHit > 6.5) {
            this.lastZoneCooldown[zIdx] = now;
            this.zoneHits += 1;
            const isPro = dTargetSq <= (cz.radius * 0.68) * (cz.radius * 0.68) && this.slipAngleDeg >= 24;
            const bonus = isPro ? 600 : 350;
            this.liveDriftScore += bonus;
            this.bankPendingDrift(true);
            this.sustainedDriftTimer = 0;
            this.comboMultiplier = Math.min(8.0, this.comboMultiplier + (isPro ? 0.6 : 0.4));
            const zoneLabel = cz.zoneType === 'inner' ? 'INNER CLIP' : 'OUTER ZONE';
            this.activeZoneBanner = `${isPro ? 'PRO!' : 'GREAT!'} ${zoneLabel} +${bonus}`;
            this.activeZoneBannerTimer = 1.65;
            onZoneHit?.();
          }
          break;
        }
      }

      const zoneMult = insideAnyZone ? 1.8 : 1.0;
      const pts =
        (210 + stats.driftReadiness * 1.35) *
        angleBonus *
        speedBonus *
        zoneMult *
        clampedDt;
      this.liveDriftScore += pts;
      this.comboMultiplier = Math.min(8.0, this.comboMultiplier + clampedDt * 0.45);
      if (this.comboMultiplier > this.maxCombo) {
        this.maxCombo = this.comboMultiplier;
      }

      if (this.oversteerRisk >= 0.42) {
        this.straightenRisk = 0;
        this.driftCallout = 'AWAS TERLALU OVER! BALAS STEER!';
      } else if (this.transitionProgress >= 0.22 && isCounterSteerInput) {
        this.straightenRisk = 0;
        this.driftCallout = 'SWITCHING... TAHAN BELOK!';
      } else if (this.slipAngleDeg < 15 && this.liveDriftScore > 60 && !input.handbrake) {
        this.straightenRisk = THREE.MathUtils.clamp((15 - this.slipAngleDeg) / 6, 0.25, 0.62);
        this.driftCallout = 'SUDUT TIPIS — AWAS STRAIGHTEN!';
      } else {
        this.straightenRisk = 0;
        if (this.comboMultiplier >= 4.0) this.driftCallout = 'DRIFT KING!';
        else if (this.slipAngleDeg >= 44) this.driftCallout = 'PRO ANGLE!';
        else if (this.driftPhase === 'BALANCE') this.driftCallout = 'BALANCING SLIDE!';
        else if (this.comboMultiplier >= 2.2) this.driftCallout = 'GREAT CHAIN!';
        else this.driftCallout = 'SMOOTH SLIDE';
      }
    } else if (!inSpinOut && this.liveDriftScore > 0) {
      this.driftGraceTimer -= clampedDt;
      const activelyBridging =
        this.transitionBridgeTimer > 0 &&
        Math.abs(input.steer) > 0.42 &&
        (input.throttle > 0.2 || input.handbrake || input.clutchKick);

      if (this.slipAngleDeg < 11 && this.speedKmh > 20 && !activelyBridging) {
        const hesitateBoost = Math.abs(input.steer) < 0.2 ? 1.65 : 1.0;
        this.straightenFlatTimer += clampedDt * hesitateBoost;
        this.straightenRisk = THREE.MathUtils.clamp(this.straightenFlatTimer / 0.44, 0.42, 1.0);
        this.driftCallout = 'AWAS STRAIGHTEN! SKOR TERPUTUS!';
        if (this.straightenFlatTimer >= 0.44) {
          this.triggerPenalty('STRAIGHTENED! SKOR TERPUTUS', 1.0);
          onPenaltyHit?.();
        }
      } else if (activelyBridging) {
        this.straightenRisk = 0.2;
        this.driftCallout = 'TRANSISI... TAHAN BELOK!';
      } else if (this.driftGraceTimer <= 0) {
        if (this.speedKmh < 22) {
          this.lastDriftSign = 0;
          this.driftCallout = null;
          this.straightenRisk = 0;
          this.bankPendingDrift();
        } else {
          this.triggerPenalty('STRAIGHTENED! SKOR TERPUTUS', 1.0);
          onPenaltyHit?.();
        }
      }
    } else {
      this.lastDriftSign = 0;
      this.driftCallout = inSpinOut ? 'MELINTIR! KONTROL LEPAS!' : null;
      this.straightenRisk = 0;
      this.straightenFlatTimer = 0;
      this.sustainedDriftTimer = 0;
    }

    if (inSpinOut) {
      this.driftDirection = 'SPINOUT';
    } else if (this.transitionBridgeTimer > 0 || (isCounterSteerInput && this.transitionProgress >= 0.22)) {
      this.driftDirection = 'TRANSITION';
    } else if (qualifiesDrift) {
      this.driftDirection = this.signedSlipDeg >= 0 ? 'LEFT' : 'RIGHT';
    } else {
      this.driftDirection = 'STRAIGHT';
    }

    if (this.activeZoneBannerTimer > 0) {
      this.activeZoneBannerTimer -= clampedDt;
      if (this.activeZoneBannerTimer <= 0) {
        this.activeZoneBanner = null;
      }
    }

    if (this.penaltyBannerTimer > 0) {
      this.penaltyBannerTimer -= clampedDt;
      if (this.penaltyBannerTimer <= 0) {
        this.penaltyBanner = null;
      }
    }

    this.prevSteer = input.steer;
    this.prevHandbrake = input.handbrake;
    this.prevClutchKick = input.clutchKick;
  }
}

export function pollUnifiedInput(
  keys: Record<string, boolean>,
  touchInput: {
    throttle: boolean;
    brake: boolean;
    left: boolean;
    right: boolean;
    handbrake: boolean;
    clutchKick: boolean;
    boost: boolean;
    shiftUp: boolean;
    shiftDown: boolean;
    toggleTransmission: boolean;
  },
): InputState {
  let throttle = keys['KeyW'] || keys['ArrowUp'] || touchInput.throttle ? 1 : 0;
  let brake = keys['KeyS'] || keys['ArrowDown'] || touchInput.brake ? 1 : 0;
  let steer =
    (keys['KeyA'] || keys['ArrowLeft'] || touchInput.left ? 1 : 0) -
    (keys['KeyD'] || keys['ArrowRight'] || touchInput.right ? 1 : 0);
  let handbrake = Boolean(keys['Space'] || touchInput.handbrake);
  let clutchKick = Boolean(keys['KeyE'] || touchInput.clutchKick);
  let boost = Boolean(keys['ShiftLeft'] || keys['ShiftRight'] || touchInput.boost);
  let gamepadConnected = false;
  let gamepadName: string | null = null;

  if (typeof navigator !== 'undefined' && navigator.getGamepads) {
    const pads = navigator.getGamepads();
    for (let i = 0; i < pads.length; i++) {
      const gp = pads[i];
      if (!gp) continue;
      gamepadConnected = true;
      gamepadName = gp.id.split('(')[0].trim();

      const axisX = gp.axes[0] ?? 0;
      if (Math.abs(axisX) > 0.12) {
        steer = -Math.sign(axisX) * Math.pow((Math.abs(axisX) - 0.12) / 0.88, 1.15);
      }
      const rt = gp.buttons[7]?.value ?? 0;
      const lt = gp.buttons[6]?.value ?? 0;
      if (rt > 0.08) throttle = Math.max(throttle, rt);
      if (lt > 0.08) brake = Math.max(brake, lt);

      if (gp.buttons[0]?.pressed || gp.buttons[2]?.pressed) handbrake = true;
      if (gp.buttons[4]?.pressed) clutchKick = true;
      if (gp.buttons[1]?.pressed || gp.buttons[5]?.pressed) boost = true;
      break;
    }
  }

  return {
    throttle,
    brake,
    steer,
    handbrake,
    clutchKick,
    boost,
    shiftUp: Boolean(keys['KeyX'] || touchInput.shiftUp),
    shiftDown: Boolean(keys['KeyZ'] || touchInput.shiftDown),
    toggleTransmission: Boolean(keys['KeyT'] || touchInput.toggleTransmission),
    gamepadConnected,
    gamepadName,
  };
}
