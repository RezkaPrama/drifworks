import React, { useEffect, useState } from 'react';
import { RefreshCw, Trophy } from 'lucide-react';
import { TRACKS } from '../data/catalog';
import { LeaderboardEntry, TrackId } from '../types/game';

interface LeaderboardPanelProps {
  currentUserId?: string;
  leaderboard: Record<TrackId, LeaderboardEntry[]>;
  loading: boolean;
  initialTrackId: TrackId;
  onFetchTrack: (trackId: TrackId) => void;
  onSignIn: () => void;
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  currentUserId,
  leaderboard,
  loading,
  initialTrackId,
  onFetchTrack,
  onSignIn,
}) => {
  const [tabTrack, setTabTrack] = useState<TrackId>(initialTrackId);

  useEffect(() => {
    onFetchTrack(tabTrack);
  }, [tabTrack, onFetchTrack]);

  const entries = leaderboard[tabTrack] || [];

  return (
    <div className="absolute inset-0 top-[57px] z-25 bg-[#0b0f17]/94 overflow-y-auto custom-scroll p-6">
      <div className="max-w-5xl mx-auto space-y-6 pb-10">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="space-y-1">
            <div className="text-xs text-amber-400 font-medium">
              Kompetisi Daring Global
            </div>
            <h2 className="font-display text-3xl font-bold text-white">
              Papan Peringkat Drift Dunia
            </h2>
            <p className="text-sm text-slate-300">
              Skor terbaik Anda diunggah otomatis ke cloud saat masuk dengan akun Google.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!currentUserId && (
              <button
                onClick={onSignIn}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-semibold text-xs cursor-pointer"
              >
                Masuk Google untuk Catat Skor
              </button>
            )}
            <button
              onClick={() => onFetchTrack(tabTrack)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </button>
          </div>
        </div>

        {/* Track Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          {TRACKS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTabTrack(t.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                tabTrack === t.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
          {loading && entries.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">
              Memuat peringkat global dari server...
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-200">
                Belum Ada Catatan Skor di Lintasan Ini
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Jadilah drifter pertama yang mencetak rekor global di {TRACKS.find((t) => t.id === tabTrack)?.name}!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-xs text-slate-400">
                  <tr>
                    <th className="py-3 px-4 font-medium">Peringkat</th>
                    <th className="py-3 px-4 font-medium">Drifter</th>
                    <th className="py-3 px-4 font-medium">Mobil & Setup</th>
                    <th className="py-3 px-4 font-medium text-right">Tenaga</th>
                    <th className="py-3 px-4 font-medium text-right">Max Combo</th>
                    <th className="py-3 px-4 font-medium text-right">Skor Drift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {entries.map((entry, idx) => {
                    const isMe = currentUserId && entry.userId === currentUserId;
                    return (
                      <tr
                        key={entry.userId}
                        className={isMe ? 'bg-amber-500/10' : 'hover:bg-slate-800/40'}
                      >
                        <td className="py-3 px-4 font-mono-tabular font-bold text-slate-200">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {entry.driverName}
                          {isMe && (
                            <span className="ml-2 text-xs text-amber-400 font-normal">
                              (Anda)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-300">
                          <span className="font-medium text-white">{entry.carName}</span>
                          <span className="text-slate-500 mx-1.5" aria-hidden="true">·</span>
                          <span>{entry.carSpec}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono-tabular text-slate-300">
                          {entry.horsepower} HP
                        </td>
                        <td className="py-3 px-4 text-right font-mono-tabular text-cyan-400">
                          {entry.maxCombo.toFixed(1)}x
                        </td>
                        <td className="py-3 px-4 text-right font-mono-tabular font-bold text-amber-400">
                          {entry.score.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
