import { useCallback, useState } from 'react';
import { CarSpecHud } from './components/CarSpecHud';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { ProShopPanel } from './components/ProShopPanel';
import { RaceHud } from './components/RaceHud';
import { RunResultModal } from './components/RunResultModal';
import { ActiveTab, TopNav } from './components/TopNav';
import { TrackCareerPanel } from './components/TrackCareerPanel';
import { WorkshopDock } from './components/WorkshopDock';
import { createDefaultBuild, TRACKS } from './data/catalog';
import { driftAudio } from './engine/audioEngine';
import {
  RaceCameraMode,
  ThreeViewport,
  WorkshopCameraPreset,
} from './engine/ThreeViewport';
import { useGameStore } from './hooks/useGameStore';
import { GameModeType, RunResult, TandemSummary, TelemetryState, TrackId } from './types/game';

const INITIAL_TELEMETRY: TelemetryState = {
  speedKmh: 0,
  rpm: 1200,
  maxRpm: 7800,
  gear: 1,
  slipAngleDeg: 0,
  signedSlipDeg: 0,
  driftDirection: 'STRAIGHT',
  isDrifting: false,
  rearTraction: 1.0,
  steerLevel: 0,
  throttleLevel: 0,
  brakeLevel: 0,
  driftPhase: 'GRIP',
  bankedScore: 0,
  liveDriftScore: 0,
  comboMultiplier: 1.0,
  comboGraceRatio: 0,
  straightenRisk: 0,
  oversteerRisk: 0,
  transitionProgress: 0,
  driftCallout: null,
  maxCombo: 1.0,
  zoneHits: 0,
  activeZoneText: null,
  penaltyBanner: null,
  timeRemaining: 95,
  nitro: 1.0,
  carX: 0,
  carZ: -110,
  carHeading: 0,
  bodyIntegrity: 100,
  tireHealth: 100,
  autoCounterSteer: true,
  gameMode: 'solo',
  tandemRound: 1,
  tandemRole: 'lead',
  tandemLeadScore: 0,
  tandemChaseScore: 0,
  tandemAiScore: 0,
  tandemDistanceM: 0,
  tandemProximityLabel: 'STANDBY',
  tandemAngleMatchPct: 0,
  tandemAiAngleDeg: 0,
  tandemRadarDx: 0,
  tandemRadarDz: 0,
  gamepadConnected: false,
  gamepadName: null,
};

