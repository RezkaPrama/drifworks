import React from 'react';
import { Lock, Play, Star, Swords } from 'lucide-react';
import { getCareerRank, TRACKS } from '../data/catalog';
import { TEMP_DEV_UNLOCK_ALL_TRACKS } from '../hooks/useGameStore';
import { GameModeType, TrackId, UserProfile } from '../types/game';

interface TrackCareerPanelProps {
  profile: UserProfile;
  selectedTrackId: TrackId;
  onSelectTrack: (trackId: TrackId) => void;
  onStartTrack: (trackId: TrackId, mode?: GameModeType) => void;
  onClose: () => void;
}

export const TrackCareerPanel: React.FC<TrackCareerPanelProps> = ({
  profile,
  selectedTrackId,
  onSelectTrack,
  onStartTrack,
  onClose,
}) => {
  const rank = getCareerRank(profile.reputation);
  const progressPct = rank.nextRep
    ? Math.min(100, Math.round((profile.reputation / rank.nextRep) * 100))
    : 100;

  return (
    <div className="absolute inset-0 top-[57px] z-25 bg-[#0b0f17]/94 overflow-y-auto custom-scroll p-6">
      <div className="max-w-6xl mx-auto space-y-6 pb-10">
        {/* Career Progression Header */}
        <div className="flex flex-wrap items-end justify-between gap-6 pb-5 border-b border-slate-800">
          <div className="space-y-1">
            <div className="text-xs text-amber-400 font-medium">
              Mode Karier & Lintasan Aspal Drift
            </div>
            <h2 className="font-display text-3xl font-bold text-white">
              {rank.title}
            </h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Kumpulkan Reputasi (REP) dari sesi Solo Drift maupun Tandem Battle 1v1 melawan AI untuk membuka lintasan kelas Pro.
            </p>
          </div>

          <div className="w-full sm:w-80 space-y-2 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Reputasi Karier</span>
              <span className="font-mono-tabular font-bold text-white">
                {profile.reputation.toLocaleString('id-ID')}
                {rank.nextRep ? ` / ${rank.nextRep.toLocaleString('id-ID')} REP` : ' REP (Maks)'}
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-sm overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Target berikutnya</span>
              <span>{rank.nextRep ? `${(rank.nextRep - profile.reputation).toLocaleString('id-ID')} REP lagi` : 'Semua Rank Terbuka'}</span>
            </div>
          </div>
        </div>

        {/* Track Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TRACKS.map((track) => {
            const unlocked = TEMP_DEV_UNLOCK_ALL_TRACKS || profile.reputation >= track.requiredRep;
            const isSelected = selectedTrackId === track.id;

            return (
              <div
                key={track.id}
                onClick={() => unlocked && onSelectTrack(track.id)}
                className={`group rounded-xl overflow-hidden border transition-colors ${
                  isSelected && unlocked
                    ? 'bg-slate-900 border-amber-500'
                    : unlocked
                      ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 cursor-pointer'
                      : 'bg-slate-900/45 border-slate-800/70'
                }`}
              >
                <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-950 overflow-hidden">
                  <img
                    src={track.imageUrl}
                    alt={`${track.name} — ${track.location}`}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      unlocked ? 'group-hover:scale-105' : 'grayscale opacity-45'
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />

                  {!unlocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950/55">
                      <Lock className="w-7 h-7 text-amber-400 mb-2" />
                      <div className="text-sm font-bold text-white">
                        Butuh {track.requiredRep.toLocaleString('id-ID')} REP
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">
                        Kurang {(track.requiredRep - profile.reputation).toLocaleString('id-ID')} REP lagi untuk membuka
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-300">
                        {track.difficulty} <span aria-hidden="true">·</span> {track.location} <span aria-hidden="true">·</span> {track.durationSec}d
                      </div>
                      <h3 className="font-display text-xl font-bold text-white">
                        {track.name}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {track.description}
                  </p>

                  {/* Star Targets */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    {[0, 1, 2].map((idx) => (
                      <div key={idx} className="bg-slate-950/70 rounded-lg p-2 border border-slate-800/80">
                        <div className="flex items-center gap-1 text-amber-400 font-semibold">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{idx + 1} Bintang</span>
                        </div>
                        <div className="font-mono-tabular text-white font-bold mt-0.5">
                          {track.starTargets[idx].toLocaleString('id-ID')}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          +{track.repRewards[idx]} REP
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                      }}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Kembali
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={!unlocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartTrack(track.id, 'tandem');
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          unlocked
                            ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Swords className="w-3.5 h-3.5" />
                        {unlocked ? 'Tandem 1v1 AI' : 'Terkunci'}
                      </button>

                      <button
                        disabled={!unlocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartTrack(track.id, 'solo');
                        }}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          unlocked
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {unlocked ? 'Solo Drift' : 'Terkunci'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
