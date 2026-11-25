import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Lock, Check } from 'lucide-react';
import {
  BODYKIT_OPTIONS,
  CAR_CATALOG,
  createDefaultBuild,
  PAINT_FINISHES,
  PAINT_PALETTE,
  RIM_COLORS,
  RIM_OPTIONS,
  SMOKE_COLORS,
  SPOILER_OPTIONS,
  UNDERGLOW_OPTIONS,
  UPGRADE_PART_TIERS,
} from '../data/catalog';
import { CarBuildConfig, CarClass, CarId, UserProfile } from '../types/game';

type WorkshopSubTab = 'mobil' | 'mesin' | 'performa' | 'visual' | 'tuning';
type ClassFilter = 'Semua' | CarClass;

interface WorkshopDockProps {
  profile: UserProfile;
  builds: Record<CarId, CarBuildConfig>;
  onSelectCar: (carId: CarId) => void;
  onBuyCar: (carId: CarId, currency: 'coins' | 'credits') => void;
  onUpgradePart: (
    carId: CarId,
    slot: 'engineTier' | 'turboTier' | 'diffTier' | 'tireTier' | 'suspensionTier' | 'brakeTier',
    tier: 0 | 1 | 2 | 3,
    currency: 'coins' | 'credits',
  ) => void;
  onApplyVisual: (
    carId: CarId,
    partKey: string,
    patch: Partial<CarBuildConfig>,
    coinCost: number,
    creditCost: number,
    payWith: 'coins' | 'credits',
  ) => void;
  onUpdateTuning: (carId: CarId, patch: Partial<CarBuildConfig>) => void;
  onOpenShop: () => void;
  onPanelOpenChange?: (open: boolean) => void;
}