function GameApp() {
  const store = useGameStore();
  const [mode, setMode] = useState<'workshop' | 'race'>('workshop');
  const [gameMode, setGameMode] = useState<GameModeType>('solo');
  const [activeTab, setActiveTab] = useState<ActiveTab>('workshop');
  const [selectedTrackId, setSelectedTrackId] = useState<TrackId>('harbor_toybox');
  const [workshopPreset, setWorkshopPreset] = useState<WorkshopCameraPreset>('overview');
  const [raceCameraMode, setRaceCameraMode] = useState<RaceCameraMode>('drift');
  const [isPaused, setIsPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryState>(INITIAL_TELEMETRY);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [raceSessionKey, setRaceSessionKey] = useState(0);

  const [touchControls, setTouchControls] = useState({
    throttle: false,
    brake: false,
    left: false,
    right: false,
    handbrake: false,
    clutchKick: false,
    boost: false,
  });

  const activeBuild =
    store.builds[store.profile.activeCarId] ??
    createDefaultBuild(store.profile.activeCarId);
  const activeTrack = TRACKS.find((t) => t.id === selectedTrackId) ?? TRACKS[0];

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      driftAudio.setMuted(next);
      return next;
    });
  }, []);

  const handleStartRace = useCallback(
    (trackOverride?: TrackId, modeOverride?: GameModeType) => {
      const targetTrack = trackOverride ?? selectedTrackId;
      const targetMode = modeOverride ?? gameMode;
      setSelectedTrackId(targetTrack);
      setGameMode(targetMode);
      setRunResult(null);
      setIsPaused(false);
      setMode('race');
      setActiveTab('workshop');
      setRaceSessionKey((k) => k + 1);
    },
    [gameMode, selectedTrackId],
  );

  const handleRaceFinish = useCallback(
    async (summary: {
      totalScore: number;
      maxCombo: number;
      zoneHits: number;
      bodyIntegrityEnd: number;
      tireHealthEnd: number;
      tandemResult?: TandemSummary;
    }) => {
      const res = await store.recordRunCompletion(selectedTrackId, {
        gameMode,
        ...summary,
      });
      setRunResult(res);
    },
    [gameMode, selectedTrackId, store],
  );

  const handleCycleCamera = useCallback(() => {
    const order: RaceCameraMode[] = ['drift', 'chase', 'hood', 'cinematic'];
    setRaceCameraMode((prev) => order[(order.indexOf(prev) + 1) % order.length]);
  }, []);

  const handleTouchChange = useCallback(
    (
      key: 'throttle' | 'brake' | 'left' | 'right' | 'handbrake' | 'clutchKick' | 'boost',
      active: boolean,
    ) => {
      setTouchControls((prev) => ({ ...prev, [key]: active }));
    },
    [],
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0b0f17]">
      {/* Persistent 3D WebGL Canvas */}
      <ThreeViewport
        mode={mode}
        gameMode={gameMode}
        carId={store.profile.activeCarId}
        build={activeBuild}
        trackId={selectedTrackId}
        sessionKey={raceSessionKey}
        workshopPreset={workshopPreset}
        raceCameraMode={raceCameraMode}
        isPaused={isPaused || Boolean(runResult)}
        touchControls={touchControls}
        onTelemetry={setTelemetry}
        onRaceFinish={handleRaceFinish}
        onToggleCamera={handleCycleCamera}
        onTogglePause={() => setIsPaused((p) => !p)}
        onToggleAssist={() => store.toggleAutoCounterSteer(store.profile.activeCarId)}
      />

      {/* Workshop & Hub Overlays */}
      {mode === 'workshop' && (
        <>
          <div className="absolute top-0 left-0 right-0 z-30">
            <TopNav
              activeTab={activeTab}
              gameMode={gameMode}
              onSelectTab={setActiveTab}
              onChangeGameMode={setGameMode}
              onStartRace={() => handleStartRace()}
            />
          </div>

          {activeTab === 'workshop' && (
            <>
              <CarSpecHud
                profile={store.profile}
                build={activeBuild}
                selectedTrackId={selectedTrackId}
                user={store.user}
                cameraPreset={workshopPreset}
                muted={muted}
                onChangeCameraPreset={setWorkshopPreset}
                onToggleMute={handleToggleMute}
                onSignIn={store.signInGoogle}
                onSignOut={store.signOutUser}
                onOpenTracks={() => setActiveTab('tracks')}
                onRepairBody={store.repairBody}
                onReplaceTires={store.replaceTires}
                onToggleAssist={store.toggleAutoCounterSteer}
              />
              <WorkshopDock
                profile={store.profile}
                builds={store.builds}
                onSelectCar={store.selectCar}
                onBuyCar={store.buyCar}
                onUpgradePart={store.upgradeMechanicalPart}
                onApplyVisual={store.applyVisualPart}
                onUpdateTuning={store.updateTuning}
                onOpenShop={() => setActiveTab('shop')}
              />
            </>
          )}

          {activeTab === 'tracks' && (
            <TrackCareerPanel
              profile={store.profile}
              selectedTrackId={selectedTrackId}
              onSelectTrack={setSelectedTrackId}
              onStartTrack={(id, m) => handleStartRace(id, m)}
              onClose={() => setActiveTab('workshop')}
            />
          )}

          {activeTab === 'leaderboard' && (
            <LeaderboardPanel
              currentUserId={store.user?.uid}
              leaderboard={store.leaderboard}
              loading={store.loadingLeaderboard}
              initialTrackId={selectedTrackId}
              onFetchTrack={store.fetchLeaderboard}
              onSignIn={store.signInGoogle}
            />
          )}

          {activeTab === 'shop' && (
            <ProShopPanel
              profile={store.profile}
              purchases={store.purchases}
              isSignedIn={Boolean(store.user)}
              onPurchase={store.completeStorePurchase}
              onSignIn={store.signInGoogle}
            />
          )}
        </>
      )}

      {/* Race Mode HUD */}
      {mode === 'race' && (
        <RaceHud
          track={activeTrack}
          telemetry={telemetry}
          cameraMode={raceCameraMode}
          isPaused={isPaused}
          muted={muted}
          onTogglePause={() => setIsPaused((p) => !p)}
          onExitToWorkshop={() => {
            driftAudio.stopDriving();
            setMode('workshop');
            setIsPaused(false);
          }}
          onCycleCamera={handleCycleCamera}
          onToggleMute={handleToggleMute}
          onToggleAssist={() => store.toggleAutoCounterSteer(store.profile.activeCarId)}
          onRestart={() => handleStartRace(selectedTrackId, gameMode)}
          onTouchChange={handleTouchChange}
        />
      )}

      {/* Post-Run Summary Modal */}
      {runResult && (
        <RunResultModal
          result={runResult}
          isSignedIn={Boolean(store.user)}
          onRetry={() => handleStartRace(selectedTrackId, gameMode)}
          onViewLeaderboard={() => {
            setRunResult(null);
            setMode('workshop');
            setActiveTab('leaderboard');
          }}
          onBackToWorkshop={() => {
            setRunResult(null);
            setMode('workshop');
            setActiveTab('workshop');
          }}
          onSignIn={store.signInGoogle}
        />
      )}

      {/* Notification Toast */}
      {store.toast && (
        <div
          className={`fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg border text-xs font-semibold shadow-lg ${
            store.toast.tone === 'warn'
              ? 'bg-rose-950/95 border-rose-500/60 text-rose-200'
              : 'bg-slate-900/95 border-amber-500/60 text-amber-200'
          }`}
        >
          {store.toast.text}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GameApp />
    </ErrorBoundary>
  );
}
