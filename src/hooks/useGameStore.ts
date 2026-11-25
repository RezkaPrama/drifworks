import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  CAR_CATALOG,
  calculateCarStats,
  createDefaultBuild,
  TRACKS,
  UPGRADE_PART_TIERS,
} from '../data/catalog';
import { driftAudio } from '../engine/audioEngine';
import { startMidtransCheckout } from '../payments/midtrans';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  CarBuildConfig,
  CarId,
  GameModeType,
  LeaderboardEntry,
  PaymentMethod,
  RunResult,
  StorePackage,
  StorePurchase,
  TandemSummary,
  TrackId,
  UserProfile,
} from '../types/game';

const LOCAL_PROFILE_KEY = 'apex_driftworks_profile_v1';
const LOCAL_BUILDS_KEY = 'apex_driftworks_builds_v1';
const LOCAL_PURCHASES_KEY = 'apex_driftworks_purchases_v1';

const LEGACY_CAR_MAP: Record<string, CarId> = {
  kitsune_s13: 'silvia_s15',
  bento_kei: 'carry_futura',
  vipera_rx7: 'rx7_fc3s',
  titan_gt: 'mustang_v8',
  solstice_pro: 'supra_a90',
};

const VALID_CAR_IDS = new Set<CarId>(CAR_CATALOG.map((c) => c.id));

function normalizeCarId(rawId: string | undefined): CarId {
  if (!rawId) return 'carry_futura';
  if (VALID_CAR_IDS.has(rawId as CarId)) return rawId as CarId;
  return LEGACY_CAR_MAP[rawId] ?? 'carry_futura';
}

const DEFAULT_STARTER_DRIFT_COINS = 2500;
// TODO(publish): Ubah ke null sebelum publish untuk mengembalikan Drift Coins default (2.500 DC)
const TEMP_DEV_FULL_COINS: number | null = null;
// TODO(publish): Ubah ke false sebelum publish untuk mengembalikan sistem kunci track berdasarkan REP
export const TEMP_DEV_UNLOCK_ALL_TRACKS = false;

function normalizeProfile(raw: UserProfile): UserProfile {
  const mappedOwned = Array.from(
    new Set((raw.ownedCars || []).map((id) => normalizeCarId(id))),
  );
  if (mappedOwned.length === 0) mappedOwned.push('carry_futura');
  const active = normalizeCarId(raw.activeCarId);
  if (!mappedOwned.includes(active)) mappedOwned.push(active);
  // Reset the leftover dev-test balance (9,999,999 DC) back to the starter amount
  const driftCoins =
    TEMP_DEV_FULL_COINS !== null && raw.driftCoins < 5000000
      ? TEMP_DEV_FULL_COINS
      : raw.driftCoins >= 5000000
        ? DEFAULT_STARTER_DRIFT_COINS
        : raw.driftCoins;
  return {
    ...raw,
    driftCoins,
    activeCarId: active,
    ownedCars: mappedOwned,
  };
}

const LEGACY_ROOKIE_PAINT: Partial<Record<CarId, { oldHex: string; newHex: string }>> = {
  carry_futura: { oldHex: '#f59e0b', newHex: '#254b8c' },
  kijang_super: { oldHex: '#10b981', newHex: '#2b4c7e' },
  corolla_dx: { oldHex: '#ef4444', newHex: '#1d63dc' },
  bmw_e36: { oldHex: '#2563eb', newHex: '#1e3d6b' },
};

function normalizeBuild(id: CarId, raw: Partial<CarBuildConfig>): CarBuildConfig {
  const def = createDefaultBuild(id);
  const merged: CarBuildConfig = {
    ...def,
    ...raw,
    carId: id,
    steerSensitivity: raw.steerSensitivity ?? def.steerSensitivity,
    bodyIntegrity: raw.bodyIntegrity ?? 100,
    tireHealth: raw.tireHealth ?? 100,
    autoCounterSteer: raw.autoCounterSteer ?? true,
  };

  const legacyPaint = LEGACY_ROOKIE_PAINT[id];
  const hasCustomPaintUnlocked = (merged.unlockedParts || []).some((p) => p.startsWith('paint_'));
  if (legacyPaint && !hasCustomPaintUnlocked && merged.paintHex === legacyPaint.oldHex) {
    merged.paintHex = legacyPaint.newHex;
  }
  if (id === 'bmw_e36' && merged.rimStyle === 'steel' && !merged.unlockedParts.includes('rim_mesh')) {
    merged.rimStyle = 'mesh';
    merged.unlockedParts = Array.from(new Set([...merged.unlockedParts, 'rim_mesh']));
  }
  if (id === 'kijang_kapsul' && merged.rimStyle === 'steel' && !merged.unlockedParts.includes('rim_spoke5')) {
    merged.rimStyle = 'spoke5';
    merged.unlockedParts = Array.from(new Set([...merged.unlockedParts, 'rim_spoke5']));
  }
  return merged;
}

