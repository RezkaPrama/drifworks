import React from 'react';
import { LogIn, LogOut, ShieldCheck, Volume2, VolumeX, Wrench } from 'lucide-react';
import { User } from 'firebase/auth';
import {
  CAR_CATALOG,
  calculateCarStats,
  getCareerRank,
  TRACKS,
} from '../data/catalog';
import { WorkshopCameraPreset } from '../engine/ThreeViewport';
import { CarBuildConfig, CarId, TrackId, UserProfile } from '../types/game';

interface CarSpecHudProps {
  profile: UserProfile;
  build: CarBuildConfig;
  selectedTrackId: TrackId;
  user: User | null;
  cameraPreset: WorkshopCameraPreset;
  muted: boolean;
  onChangeCameraPreset: (p: WorkshopCameraPreset) => void;
  onToggleMute: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenTracks: () => void;
  onRepairBody: (carId: CarId) => void;
  onReplaceTires: (carId: CarId) => void;
  onToggleAssist: (carId: CarId) => void;
}

export const CarSpecHud: React.FC<CarSpecHudProps> = ({
  profile,
  build,
  selectedTrackId,
  user,
  cameraPreset,
  muted,
  onChangeCameraPreset,
  onToggleMute,
  onSignIn,
  onSignOut,
  onOpenTracks,
  onRepairBody,
  onReplaceTires,
  onToggleAssist,
}) => {
  const car = CAR_CATALOG.find((c) => c.id === profile.activeCarId) ?? CAR_CATALOG[0];
  const stats = calculateCarStats(car, build);
  const rank = getCareerRank(profile.reputation);
  const track = TRACKS.find((t) => t.id === selectedTrackId) ?? TRACKS[0];

  const bodyPct = Math.round(build.bodyIntegrity ?? 100);
  const tirePct = Math.round(build.tireHealth ?? 100);
  const assistOn = build.autoCounterSteer ?? true;

  const camPresets: { id: WorkshopCameraPreset; label: string }[] = [
    { id: 'overview', label: 'Utama' },
    { id: 'action', label: 'Aksi Drift' },
    { id: 'front', label: 'Depan' },
    { id: 'wheels', label: 'Velg' },
    { id: 'rear', label: 'Belakang' },
  ];

  return (
    <div className="pointer-events-none absolute top-16 left-0 right-0 z-20 flex flex-wrap items-start justify-between gap-4 px-6 pt-3">
      {/* Left: Active Car Build, Dyno Spec & Maintenance */}
      <div className="pointer-events-auto bg-[#0d121c]/92 border border-slate-800 rounded-xl p-4 w-full max-w-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-slate-400">
              <span className="text-slate-200 font-medium">{car.carClass}</span>{' '}
              <span aria-hidden="true">·</span> {car.era} <span aria-hidden="true">·</span>{' '}
              <span className="text-amber-400 font-medium">{stats.driftSpecLabel}</span>
            </div>
            <h1 className="font-display text-lg font-bold text-white leading-tight mt-0.5">
              {car.name}
            </h1>
          </div>

          <button
            onClick={onToggleMute}
            title={muted ? 'Aktifkan Audio' : 'Bisukan Audio'}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Dyno numbers */}
        <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-800/80 text-xs">
          <div>
            <div className="text-slate-400">Tenaga</div>
            <div className="font-mono-tabular font-bold text-white text-sm">
              {stats.horsepower} HP
            </div>
          </div>
          <div>
            <div className="text-slate-400">Sudut</div>
            <div className="font-mono-tabular font-bold text-white text-sm">
              {stats.steerAngleDeg}°
            </div>
          </div>
          <div>
            <div className="text-slate-400">Bobot</div>
            <div className="font-mono-tabular font-bold text-white text-sm">
              {stats.weightKg} kg
            </div>
          </div>
          <div>
            <div className="text-slate-400">Drift</div>
            <div className="font-mono-tabular font-bold text-amber-400 text-sm">
              {stats.driftReadiness}%
            </div>
          </div>
        </div>

        {/* Drift Readiness Progress Bar */}
        <div className="space-y-1">
          <div className="h-1.5 w-full bg-slate-800 rounded-sm overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                stats.driftReadiness >= 75
                  ? 'bg-emerald-400'
                  : stats.driftReadiness >= 45
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
              }`}
              style={{ width: `${stats.driftReadiness}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">
            {stats.driftReadiness < 45
              ? 'Setup masih stock grip. Pasang Differential & Ban Drift agar mudah slide.'
              : stats.driftReadiness < 75
                ? 'Siap Street Drift. Tambahkan Angle Kit & Turbo untuk sudut lebih dalam.'
                : 'Konfigurasi Pro Drift siap menaklukkan leaderboard global.'}
          </p>
        </div>

        {/* Body & Tire Maintenance + Counter-Steer Assist */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
          <div className="bg-slate-950/75 border border-slate-800 rounded-lg p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Bumper & Bodi</span>
              <span className={`font-mono-tabular font-bold ${bodyPct < 60 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {bodyPct}%
              </span>
            </div>
            {bodyPct < 100 && (
              <button
                onClick={() => onRepairBody(car.id)}
                className="w-full py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <Wrench className="w-3 h-3" />
                Perbaiki (120 DC)
              </button>
            )}
          </div>

          <div className="bg-slate-950/75 border border-slate-800 rounded-lg p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Kondisi Ban</span>
              <span className={`font-mono-tabular font-bold ${tirePct < 55 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {tirePct}%
              </span>
            </div>
            {tirePct < 100 && (
              <button
                onClick={() => onReplaceTires(car.id)}
                className="w-full py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold cursor-pointer"
              >
                Ganti Ban (150 DC)
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => onToggleAssist(car.id)}
          className={`w-full py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
            assistOn
              ? 'bg-emerald-500/12 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Auto Counter-Steer Assist
          </span>
          <span className="font-mono-tabular">{assistOn ? 'ON' : 'OFF'}</span>
        </button>

        {/* Camera Angle Segmented Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
          {camPresets.map((p) => (
            <button
              key={p.id}
              onClick={() => onChangeCameraPreset(p.id)}
              className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                cameraPreset === p.id
                  ? 'bg-slate-800 text-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Driver Profile, Wallet, Career REP & Active Track */}
      <div className="pointer-events-auto bg-[#0d121c]/92 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 min-w-[280px]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-400">
              {rank.title} <span aria-hidden="true">·</span>{' '}
              <span className="font-mono-tabular text-slate-200">
                {profile.reputation.toLocaleString('id-ID')} REP
              </span>
            </div>
            <div className="text-sm font-semibold text-white truncate max-w-[170px]">
              {profile.displayName}
            </div>
          </div>

          {user ? (
            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </button>
          ) : (
            <button
              onClick={onSignIn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-semibold text-xs whitespace-nowrap cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              Masuk Google
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400">Drift Coins</span>
            <div className="font-mono-tabular font-bold text-amber-400 text-sm">
              {profile.driftCoins.toLocaleString('id-ID')} DC
            </div>
          </div>
          <div>
            <span className="text-slate-400">Apex Credits</span>
            <div className="font-mono-tabular font-bold text-cyan-400 text-sm">
              {profile.apexCredits.toLocaleString('id-ID')} AC
            </div>
          </div>
          <button
            onClick={onOpenTracks}
            className="text-right hover:text-amber-300 transition-colors cursor-pointer"
          >
            <span className="text-slate-400 block">Track Aktif</span>
            <span className="font-semibold text-white underline decoration-slate-600 underline-offset-2">
              {track.name.split(' ').slice(0, 2).join(' ')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
