import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import express, { NextFunction, Request, Response } from 'express';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { createDefaultBuild, STORE_PACKAGES } from './src/data/catalog';

/**
 * Midtrans payment server for Apex DriftWorks.
 * - The browser never grants credits. Only this server does, after Midtrans confirms payment.
 * - Prices come from STORE_PACKAGES on the server, never from the client.
 */

const PORT = Number(process.env.PORT ?? 3001);
const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY ?? '';
const CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY ?? '';
const IS_PROD = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID;

if (!SERVER_KEY) {
  console.error('MIDTRANS_SERVER_KEY is missing. Set it in .env on the server.');
  process.exit(1);
}

const SNAP_BASE = IS_PROD ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
const API_BASE = IS_PROD ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
const MIDTRANS_AUTH = `Basic ${Buffer.from(`${SERVER_KEY}:`).toString('base64')}`;

const app = initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = DATABASE_ID ? getFirestore(app, DATABASE_ID) : getFirestore(app);
const auth = getAuth(app);

interface AuthedRequest extends Request {
  uid?: string;
  email?: string;
}

async function requireUser(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Login diperlukan.' });
    return;
  }
  try {
    const decoded = await auth.verifyIdToken(token);
    req.uid = decoded.uid;
    req.email = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: 'Sesi login tidak valid.' });
  }
}

function mapPaymentMethod(paymentType: string | undefined): 'qris' | 'ewallet' | 'va' | 'card' {
  switch (paymentType) {
    case 'qris':
      return 'qris';
    case 'gopay':
    case 'shopeepay':
      return 'ewallet';
    case 'credit_card':
      return 'card';
    default:
      return 'va'; // bank_transfer, echannel, permata, etc.
  }
}

const server = express();
server.use(express.json({ limit: '100kb' }));

// ---------- 1. Create a Snap transaction ----------
server.post('/api/checkout', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const packageId = String(req.body?.packageId ?? '');
    const pkg = STORE_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      res.status(400).json({ error: 'Paket tidak ditemukan.' });
      return;
    }

    const uid = req.uid as string;
    // Midtrans order_id: max 50 chars. The uid is stored in Firestore, not in the id.
    const orderId = `DW-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    await db.collection('orders').doc(orderId).set({
      uid,
      packageId: pkg.id,
      amountIdr: pkg.priceIdr,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });

    const snapRes = await fetch(`${SNAP_BASE}/snap/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: MIDTRANS_AUTH,
      },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: pkg.priceIdr },
        item_details: [
          { id: pkg.id, price: pkg.priceIdr, quantity: 1, name: pkg.name.slice(0, 50) },
        ],
        customer_details: req.email ? { email: req.email } : undefined,
      }),
    });

    const data = (await snapRes.json()) as { token?: string; redirect_url?: string; error_messages?: string[] };
    if (!snapRes.ok || !data.token) {
      console.error('Midtrans Snap error:', snapRes.status, data);
      await db.collection('orders').doc(orderId).update({ status: 'failed' });
      res.status(502).json({ error: 'Gagal membuat transaksi pembayaran.' });
      return;
    }

    res.json({
      orderId,
      token: data.token,
      redirectUrl: data.redirect_url,
      clientKey: CLIENT_KEY,
      snapJsUrl: `${SNAP_BASE}/snap/snap.js`,
    });
  } catch (err) {
    console.error('checkout error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// ---------- 2. Midtrans webhook ----------
server.post('/api/midtrans-webhook', async (req: Request, res: Response) => {
  try {
    const n = req.body as Record<string, string | undefined>;
    const orderId = n.order_id ?? '';
    const statusCode = n.status_code ?? '';
    const grossAmount = n.gross_amount ?? '';
    const signature = n.signature_key ?? '';

    // Verify the signature: sha512(order_id + status_code + gross_amount + serverKey)
    const expected = crypto
      .createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${SERVER_KEY}`)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Never trust the body alone: ask Midtrans for the real status.
    const statusRes = await fetch(`${API_BASE}/v2/${encodeURIComponent(orderId)}/status`, {
      headers: { Accept: 'application/json', Authorization: MIDTRANS_AUTH },
    });
    if (!statusRes.ok) {
      console.error('Midtrans status check failed:', statusRes.status);
      res.status(502).json({ error: 'Status check failed' }); // Midtrans will retry
      return;
    }
    const status = (await statusRes.json()) as {
      transaction_status?: string;
      fraud_status?: string;
      payment_type?: string;
      gross_amount?: string;
    };

    const orderRef = db.collection('orders').doc(orderId);
    const paid =
      status.transaction_status === 'settlement' ||
      (status.transaction_status === 'capture' && status.fraud_status === 'accept');

    if (!paid) {
      if (['deny', 'cancel', 'expire', 'failure'].includes(status.transaction_status ?? '')) {
        await orderRef.set({ status: status.transaction_status }, { merge: true });
      }
      res.json({ ok: true });
      return;
    }

    await db.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) throw new Error(`Unknown order ${orderId}`);
      const order = orderSnap.data() as { uid: string; packageId: string; amountIdr: number; status: string };
      if (order.status === 'paid') return; // idempotent: Midtrans may call more than once

      const pkg = STORE_PACKAGES.find((p) => p.id === order.packageId);
      if (!pkg) throw new Error(`Unknown package ${order.packageId}`);
      if (Number(status.gross_amount) !== order.amountIdr || order.amountIdr !== pkg.priceIdr) {
        throw new Error(`Amount mismatch for ${orderId}`);
      }

      const userRef = db.collection('users').doc(order.uid);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error(`User ${order.uid} has no profile`);
      const owned = ((userSnap.data() as { ownedCars?: string[] }).ownedCars ?? []) as string[];

      const update: Record<string, unknown> = {
        apexCredits: FieldValue.increment(pkg.creditsGranted),
        driftCoins: FieldValue.increment(pkg.bonusCoins),
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (pkg.unlockedCarId) {
        update.ownedCars = FieldValue.arrayUnion(pkg.unlockedCarId);
        update.activeCarId = pkg.unlockedCarId;
        if (!owned.includes(pkg.unlockedCarId)) {
          const buildRef = userRef.collection('builds').doc(pkg.unlockedCarId);
          tx.set(buildRef, {
            ownerId: order.uid,
            ...createDefaultBuild(pkg.unlockedCarId),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
      tx.update(userRef, update);

      tx.set(userRef.collection('purchases').doc(orderId), {
        ownerId: order.uid,
        packageId: pkg.id,
        packageName: pkg.name,
        amountIdr: pkg.priceIdr,
        creditsGranted: pkg.creditsGranted,
        unlockedCarId: pkg.unlockedCarId ?? '',
        paymentMethod: mapPaymentMethod(status.payment_type),
        status: 'completed',
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(orderRef, { status: 'paid', paidAt: FieldValue.serverTimestamp() });
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' }); // Midtrans will retry
  }
});

// ---------- 3. Serve the built game (production) ----------
const distDir = path.resolve(process.cwd(), 'dist');
server.use(express.static(distDir));
server.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`DriftWorks server on :${PORT} (Midtrans ${IS_PROD ? 'PRODUCTION' : 'sandbox'})`);
});
