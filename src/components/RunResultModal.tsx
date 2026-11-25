import React from 'react';
import { RotateCcw, Star, Swords, Trophy, Wrench } from 'lucide-react';
import { TRACKS } from '../data/catalog';
import { RunResult } from '../types/game';

interface RunResultModalProps {
  result: RunResult;
  isSignedIn: boolean;
  onRetry: () => void;
  onViewLeaderboard: () => void;
  onBackToWorkshop: () => void;
  onSignIn: () => void;
}

export const RunResultModal: React.FC<RunResultModalProps> = ({
  result,
  isSignedIn,
  onRetry,
  onViewLeaderboard,
  onBackToWorkshop,
  onSignIn,
}) => {
  const track = TRACKS.find((t) => t.id === result.trackId) ?? TRACKS[0];
  const tandem = result.tandemResult;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-4">
        <div className="text-center space-y-1.5">
          <div className="text-xs text-amber-400 font-medium inline-flex items-center gap-1.5">
            {tandem && <Swords className="w-3.5 h-3.5 text-cyan-400" />}
            {tandem ? 'Penilaian Juri Tandem Battle' : 'Sesi Drift Selesai'} · {track.name}
          </div>

          {tandem ? (
            <h2
              className={`font-display text-3xl font-bold ${
                tandem.won ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {tandem.won ? 'MENANG TANDEM!' : 'KALAH TANDEM'}
            </h2>
          ) : (
            <h2 className="font-display text-3xl font-bold text-white font-mono-tabular">
              {result.totalScore.toLocaleString('id-ID')} Poin
            </h2>
          )}

          {/* Stars */}
          <div className="flex items-center justify-center gap-2 pt-1">
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                className={`w-6 h-6 ${
                  s <= result.stars
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Tandem Judge Score Comparison */}
        {tandem && (
          <div className="bg-slate-950/90 border border-cyan-500/35 rounded-lg p-3 space-y-2 text-xs">
            <div className="grid grid-cols-3 text-slate-400 font-medium border-b border-slate-800 pb-1.5">
              <span>Ronde</span>
              <span className="text-right text-amber-400">Anda</span>
              <span className="text-right text-cyan-400">AI Rival</span>
            </div>
            <div className="grid grid-cols-3 items-center">
              <span className="text-slate-300">Ronde 1 (Lead)</span>
              <span className="text-right font-mono-tabular font-bold text-white">
                {tandem.playerLead.toLocaleString('id-ID')}
              </span>
              <span className="text-right font-mono-tabular text-slate-300">
                {tandem.aiChase.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="grid grid-cols-3 items-center">
              <span className="text-slate-300">Ronde 2 (Chase)</span>
              <span className="text-right font-mono-tabular font-bold text-white">
                {tandem.playerChase.toLocaleString('id-ID')}
              </span>
              <span className="text-right font-mono-tabular text-slate-300">
                {tandem.aiLead.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="grid grid-cols-3 items-center pt-1.5 border-t border-slate-800 font-bold">
              <span className="text-white">Total Juri</span>
              <span className="text-right font-mono-tabular text-amber-400">
                {(tandem.playerLead + tandem.playerChase).toLocaleString('id-ID')}
              </span>
              <span className="text-right font-mono-tabular text-cyan-400">
                {(tandem.aiLead + tandem.aiChase).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        )}

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
            <div className="text-slate-400">Max Combo & Clip</div>
            <div className="font-mono-tabular text-base font-bold text-cyan-400 mt-0.5">
              {result.maxCombo.toFixed(1)}x · {result.zoneHits} Clip
            </div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
            <div className="text-slate-400">Kondisi Bumper / Ban</div>
            <div className="font-mono-tabular text-base font-bold text-white mt-0.5">
              {result.bodyIntegrityEnd}% / {result.tireHealthEnd}%
            </div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
            <div className="text-slate-400">Hadiah Drift Coins</div>
            <div className="font-mono-tabular text-lg font-bold text-amber-400 mt-0.5">
              +{result.coinsEarned.toLocaleString('id-ID')} DC
            </div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
            <div className="text-slate-400">Reputasi Karier</div>
            <div className="font-mono-tabular text-lg font-bold text-emerald-400 mt-0.5">
              +{result.repEarned.toLocaleString('id-ID')} REP
            </div>
          </div>
        </div>

        {/* Newly Unlocked Track Callout */}
        {result.newlyUnlockedTracks.length > 0 && (
          <div className="bg-emerald-500/12 border border-emerald-500/40 rounded-lg p-3 text-xs text-emerald-200">
            <span className="font-bold text-emerald-300">Lintasan Baru Terbuka: </span>
            {result.newlyUnlockedTracks
              .map((id) => TRACKS.find((t) => t.id === id)?.name)
              .filter(Boolean)
              .join(', ')}
          </div>
        )}

        {!isSignedIn && (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-300">
              Masuk dengan Google agar rekor Anda tercatat di Leaderboard Global.
            </span>
            <button
              onClick={onSignIn}
              className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-white text-slate-950 font-semibold whitespace-nowrap cursor-pointer"
            >
              Masuk
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <button
            onClick={onRetry}
            className="py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Ulangi Track
          </button>
          <button
            onClick={onViewLeaderboard}
            className="py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Leaderboard
          </button>
          <button
            onClick={onBackToWorkshop}
            className="py-2.5 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" />
            Workshop
          </button>
        </div>
      </div>
    </div>
  );
};
