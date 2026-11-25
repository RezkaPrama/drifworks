import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Terjadi kesalahan aplikasi.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h1 className="text-xl font-bold text-white">Gagal Memuat Sesi</h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Aplikasi mengalami kendala saat sinkronisasi data. Muat ulang halaman untuk memulihkan sesi garasi Anda.
            </p>
            <pre className="text-xs bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-auto max-h-36 text-amber-300">
              {this.state.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-lg transition-colors"
            >
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
