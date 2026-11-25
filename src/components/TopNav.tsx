import React from 'react';
import { Play, Swords, User } from 'lucide-react';
import { GameModeType } from '../types/game';

export type ActiveTab = 'workshop' | 'tracks' | 'leaderboard' | 'shop';

interface TopNavProps {
  activeTab: ActiveTab;
  gameMode: GameModeType;
  onSelectTab: (tab: ActiveTab) => void;
  onChangeGameMode: (mode: GameModeType) => void;
  onStartRace: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  gameMode,
  onSelectTab,
  onChangeGameMode,
  onStartRace,
}) => {
  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'workshop', label: 'Workshop' },
    { id: 'tracks', label: 'Lintasan & Karier' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'shop', label: 'Pro Shop' },
  ];

  return (
    <header className="relative z-30 flex items-center justify-between gap-4 px-5 py-3 bg-[#0b0f17]/95 border-b border-slate-800/90">
      <button
        onClick={() => onSelectTab('workshop')}
        className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-amber-400 transition-colors cursor-pointer"
      >
        Apex DriftWorks
      </button>

      <nav className="flex items-center gap-5 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive
                  ? 'text-amber-400'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute left-0 right-0 -bottom-3 h-0.5 bg-amber-400" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-2.5 shrink-0">
        <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => onChangeGameMode('solo')}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              gameMode === 'solo'
                ? 'bg-slate-800 text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Solo
          </button>
          <button
            onClick={() => onChangeGameMode('tandem')}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              gameMode === 'tandem'
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            Tandem AI
          </button>
        </div>

        <button
          onClick={onStartRace}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm whitespace-nowrap shrink-0 transition-colors cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          {gameMode === 'tandem' ? 'Tandem 1v1' : 'Mulai Drift'}
        </button>
      </div>
    </header>
  );
};