function createAllDefaultBuilds(): Record<CarId, CarBuildConfig> {
  const result = {} as Record<CarId, CarBuildConfig>;
  for (const car of CAR_CATALOG) {
    result[car.id] = createDefaultBuild(car.id);
  }
  return result;
}

function createInitialGuestProfile(): UserProfile {
  return {
    uid: 'guest_driver',
    displayName: 'Tamu Drifter',
    driftCoins: TEMP_DEV_FULL_COINS ?? DEFAULT_STARTER_DRIFT_COINS,
    apexCredits: 60,
    reputation: 0,
    activeCarId: 'carry_futura',
    ownedCars: ['carry_futura'],
  };
}

function loadLocalProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (raw) return normalizeProfile(JSON.parse(raw) as UserProfile);
  } catch {
    // ignore
  }
  return createInitialGuestProfile();
}

function loadLocalBuilds(): Record<CarId, CarBuildConfig> {
  const defaults = createAllDefaultBuilds();
  try {
    const raw = localStorage.getItem(LOCAL_BUILDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, CarBuildConfig>;
      for (const [rawKey, b] of Object.entries(parsed)) {
        const id = normalizeCarId(rawKey);
        defaults[id] = normalizeBuild(id, b);
      }
    }
  } catch {
    // ignore
  }
  return defaults;
}

function loadLocalPurchases(): StorePurchase[] {
  try {
    const raw = localStorage.getItem(LOCAL_PURCHASES_KEY);
    if (raw) return JSON.parse(raw) as StorePurchase[];
  } catch {
    // ignore
  }
  return [];
}

