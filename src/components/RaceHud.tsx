import React, { useMemo } from 'react';
import {
  Camera,
  Gamepad2,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Star,
  Swords,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import * as THREE from 'three';
import { RaceCameraMode } from '../engine/ThreeViewport';
import { TelemetryState, TrackDefinition } from '../types/game';

interface RaceHudProps {
  track: TrackDefinition;
  telemetry: TelemetryState;
  cameraMode: RaceCameraMode;
  isPaused: boolean;
  muted: boolean;
  onTogglePause: () => void;
  onExitToWorkshop: () => void;
  onCycleCamera: () => void;
  onToggleMute: () => void;
  onToggleAssist: () => void;
  onRestart: () => void;
  onTouchChange: (
    key: 'throttle' | 'brake' | 'left' | 'right' | 'handbrake' | 'clutchKick' | 'boost',
    active: boolean,
  ) => void;
}

export const RaceHud: React.FC<RaceHudProps> = ({
  track,
  telemetry,
  cameraMode,
  isPaused,
  muted,
  onTogglePause,
  onExitToWorkshop,
  onCycleCamera,
  onToggleMute,
  onToggleAssist,
  onRestart,
  onTouchChange,
}) => {
  const rpmRatio = Math.min(1, telemetry.rpm / Math.max(1, telemetry.maxRpm));
  const arcDash = 220;
  const arcFill = arcDash * rpmRatio;

  const mins = Math.floor(telemetry.timeRemaining / 60);
  const secs = Math.floor(telemetry.timeRemaining % 60);
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  const camLabels: Record<RaceCameraMode, string> = {
    chase: 'Chase',
    drift: 'Dynamic Drift',
    hood: 'Kap Mesin',
    cinematic: 'Sinematik',
  };

  // Precompute SVG minimap path & bounds from track spline
  const minimap = useMemo(() => {
    const pts = track.waypoints.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
    const sampled = curve.getPoints(96);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    sampled.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    });
    const pad = 22;
    const spanX = Math.max(1, maxX - minX);
    const spanZ = Math.max(1, maxZ - minZ);
    const scale = Math.min((136 - pad * 2) / spanX, (112 - pad * 2) / spanZ);
    const toSvg = (x: number, z: number) => ({
      sx: 68 + (x - (minX + maxX) / 2) * scale,
      sy: 56 + (z - (minZ + maxZ) / 2) * scale,
    });
    const pathD =
      sampled
        .map((p, idx) => {
          const { sx, sy } = toSvg(p.x, p.z);
          return `${idx === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`;
        })
        .join(' ') + ' Z';
    const zones = track.clipZones.map((t, idx) => {
      const p = curve.getPointAt(t);
      return { ...toSvg(p.x, p.z), isInner: idx % 2 === 0 };
    });
    return { pathD, zones, toSvg };
  }, [track]);

  const carSvgPos = minimap.toSvg(telemetry.carX, telemetry.carZ);
  const carDeg = (-telemetry.carHeading * 180) / Math.PI + 180;

  // Tandem Enemy Radar SVG offset (scaled to 22m radius -> 32px)
  const radarScale = 32 / 22;
  const radarEnemyX = Math.max(-36, Math.min(36, telemetry.tandemRadarDx * radarScale));
  const radarEnemyY = Math.max(-36, Math.min(36, -telemetry.tandemRadarDz * radarScale));

  const earnedStars =
    telemetry.bankedScore >= track.starTargets[2]
      ? 3
      : telemetry.bankedScore >= track.starTargets[1]
        ? 2
        : telemetry.bankedScore >= track.starTargets[0]
          ? 1
          : 0;

  const dirLabel =
    telemetry.driftDirection === 'LEFT'
      ? 'KIRI'
      : telemetry.driftDirection === 'RIGHT'
        ? 'KANAN'
        : telemetry.driftDirection === 'TRANSITION'
          ? 'TRANSISI'
          : telemetry.driftDirection === 'SPINOUT'
            ? 'SPIN-OUT'
            : 'LURUS';

  const proximityTone =
    telemetry.tandemProximityLabel.includes('TERLALU JAUH')
      ? 'text-rose-400'
      : telemetry.tandemProximityLabel.includes('CLOSE PROXIMITY') ||
          telemetry.tandemProximityLabel.includes('MENEMPEL')
        ? 'text-emerald-400'
        : 'text-cyan-300';

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Row: Controls, Live Drift Score / Tandem Judge, & Track Minimap + Radar */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left Compact Actions */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 max-w-sm">
          <button
            onClick={onTogglePause}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0d121c]/92 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-white cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" />
            Jeda
          </button>
          <button
            onClick={onCycleCamera}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0d121c]/92 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            {camLabels[cameraMode]} (C)
          </button>
          <button
            onClick={onToggleAssist}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer ${
              telemetry.autoCounterSteer
                ? 'bg-[#0d121c]/92 border-emerald-500/50 text-emerald-300'
                : 'bg-[#0d121c]/92 border-slate-700 text-slate-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Assist: {telemetry.autoCounterSteer ? 'ON' : 'OFF'} (Q)
          </button>
          <button
            onClick={onToggleMute}
            className="p-2 rounded-lg bg-[#0d121c]/92 border border-slate-800 hover:border-slate-700 text-slate-200 cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {telemetry.gamepadConnected && (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0d121c]/92 border border-emerald-500/40 text-xs text-emerald-300">
              <Gamepad2 className="w-3.5 h-3.5" />
              <span className="truncate max-w-[140px]">
                {telemetry.gamepadName || 'Gamepad Terhubung'}
              </span>
            </div>
          )}
        </div>

        {/* Top-Center: Score, Tandem Judge Bar, Live Drift Chain & Penalties */}
        <div className="flex flex-col items-center text-center">
          <div className="bg-[#0d121c]/92 border border-slate-800 rounded-xl px-6 py-2.5 min-w-[260px]">
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
              {telemetry.gameMode === 'tandem' ? (
                <span className="inline-flex items-center gap-1 font-bold text-cyan-400">
                  <Swords className="w-3 h-3" />
                  RONDE {telemetry.tandemRound}/2 · {telemetry.tandemRole === 'lead' ? 'LEAD RUN' : 'CHASE RUN'}
                </span>
              ) : (
                <span>{track.name}</span>
              )}
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-white font-semibold">{timeStr}</span>
              {telemetry.gameMode === 'solo' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-0.5">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s <= earnedStars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </span>
                </>
              )}
            </div>

            {telemetry.gameMode === 'tandem' ? (
              <div className="mt-1 space-y-1.5">
                <div className="flex items-center justify-center gap-4">
                  <div>
                    <div className="text-[10px] text-slate-400">ANDA</div>
                    <div className="font-mono-tabular text-xl font-bold text-amber-400 leading-none">
                      {telemetry.bankedScore.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-slate-500">VS</div>
                  <div>
                    <div className="text-[10px] text-slate-400">AI RIVAL</div>
                    <div className="font-mono-tabular text-xl font-bold text-cyan-400 leading-none">
                      {telemetry.tandemAiScore.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-800/90 text-[10px]">
                  <div>
                    <div className="text-slate-400">Jarak</div>
                    <div className={`font-mono-tabular font-bold ${proximityTone}`}>
                      {telemetry.tandemDistanceM.toFixed(1)}m
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Angle</div>
                    <div className="font-mono-tabular font-bold text-white">
                      {telemetry.slipAngleDeg}° / {telemetry.tandemAiAngleDeg}°
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Match</div>
                    <div
                      className={`font-mono-tabular font-bold ${
                        telemetry.tandemAngleMatchPct >= 75
                          ? 'text-emerald-400'
                          : telemetry.tandemAngleMatchPct >= 45
                            ? 'text-amber-400'
                            : 'text-rose-400'
                      }`}
                    >
                      {telemetry.tandemAngleMatchPct}%
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="font-mono-tabular text-2xl sm:text-3xl font-bold text-white leading-tight mt-0.5">
                {telemetry.bankedScore.toLocaleString('id-ID')}
              </div>
            )}
          </div>

          {(telemetry.liveDriftScore > 0 || telemetry.oversteerRisk >= 0.45) && (
            <div
              className={`mt-2 rounded-lg px-4 py-1.5 min-w-[248px] space-y-1 border ${
                telemetry.oversteerRisk >= 0.45 || telemetry.straightenRisk >= 0.35
                  ? 'bg-rose-950/92 border-rose-500'
                  : telemetry.transitionProgress >= 0.18
                    ? 'bg-[#0d121c]/94 border-cyan-400'
                    : telemetry.straightenRisk > 0
                      ? 'bg-[#0d121c]/94 border-amber-400'
                      : 'bg-[#0d121c]/94 border-amber-500/60'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`text-[11px] font-bold tracking-wide ${
                    telemetry.oversteerRisk >= 0.45 || telemetry.straightenRisk >= 0.35
                      ? 'text-rose-300'
                      : telemetry.transitionProgress >= 0.18
                        ? 'text-cyan-300'
                        : 'text-amber-300'
                  }`}
                >
                  {telemetry.driftCallout || 'DRIFTING'}
                </span>
                <span className="font-mono-tabular text-xs text-slate-300">
                  {telemetry.slipAngleDeg}° · {dirLabel}
                </span>
              </div>
              <div className="flex items-baseline justify-center gap-2">
                <span className="font-mono-tabular text-xl font-bold text-amber-400">
                  +{telemetry.liveDriftScore.toLocaleString('id-ID')}
                </span>
                <span className="font-mono-tabular text-sm font-bold text-cyan-400">
                  ×{telemetry.comboMultiplier.toFixed(1)}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-sm overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    telemetry.oversteerRisk >= 0.45 || telemetry.straightenRisk >= 0.35
                      ? 'bg-rose-500'
                      : telemetry.transitionProgress >= 0.18
                        ? 'bg-cyan-400'
                        : 'bg-amber-400'
                  }`}
                  style={{
                    width: `${Math.round(
                      (telemetry.transitionProgress >= 0.18
                        ? telemetry.transitionProgress
                        : telemetry.comboGraceRatio) * 100,
                    )}%`,
                  }}
                />
              </div>
              {telemetry.oversteerRisk >= 0.45 ? (
                <div className="text-[10px] font-bold text-rose-200 tracking-wide">
                  TERLALU OVER! BALAS STEER ATAU MELINTIR
                </div>
              ) : telemetry.straightenRisk >= 0.35 ? (
                <div className="text-[10px] font-bold text-rose-200 tracking-wide">
                  CEGAH STRAIGHTEN: TAHAN GAS + BELOK / TEKAN E
                </div>
              ) : telemetry.transitionProgress >= 0.18 ? (
                <div className="text-[10px] font-bold text-cyan-200 tracking-wide">
                  TAHAN STEER UNTUK SWITCH ARAH DRIFT
                </div>
              ) : null}
            </div>
          )}

          {telemetry.activeZoneText && (
            <div className="mt-2 px-4 py-1 rounded-lg bg-amber-500 text-slate-950 font-display font-bold text-xs tracking-wide">
              {telemetry.activeZoneText}
            </div>
          )}

          {telemetry.penaltyBanner && (
            <div className="mt-1.5 px-4 py-1 rounded-lg bg-rose-600 text-white font-display font-bold text-xs tracking-wide">
              {telemetry.penaltyBanner}
            </div>
          )}
        </div>

        {/* Top-Right: Minimap & Tandem Proximity Radar */}
        <div className="hidden md:flex flex-col items-end gap-2">
          <div className="flex flex-col items-end gap-1.5 bg-[#0d121c]/92 border border-slate-800 rounded-xl p-2.5">
            <div className="w-full flex items-center justify-between text-[11px] px-1">
              <span className="text-slate-400">Peta Lintasan</span>
              <span className="font-mono-tabular text-amber-400 font-semibold">
                {telemetry.zoneHits} Clip
              </span>
            </div>
            <svg width="136" height="112" viewBox="0 0 136 112" className="bg-slate-950/80 rounded-lg border border-slate-800/80">
              <path
                d={minimap.pathD}
                fill="none"
                stroke="#334155"
                strokeWidth="8"
                strokeLinejoin="round"
              />
              <path
                d={minimap.pathD}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {minimap.zones.map((z, idx) => (
                <circle
                  key={idx}
                  cx={z.sx}
                  cy={z.sy}
                  r="3.5"
                  fill={z.isInner ? '#fbbf24' : '#22d3ee'}
                />
              ))}
              <g transform={`translate(${carSvgPos.sx.toFixed(1)}, ${carSvgPos.sy.toFixed(1)}) rotate(${carDeg.toFixed(1)})`}>
                <polygon points="0,-6 4.5,5 0,2.5 -4.5,5" fill="#22d3ee" stroke="#0f172a" strokeWidth="1" />
              </g>
            </svg>
          </div>

          {telemetry.gameMode === 'tandem' && (
            <div className="bg-[#0d121c]/92 border border-cyan-500/40 rounded-xl p-2.5 w-[158px] space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-cyan-300 font-semibold">Radar Rival</span>
                <span className={`font-mono-tabular font-bold ${proximityTone}`}>
                  {telemetry.tandemDistanceM.toFixed(1)}m
                </span>
              </div>
              <div className="flex justify-center">
                <svg width="84" height="84" viewBox="-42 -42 84 84" className="bg-slate-950/90 rounded-lg border border-slate-800">
                  <circle cx="0" cy="0" r="16" fill="none" stroke="#1e293b" strokeWidth="1" />
                  <circle cx="0" cy="0" r="32" fill="none" stroke="#1e293b" strokeWidth="1" />
                  <line x1="-42" y1="0" x2="42" y2="0" stroke="#1e293b" strokeWidth="1" />
                  <line x1="0" y1="-42" x2="0" y2="42" stroke="#1e293b" strokeWidth="1" />
                  {/* Player center arrow */}
                  <polygon points="0,-6 4.5,5 0,2.5 -4.5,5" fill="#fbbf24" />
                  {/* AI Rival marker */}
                  <circle cx={radarEnemyX} cy={radarEnemyY} r="4.5" fill="#22d3ee" stroke="#0f172a" strokeWidth="1" />
                </svg>
              </div>
              <div className={`text-center text-[10px] font-bold ${proximityTone}`}>
                {telemetry.tandemProximityLabel}
              </div>
              <div className="pt-1 border-t border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Angle Match</span>
                  <span className="font-mono-tabular font-bold text-white">
                    {telemetry.tandemAngleMatchPct}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-sm overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ${
                      telemetry.tandemAngleMatchPct >= 75
                        ? 'bg-emerald-400'
                        : telemetry.tandemAngleMatchPct >= 45
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                    }`}
                    style={{ width: `${telemetry.tandemAngleMatchPct}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Key Hints + Mobile Touch + SVG Tachometer/Speedometer */}
      <div className="flex items-end justify-between gap-4">
        <div className="hidden lg:block bg-[#0d121c]/88 border border-slate-800 rounded-xl px-3.5 py-2.5 text-[11px] text-slate-300 space-y-1">
          <div>
            <span className="font-mono-tabular text-white font-semibold">W A S D</span> / Panah{' '}
            <span className="text-slate-500 mx-1">·</span>{' '}
            <span className="font-mono-tabular text-amber-400 font-semibold">SPASI</span> E-Brake{' '}
            <span className="text-slate-500 mx-1">·</span>{' '}
            <span className="font-mono-tabular text-emerald-400 font-semibold">E</span> Clutch Kick
          </div>
          <div>
            <span className="font-mono-tabular text-cyan-400 font-semibold">SHIFT</span> Nitro{' '}
            <span className="text-slate-500 mx-1">·</span>{' '}
            <span className="font-mono-tabular text-white font-semibold">Q</span> Assist{' '}
            <span className="text-slate-500 mx-1">·</span>{' '}
            <span className="font-mono-tabular text-white font-semibold">R</span> Reset
          </div>
        </div>

        {/* Touch controls on small screens */}
        <div className="pointer-events-auto flex lg:hidden items-end justify-between w-full gap-2">
          <div className="flex gap-1.5">
            <button
              onPointerDown={() => onTouchChange('left', true)}
              onPointerUp={() => onTouchChange('left', false)}
              onPointerLeave={() => onTouchChange('left', false)}
              className="w-13 h-14 rounded-xl bg-[#0d121c]/90 border border-slate-700 text-white font-bold text-lg active:bg-amber-500 active:text-slate-950"
            >
              ←
            </button>
            <button
              onPointerDown={() => onTouchChange('right', true)}
              onPointerUp={() => onTouchChange('right', false)}
              onPointerLeave={() => onTouchChange('right', false)}
              className="w-13 h-14 rounded-xl bg-[#0d121c]/90 border border-slate-700 text-white font-bold text-lg active:bg-amber-500 active:text-slate-950"
            >
              →
            </button>
          </div>
          <div className="flex gap-1.5">
            <button
              onPointerDown={() => onTouchChange('clutchKick', true)}
              onPointerUp={() => onTouchChange('clutchKick', false)}
              onPointerLeave={() => onTouchChange('clutchKick', false)}
              className="px-2.5 h-14 rounded-xl bg-cyan-500/90 text-slate-950 font-bold text-[11px]"
            >
              KICK
            </button>
            <button
              onPointerDown={() => onTouchChange('handbrake', true)}
              onPointerUp={() => onTouchChange('handbrake', false)}
              onPointerLeave={() => onTouchChange('handbrake', false)}
              className="px-2.5 h-14 rounded-xl bg-amber-500/90 text-slate-950 font-bold text-[11px]"
            >
              E-BRK
            </button>
            <button
              onPointerDown={() => onTouchChange('brake', true)}
              onPointerUp={() => onTouchChange('brake', false)}
              onPointerLeave={() => onTouchChange('brake', false)}
              className="w-13 h-14 rounded-xl bg-rose-500/85 text-white font-bold text-xs"
            >
              REM
            </button>
            <button
              onPointerDown={() => onTouchChange('throttle', true)}
              onPointerUp={() => onTouchChange('throttle', false)}
              onPointerLeave={() => onTouchChange('throttle', false)}
              className="w-15 h-14 rounded-xl bg-emerald-500/90 text-slate-950 font-bold text-xs"
            >
              GAS
            </button>
          </div>
        </div>

        {/* Bottom-Right Custom SVG Speedometer & Tachometer */}
        <div className="hidden sm:flex items-center gap-4 bg-[#0d121c]/92 border border-slate-800 rounded-xl px-4 py-3">
          <div className="space-y-1.5 text-right">
            <div>
              <div className="text-[11px] text-slate-400">
                {telemetry.driftPhase === 'INITIATE'
                  ? 'Initiate Terpicu!'
                  : telemetry.driftPhase === 'BALANCE'
                    ? 'Seimbangkan Slide'
                    : telemetry.driftPhase === 'SLIDE'
                      ? 'Traksi Terlepas'
                      : 'Sudut Drift'}
              </div>
              <div className="font-mono-tabular text-sm font-bold text-amber-400">
                {telemetry.slipAngleDeg}° · {dirLabel}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-slate-400">Bodi </span>
                <span className={`font-mono-tabular font-bold ${telemetry.bodyIntegrity < 60 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {telemetry.bodyIntegrity}%
                </span>
              </div>
              <div>
                <span className="text-slate-400">Ban </span>
                <span className={`font-mono-tabular font-bold ${telemetry.tireHealth < 55 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {telemetry.tireHealth}%
                </span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 mb-0.5">Nitro Boost</div>
              <div className="w-24 h-1.5 bg-slate-800 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-75"
                  style={{ width: `${Math.round(telemetry.nitro * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="relative w-28 h-24 flex items-center justify-center">
            <svg viewBox="0 0 120 100" className="w-full h-full">
              <path
                d="M 16 82 A 48 48 0 1 1 104 82"
                fill="none"
                stroke="#1e293b"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <path
                d="M 16 82 A 48 48 0 1 1 104 82"
                fill="none"
                stroke={rpmRatio > 0.85 ? '#ef4444' : '#f59e0b'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${arcFill} ${arcDash}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
              <div className="font-mono-tabular text-2xl font-bold text-white leading-none">
                {telemetry.speedKmh}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                KM/H · G{telemetry.gear}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pause Modal */}
      {isPaused && (
        <div className="pointer-events-auto fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-4 text-center">
            <h2 className="font-display text-2xl font-bold text-white">Balapan Dijeda</h2>
            <p className="text-xs text-slate-300">
              {track.name} — Skor saat ini {telemetry.bankedScore.toLocaleString('id-ID')}
            </p>
            <div className="space-y-2 pt-2">
              <button
                onClick={onTogglePause}
                className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Lanjutkan Drift
              </button>
              <button
                onClick={onRestart}
                className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Ulangi Sesi
              </button>
              <button
                onClick={onExitToWorkshop}
                className="w-full py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wrench className="w-4 h-4" />
                Kembali ke Workshop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