export const WorkshopDock: React.FC<WorkshopDockProps> = ({
  profile,
  builds,
  onSelectCar,
  onBuyCar,
  onUpgradePart,
  onApplyVisual,
  onUpdateTuning,
  onOpenShop,
  onPanelOpenChange,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [subTab, setSubTab] = useState<WorkshopSubTab>('mesin');
  const [classFilter, setClassFilter] = useState<ClassFilter>('Semua');

  // Tell the 3D viewport whether the panel is covering the bottom of the screen
  useEffect(() => {
    onPanelOpenChange?.(!collapsed);
    return () => onPanelOpenChange?.(false);
  }, [collapsed, onPanelOpenChange]);

  const activeCarId = profile.activeCarId;
  const activeBuild = builds[activeCarId] ?? createDefaultBuild(activeCarId);
  const filteredCars =
    classFilter === 'Semua'
      ? CAR_CATALOG
      : CAR_CATALOG.filter((c) => c.carClass === classFilter);

  const tabs: { id: WorkshopSubTab; label: string }[] = [
    { id: 'mobil', label: 'Garasi Mobil' },
    { id: 'mesin', label: 'Mesin & Diff' },
    { id: 'performa', label: 'Chassis & Ban' },
    { id: 'visual', label: 'Visual & Bodykit' },
    { id: 'tuning', label: 'Tuning Setup' },
  ];

  const renderMechanicalSlots = (category: 'mesin' | 'performa') => {
    const slots = (
      Object.keys(UPGRADE_PART_TIERS) as Array<keyof typeof UPGRADE_PART_TIERS>
    ).filter((k) => UPGRADE_PART_TIERS[k].category === category);

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {slots.map((slotKey) => {
          const meta = UPGRADE_PART_TIERS[slotKey];
          const currentTier = activeBuild[slotKey];
          return (
            <div
              key={slotKey}
              className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2.5"
            >
              <div className="text-xs font-semibold text-white">{meta.label}</div>
              <div className="space-y-1.5">
                {meta.tiers.map((t) => {
                  const partKey = `${slotKey}_${t.tier}`;
                  const unlocked =
                    t.tier === 0 || activeBuild.unlockedParts.includes(partKey);
                  const equipped = currentTier === t.tier;
                  return (
                    <div
                      key={t.tier}
                      className={`p-2 rounded-md border text-xs transition-colors ${
                        equipped
                          ? 'bg-amber-500/12 border-amber-500/70'
                          : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-100 truncate">
                          {t.name}
                        </span>
                        {equipped ? (
                          <span className="text-amber-400 font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Terpasang
                          </span>
                        ) : unlocked ? (
                          <button
                            onClick={() =>
                              onUpgradePart(activeCarId, slotKey, t.tier, 'coins')
                            }
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Pasang
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                onUpgradePart(activeCarId, slotKey, t.tier, 'coins')
                              }
                              className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold whitespace-nowrap cursor-pointer"
                            >
                              {t.coinCost} DC
                            </button>
                            <button
                              onClick={() =>
                                onUpgradePart(activeCarId, slotKey, t.tier, 'credits')
                              }
                              className="px-2 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold whitespace-nowrap cursor-pointer"
                            >
                              {t.creditCost} AC
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {t.detail}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(1040px,95vw)] flex flex-col items-center transition-transform duration-200"
    >
      {/* Collapse/Expand Toggle Tab */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-t-lg bg-[#0d121c]/95 border border-b-0 border-slate-800 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
      >
        {collapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" />
            Buka Workshop
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" />
            Sembunyikan Panel
          </>
        )}
      </button>

      {!collapsed && (
        <div className="w-full bg-[#0d121c]/95 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
          {/* Sub-navigation bar */}
          <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-slate-800 bg-slate-950/60 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSubTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    subTab === t.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={onOpenShop}
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Isi Apex Credits di Pro Shop →
            </button>
          </div>

          {/* Active Panel Body */}
          <div className="p-4 max-h-[270px] overflow-y-auto custom-scroll">
            {subTab === 'mobil' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['Semua', 'Rookie', 'Am / Semi-Pro', 'Pro'] as ClassFilter[]).map((cls) => (
                      <button
                        key={cls}
                        onClick={() => setClassFilter(cls)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          classFilter === cls
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">
                    Menampilkan {filteredCars.length} dari {CAR_CATALOG.length} mobil drift
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {filteredCars.map((car) => {
                    const owned = profile.ownedCars.includes(car.id);
                    const active = profile.activeCarId === car.id;
                    const classTextColor =
                      car.carClass === 'Pro'
                        ? 'text-cyan-400'
                        : car.carClass === 'Am / Semi-Pro'
                          ? 'text-amber-400'
                          : 'text-emerald-400';
                    return (
                      <div
                        key={car.id}
                        className={`flex flex-col justify-between p-3 rounded-lg border transition-colors ${
                          active
                            ? 'bg-amber-500/12 border-amber-500/80'
                            : 'bg-slate-900/90 border-slate-800'
                        }`}
                      >
                        <div className="space-y-1.5">
                          {car.thumbnailUrl && (
                            <div className="w-full h-24 rounded-md overflow-hidden bg-slate-950 border border-slate-800/80">
                              <img
                                src={car.thumbnailUrl}
                                alt={car.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400">
                            <span className={`font-semibold ${classTextColor}`}>
                              {car.carClass}
                            </span>
                            <span className="font-mono-tabular">{car.baseHp} HP</span>
                          </div>
                          <div className="font-display font-bold text-sm text-white leading-snug">
                            {car.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {car.subtitle} <span aria-hidden="true">·</span> {car.era}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                            {car.description}
                          </p>
                        </div>

                        <div className="pt-2.5 mt-2 border-t border-slate-800/80">
                          {active ? (
                            <div className="text-xs font-semibold text-amber-400 text-center py-1">
                              Mobil Aktif
                            </div>
                          ) : owned ? (
                            <button
                              onClick={() => onSelectCar(car.id)}
                              className="w-full py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer"
                            >
                              Pilih Mobil
                            </button>
                          ) : (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => onBuyCar(car.id, 'coins')}
                                className="flex-1 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold whitespace-nowrap cursor-pointer"
                              >
                                {car.coinPrice.toLocaleString('id-ID')} DC
                              </button>
                              <button
                                onClick={() => onBuyCar(car.id, 'credits')}
                                className="flex-1 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-bold whitespace-nowrap cursor-pointer"
                              >
                                {car.creditPrice} AC
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {subTab === 'mesin' && renderMechanicalSlots('mesin')}
            {subTab === 'performa' && renderMechanicalSlots('performa')}

            {subTab === 'visual' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Paint & Finish */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-3">
                  <div className="font-semibold text-white">Cat Bodi & Lapisan</div>
                  <div className="flex flex-wrap gap-2">
                    {PAINT_PALETTE.map((c) => {
                      const partKey = `paint_${c.hex}`;
                      const owned =
                        c.creditCost === 0 ||
                        activeBuild.unlockedParts.includes(partKey);
                      const selected = activeBuild.paintHex === c.hex;
                      return (
                        <button
                          key={c.hex}
                          onClick={() =>
                            onApplyVisual(
                              activeCarId,
                              partKey,
                              { paintHex: c.hex },
                              0,
                              c.creditCost,
                              'credits',
                            )
                          }
                          title={`${c.name}${owned ? '' : ` (${c.creditCost} AC)`}`}
                          className={`relative w-7 h-7 rounded-md border-2 transition-transform cursor-pointer ${
                            selected ? 'border-white scale-110' : 'border-slate-700'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        >
                          {!owned && (
                            <Lock className="w-2.5 h-2.5 text-white absolute bottom-0.5 right-0.5 drop-shadow" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-1.5">
                    {PAINT_FINISHES.map((f) => {
                      const partKey = `finish_${f.id}`;
                      const owned =
                        f.coinCost === 0 ||
                        activeBuild.unlockedParts.includes(partKey);
                      const selected = activeBuild.paintFinish === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() =>
                            onApplyVisual(
                              activeCarId,
                              partKey,
                              { paintFinish: f.id },
                              f.coinCost,
                              0,
                              'coins',
                            )
                          }
                          className={`flex-1 py-1.5 px-2 rounded border text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                            selected
                              ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {f.name.split(' ')[0]}
                          {!owned && ` (${f.coinCost})`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bodykit & Spoiler */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2.5">
                  <div className="font-semibold text-white">Bodykit & Spoiler</div>
                  <div className="space-y-1.5">
                    {BODYKIT_OPTIONS.map((kit) => {
                      const partKey = `kit_${kit.id}`;
                      const owned =
                        kit.coinCost === 0 ||
                        activeBuild.unlockedParts.includes(partKey);
                      const selected = activeBuild.bodykit === kit.id;
                      return (
                        <div
                          key={kit.id}
                          className="flex items-center justify-between gap-2 bg-slate-950/70 px-2.5 py-1.5 rounded border border-slate-800"
                        >
                          <span className={selected ? 'text-amber-400 font-semibold' : 'text-slate-200'}>
                            {kit.name}
                          </span>
                          {selected ? (
                            <span className="text-amber-400 font-semibold">Aktif</span>
                          ) : owned ? (
                            <button
                              onClick={() =>
                                onApplyVisual(activeCarId, partKey, { bodykit: kit.id }, 0, 0, 'coins')
                              }
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                            >
                              Pasang
                            </button>
                          ) : (
                            <div className="flex gap-1">
                              <button
                                onClick={() =>
                                  onApplyVisual(activeCarId, partKey, { bodykit: kit.id }, kit.coinCost, kit.creditCost, 'coins')
                                }
                                className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-semibold cursor-pointer"
                              >
                                {kit.coinCost} DC
                              </button>
                              <button
                                onClick={() =>
                                  onApplyVisual(activeCarId, partKey, { bodykit: kit.id }, kit.coinCost, kit.creditCost, 'credits')
                                }
                                className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-semibold cursor-pointer"
                              >
                                {kit.creditCost} AC
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {SPOILER_OPTIONS.map((sp) => {
                      const partKey = `wing_${sp.id}`;
                      const owned =
                        sp.coinCost === 0 ||
                        activeBuild.unlockedParts.includes(partKey);
                      const selected = activeBuild.spoiler === sp.id;
                      return (
                        <button
                          key={sp.id}
                          onClick={() =>
                            onApplyVisual(
                              activeCarId,
                              partKey,
                              { spoiler: sp.id },
                              sp.coinCost,
                              sp.creditCost,
                              'coins',
                            )
                          }
                          className={`py-1.5 px-2 rounded border text-[11px] font-medium truncate cursor-pointer ${
                            selected
                              ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {sp.name}
                          {!owned && ` (${sp.coinCost} DC)`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Velg, Asap Ban & Underglow */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2.5">
                  <div className="font-semibold text-white">Velg, Asap Ban & Underglow</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {RIM_OPTIONS.map((r) => {
                      const partKey = `rim_${r.id}`;
                      const owned =
                        r.coinCost === 0 ||
                        activeBuild.unlockedParts.includes(partKey);
                      const selected = activeBuild.rimStyle === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() =>
                            onApplyVisual(
                              activeCarId,
                              partKey,
                              { rimStyle: r.id },
                              r.coinCost,
                              r.creditCost,
                              'coins',
                            )
                          }
                          className={`py-1.5 px-2 rounded border text-[11px] font-medium truncate cursor-pointer ${
                            selected
                              ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          {r.name}
                          {!owned && ` (${r.coinCost})`}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Warna Velg</span>
                    <div className="flex gap-1.5">
                      {RIM_COLORS.map((rc) => (
                        <button
                          key={rc.hex}
                          onClick={() =>
                            onApplyVisual(
                              activeCarId,
                              `rimcol_${rc.hex}`,
                              { rimColorHex: rc.hex },
                              0,
                              0,
                              'coins',
                            )
                          }
                          title={rc.name}
                          className={`w-5 h-5 rounded border cursor-pointer ${
                            activeBuild.rimColorHex === rc.hex
                              ? 'border-white scale-110'
                              : 'border-slate-700'
                          }`}
                          style={{ backgroundColor: rc.hex }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Asap Drift</span>
                    <div className="flex gap-1.5">
                      {SMOKE_COLORS.map((sc) => {
                        const partKey = `smoke_${sc.id}`;
                        const owned =
                          sc.creditCost === 0 ||
                          activeBuild.unlockedParts.includes(partKey);
                        return (
                          <button
                            key={sc.id}
                            onClick={() =>
                              onApplyVisual(
                                activeCarId,
                                partKey,
                                { smokeColorHex: sc.hex },
                                0,
                                sc.creditCost,
                                'credits',
                              )
                            }
                            title={`${sc.name}${owned ? '' : ` (${sc.creditCost} AC)`}`}
                            className={`relative w-5 h-5 rounded border cursor-pointer ${
                              activeBuild.smokeColorHex === sc.hex
                                ? 'border-white scale-110'
                                : 'border-slate-700'
                            }`}
                            style={{ backgroundColor: sc.hex }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Underglow</span>
                    <div className="flex gap-1.5">
                      {UNDERGLOW_OPTIONS.map((ug) => {
                        const partKey = `glow_${ug.id}`;
                        return (
                          <button
                            key={ug.id}
                            onClick={() =>
                              onApplyVisual(
                                activeCarId,
                                partKey,
                                { underglowHex: ug.hex },
                                0,
                                ug.creditCost,
                                'credits',
                              )
                            }
                            className={`px-2 py-0.5 rounded border text-[11px] cursor-pointer ${
                              activeBuild.underglowHex === ug.hex
                                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                                : 'border-slate-800 text-slate-400 bg-slate-950'
                            }`}
                          >
                            {ug.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {subTab === 'tuning' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between gap-1">
                    <span className="text-slate-300 font-medium">Sensitivitas Kemudi</span>
                    <span className="font-mono-tabular text-amber-400">
                      {Math.round((activeBuild.steerSensitivity ?? 0.7) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.4}
                    max={1.0}
                    step={0.05}
                    value={activeBuild.steerSensitivity ?? 0.7}
                    onChange={(e) =>
                      onUpdateTuning(activeCarId, {
                        steerSensitivity: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400">
                    Haluskan respons belok agar tidak liar saat dikendalikan di keyboard maupun gamepad.
                  </p>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-medium">Tinggi Suspensi</span>
                    <span className="font-mono-tabular text-amber-400">
                      {activeBuild.rideHeight > 0
                        ? `Ceper ${Math.round(activeBuild.rideHeight * 100)}%`
                        : activeBuild.rideHeight < 0
                          ? `Tinggi ${Math.round(Math.abs(activeBuild.rideHeight) * 100)}%`
                          : 'Netral'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-0.6}
                    max={1.0}
                    step={0.1}
                    value={activeBuild.rideHeight}
                    onChange={(e) =>
                      onUpdateTuning(activeCarId, {
                        rideHeight: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400">
                    Menurunkan ground clearance secara visual di showroom dan lintasan.
                  </p>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-medium">Sudut Camber</span>
                    <span className="font-mono-tabular text-amber-400">
                      -{activeBuild.camber.toFixed(1)}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={0.5}
                    value={activeBuild.camber}
                    onChange={(e) =>
                      onUpdateTuning(activeCarId, {
                        camber: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400">
                    Camber negatif menambah traksi saat mobil miring ekstrem di tengah drift.
                  </p>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-medium">Rasio Gigi</span>
                    <span className="font-mono-tabular text-amber-400">
                      {activeBuild.gearRatio.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.85}
                    max={1.25}
                    step={0.05}
                    value={activeBuild.gearRatio}
                    onChange={(e) =>
                      onUpdateTuning(activeCarId, {
                        gearRatio: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400">
                    Rasio lebih pendek mempercepat akselerasi keluar tikungan.
                  </p>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-medium">Brake Bias</span>
                    <span className="font-mono-tabular text-amber-400">
                      {Math.round(activeBuild.brakeBias * 100)}% Depan
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.35}
                    max={0.75}
                    step={0.05}
                    value={activeBuild.brakeBias}
                    onChange={(e) =>
                      onUpdateTuning(activeCarId, {
                        brakeBias: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400">
                    Atur keseimbangan rem untuk menjaga kestabilan saat inisiasi tikungan.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