export function useGameStore() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(loadLocalProfile);
  const [builds, setBuilds] = useState<Record<CarId, CarBuildConfig>>(loadLocalBuilds);
  const [purchases, setPurchases] = useState<StorePurchase[]>(loadLocalPurchases);
  const [leaderboard, setLeaderboard] = useState<Record<TrackId, LeaderboardEntry[]>>({
    harbor_toybox: [],
    sunset_canyon: [],
    sakura_touge: [],
    neon_docks: [],
    practice_yard: [],
  });
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'warn' } | null>(null);

  const showToast = useCallback((text: string, tone: 'ok' | 'warn' = 'ok') => {
    setToast({ text, tone });
    window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 3400);
  }, []);

  // Persist guest state locally
  useEffect(() => {
    if (!user) {
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
      localStorage.setItem(LOCAL_BUILDS_KEY, JSON.stringify(builds));
      localStorage.setItem(LOCAL_PURCHASES_KEY, JSON.stringify(purchases));
    }
  }, [user, profile, builds, purchases]);

  // Listen to Firebase Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      setAuthReady(true);

      if (!fbUser) {
        setProfile(loadLocalProfile());
        setBuilds(loadLocalBuilds());
        setPurchases(loadLocalPurchases());
        return;
      }

      // Load or bootstrap cloud user profile & builds
      const userPath = `users/${fbUser.uid}`;
      try {
        const userRef = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const initialName = (fbUser.displayName || 'Drifter').slice(0, 50);
          const freshProfile: UserProfile = {
            uid: fbUser.uid,
            displayName: initialName,
            driftCoins: TEMP_DEV_FULL_COINS ?? DEFAULT_STARTER_DRIFT_COINS,
            apexCredits: 80,
            reputation: 0,
            activeCarId: 'carry_futura',
            ownedCars: ['carry_futura'],
          };
          await setDoc(userRef, {
            ...freshProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          const starterBuild = createDefaultBuild('carry_futura');
          await setDoc(doc(db, 'users', fbUser.uid, 'builds', 'carry_futura'), {
            ownerId: fbUser.uid,
            ...starterBuild,
            updatedAt: serverTimestamp(),
          });
          setProfile(freshProfile);
          setBuilds((prev) => ({ ...prev, carry_futura: starterBuild }));
        } else {
          const rawData = snap.data() as UserProfile;
          const data = normalizeProfile(rawData);
          if (TEMP_DEV_FULL_COINS !== null && rawData.driftCoins < 5000000) {
            await updateDoc(userRef, {
              driftCoins: TEMP_DEV_FULL_COINS,
              updatedAt: serverTimestamp(),
            });
          }
          setProfile(data);

          const buildsSnap = await getDocs(collection(db, 'users', fbUser.uid, 'builds'));
          const nextBuilds = createAllDefaultBuilds();
          buildsSnap.forEach((bDoc) => {
            const bData = bDoc.data() as CarBuildConfig & { ownerId?: string };
            const normId = normalizeCarId(bData.carId);
            nextBuilds[normId] = normalizeBuild(normId, bData);
          });
          setBuilds(nextBuilds);

          const purSnap = await getDocs(
            query(
              collection(db, 'users', fbUser.uid, 'purchases'),
              orderBy('createdAt', 'desc'),
              limit(20),
            ),
          );
          const list: StorePurchase[] = [];
          purSnap.forEach((pDoc) => {
            list.push({ id: pDoc.id, ...(pDoc.data() as Omit<StorePurchase, 'id'>) });
          });
          setPurchases(list);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, userPath);
      }
    });
    return () => unsub();
  }, []);

  const signInGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Berhasil masuk ke Garasi Cloud & Leaderboard Global');
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        showToast('Login Google dibatalkan. Anda tetap bisa bermain sebagai tamu.', 'warn');
        return;
      }
      if (code === 'auth/popup-blocked') {
        showToast('Popup diblokir browser. Izinkan popup untuk login Google.', 'warn');
        return;
      }
      showToast('Login Google tidak dapat dilanjutkan saat ini.', 'warn');
    }
  }, [showToast]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    showToast('Keluar dari akun cloud.');
  }, [showToast]);

  const syncProfileUpdate = useCallback(
    async (next: UserProfile) => {
      setProfile(next);
      if (!user) return;
      const path = `users/${user.uid}`;
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          displayName: next.displayName,
          driftCoins: next.driftCoins,
          apexCredits: next.apexCredits,
          reputation: next.reputation,
          activeCarId: next.activeCarId,
          ownedCars: next.ownedCars,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user],
  );

  const syncBuildUpdate = useCallback(
    async (carId: CarId, nextBuild: CarBuildConfig) => {
      setBuilds((prev) => ({ ...prev, [carId]: nextBuild }));
      if (!user) return;
      const path = `users/${user.uid}/builds/${carId}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'builds', carId), {
          ownerId: user.uid,
          ...nextBuild,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    },
    [user],
  );

  const selectCar = useCallback(
    (carId: CarId) => {
      if (!profile.ownedCars.includes(carId)) return;
      driftAudio.playChime('click');
      void syncProfileUpdate({ ...profile, activeCarId: carId });
    },
    [profile, syncProfileUpdate],
  );

  const buyCar = useCallback(
    async (carId: CarId, currency: 'coins' | 'credits') => {
      const item = CAR_CATALOG.find((c) => c.id === carId);
      if (!item || profile.ownedCars.includes(carId)) return;

      if (currency === 'coins') {
        if (profile.driftCoins < item.coinPrice) {
          showToast('Drift Coins tidak cukup. Drift lagi atau gunakan Apex Credits!', 'warn');
          return;
        }
        const nextProfile: UserProfile = {
          ...profile,
          driftCoins: profile.driftCoins - item.coinPrice,
          ownedCars: [...profile.ownedCars, carId],
          activeCarId: carId,
        };
        const freshBuild = createDefaultBuild(carId);
        await syncProfileUpdate(nextProfile);
        await syncBuildUpdate(carId, freshBuild);
        driftAudio.playChime('unlock');
        showToast(`${item.name} dibeli dan masuk ke garasi!`);
      } else {
        if (profile.apexCredits < item.creditPrice) {
          showToast('Apex Credits tidak cukup. Kunjungi Pro Shop!', 'warn');
          return;
        }
        const nextProfile: UserProfile = {
          ...profile,
          apexCredits: profile.apexCredits - item.creditPrice,
          ownedCars: [...profile.ownedCars, carId],
          activeCarId: carId,
        };
        const freshBuild = createDefaultBuild(carId);
        await syncProfileUpdate(nextProfile);
        await syncBuildUpdate(carId, freshBuild);
        driftAudio.playChime('unlock');
        showToast(`${item.name} dibuka menggunakan Apex Credits!`);
      }
    },
    [profile, showToast, syncBuildUpdate, syncProfileUpdate],
  );

  const upgradeMechanicalPart = useCallback(
    async (
      carId: CarId,
      slot: 'engineTier' | 'turboTier' | 'diffTier' | 'tireTier' | 'suspensionTier' | 'brakeTier',
      targetTier: 0 | 1 | 2 | 3,
      currency: 'coins' | 'credits',
    ) => {
      const currentBuild = builds[carId] ?? createDefaultBuild(carId);
      const slotMeta = UPGRADE_PART_TIERS[slot];
      const tierInfo = slotMeta.tiers[targetTier];
      if (!tierInfo) return;
      const partKey = `${slot}_${targetTier}`;

      if (currentBuild.unlockedParts.includes(partKey) || targetTier === 0) {
        const updated = { ...currentBuild, [slot]: targetTier };
        await syncBuildUpdate(carId, updated);
        driftAudio.playChime('click');
        return;
      }

      if (currency === 'coins') {
        if (profile.driftCoins < tierInfo.coinCost) {
          showToast('Drift Coins belum cukup untuk part ini.', 'warn');
          return;
        }
        await syncProfileUpdate({ ...profile, driftCoins: profile.driftCoins - tierInfo.coinCost });
      } else {
        if (profile.apexCredits < tierInfo.creditCost) {
          showToast('Apex Credits belum cukup. Kunjungi Pro Shop!', 'warn');
          return;
        }
        await syncProfileUpdate({ ...profile, apexCredits: profile.apexCredits - tierInfo.creditCost });
      }

      const updated: CarBuildConfig = {
        ...currentBuild,
        [slot]: targetTier,
        unlockedParts: [...currentBuild.unlockedParts, partKey],
      };
      await syncBuildUpdate(carId, updated);
      driftAudio.playChime('unlock');
      showToast(`${tierInfo.name} terpasang!`);
    },
    [builds, profile, showToast, syncBuildUpdate, syncProfileUpdate],
  );

  const applyVisualPart = useCallback(
    async (
      carId: CarId,
      partKey: string,
      patch: Partial<CarBuildConfig>,
      coinCost: number,
      creditCost: number,
      payWith: 'coins' | 'credits',
    ) => {
      const currentBuild = builds[carId];
      const alreadyOwned =
        (coinCost === 0 && creditCost === 0) || currentBuild.unlockedParts.includes(partKey);

      if (!alreadyOwned) {
        if (payWith === 'coins') {
          if (profile.driftCoins < coinCost || coinCost === 0) {
            if (creditCost > 0 && coinCost === 0) {
              showToast('Item eksklusif ini menggunakan Apex Credits.', 'warn');
            } else {
              showToast('Drift Coins belum cukup.', 'warn');
            }
            return;
          }
          await syncProfileUpdate({ ...profile, driftCoins: profile.driftCoins - coinCost });
        } else {
          if (profile.apexCredits < creditCost) {
            showToast('Apex Credits belum cukup. Kunjungi Pro Shop!', 'warn');
            return;
          }
          await syncProfileUpdate({ ...profile, apexCredits: profile.apexCredits - creditCost });
        }
      }

      const nextUnlocked = alreadyOwned
        ? currentBuild.unlockedParts
        : [...currentBuild.unlockedParts, partKey];
      const updated: CarBuildConfig = {
        ...currentBuild,
        ...patch,
        unlockedParts: nextUnlocked,
      };
      await syncBuildUpdate(carId, updated);
      driftAudio.playChime(alreadyOwned ? 'click' : 'unlock');
    },
    [builds, profile, showToast, syncBuildUpdate, syncProfileUpdate],
  );

  const updateTuning = useCallback(
    (carId: CarId, patch: Partial<CarBuildConfig>) => {
      const currentBuild = builds[carId];
      const updated: CarBuildConfig = { ...currentBuild, ...patch };
      void syncBuildUpdate(carId, updated);
    },
    [builds, syncBuildUpdate],
  );

  const repairBody = useCallback(
    async (carId: CarId) => {
      const currentBuild = builds[carId] ?? createDefaultBuild(carId);
      if ((currentBuild.bodyIntegrity ?? 100) >= 100) return;
      const cost = 120;
      if (profile.driftCoins < cost) {
        showToast('Drift Coins tidak cukup untuk perbaikan bumper (120 DC).', 'warn');
        return;
      }
      await syncProfileUpdate({ ...profile, driftCoins: profile.driftCoins - cost });
      await syncBuildUpdate(carId, { ...currentBuild, bodyIntegrity: 100 });
      driftAudio.playChime('unlock');
      showToast('Bumper & bodi mobil diperbaiki kembali ke 100%!');
    },
    [builds, profile, showToast, syncBuildUpdate, syncProfileUpdate],
  );

  const replaceTires = useCallback(
    async (carId: CarId) => {
      const currentBuild = builds[carId] ?? createDefaultBuild(carId);
      if ((currentBuild.tireHealth ?? 100) >= 100) return;
      const cost = 150;
      if (profile.driftCoins < cost) {
        showToast('Drift Coins tidak cukup untuk ganti ban baru (150 DC).', 'warn');
        return;
      }
      await syncProfileUpdate({ ...profile, driftCoins: profile.driftCoins - cost });
      await syncBuildUpdate(carId, { ...currentBuild, tireHealth: 100 });
      driftAudio.playChime('unlock');
      showToast('Ban drift baru terpasang (100% Grip)!');
    },
    [builds, profile, showToast, syncBuildUpdate, syncProfileUpdate],
  );

  const toggleAutoCounterSteer = useCallback(
    (carId: CarId) => {
      const currentBuild = builds[carId] ?? createDefaultBuild(carId);
      const next = !(currentBuild.autoCounterSteer ?? true);
      void syncBuildUpdate(carId, { ...currentBuild, autoCounterSteer: next });
      driftAudio.playChime('click');
      showToast(`Auto Counter-Steer Assist: ${next ? 'ON' : 'OFF (Manual Penuh)'}`);
    },
    [builds, showToast, syncBuildUpdate],
  );

  const fetchLeaderboard = useCallback(async (trackId: TrackId) => {
    setLoadingLeaderboard(true);
    const path = `tracks/${trackId}/leaderboard`;
    try {
      const q = query(
        collection(db, 'tracks', trackId, 'leaderboard'),
        where('score', '>=', 0),
        orderBy('score', 'desc'),
        limit(25),
      );
      const snap = await getDocs(q);
      const entries: LeaderboardEntry[] = [];
      snap.forEach((d) => {
        entries.push(d.data() as LeaderboardEntry);
      });
      setLeaderboard((prev) => ({ ...prev, [trackId]: entries }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, []);

  const recordRunCompletion = useCallback(
    async (
      trackId: TrackId,
      summary: {
        gameMode: GameModeType;
        totalScore: number;
        maxCombo: number;
        zoneHits: number;
        bodyIntegrityEnd: number;
        tireHealthEnd: number;
        tandemResult?: TandemSummary;
      },
    ): Promise<RunResult> => {
      const track = TRACKS.find((t) => t.id === trackId) ?? TRACKS[0];
      let stars: 0 | 1 | 2 | 3 = 0;
      if (summary.totalScore >= track.starTargets[2]) stars = 3;
      else if (summary.totalScore >= track.starTargets[1]) stars = 2;
      else if (summary.totalScore >= track.starTargets[0]) stars = 1;

      const tandemBonusRep = summary.tandemResult?.won ? 280 : summary.tandemResult ? 90 : 0;
      const tandemBonusCoins = summary.tandemResult?.won ? 450 : summary.tandemResult ? 120 : 0;

      const baseRep = Math.round(summary.totalScore / 35);
      const starRep = stars > 0 ? track.repRewards[stars - 1] : 120;
      const repEarned = Math.max(100, baseRep + starRep + tandemBonusRep);

      const baseCoins = Math.round(summary.totalScore / 22);
      const starCoins = stars > 0 ? track.coinRewards[stars - 1] : 150;
      const coinsEarned = Math.max(150, baseCoins + starCoins + tandemBonusCoins);

      const prevRep = profile.reputation;
      const nextRep = prevRep + repEarned;

      const newlyUnlockedTracks = TRACKS.filter(
        (t) => t.requiredRep > prevRep && t.requiredRep <= nextRep,
      ).map((t) => t.id);

      await syncProfileUpdate({
        ...profile,
        driftCoins: profile.driftCoins + coinsEarned,
        reputation: nextRep,
      });

      // Persist vehicle wear & bumper damage after the run
      const activeBuild = builds[profile.activeCarId] ?? createDefaultBuild(profile.activeCarId);
      await syncBuildUpdate(profile.activeCarId, {
        ...activeBuild,
        bodyIntegrity: Math.max(0, Math.min(100, Math.round(summary.bodyIntegrityEnd))),
        tireHealth: Math.max(10, Math.min(100, Math.round(summary.tireHealthEnd))),
      });

      // Submit Personal Best to Global Online Leaderboard if authenticated
      if (user && summary.totalScore > 0) {
        const carId = profile.activeCarId;
        const carMeta = CAR_CATALOG.find((c) => c.id === carId) ?? CAR_CATALOG[0];
        const build = builds[carId];
        const stats = calculateCarStats(carMeta, build);

        const lbPath = `tracks/${trackId}/leaderboard/${user.uid}`;
        try {
          const lbRef = doc(db, 'tracks', trackId, 'leaderboard', user.uid);
          const existingSnap = await getDoc(lbRef);
          const prevBest = existingSnap.exists()
            ? (existingSnap.data() as LeaderboardEntry).score
            : -1;

          if (summary.totalScore > prevBest) {
            await setDoc(lbRef, {
              userId: user.uid,
              trackId,
              driverName: profile.displayName,
              carName: carMeta.name,
              carSpec: `${stats.driftSpecLabel} · ${build.bodykit}`,
              score: summary.totalScore,
              maxCombo: Math.max(1, summary.maxCombo),
              horsepower: stats.horsepower,
              updatedAt: serverTimestamp(),
            });
            void fetchLeaderboard(trackId);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, lbPath);
        }
      }

      if (newlyUnlockedTracks.length > 0) {
        driftAudio.playChime('unlock');
      }

      return {
        trackId,
        gameMode: summary.gameMode,
        totalScore: summary.totalScore,
        maxCombo: summary.maxCombo,
        zoneHits: summary.zoneHits,
        stars,
        repEarned,
        coinsEarned,
        newlyUnlockedTracks,
        bodyIntegrityEnd: Math.round(summary.bodyIntegrityEnd),
        tireHealthEnd: Math.round(summary.tireHealthEnd),
        tandemResult: summary.tandemResult,
      };
    },
    [builds, fetchLeaderboard, profile, syncBuildUpdate, syncProfileUpdate, user],
  );

  const completeStorePurchase = useCallback(
    async (pkg: StorePackage, paymentMethod: PaymentMethod) => {
      const nextOwned =
        pkg.unlockedCarId && !profile.ownedCars.includes(pkg.unlockedCarId)
          ? [...profile.ownedCars, pkg.unlockedCarId]
          : profile.ownedCars;

      const nextActive = pkg.unlockedCarId ? pkg.unlockedCarId : profile.activeCarId;

      const nextProfile: UserProfile = {
        ...profile,
        apexCredits: profile.apexCredits + pkg.creditsGranted,
        driftCoins: profile.driftCoins + pkg.bonusCoins,
        ownedCars: nextOwned,
        activeCarId: nextActive,
      };

      await syncProfileUpdate(nextProfile);

      if (pkg.unlockedCarId && !profile.ownedCars.includes(pkg.unlockedCarId)) {
        const freshBuild = createDefaultBuild(pkg.unlockedCarId);
        await syncBuildUpdate(pkg.unlockedCarId, freshBuild);
      }

      const purchaseId = `pur_${Date.now()}`;
      const newPurchase: StorePurchase = {
        id: purchaseId,
        ownerId: user ? user.uid : 'guest_driver',
        packageId: pkg.id,
        packageName: pkg.name,
        amountIdr: pkg.priceIdr,
        creditsGranted: pkg.creditsGranted,
        unlockedCarId: pkg.unlockedCarId || '',
        paymentMethod,
        status: 'completed',
      };

      if (user) {
        const purPath = `users/${user.uid}/purchases/${purchaseId}`;
        try {
          await setDoc(doc(db, 'users', user.uid, 'purchases', purchaseId), {
            ownerId: user.uid,
            packageId: pkg.id,
            packageName: pkg.name,
            amountIdr: pkg.priceIdr,
            creditsGranted: pkg.creditsGranted,
            unlockedCarId: pkg.unlockedCarId || '',
            paymentMethod,
            status: 'completed',
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, purPath);
        }
      }

      setPurchases((prev) => [newPurchase, ...prev]);
      driftAudio.playChime('unlock');
      showToast(`Pembelian ${pkg.name} berhasil!`);
    },
    [profile, showToast, syncBuildUpdate, syncProfileUpdate, user],
  );

  // Real-money purchase: the server grants everything after Midtrans confirms payment.
  // The client only opens the popup, then re-reads the profile the server wrote.
  const purchaseWithMidtrans = useCallback(
    async (pkg: StorePackage) => {
      if (!user) {
        showToast('Masuk dengan Google dulu untuk membeli.', 'warn');
        return;
      }
      const uid = user.uid;

      const reloadFromCloud = async () => {
        const snap = await getDoc(doc(db, 'users', uid));
        if (!snap.exists()) return null;
        const fresh = normalizeProfile(snap.data() as UserProfile);
        setProfile(fresh);

        const buildsSnap = await getDocs(collection(db, 'users', uid, 'builds'));
        const nextBuilds = createAllDefaultBuilds();
        buildsSnap.forEach((bDoc) => {
          const bData = bDoc.data() as CarBuildConfig;
          const normId = normalizeCarId(bData.carId);
          nextBuilds[normId] = normalizeBuild(normId, bData);
        });
        setBuilds(nextBuilds);

        const purSnap = await getDocs(
          query(collection(db, 'users', uid, 'purchases'), orderBy('createdAt', 'desc'), limit(20)),
        );
        const list: StorePurchase[] = [];
        purSnap.forEach((pDoc) => {
          list.push({ id: pDoc.id, ...(pDoc.data() as Omit<StorePurchase, 'id'>) });
        });
        setPurchases(list);
        return { fresh, count: list.length };
      };

      try {
        const before = await reloadFromCloud();
        const outcome = await startMidtransCheckout(pkg.id);

        if (outcome === 'closed') {
          showToast('Pembayaran dibatalkan.', 'warn');
          return;
        }
        if (outcome === 'error') {
          showToast('Pembayaran gagal. Silakan coba lagi.', 'warn');
          return;
        }

        showToast(
          outcome === 'pending'
            ? 'Menunggu pembayaran. Item masuk otomatis setelah lunas.'
            : 'Pembayaran diterima, memverifikasi...',
        );

        // Webhook can arrive a few seconds late: poll until the server has written the receipt.
        for (let i = 0; i < 15; i++) {
          await new Promise((r) => window.setTimeout(r, 2000));
          const now = await reloadFromCloud();
          if (now && (!before || now.count > before.count)) {
            driftAudio.playChime('unlock');
            showToast(`Pembelian ${pkg.name} berhasil!`);
            return;
          }
        }
        if (outcome === 'pending') {
          showToast('Pembayaran belum lunas. Item masuk otomatis setelah lunas.');
        } else {
          showToast('Verifikasi memakan waktu. Muat ulang halaman sebentar lagi.', 'warn');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal memulai pembayaran.';
        showToast(msg, 'warn');
      }
    },
    [showToast, user],
  );

  return {
    user,
    authReady,
    profile,
    builds,
    purchases,
    leaderboard,
    loadingLeaderboard,
    toast,
    signInGoogle,
    signOutUser,
    selectCar,
    buyCar,
    upgradeMechanicalPart,
    applyVisualPart,
    updateTuning,
    repairBody,
    replaceTires,
    toggleAutoCounterSteer,
    fetchLeaderboard,
    recordRunCompletion,
    completeStorePurchase,
    purchaseWithMidtrans,
  };
}
