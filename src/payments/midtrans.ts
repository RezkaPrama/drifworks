import { auth } from '../firebase';

interface CheckoutResponse {
  orderId: string;
  token: string;
  redirectUrl?: string;
  clientKey: string;
  snapJsUrl: string;
}

interface SnapCallbacks {
  onSuccess?: () => void;
  onPending?: () => void;
  onError?: () => void;
  onClose?: () => void;
}

declare global {
  interface Window {
    snap?: {
      pay: (token: string, callbacks?: SnapCallbacks) => void;
    };
  }
}

export type CheckoutOutcome = 'success' | 'pending' | 'error' | 'closed';

function loadSnapScript(url: string, clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.snap) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-midtrans-snap]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Gagal memuat Midtrans Snap.')));
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.setAttribute('data-client-key', clientKey);
    script.setAttribute('data-midtrans-snap', 'true');
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat Midtrans Snap.'));
    document.body.appendChild(script);
  });
}

/**
 * Ask the server for a Snap token and open the Midtrans payment popup.
 * This never grants anything: credits are added by the server webhook only.
 */
export async function startMidtransCheckout(packageId: string): Promise<CheckoutOutcome> {
  const user = auth.currentUser;
  if (!user) throw new Error('Silakan masuk dengan Google terlebih dahulu.');

  const idToken = await user.getIdToken();
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ packageId }),
  });

  const data = (await res.json()) as Partial<CheckoutResponse> & { error?: string };
  if (!res.ok || !data.token || !data.clientKey || !data.snapJsUrl) {
    throw new Error(data.error ?? 'Gagal memulai pembayaran.');
  }

  await loadSnapScript(data.snapJsUrl, data.clientKey);
  const snap = window.snap;
  if (!snap) throw new Error('Midtrans Snap tidak tersedia.');

  return new Promise<CheckoutOutcome>((resolve) => {
    snap.pay(data.token as string, {
      onSuccess: () => resolve('success'),
      onPending: () => resolve('pending'),
      onError: () => resolve('error'),
      onClose: () => resolve('closed'),
    });
  });
}
