import React, { useState } from 'react';
import { CheckCircle2, CreditCard, ShieldCheck, ShoppingBag, X } from 'lucide-react';
import { formatIdr, STORE_PACKAGES } from '../data/catalog';
import { PaymentMethod, StorePackage, StorePurchase, UserProfile } from '../types/game';

interface ProShopPanelProps {
  profile: UserProfile;
  purchases: StorePurchase[];
  isSignedIn: boolean;
  onPurchase: (pkg: StorePackage, method: PaymentMethod) => Promise<void>;
  onSignIn: () => void;
}

export const ProShopPanel: React.FC<ProShopPanelProps> = ({
  profile,
  purchases,
  isSignedIn,
  onPurchase,
  onSignIn,
}) => {
  const [checkoutPkg, setCheckoutPkg] = useState<StorePackage | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('qris');
  const [processing, setProcessing] = useState(false);

  const paymentMethods: { id: PaymentMethod; label: string; desc: string }[] = [
    { id: 'qris', label: 'QRIS Instan', desc: 'Scan via BCA, Mandiri, GoPay, OVO, Dana' },
    { id: 'ewallet', label: 'E-Wallet', desc: 'GoPay / OVO / ShopeePay' },
    { id: 'va', label: 'Virtual Account', desc: 'Transfer Bank Otomatis' },
    { id: 'card', label: 'Kartu Kredit / Debit', desc: 'Visa / Mastercard' },
  ];

  const handleConfirmPurchase = async () => {
    if (!checkoutPkg) return;
    setProcessing(true);
    try {
      await onPurchase(checkoutPkg, method);
      setCheckoutPkg(null);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="absolute inset-0 top-[57px] z-25 bg-[#0b0f17]/94 overflow-y-auto custom-scroll p-6">
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-6 pb-5 border-b border-slate-800">
          <div className="space-y-1">
            <div className="text-xs text-cyan-400 font-medium">
              Dukungan Developer & Paket Eksklusif
            </div>
            <h2 className="font-display text-3xl font-bold text-white">
              Pro Shop Apex DriftWorks
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              Dukung pengembangan game dengan membeli Apex Credits atau Bundel Mobil Pro menggunakan mata uang sungguhan. Credits dapat langsung dipakai untuk membuka mobil dan part modifikasi.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-6">
            <div>
              <div className="text-xs text-slate-400">Saldo Apex Credits</div>
              <div className="font-mono-tabular text-xl font-bold text-cyan-400">
                {profile.apexCredits.toLocaleString('id-ID')} AC
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-xs text-slate-400">Saldo Drift Coins</div>
              <div className="font-mono-tabular text-xl font-bold text-amber-400">
                {profile.driftCoins.toLocaleString('id-ID')} DC
              </div>
            </div>
          </div>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {STORE_PACKAGES.map((pkg) => {
            const alreadyOwnsCar =
              pkg.unlockedCarId && profile.ownedCars.includes(pkg.unlockedCarId);
            return (
              <div
                key={pkg.id}
                className={`flex flex-col justify-between rounded-xl p-5 border transition-colors ${
                  pkg.featured
                    ? 'bg-slate-900 border-cyan-500/70'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {pkg.category === 'bundle' ? 'Bundel Mobil + Credits' : 'Paket Apex Credits'}
                    </span>
                    {pkg.featured && (
                      <span className="text-cyan-400 font-semibold">Populer</span>
                    )}
                  </div>
                  <h3 className="font-display text-xl font-bold text-white">
                    {pkg.name}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {pkg.tagline}
                  </p>

                  <div className="pt-3 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Apex Credits</span>
                      <span className="font-mono-tabular font-bold text-cyan-400">
                        +{pkg.creditsGranted.toLocaleString('id-ID')} AC
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Bonus Drift Coins</span>
                      <span className="font-mono-tabular font-bold text-amber-400">
                        +{pkg.bonusCoins.toLocaleString('id-ID')} DC
                      </span>
                    </div>
                    {pkg.unlockedCarId && (
                      <div className="flex justify-between text-slate-300">
                        <span>Unit Mobil</span>
                        <span className="font-semibold text-white">
                          {alreadyOwnsCar ? 'Sudah Dimiliki (Tetap dapat AC)' : 'Langsung Terbuka'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-mono-tabular text-lg font-bold text-white">
                      {formatIdr(pkg.priceIdr)}
                    </div>
                    <div className="text-[11px] text-slate-400">{pkg.priceUsd} USD</div>
                  </div>
                  <button
                    onClick={() => setCheckoutPkg(pkg)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs whitespace-nowrap cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Beli Sekarang
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Purchase Receipt History */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-white">
              Riwayat Transaksi & Struk Dukungan Developer
            </h3>
            {!isSignedIn && (
              <button
                onClick={onSignIn}
                className="text-xs font-medium text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                Masuk Google untuk sinkronisasi struk permanen →
              </button>
            )}
          </div>

          {purchases.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">
              Belum ada riwayat pembelian pada akun ini.
            </p>
          ) : (
            <div className="divide-y divide-slate-800 text-xs">
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="py-2.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-semibold text-white">{p.packageName}</span>
                    <span className="text-slate-500 mx-2" aria-hidden="true">·</span>
                    <span className="text-slate-400 uppercase">{p.paymentMethod}</span>
                  </div>
                  <div className="flex items-center gap-4 font-mono-tabular">
                    <span className="text-cyan-400">+{p.creditsGranted} AC</span>
                    <span className="text-white font-semibold">{formatIdr(p.amountIdr)}</span>
                    <span className="text-emerald-400 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Lunas
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {checkoutPkg && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-cyan-400 font-medium">Checkout Pembelian</div>
                <h3 className="font-display text-xl font-bold text-white">
                  {checkoutPkg.name}
                </h3>
              </div>
              <button
                onClick={() => setCheckoutPkg(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Item</span>
                <span className="text-white font-medium">{checkoutPkg.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Tagihan</span>
                <span className="font-mono-tabular font-bold text-white text-sm">
                  {formatIdr(checkoutPkg.priceIdr)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                Pilih Metode Pembayaran
              </div>
              <div className="grid grid-cols-1 gap-2">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setMethod(pm.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      method === pm.id
                        ? 'bg-cyan-500/12 border-cyan-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{pm.label}</div>
                      <div className="text-[11px] text-slate-400">{pm.desc}</div>
                    </div>
                    <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Pembayaran diproses aman oleh Midtrans. Metode bayar final dipilih di jendela Midtrans, dan item masuk otomatis setelah pembayaran terverifikasi.
              </span>
            </div>

            <button
              onClick={handleConfirmPurchase}
              disabled={processing}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              {processing ? 'Memproses Pembayaran...' : `Konfirmasi Bayar ${formatIdr(checkoutPkg.priceIdr)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
