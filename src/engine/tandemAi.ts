import * as THREE from 'three';
import { TrackWorld } from './trackBuilder3d';

const _tanNow = new THREE.Vector3();
const _tanAhead = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _normVec = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export class TandemAiCar {
  public position = new THREE.Vector3();
  public velocity = new THREE.Vector3();
  public heading = 0;
  public slipAngleDeg = 0;
  public signedSlipDeg = 0;
  public isDrifting = false;
  public steerVisualRad = 0;
  public bodyRollRad = 0;
  public bodyPitchRad = 0;
  public wheelSpinRad = 0;
  public speedKmh = 0;
  public aiScore = 0;

  private splineT = 0;
  private totalLength = 400;
  private currentDriftRad = 0;
  private currentSpeedMs = 18;
  private lateralOffset = 0;

  public resetForRound(trackWorld: TrackWorld, role: 'lead' | 'chase') {
    this.totalLength = Math.max(120, trackWorld.curve.getLength());
    // When AI is 'chase', it spawns ~9m behind start; when AI is 'lead', ~9m ahead of start
    const deltaT = (role === 'lead' ? 9.5 : -9.5) / this.totalLength;
    this.splineT = (deltaT + 1) % 1;

    const pt = trackWorld.curve.getPointAt(this.splineT);
    const tan = trackWorld.curve.getTangentAt(this.splineT).normalize();
    this.position.set(pt.x, 0, pt.z);
    this.heading = Math.atan2(tan.x, tan.z);
    this.velocity.set(tan.x * 12, 0, tan.z * 12);
    this.currentSpeedMs = 12;
    this.currentDriftRad = 0;
    this.lateralOffset = 0;
    this.slipAngleDeg = 0;
    this.signedSlipDeg = 0;
    this.isDrifting = false;
    this.steerVisualRad = 0;
    this.bodyRollRad = 0;
    this.bodyPitchRad = 0;
    this.wheelSpinRad = 0;
    this.speedKmh = 42;
  }

  public step(
    dt: number,
    role: 'lead' | 'chase',
    trackWorld: TrackWorld,
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector3,
    playerHeading: number,
    playerT: number,
    roadHalfWidth: number,
  ) {
    const clampedDt = Math.min(dt, 0.05);

    // Measure curvature ahead on spline
    trackWorld.curve.getTangentAt(this.splineT, _tanNow).normalize();
    trackWorld.curve.getTangentAt((this.splineT + 0.032) % 1, _tanAhead).normalize();
    const bendCross = _tanNow.z * _tanAhead.x - _tanNow.x * _tanAhead.z;
    const curvature = THREE.MathUtils.clamp(bendCross * 3.8, -1, 1);

    // Signed circular track gap relative to player (+ = AI ahead of player, - = AI behind player)
    let gapT = this.splineT - playerT;
    if (gapT > 0.5) gapT -= 1;
    if (gapT < -0.5) gapT += 1;
    const gapMeters = gapT * this.totalLength;

    let targetSpeedMs = 21 - Math.abs(curvature) * 3.2; // ~64-76 km/h flowy pace
    let targetDriftRad = 0;
    let targetLat = 0;

    if (role === 'lead') {
      // AI leads: maintain dramatic 30-52 deg drifts through curves, mild rubberband so player can chase door-to-door
      if (gapMeters > 26) targetSpeedMs -= 4.5;
      else if (gapMeters < 5.5) targetSpeedMs += 4.2;

      if (Math.abs(curvature) > 0.14) {
        targetDriftRad = Math.sign(curvature) * THREE.MathUtils.degToRad(26 + Math.abs(curvature) * 28);
        targetLat = -Math.sign(curvature) * (roadHalfWidth * 0.34);
      }
    } else {
      // AI chases behind player (target gap: -6.5m behind player)
      const desiredGap = -6.5;
      const gapError = desiredGap - gapMeters; // positive if AI is too close/ahead, negative if too far back
      targetSpeedMs = Math.max(
        10,
        Math.min(34, playerVel.length() - gapError * 1.15),
      );

      // Mirror player's drift angle when close, or use track curvature
      const playerSlip = Math.atan2(
        playerVel.x * Math.cos(playerHeading) - playerVel.z * Math.sin(playerHeading),
        Math.max(2, Math.abs(playerVel.x * Math.sin(playerHeading) + playerVel.z * Math.cos(playerHeading))),
      );
      if (Math.abs(gapMeters) < 18 && Math.abs(playerSlip) > 0.18) {
        targetDriftRad = THREE.MathUtils.clamp(-playerSlip * 0.92, -0.82, 0.82);
      } else if (Math.abs(curvature) > 0.14) {
        targetDriftRad = Math.sign(curvature) * THREE.MathUtils.degToRad(24 + Math.abs(curvature) * 26);
      }
      // Subtle lane offset so AI sits on player's door instead of bumping straight into rear bumper
      targetLat = Math.sign(curvature || 1) * 1.45;
    }

    this.currentSpeedMs = THREE.MathUtils.damp(this.currentSpeedMs, targetSpeedMs, 4.5, clampedDt);
    this.currentDriftRad = THREE.MathUtils.damp(this.currentDriftRad, targetDriftRad, 5.2, clampedDt);
    this.lateralOffset = THREE.MathUtils.damp(this.lateralOffset, targetLat, 3.2, clampedDt);

    // Advance along spline
    this.splineT = (this.splineT + (this.currentSpeedMs * clampedDt) / this.totalLength) % 1;

    trackWorld.curve.getPointAt(this.splineT, _targetPos);
    trackWorld.curve.getTangentAt(this.splineT, _tanNow).normalize();
    _normVec.crossVectors(_up, _tanNow).normalize();

    _targetPos.addScaledVector(_normVec, this.lateralOffset);

    // Smoothly move world position & avoid overlapping player car
    const dxP = _targetPos.x - playerPos.x;
    const dzP = _targetPos.z - playerPos.z;
    const distP = Math.hypot(dxP, dzP);
    if (distP < 3.4 && distP > 0.01) {
      const push = (3.4 - distP) * 0.65;
      _targetPos.x += (dxP / distP) * push;
      _targetPos.z += (dzP / distP) * push;
    }

    const prevX = this.position.x;
    const prevZ = this.position.z;
    this.position.x = THREE.MathUtils.damp(this.position.x, _targetPos.x, 9, clampedDt);
    this.position.z = THREE.MathUtils.damp(this.position.z, _targetPos.z, 9, clampedDt);

    this.velocity.set(
      (this.position.x - prevX) / Math.max(0.008, clampedDt),
      0,
      (this.position.z - prevZ) / Math.max(0.008, clampedDt),
    );
    this.speedKmh = Math.round(this.currentSpeedMs * 3.6);

    const pathHeading = Math.atan2(_tanNow.x, _tanNow.z);
    const desiredHeading = pathHeading + this.currentDriftRad;
    // Shortest angle interpolation
    let diff = desiredHeading - this.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.heading += diff * Math.min(1, clampedDt * 8.5);

    this.signedSlipDeg = Math.round(THREE.MathUtils.radToDeg(this.currentDriftRad));
    this.slipAngleDeg = Math.abs(this.signedSlipDeg);
    this.isDrifting = this.slipAngleDeg >= 12 && this.speedKmh >= 24;
    this.steerVisualRad = THREE.MathUtils.damp(
      this.steerVisualRad,
      THREE.MathUtils.clamp(-this.currentDriftRad * 0.85, -0.78, 0.78),
      10,
      clampedDt,
    );
    this.bodyRollRad = THREE.MathUtils.damp(
      this.bodyRollRad,
      THREE.MathUtils.clamp(-this.currentDriftRad * 0.14, -0.18, 0.18),
      8,
      clampedDt,
    );
    this.bodyPitchRad = THREE.MathUtils.damp(this.bodyPitchRad, -0.025, 8, clampedDt);
    this.wheelSpinRad += ((this.currentSpeedMs + (this.isDrifting ? 6 : 0)) / 0.41) * clampedDt;

    // Score accumulation for AI judge score
    if (this.isDrifting) {
      const proxBonus =
        role === 'chase' && distP < 9.5
          ? 1.45
          : 1.0;
      this.aiScore += (320 + this.slipAngleDeg * 5.2) * proxBonus * clampedDt;
    }
  }
}
