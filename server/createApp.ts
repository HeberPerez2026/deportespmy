import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import * as webpushNamespace from 'web-push';

const webpush =
  (webpushNamespace as unknown as { default?: typeof webpushNamespace }).default ||
  webpushNamespace;

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId: string;
}

interface AdminTokenRecord {
  adminId: string;
  accessToken: string;
  refreshToken?: string;
  publicKey?: string;
  userId?: string;
  nickname?: string;
  email?: string;
  expiresAt?: string;
  connectedAt?: string;
}

// Load Firebase config once for server-side Firestore REST lookups/updates
let firebaseCfg: FirebaseAppletConfig | null = null;
try {
  const cwdCfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const relCfgPath = fileURLToPath(new URL('../firebase-applet-config.json', import.meta.url));
  const cfgPath = fs.existsSync(cwdCfgPath) ? cwdCfgPath : relCfgPath;
  if (fs.existsSync(cfgPath)) {
    firebaseCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  }
} catch (err) {
  console.warn('No se pudo leer firebase-applet-config.json en server:', err);
}

// In-memory store for admin OAuth tokens (backed by Firestore settings/profile_{adminId})
const adminTokensStore = new Map<string, AdminTokenRecord>();

// In-memory store for Web Push subscriptions & cached VAPID keys
interface ServerPushSubscriptionRecord {
  id: string;
  deviceId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  bookingCodes: string[];
  clientPhone?: string;
  clientName?: string;
  enabled: boolean;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}
const pushSubscriptionsStore = new Map<string, ServerPushSubscriptionRecord>();
let cachedVapidKeys: { publicKey: string; privateKey: string; subject: string } | null = null;
let vapidInitPromise: Promise<{ publicKey: string; privateKey: string; subject: string } | null> | null = null;

// In-memory cache for verified payment statuses (keyed by external_reference or paymentId)
const verifiedPayments = new Map<string, {
  paymentId: string;
  status: string;
  amount: number;
  bookingCode: string;
  adminId?: string;
  approvedAt: string;
}>();

function normalizeAdminId(raw?: unknown): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

function cleanEnvValue(val?: string): string {
  if (!val) return '';
  return val
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim();
}

function resolveMpOAuthCredentials(): { clientId: string; clientSecret: string } {
  const envClient =
    cleanEnvValue(process.env.MP_CLIENT_ID) ||
    cleanEnvValue(process.env.mp_client_id) ||
    cleanEnvValue(process.env.MERCADOPAGO_CLIENT_ID) ||
    cleanEnvValue(process.env.mercadopago_client_id) ||
    cleanEnvValue(process.env.VITE_MP_CLIENT_ID) ||
    cleanEnvValue(process.env.MP_APP_ID) ||
    cleanEnvValue(process.env.mp_app_id) ||
    cleanEnvValue(process.env.MERCADOPAGO_APP_ID);

  const envSecret =
    cleanEnvValue(process.env.MP_CLIENT_SECRET) ||
    cleanEnvValue(process.env.mp_client_secret) ||
    cleanEnvValue(process.env.MERCADOPAGO_CLIENT_SECRET) ||
    cleanEnvValue(process.env.mercadopago_client_secret) ||
    cleanEnvValue(process.env.VITE_MP_CLIENT_SECRET) ||
    cleanEnvValue(process.env.MP_SECRET) ||
    cleanEnvValue(process.env.mp_secret) ||
    cleanEnvValue(process.env.MERCADOPAGO_SECRET);

  const clientId = envClient || '3170313159721860';
  const clientSecret = envSecret || 'hwsrqOkpZn7zqTszTVbt97HaGbfStE42';

  return { clientId, clientSecret };
}

function listSafeMpEnvKeys(): string[] {
  return Object.keys(process.env)
    .filter((k) => /mp_|_mp|mercado|client_id|client_secret|app_id/i.test(k))
    .sort();
}

interface ResilientResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: <T = any>() => Promise<T>;
}

function singleHttpsRequest(
  targetUrl: string,
  options: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number } = {}
): Promise<ResilientResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const isHttps = parsed.protocol === 'https:';
    const transport = isHttps ? https : http;
    const method = (options.method || 'GET').toUpperCase();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'DeportesPMY/1.0',
      Connection: 'close',
      ...(options.headers || {}),
    };

    const bodyBuffer = options.body ? Buffer.from(options.body, 'utf-8') : null;
    if (bodyBuffer && !headers['Content-Length'] && !headers['content-length']) {
      headers['Content-Length'] = String(bodyBuffer.byteLength);
    }

    const req = transport.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers,
        agent: false, // Prevent stale keep-alive socket reuse (ECONNRESET)
        timeout: options.timeoutMs ?? 12000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          const rawBody = Buffer.concat(chunks).toString('utf-8');
          const status = res.statusCode || 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            text: async () => rawBody,
            json: async <T = any>() => {
              const trimmed = rawBody.trim();
              if (!trimmed) {
                throw new Error(`Respuesta vacía del servidor externo (HTTP ${status})`);
              }
              if (trimmed.startsWith('<')) {
                throw new Error(`El servidor externo devolvió HTML en lugar de JSON (HTTP ${status}).`);
              }
              return JSON.parse(trimmed) as T;
            },
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('ETIMEDOUT'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (bodyBuffer) {
      req.write(bodyBuffer);
    }
    req.end();
  });
}

async function resilientFetch(
  targetUrl: string,
  options: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number } = {},
  maxRetries = 2
): Promise<ResilientResponse> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await singleHttpsRequest(targetUrl, options);
    } catch (err: any) {
      lastError = err;
      const code = err?.code || err?.cause?.code || '';
      const msg = String(err?.message || '');
      const isTransient =
        code === 'ECONNRESET' ||
        code === 'ETIMEDOUT' ||
        code === 'EPIPE' ||
        code === 'ECONNREFUSED' ||
        code === 'EAI_AGAIN' ||
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('socket hang up');

      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}

function getFirestoreDocUrl(collectionPath: string, docId?: string): string | null {
  if (!firebaseCfg?.projectId || !firebaseCfg?.firestoreDatabaseId || !firebaseCfg?.apiKey) {
    return null;
  }
  const base = `https://firestore.googleapis.com/v1/projects/${firebaseCfg.projectId}/databases/${firebaseCfg.firestoreDatabaseId}/documents`;
  if (docId) {
    return `${base}/${collectionPath}/${encodeURIComponent(docId)}?key=${encodeURIComponent(firebaseCfg.apiKey)}`;
  }
  return `${base}:${collectionPath}?key=${encodeURIComponent(firebaseCfg.apiKey)}`;
}

async function fetchAdminTokensFromFirestore(adminId: string): Promise<AdminTokenRecord | null> {
  const cleanId = normalizeAdminId(adminId);
  if (!cleanId) return null;

  const url = getFirestoreDocUrl('settings', `profile_${cleanId}`);
  if (!url) return null;

  try {
    const resp = await resilientFetch(url);
    if (!resp.ok) return null;
    const json: any = await resp.json();
    const fields = json?.fields;
    if (!fields) return null;

    const accessToken = fields.mpAccessToken?.stringValue || '';
    if (!accessToken) return null;

    const record: AdminTokenRecord = {
      adminId: cleanId,
      accessToken,
      refreshToken: fields.mpRefreshToken?.stringValue || undefined,
      publicKey: fields.mpPublicKey?.stringValue || undefined,
      userId: fields.mpUserId?.stringValue || undefined,
      nickname: fields.mpAccountNickname?.stringValue || undefined,
      email: fields.mpAccountEmail?.stringValue || undefined,
      expiresAt: fields.mpTokenExpiresAt?.stringValue || undefined,
      connectedAt: fields.mpConnectedAt?.stringValue || undefined,
    };

    adminTokensStore.set(cleanId, record);
    return record;
  } catch (err) {
    console.warn(`[Firestore REST] Error leyendo tokens de ${cleanId}:`, err);
    return null;
  }
}

async function updateAdminTokensInFirestore(adminId: string, record: AdminTokenRecord): Promise<void> {
  const cleanId = normalizeAdminId(adminId);
  if (!cleanId || !firebaseCfg) return;

  const base = `https://firestore.googleapis.com/v1/projects/${firebaseCfg.projectId}/databases/${firebaseCfg.firestoreDatabaseId}/documents/settings/profile_${encodeURIComponent(cleanId)}`;
  const updateMask = [
    'mpAccessToken',
    'mpRefreshToken',
    'mpPublicKey',
    'mpOAuthConnected',
    'mpUserId',
    'mpAccountNickname',
    'mpAccountEmail',
    'mpTokenExpiresAt',
    'mpConnectedAt'
  ].map(f => `updateMask.fieldPaths=${f}`).join('&');

  try {
    await resilientFetch(`${base}?${updateMask}&key=${encodeURIComponent(firebaseCfg.apiKey)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          mpAccessToken: { stringValue: record.accessToken || '' },
          mpRefreshToken: { stringValue: record.refreshToken || '' },
          mpPublicKey: { stringValue: record.publicKey || '' },
          mpOAuthConnected: { booleanValue: true },
          mpUserId: { stringValue: record.userId || '' },
          mpAccountNickname: { stringValue: record.nickname || '' },
          mpAccountEmail: { stringValue: record.email || '' },
          mpTokenExpiresAt: { stringValue: record.expiresAt || '' },
          mpConnectedAt: { stringValue: record.connectedAt || new Date().toISOString() },
        }
      })
    });
  } catch (err) {
    console.warn(`[Firestore REST] Error actualizando tokens de ${cleanId}:`, err);
  }
}

async function confirmBookingInFirestore(
  bookingCode: string,
  paymentId: string,
  paidAmount: number
): Promise<boolean> {
  if (!bookingCode || !firebaseCfg) return false;
  const queryUrl = `https://firestore.googleapis.com/v1/projects/${firebaseCfg.projectId}/databases/${firebaseCfg.firestoreDatabaseId}/documents:runQuery?key=${encodeURIComponent(firebaseCfg.apiKey)}`;

  try {
    const queryResp = await resilientFetch(queryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'bookings' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'bookingCode' },
              op: 'EQUAL',
              value: { stringValue: bookingCode }
            }
          },
          limit: 1
        }
      })
    });

    if (!queryResp.ok) return false;
    const rows: any[] = await queryResp.json();
    const docEntry = rows.find(r => r?.document?.name);
    if (!docEntry) return false;

    const docName: string = docEntry.document.name;
    const fields = docEntry.document.fields || {};
    const totalAmount = Number(fields.totalAmount?.doubleValue ?? fields.totalAmount?.integerValue ?? 0);
    const currentStatus = fields.status?.stringValue || '';

    if (currentStatus === 'confirmed' && fields.paymentReference?.stringValue === `MP-${paymentId}`) {
      return true;
    }

    const effectivePaid = paidAmount > 0 ? paidAmount : (Number(fields.amountPaid?.doubleValue ?? fields.amountPaid?.integerValue ?? 0) || totalAmount * 0.5);
    const balanceDue = Math.max(0, totalAmount - effectivePaid);
    const paymentStatus = balanceDue <= 0 ? 'total_pagado' : 'seña_pagada';

    const bookingPushMeta = {
      bookingCode,
      clientPhone: fields.clientPhone?.stringValue || '',
      pushDeviceId: fields.pushDeviceId?.stringValue || '',
      courtName: fields.courtName?.stringValue || 'Cancha',
      date: fields.date?.stringValue || '',
      startTime: fields.startTime?.stringValue || '',
      endTime: fields.endTime?.stringValue || '',
      amountPaid: effectivePaid,
      balanceDue,
      totalAmount,
      paymentMethod: fields.paymentMethod?.stringValue || 'mercadopago',
    };

    const patchUrl = `https://firestore.googleapis.com/v1/${docName}?updateMask.fieldPaths=status&updateMask.fieldPaths=paymentStatus&updateMask.fieldPaths=amountPaid&updateMask.fieldPaths=balanceDue&updateMask.fieldPaths=paymentReference&updateMask.fieldPaths=whatsappSent&updateMask.fieldPaths=whatsappSentAt&key=${encodeURIComponent(firebaseCfg.apiKey)}`;

    const patchResp = await resilientFetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          status: { stringValue: 'confirmed' },
          paymentStatus: { stringValue: paymentStatus },
          amountPaid: { doubleValue: effectivePaid },
          balanceDue: { doubleValue: balanceDue },
          paymentReference: { stringValue: `MP-${paymentId}` },
          whatsappSent: { booleanValue: true },
          whatsappSentAt: { stringValue: new Date().toISOString() }
        }
      })
    });

    if (patchResp.ok) {
      dispatchBookingPushNotification({
        ...bookingPushMeta,
        eventType: 'payment_confirmed',
      }).catch((pushErr) => {
        console.warn('[Push] Error enviando push desde confirmBookingInFirestore:', pushErr);
      });
    }

    return patchResp.ok;
  } catch (err) {
    console.warn(`[Firestore REST] Error confirmando reserva ${bookingCode}:`, err);
    return false;
  }
}

function normalizePhoneDigits(phone?: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
}

async function ensureVapidKeys(): Promise<{ publicKey: string; privateKey: string; subject: string } | null> {
  if (cachedVapidKeys) {
    return cachedVapidKeys;
  }
  if (vapidInitPromise) {
    return vapidInitPromise;
  }

  vapidInitPromise = (async () => {
    const subject = cleanEnvValue(process.env.VAPID_SUBJECT) || 'mailto:soporte@deportespmy.com.ar';
    const envPub = cleanEnvValue(process.env.VAPID_PUBLIC_KEY);
    const envPriv = cleanEnvValue(process.env.VAPID_PRIVATE_KEY);

    if (envPub && envPriv) {
      cachedVapidKeys = { publicKey: envPub, privateKey: envPriv, subject };
      webpush.setVapidDetails(subject, envPub, envPriv);
      return cachedVapidKeys;
    }

    const docUrl = getFirestoreDocUrl('settings', 'pushVapidConfig');
    if (docUrl) {
      try {
        const resp = await resilientFetch(docUrl);
        if (resp.ok) {
          const json: any = await resp.json();
          const fields = json?.fields;
          const pub = fields?.publicKey?.stringValue;
          const priv = fields?.privateKey?.stringValue;
          if (pub && priv) {
            cachedVapidKeys = { publicKey: pub, privateKey: priv, subject };
            webpush.setVapidDetails(subject, pub, priv);
            return cachedVapidKeys;
          }
        }
      } catch (err) {
        console.warn('[Push] No se pudo leer pushVapidConfig desde Firestore:', err);
      }
    }

    const generated = webpush.generateVAPIDKeys();
    cachedVapidKeys = {
      publicKey: generated.publicKey,
      privateKey: generated.privateKey,
      subject,
    };
    webpush.setVapidDetails(subject, generated.publicKey, generated.privateKey);

    if (firebaseCfg?.projectId && firebaseCfg?.firestoreDatabaseId && firebaseCfg?.apiKey) {
      const saveUrl = `https://firestore.googleapis.com/v1/projects/${firebaseCfg.projectId}/databases/${firebaseCfg.firestoreDatabaseId}/documents/settings/pushVapidConfig?key=${encodeURIComponent(firebaseCfg.apiKey)}`;
      try {
        await resilientFetch(saveUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              publicKey: { stringValue: generated.publicKey },
              privateKey: { stringValue: generated.privateKey },
              subject: { stringValue: subject },
              updatedAt: { stringValue: new Date().toISOString() },
            }
          })
        });
      } catch (err) {
        console.warn('[Push] No se pudo persistir pushVapidConfig en Firestore:', err);
      }
    }

    return cachedVapidKeys;
  })();

  const result = await vapidInitPromise;
  vapidInitPromise = null;
  return result;
}

function parseFirestorePushDoc(docObj: any): ServerPushSubscriptionRecord | null {
  const fields = docObj?.fields;
  if (!fields) return null;
  const nameParts = String(docObj.name || '').split('/');
  const id = nameParts[nameParts.length - 1] || fields.deviceId?.stringValue || '';
  const deviceId = fields.deviceId?.stringValue || id;
  const endpoint = fields.endpoint?.stringValue || '';
  const p256dh = fields.p256dh?.stringValue || '';
  const auth = fields.auth?.stringValue || '';
  const enabled = fields.enabled?.booleanValue !== false;
  if (!id || !endpoint || !p256dh || !auth) return null;

  const rawCodes = fields.bookingCodes?.arrayValue?.values;
  const bookingCodes: string[] = Array.isArray(rawCodes)
    ? rawCodes.map((v: any) => String(v?.stringValue || '').trim()).filter(Boolean)
    : [];

  return {
    id,
    deviceId,
    endpoint,
    p256dh,
    auth,
    bookingCodes,
    clientPhone: fields.clientPhone?.stringValue || '',
    clientName: fields.clientName?.stringValue || '',
    enabled,
    userAgent: fields.userAgent?.stringValue || '',
    createdAt: fields.createdAt?.stringValue || '',
    updatedAt: fields.updatedAt?.stringValue || '',
  };
}

async function savePushSubToFirestoreRest(record: ServerPushSubscriptionRecord): Promise<void> {
  pushSubscriptionsStore.set(record.id, record);
  if (!firebaseCfg?.projectId || !firebaseCfg?.firestoreDatabaseId || !firebaseCfg?.apiKey) return;

  const docUrl = `https://firestore.googleapis.com/v1/projects/${firebaseCfg.projectId}/databases/${firebaseCfg.firestoreDatabaseId}/documents/pushSubscriptions/${encodeURIComponent(record.id)}?key=${encodeURIComponent(firebaseCfg.apiKey)}`;
  try {
    await resilientFetch(docUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          deviceId: { stringValue: record.deviceId },
          endpoint: { stringValue: record.endpoint },
          p256dh: { stringValue: record.p256dh },
          auth: { stringValue: record.auth },
          bookingCodes: {
            arrayValue: {
              values: record.bookingCodes.slice(0, 50).map((code) => ({ stringValue: code }))
            }
          },
          clientPhone: { stringValue: record.clientPhone || '' },
          clientName: { stringValue: record.clientName || '' },
          enabled: { booleanValue: record.enabled },
          userAgent: { stringValue: (record.userAgent || '').slice(0, 200) },
          createdAt: { stringValue: record.createdAt || new Date().toISOString() },
          updatedAt: { stringValue: record.updatedAt || new Date().toISOString() },
        }
      })
    });
  } catch (err) {
    console.warn('[Push] Error guardando suscripción en Firestore REST:', err);
  }
}

async function deletePushSubFromFirestoreRest(subId: string): Promise<void> {
  pushSubscriptionsStore.delete(subId);
  if (!firebaseCfg?.projectId || !firebaseCfg?.firestoreDatabaseId || !firebaseCfg?.apiKey) return;
  const docUrl = `https://firestore.googleapis.com/v1/projects/${firebaseCfg.projectId}/databases/${firebaseCfg.firestoreDatabaseId}/documents/pushSubscriptions/${encodeURIComponent(subId)}?key=${encodeURIComponent(firebaseCfg.apiKey)}`;
  try {
    await resilientFetch(docUrl, { method: 'DELETE' });
  } catch {}
}

async function loadAllPushSubscriptions(): Promise<ServerPushSubscriptionRecord[]> {
  const merged = new Map<string, ServerPushSubscriptionRecord>(pushSubscriptionsStore);

  if (firebaseCfg?.projectId && firebaseCfg?.firestoreDatabaseId && firebaseCfg?.apiKey) {
    const listUrl = `https://firestore.googleapis.com/v1/projects/${firebaseCfg.projectId}/databases/${firebaseCfg.firestoreDatabaseId}/documents/pushSubscriptions?pageSize=200&key=${encodeURIComponent(firebaseCfg.apiKey)}`;
    try {
      const resp = await resilientFetch(listUrl);
      if (resp.ok) {
        const data: any = await resp.json();
        const docs: any[] = Array.isArray(data?.documents) ? data.documents : [];
        for (const d of docs) {
          const parsed = parseFirestorePushDoc(d);
          if (parsed) {
            merged.set(parsed.id, parsed);
            pushSubscriptionsStore.set(parsed.id, parsed);
          }
        }
      }
    } catch (err) {
      console.warn('[Push] Error leyendo pushSubscriptions desde Firestore REST:', err);
    }
  }

  return Array.from(merged.values());
}

function buildBookingPushContent(input: {
  eventType: string;
  bookingCode: string;
  courtName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  amountPaid?: number;
  balanceDue?: number;
  refundAmount?: number;
  mpRefunded?: boolean;
  customTitle?: string;
  customBody?: string;
  missingPlayers?: number;
  playerName?: string;
  playerPhone?: string;
  remainingPlayers?: number;
  joinBookingCode?: string;
}) {
  const code = input.bookingCode || 'PMY';
  const court = input.courtName || 'Tu cancha';
  const schedule = input.date && input.startTime ? `${input.date} ${input.startTime} hs` : (input.date || '');
  const balance = Number(input.balanceDue || 0);
  const paid = Number(input.amountPaid || 0);
  const refund = Number(input.refundAmount ?? paid);
  const missing = Math.max(0, Number(input.missingPlayers || 0));
  const remaining = Math.max(0, Number(input.remainingPlayers ?? 0));
  const joinCode = (input.joinBookingCode || '').trim();

  let title = input.customTitle?.trim() || '';
  let body = input.customBody?.trim() || '';

  if (!title || !body) {
    switch (input.eventType) {
      case 'booking_created':
        title = title || `Reserva registrada #${code}`;
        body = body || `${court}${schedule ? ` · ${schedule}` : ''}. Pendiente de pago o verificación.`;
        break;
      case 'receipt_submitted':
        title = title || `Comprobante recibido #${code}`;
        body = body || `El club está revisando tu comprobante para ${court}${schedule ? ` (${schedule})` : ''}.`;
        break;
      case 'payment_confirmed':
        title = title || `Turno confirmado #${code}`;
        body = body || `${court}${schedule ? ` · ${schedule}` : ''}. ${balance > 0 ? `Saldo en cancha: $${balance.toLocaleString('es-AR')}.` : 'Pago 100% acreditado.'}`;
        break;
      case 'balance_paid':
        title = title || `Saldo completado #${code}`;
        body = body || `${court}${schedule ? ` (${schedule})` : ''} quedó abonado al 100%.`;
        break;
      case 'booking_cancelled':
        title = title || `Turno cancelado #${code}`;
        body = body || (refund > 0
          ? `${court}${schedule ? ` (${schedule})` : ''} fue cancelado. ${input.mpRefunded ? `Se devolvieron $${refund.toLocaleString('es-AR')} por Mercado Pago.` : `Devolución registrada de $${refund.toLocaleString('es-AR')}.`}`
          : `${court}${schedule ? ` (${schedule})` : ''} fue cancelado y liberado.`);
        break;
      case 'looking_for_players': {
        const countLabel = missing === 1 ? 'Falta 1 jugador' : `Faltan ${missing || 1} jugadores`;
        title = title || `${countLabel} · ${court}`;
        body = body || `${schedule ? `${schedule} · ` : ''}${input.playerName ? `${input.playerName} busca gente para jugar.` : 'Se buscan jugadores para completar el turno.'} Tocá para sumarte.`;
        break;
      }
      case 'player_joined_match': {
        const joiner = input.playerName || 'Un jugador';
        title = title || `¡Se sumó ${joiner}! #${code}`;
        body = body || `${court}${schedule ? ` (${schedule})` : ''}. ${remaining > 0 ? `Ahora faltan ${remaining}.` : '¡Equipo completo!'}${input.playerPhone ? ` Tel: ${input.playerPhone}` : ''}`;
        break;
      }
      case 'player_invite_match': {
        const inviter = input.playerName || 'Un organizador';
        title = title || `Invitación a jugar · ${court}`;
        body = body || `${inviter} te invitó a sumarte (${schedule || 'hoy'})${missing > 0 ? ` · Faltan ${missing}` : ''}. Tocá para anotarte.`;
        break;
      }
      case 'pre_match_reminder': {
        title = title || `¡Tu partido empieza pronto! · ${court}`;
        body = body || `Turno #${code} (${schedule}). ${balance > 0 ? `Saldo pendiente en cancha: $${balance.toLocaleString('es-AR')}.` : 'Todo listo para salir a jugar.'}`;
        break;
      }
      case 'admin_broadcast': {
        title = title || 'Comunicado · DeportesPMY';
        body = body || 'Hay novedades disponibles en la plataforma.';
        break;
      }
      default:
        title = title || `Actualización de turno #${code}`;
        body = body || `${court}${schedule ? ` · ${schedule}` : ''}. Tocá para ver el estado actualizado.`;
        break;
    }
  }

  const effectiveJoinCode =
    joinCode ||
    (input.eventType === 'looking_for_players' || input.eventType === 'player_invite_match' ? code : '');

  const url = input.eventType === 'admin_broadcast'
    ? '/'
    : effectiveJoinCode
      ? `/?join_booking=${encodeURIComponent(effectiveJoinCode)}`
      : `/?booking_code=${encodeURIComponent(code)}`;

  return {
    title,
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: effectiveJoinCode ? `match-${code}-${input.eventType}` : `booking-${code}-${input.eventType}`,
    url,
    bookingCode: code,
    joinBookingCode: effectiveJoinCode,
    status: input.eventType,
  };
}

async function dispatchBookingPushNotification(input: {
  eventType: string;
  bookingCode: string;
  clientPhone?: string;
  pushDeviceId?: string;
  targetDeviceId?: string;
  excludeDeviceId?: string;
  broadcast?: boolean;
  courtName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  amountPaid?: number;
  balanceDue?: number;
  refundAmount?: number;
  mpRefunded?: boolean;
  customTitle?: string;
  customBody?: string;
  missingPlayers?: number;
  playerName?: string;
  playerPhone?: string;
  remainingPlayers?: number;
  joinBookingCode?: string;
}): Promise<{ ok: boolean; sentCount: number; matchedCount: number }> {
  const keys = await ensureVapidKeys();
  if (!keys) {
    return { ok: false, sentCount: 0, matchedCount: 0 };
  }

  const allSubs = await loadAllPushSubscriptions();
  const targetPhoneNorm = normalizePhoneDigits(input.clientPhone);
  const targetCode = String(input.bookingCode || '').trim().toUpperCase();
  const targetDevice = String(input.targetDeviceId || input.pushDeviceId || '').trim();
  const excludeDevice = String(input.excludeDeviceId || '').trim();

  const matched = allSubs.filter((sub) => {
    if (!sub.enabled || !sub.endpoint || !sub.p256dh || !sub.auth) return false;
    if (excludeDevice && sub.deviceId === excludeDevice) return false;

    if (input.eventType === 'player_invite_match') {
      if (targetDevice && sub.deviceId === targetDevice) return true;
      const subPhoneNorm = normalizePhoneDigits(sub.clientPhone);
      return Boolean(targetPhoneNorm && subPhoneNorm && targetPhoneNorm === subPhoneNorm);
    }

    if (input.broadcast) {
      return true;
    }

    const codeMatch = targetCode && sub.bookingCodes.some((c) => c.trim().toUpperCase() === targetCode);
    const deviceMatch = targetDevice && sub.deviceId === targetDevice;
    const subPhoneNorm = normalizePhoneDigits(sub.clientPhone);
    const phoneMatch = Boolean(targetPhoneNorm && subPhoneNorm && targetPhoneNorm === subPhoneNorm);
    return codeMatch || deviceMatch || phoneMatch;
  });

  if (matched.length === 0) {
    return { ok: true, sentCount: 0, matchedCount: 0 };
  }

  const payload = JSON.stringify(buildBookingPushContent(input));
  let sentCount = 0;

  await Promise.all(
    matched.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
          { TTL: 60 * 60 * 12 }
        );
        sentCount += 1;
      } catch (err: any) {
        const statusCode = Number(err?.statusCode || 0);
        if (statusCode === 404 || statusCode === 410) {
          await deletePushSubFromFirestoreRest(sub.id);
        } else {
          console.warn(`[Push] Error enviando push a ${sub.id}:`, err?.message || err);
        }
      }
    })
  );

  return { ok: true, sentCount, matchedCount: matched.length };
}

interface WhatsAppCloudConfig {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  bookingConfirmedTemplate: string;
  bookingApprovedTemplate: string;
  bookingCancelledTemplate: string;
  missingPlayersTemplate: string;
  tournamentCreatedTemplate: string;
  templateLang: string;
}

function resolveWhatsAppCloudConfig(): WhatsAppCloudConfig {
  return {
    accessToken:
      cleanEnvValue(process.env.WHATSAPP_CLOUD_ACCESS_TOKEN) ||
      cleanEnvValue(process.env.WHATSAPP_ACCESS_TOKEN) ||
      cleanEnvValue(process.env.WHATSAPP_TOKEN) ||
      cleanEnvValue(process.env.META_WHATSAPP_ACCESS_TOKEN) ||
      cleanEnvValue(process.env.META_ACCESS_TOKEN) ||
      '',
    phoneNumberId:
      cleanEnvValue(process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID) ||
      cleanEnvValue(process.env.WHATSAPP_PHONE_NUMBER_ID) ||
      cleanEnvValue(process.env.WHATSAPP_PHONE_ID) ||
      cleanEnvValue(process.env.META_WHATSAPP_PHONE_NUMBER_ID) ||
      cleanEnvValue(process.env.META_PHONE_NUMBER_ID) ||
      '',
    apiVersion: cleanEnvValue(process.env.WHATSAPP_CLOUD_API_VERSION) || 'v21.0',
    bookingConfirmedTemplate: cleanEnvValue(process.env.WHATSAPP_TEMPLATE_BOOKING_CONFIRMED) || '',
    bookingApprovedTemplate: cleanEnvValue(process.env.WHATSAPP_TEMPLATE_BOOKING_APPROVED) || '',
    bookingCancelledTemplate: cleanEnvValue(process.env.WHATSAPP_TEMPLATE_BOOKING_CANCELLED) || '',
    missingPlayersTemplate: cleanEnvValue(process.env.WHATSAPP_TEMPLATE_MISSING_PLAYERS) || '',
    tournamentCreatedTemplate: cleanEnvValue(process.env.WHATSAPP_TEMPLATE_TOURNAMENT_CREATED) || '',
    templateLang: cleanEnvValue(process.env.WHATSAPP_TEMPLATE_LANG) || 'es_AR',
  };
}

function getMissingWhatsAppConfigError(cfg: WhatsAppCloudConfig): string {
  const missing: string[] = [];
  if (!cfg.accessToken) missing.push('WHATSAPP_CLOUD_ACCESS_TOKEN');
  if (!cfg.phoneNumberId) missing.push('WHATSAPP_CLOUD_PHONE_NUMBER_ID');
  if (missing.length === 0) return '';
  return `WhatsApp Cloud API no configurada en el servidor (${
    missing.length === 2 ? `faltan ${missing[0]} y ${missing[1]}` : `falta ${missing[0]}`
  }).`;
}

function formatPhoneForWhatsAppCloud(rawPhone?: string): string {
  let digits = String(rawPhone || '').replace(/\D/g, '').replace(/^00+/, '');
  if (!digits || digits.length < 8) return '';

  if (digits.startsWith('54')) {
    let rest = digits.slice(2).replace(/^0+/, '');
    if (rest.startsWith('9')) {
      return `54${rest}`;
    }
    if (rest.length === 12) {
      if (rest.startsWith('11') && rest.slice(2, 4) === '15') {
        rest = `11${rest.slice(4)}`;
      } else if (rest.slice(3, 5) === '15') {
        rest = `${rest.slice(0, 3)}${rest.slice(5)}`;
      } else if (rest.slice(4, 6) === '15') {
        rest = `${rest.slice(0, 4)}${rest.slice(6)}`;
      }
    }
    if (rest.length === 10) {
      return `549${rest}`;
    }
    return `54${rest}`;
  }

  digits = digits.replace(/^0+/, '');
  if (digits.length === 12) {
    if (digits.startsWith('11') && digits.slice(2, 4) === '15') {
      digits = `11${digits.slice(4)}`;
    } else if (digits.slice(3, 5) === '15') {
      digits = `${digits.slice(0, 3)}${digits.slice(5)}`;
    } else if (digits.slice(4, 6) === '15') {
      digits = `${digits.slice(0, 4)}${digits.slice(6)}`;
    }
  }

  if (digits.length === 10) {
    return `549${digits}`;
  }

  return digits;
}

function sanitizeTemplateParam(val: unknown): string {
  const cleaned = String(val ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return (cleaned || '-').slice(0, 1000);
}

async function sendWhatsAppCloudMessage(params: {
  to: string;
  textBody: string;
  templateName?: string;
  templateParams?: string[];
  previewUrl?: boolean;
}): Promise<{
  ok: boolean;
  configured: boolean;
  status: 'sent' | 'failed';
  messageId?: string;
  to?: string;
  error?: string;
}> {
  const cfg = resolveWhatsAppCloudConfig();
  if (!cfg.accessToken || !cfg.phoneNumberId) {
    return {
      ok: false,
      configured: false,
      status: 'failed',
      error: getMissingWhatsAppConfigError(cfg),
    };
  }

  const formattedTo = formatPhoneForWhatsAppCloud(params.to);
  if (!formattedTo) {
    return {
      ok: false,
      configured: true,
      status: 'failed',
      error: 'El destinatario no tiene un número de WhatsApp válido.',
    };
  }

  const endpoint = `https://graph.facebook.com/${encodeURIComponent(cfg.apiVersion)}/${encodeURIComponent(cfg.phoneNumberId)}/messages`;

  const payload: Record<string, any> =
    params.templateName && params.templateName.trim().length > 0
      ? {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'template',
          template: {
            name: params.templateName.trim(),
            language: { code: cfg.templateLang },
            ...(Array.isArray(params.templateParams) && params.templateParams.length > 0
              ? {
                  components: [
                    {
                      type: 'body',
                      parameters: params.templateParams.map((p) => ({
                        type: 'text',
                        text: sanitizeTemplateParam(p),
                      })),
                    },
                  ],
                }
              : {}),
          },
        }
      : {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'text',
          text: {
            preview_url: Boolean(params.previewUrl),
            body: String(params.textBody || '').slice(0, 4096),
          },
        };

  try {
    const resp = await resilientFetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      timeoutMs: 12000,
    });

    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.error) {
      const apiErr =
        data?.error?.error_user_msg ||
        data?.error?.message ||
        `Meta WhatsApp Cloud API HTTP ${resp.status}`;
      return {
        ok: false,
        configured: true,
        status: 'failed',
        to: formattedTo,
        error: String(apiErr),
      };
    }

    const messageId = data?.messages?.[0]?.id ? String(data.messages[0].id) : undefined;
    return {
      ok: true,
      configured: true,
      status: 'sent',
      messageId,
      to: formattedTo,
    };
  } catch (err: any) {
    return {
      ok: false,
      configured: true,
      status: 'failed',
      to: formattedTo,
      error: err?.message || 'Error de red comunicando con WhatsApp Cloud API.',
    };
  }
}

interface ServerAvailablePlayerRecord {
  id: string;
  name: string;
  phone: string;
  preferredSports: string[];
  expiresAt?: string;
}

async function loadTodayAvailablePlayersFromFirestore(): Promise<ServerAvailablePlayerRecord[]> {
  if (!firebaseCfg?.projectId || !firebaseCfg?.firestoreDatabaseId || !firebaseCfg?.apiKey) {
    return [];
  }
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseCfg.projectId}/databases/${firebaseCfg.firestoreDatabaseId}/documents/availablePlayers?pageSize=200&key=${encodeURIComponent(firebaseCfg.apiKey)}`;
  try {
    const resp = await resilientFetch(url);
    if (!resp.ok) return [];
    const json: any = await resp.json();
    const docs = Array.isArray(json?.documents) ? json.documents : [];
    const nowMs = Date.now();
    const result: ServerAvailablePlayerRecord[] = [];

    for (const d of docs) {
      const f = d?.fields || {};
      const nameParts = String(d?.name || '').split('/');
      const id = nameParts[nameParts.length - 1] || f.id?.stringValue || '';
      const name = f.name?.stringValue || '';
      const phone = f.phone?.stringValue || '';
      const expiresAt = f.expiresAt?.stringValue || '';
      if (!phone || !name) continue;
      if (expiresAt) {
        const expMs = Date.parse(expiresAt);
        if (!Number.isNaN(expMs) && expMs < nowMs) continue;
      }
      const rawSports = f.preferredSports?.arrayValue?.values;
      const preferredSports: string[] = Array.isArray(rawSports)
        ? rawSports.map((v: any) => String(v?.stringValue || '').trim()).filter(Boolean)
        : [];
      result.push({ id, name, phone, preferredSports, expiresAt });
    }
    return result;
  } catch (err) {
    console.warn('[WhatsApp] No se pudo consultar availablePlayers en Firestore REST:', err);
    return [];
  }
}

async function refreshAdminOAuthTokenIfNeeded(record: AdminTokenRecord): Promise<AdminTokenRecord> {
  const { clientId, clientSecret } = resolveMpOAuthCredentials();
  if (!record.refreshToken || !clientId || !clientSecret) {
    return record;
  }

  if (record.expiresAt) {
    const expiresMs = Date.parse(record.expiresAt);
    if (!Number.isNaN(expiresMs) && expiresMs - Date.now() > 60 * 60 * 1000) {
      return record;
    }
  } else {
    return record;
  }

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: record.refreshToken
    });

    const resp = await resilientFetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    });

    if (!resp.ok) return record;
    const tokenJson: any = await resp.json();
    if (!tokenJson.access_token) return record;

    const updated: AdminTokenRecord = {
      ...record,
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token || record.refreshToken,
      publicKey: tokenJson.public_key || record.publicKey,
      expiresAt: tokenJson.expires_in
        ? new Date(Date.now() + Number(tokenJson.expires_in) * 1000).toISOString()
        : record.expiresAt
    };

    adminTokensStore.set(record.adminId, updated);
    await updateAdminTokensInFirestore(record.adminId, updated);
    return updated;
  } catch (err) {
    console.warn(`Error refrescando token MP de ${record.adminId}:`, err);
    return record;
  }
}

async function fetchAdminProfilePauseFlags(adminId?: string): Promise<{ mpPaused: boolean; transferPaused: boolean }> {
  const cleanId = normalizeAdminId(adminId);
  if (!cleanId) return { mpPaused: false, transferPaused: false };

  const url = getFirestoreDocUrl('settings', `profile_${cleanId}`);
  if (!url) return { mpPaused: false, transferPaused: false };

  try {
    const resp = await resilientFetch(url);
    if (!resp.ok) return { mpPaused: false, transferPaused: false };
    const json: any = await resp.json();
    const fields = json?.fields || {};
    return {
      mpPaused: Boolean(fields.mpPaused?.booleanValue),
      transferPaused: Boolean(fields.transferPaused?.booleanValue),
    };
  } catch {
    return { mpPaused: false, transferPaused: false };
  }
}

async function resolveAdminAccessToken(adminId?: string): Promise<string | null> {
  const cleanId = normalizeAdminId(adminId);
  if (cleanId) {
    let record = adminTokensStore.get(cleanId) || null;
    if (!record) {
      record = await fetchAdminTokensFromFirestore(cleanId);
    }
    if (record?.accessToken) {
      record = await refreshAdminOAuthTokenIfNeeded(record);
      return record.accessToken;
    }
    return null;
  }

  return cleanEnvValue(process.env.MP_ACCESS_TOKEN) || 'APP_USR-8232141916022310-111512-9d71e62289aa4077a789ee389a7cbbde-3844389793';
}

export function createApiApp() {
  const app = express();
  // Guard for serverless runtimes (like Vercel) that pre-parse req.body before Express runs
  app.use((req, _res, next) => {
    if (req.body !== undefined && (req as any)._body === undefined) {
      (req as any)._body = true;
    }
    next();
  });
  app.use(express.json());

  // CORS and no-cache headers for /api routes
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    const reqOrigin = req.headers.origin;
    if (reqOrigin) {
      const lower = reqOrigin.toLowerCase();
      const isAllowed =
        lower === 'https://deportespmy.com.ar' ||
        lower === 'https://www.deportespmy.com.ar' ||
        lower.endsWith('.github.io') ||
        lower.endsWith('.run.app') ||
        lower.endsWith('.vercel.app') ||
        lower.endsWith('.netlify.app') ||
        lower.startsWith('http://localhost:') ||
        lower.startsWith('http://127.0.0.1:');

      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', reqOrigin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
        res.setHeader('Access-Control-Max-Age', '86400');
      }
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.get('/api/health', (req, res) => {
    const { clientId, clientSecret } = resolveMpOAuthCredentials();
    res.json({
      ok: true,
      service: 'deportespmy-api',
      host: getRequestOrigin(req),
      vercelEnv: process.env.VERCEL_ENV || null,
      vercelRegion: process.env.VERCEL_REGION || null,
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
      detectedEnvKeys: listSafeMpEnvKeys(),
      allEnvKeysCount: Object.keys(process.env).length,
      sampleEnvKeys: Object.keys(process.env).sort().slice(0, 30),
      rawClientIdSnippet: process.env.MP_CLIENT_ID ? `${process.env.MP_CLIENT_ID.slice(0, 4)}... (len ${process.env.MP_CLIENT_ID.length})` : null,
      rawClientSecretSnippet: process.env.MP_CLIENT_SECRET ? `${process.env.MP_CLIENT_SECRET.slice(0, 4)}... (len ${process.env.MP_CLIENT_SECRET.length})` : null,
    });
  });

  const port = Number(process.env.PORT) || 3000;

  function getAppUrl(fallbackOrigin?: string): string {
    const envUrl = process.env.APP_URL;
    if (envUrl && envUrl !== 'MY_APP_URL' && envUrl.trim().length > 0 && !envUrl.includes('localhost')) {
      return envUrl.trim().replace(/\/$/, '');
    }
    if (fallbackOrigin && fallbackOrigin.trim().length > 0) {
      return fallbackOrigin.trim().replace(/\/$/, '');
    }
    if (envUrl && envUrl !== 'MY_APP_URL' && envUrl.trim().length > 0) {
      return envUrl.trim().replace(/\/$/, '');
    }
    return `http://localhost:${port}`;
  }

  function getRequestOrigin(req?: express.Request): string | null {
    if (!req) return null;
    const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim();
    const host = forwardedHost || req.get('host') || '';
    if (!host) return null;
    const protoHeader = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
    const proto = protoHeader || (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https');
    return `${proto}://${host}`.replace(/\/$/, '');
  }

  function getOAuthRedirectUri(req?: express.Request): string {
    const reqOrigin = getRequestOrigin(req);
    if (
      reqOrigin &&
      (reqOrigin === 'https://deportespmy.com.ar' ||
        reqOrigin === 'https://www.deportespmy.com.ar' ||
        reqOrigin.endsWith('.run.app') ||
        reqOrigin.endsWith('.onrender.com') ||
        reqOrigin.endsWith('.koyeb.app') ||
        reqOrigin.endsWith('.vercel.app') ||
        reqOrigin.endsWith('.netlify.app') ||
        reqOrigin.endsWith('.up.railway.app') ||
        reqOrigin.endsWith('.fly.dev'))
    ) {
      return `${reqOrigin}/api/mercadopago/oauth/callback`;
    }
    const envUrl = process.env.APP_URL;
    const base = (envUrl && envUrl !== 'MY_APP_URL' && envUrl.trim().length > 0 && !envUrl.includes('localhost'))
      ? envUrl.trim().replace(/\/$/, '')
      : (reqOrigin || `http://localhost:${port}`);
    return `${base}/api/mercadopago/oauth/callback`;
  }

  function getMercadoPagoClient(token?: string | null) {
    if (!token) return null;
    return new MercadoPagoConfig({ accessToken: token });
  }

  // ==========================================
  // 1. MERCADO PAGO 3P OAUTH ENDPOINTS
  // ==========================================

  app.get('/api/mercadopago/oauth/status', async (req, res) => {
    const adminId = normalizeAdminId(req.query.adminId);
    const { clientId, clientSecret } = resolveMpOAuthCredentials();
    const configured = Boolean(clientId && clientSecret);
    let connectedRecord: AdminTokenRecord | null = null;

    if (adminId) {
      connectedRecord = adminTokensStore.get(adminId) || await fetchAdminTokensFromFirestore(adminId);
    }

    res.json({
      configured,
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
      vercelEnv: process.env.VERCEL_ENV || null,
      host: getRequestOrigin(req),
      detectedEnvKeys: listSafeMpEnvKeys(),
      callbackUrl: getOAuthRedirectUri(req),
      connected: Boolean(connectedRecord?.accessToken),
      userId: connectedRecord?.userId || null,
      nickname: connectedRecord?.nickname || null,
      email: connectedRecord?.email || null
    });
  });

  app.get('/api/mercadopago/oauth/url', (req, res) => {
    const adminId = normalizeAdminId(req.query.adminId);
    if (!adminId) {
      return res.status(400).json({ error: 'Se requiere identificar al administrador (adminId).' });
    }

    const { clientId, clientSecret } = resolveMpOAuthCredentials();
    const redirectUri = getOAuthRedirectUri(req);

    if (!clientId || !clientSecret) {
      const missing: string[] = [];
      if (!clientId) missing.push('MP_CLIENT_ID');
      if (!clientSecret) missing.push('MP_CLIENT_SECRET');
      const envTag = process.env.VERCEL_ENV ? ` (entorno Vercel: ${process.env.VERCEL_ENV})` : '';
      return res.status(400).json({
        configured: false,
        hasClientId: Boolean(clientId),
        hasClientSecret: Boolean(clientSecret),
        vercelEnv: process.env.VERCEL_ENV || null,
        callbackUrl: redirectUri,
        error: `Falta configurar ${missing.join(' y ')} en las variables de entorno del servidor${envTag}. Recordá hacer Redeploy luego de guardarlas.`
      });
    }

    const statePayload = Buffer.from(JSON.stringify({
      adminId,
      redirectUri,
      ts: Date.now()
    })).toString('base64url');

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      platform_id: 'mp',
      state: statePayload,
      redirect_uri: redirectUri
    });

    const authUrl = `https://auth.mercadopago.com/authorization?${params.toString()}`;
    res.json({
      configured: true,
      url: authUrl,
      redirectUri
    });
  });

  const handleOAuthCallback = async (req: express.Request, res: express.Response) => {
    const { code, state, error, error_description } = req.query as Record<string, string | undefined>;

    const renderCallbackHtml = (scriptPayload: Record<string, unknown>, title: string, message: string, isError = false) => {
      const safeJson = JSON.stringify(scriptPayload).replace(/</g, '\\u003c');
      return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
      .card { background: #1e293b; border: 1px solid ${isError ? '#ef4444' : '#10b981'}; border-radius: 20px; padding: 28px; max-width: 420px; width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
      h1 { font-size: 18px; margin: 0 0 8px; color: ${isError ? '#fca5a5' : '#34d399'}; }
      p { font-size: 13px; color: #cbd5e1; margin: 0 0 18px; line-height: 1.5; }
      button { background: ${isError ? '#334155' : '#10b981'}; color: ${isError ? '#fff' : '#020617'}; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${title}</h1>
      <p>${message}</p>
      <button onclick="window.close()">Cerrar Ventana</button>
    </div>
    <script>
      (function () {
        var payload = ${safeJson};
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, '*');
            setTimeout(function () { window.close(); }, 350);
          }
        } catch (e) {
          console.error('postMessage error:', e);
        }
      })();
    </script>
  </body>
</html>`;
    };

    if (error || !code) {
      return res.send(renderCallbackHtml(
        {
          type: 'MP_OAUTH_ERROR',
          error: error_description || error || 'Autorización cancelada o código faltante.'
        },
        'Conexión cancelada',
        error_description || 'No se completó la autorización en Mercado Pago. Podés cerrar esta ventana e intentar nuevamente.',
        true
      ));
    }

    let adminId = '';
    let stateRedirectUri = '';
    try {
      if (state) {
        const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
        adminId = normalizeAdminId(decoded?.adminId);
        if (typeof decoded?.redirectUri === 'string' && decoded.redirectUri.startsWith('http')) {
          stateRedirectUri = decoded.redirectUri;
        }
      }
    } catch {
      adminId = '';
    }

    if (!adminId) {
      return res.send(renderCallbackHtml(
        { type: 'MP_OAUTH_ERROR', error: 'Estado de sesión inválido (adminId faltante).' },
        'Error de validación',
        'No pudimos identificar al administrador que inició la conexión. Cerrá esta ventana y volvé a intentarlo.',
        true
      ));
    }

    const { clientId, clientSecret } = resolveMpOAuthCredentials();
    if (!clientId || !clientSecret) {
      return res.send(renderCallbackHtml(
        { type: 'MP_OAUTH_ERROR', error: 'Credenciales de plataforma MP_CLIENT_ID / MP_CLIENT_SECRET no configuradas.' },
        'Error de servidor',
        'Faltan configurar MP_CLIENT_ID y MP_CLIENT_SECRET en el servidor.',
        true
      ));
    }

    try {
      const redirectUri = stateRedirectUri || getOAuthRedirectUri(req);
      const tokenBody = new URLSearchParams({
        client_secret: clientSecret,
        client_id: clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      });

      const tokenResp = await resilientFetch('https://api.mercadopago.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: tokenBody.toString()
      });

      const tokenRawText = await tokenResp.text();
      let tokenData: any = null;
      try {
        tokenData = JSON.parse(tokenRawText);
      } catch {
        console.error('Mercado Pago OAuth devolvió respuesta no-JSON:', tokenResp.status, tokenRawText.slice(0, 300));
        return res.send(renderCallbackHtml(
          {
            type: 'MP_OAUTH_ERROR',
            error: `Mercado Pago devolvió una respuesta inesperada (HTTP ${tokenResp.status}). Verificá el Client ID, Client Secret y la Redirect URI (${redirectUri}).`
          },
          'Error al vincular cuenta',
          `Mercado Pago devolvió una respuesta inválida (HTTP ${tokenResp.status}). Verificá las credenciales de tu aplicación en Mercado Pago Developers.`,
          true
        ));
      }

      if (!tokenResp.ok || !tokenData?.access_token) {
        console.error('Mercado Pago OAuth token error:', tokenData);
        return res.send(renderCallbackHtml(
          {
            type: 'MP_OAUTH_ERROR',
            error: tokenData?.message || tokenData?.error_description || 'Mercado Pago rechazó el código de autorización.'
          },
          'Error al vincular cuenta',
          tokenData?.message || 'No se pudo obtener el token de Mercado Pago. Verificá que la Redirect URI coincida exactamente.',
          true
        ));
      }

      let nickname = '';
      let email = '';
      let mpUserId = tokenData.user_id ? String(tokenData.user_id) : '';
      try {
        const userResp = await resilientFetch('https://api.mercadopago.com/users/me', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        if (userResp.ok) {
          const userData: any = await userResp.json();
          nickname = userData.nickname || `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
          email = userData.email || '';
          if (userData.id) mpUserId = String(userData.id);
        }
      } catch (userErr) {
        console.warn('No se pudo obtener /users/me de Mercado Pago:', userErr);
      }

      const expiresAt = tokenData.expires_in
        ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString()
        : '';
      const connectedAt = new Date().toISOString();

      const record: AdminTokenRecord = {
        adminId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || '',
        publicKey: tokenData.public_key || '',
        userId: mpUserId,
        nickname,
        email,
        expiresAt,
        connectedAt
      };

      adminTokensStore.set(adminId, record);
      await updateAdminTokensInFirestore(adminId, record);

      return res.send(renderCallbackHtml(
        {
          type: 'MP_OAUTH_SUCCESS',
          adminId,
          mpData: {
            mpOAuthConnected: true,
            mpUserId,
            mpAccountNickname: nickname,
            mpAccountEmail: email,
            mpAccessToken: tokenData.access_token,
            mpRefreshToken: tokenData.refresh_token || '',
            mpPublicKey: tokenData.public_key || '',
            mpTokenExpiresAt: expiresAt,
            mpConnectedAt: connectedAt
          }
        },
        '¡Cuenta de Mercado Pago conectada!',
        `Tu cuenta ${nickname || email || mpUserId} quedó vinculada correctamente. Esta ventana se cerrará automáticamente.`
      ));
    } catch (err: any) {
      console.error('OAuth callback exception:', err);
      return res.send(renderCallbackHtml(
        { type: 'MP_OAUTH_ERROR', error: err?.message || 'Error inesperado durante la vinculación.' },
        'Error de conexión',
        'Ocurrió un error al comunicarse con Mercado Pago. Cerrá esta ventana y volvé a intentar.',
        true
      ));
    }
  };

  app.get(['/api/mercadopago/oauth/callback', '/api/mercadopago/oauth/callback/'], handleOAuthCallback);

  app.post('/api/mercadopago/oauth/disconnect', async (req, res) => {
    const adminId = normalizeAdminId(req.body?.adminId);
    if (adminId) {
      adminTokensStore.delete(adminId);
    }
    res.json({ disconnected: true });
  });

  // ==========================================
  // 2. CHECKOUT PRO PREFERENCE (SCOPED PER ADMIN)
  // ==========================================

  app.post('/api/mercadopago/preference', async (req, res) => {
    try {
      const {
        bookingId,
        bookingCode,
        courtName,
        date,
        startTime,
        title,
        unit_price,
        quantity,
        clientName,
        clientEmail,
        clientPhone,
        adminId,
        origin
      } = req.body;

      const cleanAdminId = normalizeAdminId(adminId);
      const { mpPaused } = await fetchAdminProfilePauseFlags(cleanAdminId);
      if (mpPaused) {
        return res.status(403).json({
          error: 'El complejo pausó temporalmente los cobros con Mercado Pago.',
          methodPaused: true
        });
      }

      const resolvedToken = await resolveAdminAccessToken(cleanAdminId);
      const client = getMercadoPagoClient(resolvedToken);

      const reqOrigin = getRequestOrigin(req);
      const clientOrigin = (typeof origin === 'string' && /^https?:\/\//i.test(origin.trim()))
        ? origin.trim().replace(/\/$/, '')
        : getAppUrl(reqOrigin || undefined);
      const backendWebhookBase = (reqOrigin && reqOrigin.startsWith('https://'))
        ? reqOrigin
        : getAppUrl(reqOrigin || undefined);

      const referenceCode = bookingCode || bookingId || `PMY-${Date.now()}`;
      const itemTitle = title || `Reserva ${courtName || 'Cancha'} - ${date || ''} (${startTime || ''} hs)`;
      const price = Number(unit_price);

      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ error: 'Importe de pago inválido.' });
      }

      if (!client) {
        return res.status(400).json({
          error: 'El complejo aún no vinculó su cuenta de Mercado Pago por OAuth.',
          requiresOAuth: true
        });
      }

      const preference = new Preference(client);
      const adminQueryParam = cleanAdminId ? `&admin_id=${encodeURIComponent(cleanAdminId)}` : '';

      const backUrlSuccess = `${clientOrigin}/?payment=success&status=approved&collection_status=approved&booking_code=${encodeURIComponent(referenceCode)}&court_name=${encodeURIComponent(courtName || 'Cancha')}&booking_date=${encodeURIComponent(date || '')}&booking_time=${encodeURIComponent(startTime || '')}${adminQueryParam}`;
      const backUrlFailure = `${clientOrigin}/?payment=failure&status=rejected&collection_status=rejected&booking_code=${encodeURIComponent(referenceCode)}${adminQueryParam}`;
      const backUrlPending = `${clientOrigin}/?payment=pending&status=pending&collection_status=pending&booking_code=${encodeURIComponent(referenceCode)}${adminQueryParam}`;

      const preferenceBody: any = {
        items: [
          {
            id: referenceCode,
            title: itemTitle,
            quantity: Number(quantity) || 1,
            unit_price: price,
            currency_id: 'ARS'
          }
        ],
        payer: {
          name: clientName || 'Jugador PMY',
          email: clientEmail || 'jugador@deportespmy.com.ar',
          phone: clientPhone ? { number: clientPhone.replace(/\D/g, '') } : undefined
        },
        back_urls: {
          success: backUrlSuccess,
          failure: backUrlFailure,
          pending: backUrlPending
        },
        auto_return: 'approved',
        external_reference: referenceCode,
        statement_descriptor: 'DEPORTES PMY'
      };

      if (backendWebhookBase.startsWith('https://')) {
        preferenceBody.notification_url = `${backendWebhookBase}/api/mercadopago/webhook?booking_code=${encodeURIComponent(referenceCode)}${adminQueryParam}`;
      }

      let result: any;
      try {
        result = await preference.create({ body: preferenceBody });
      } catch {
        const directPrefResp = await resilientFetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resolvedToken}`
          },
          body: JSON.stringify(preferenceBody)
        });
        const prefJson = await directPrefResp.json();
        if (!directPrefResp.ok) {
          throw new Error(prefJson?.message || `Mercado Pago HTTP ${directPrefResp.status}`);
        }
        result = prefJson;
      }

      res.json({
        id: result.id,
        init_point: result.init_point,
        sandbox_init_point: result.sandbox_init_point,
        isSimulated: false
      });
    } catch (error: any) {
      console.error('Mercado Pago preference error:', error);
      res.status(500).json({
        error: 'Error al generar la preferencia de Mercado Pago',
        details: error?.message || error
      });
    }
  });

  // ==========================================
  // 3. MERCADO PAGO WEBHOOK (AUTOMATIC APPROVAL)
  // ==========================================

  app.post('/api/mercadopago/webhook', async (req, res) => {
    try {
      const paymentId = req.body?.data?.id
        || req.query?.['data.id']
        || (req.query?.topic === 'payment' ? req.query?.id : null)
        || req.body?.id;

      const adminId = normalizeAdminId(req.query?.admin_id || req.body?.admin_id);
      const bookingCodeHint = String(req.query?.booking_code || '');

      if (!paymentId) {
        return res.status(200).send('Event received but no payment id');
      }

      const token = await resolveAdminAccessToken(adminId);
      const client = getMercadoPagoClient(token);
      if (!client) {
        return res.status(200).send('Admin Mercado Pago token not configured');
      }

      let paymentData: any = null;
      try {
        const payment = new Payment(client);
        paymentData = await payment.get({ id: String(paymentId) });
      } catch {
        const directPayResp = await resilientFetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(paymentId))}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (directPayResp.ok) {
          paymentData = await directPayResp.json();
        }
      }

      if (paymentData && paymentData.status === 'approved' && Number(paymentData.transaction_amount) > 0) {
        const bookingCode = paymentData.external_reference || bookingCodeHint || '';
        const amount = Number(paymentData.transaction_amount) || 0;
        console.log(`✅ WEBHOOK PAGO APROBADO [${adminId || 'global'}]: ID ${paymentId} | Reserva: ${bookingCode} | $${amount}`);

        const record = {
          paymentId: String(paymentId),
          status: 'approved',
          amount,
          bookingCode,
          adminId: adminId || undefined,
          approvedAt: new Date().toISOString()
        };

        verifiedPayments.set(String(paymentId), record);
        if (bookingCode) {
          verifiedPayments.set(bookingCode, record);
          await confirmBookingInFirestore(bookingCode, String(paymentId), amount);
        }
      }

      res.status(200).send('OK');
    } catch (err) {
      console.error('Error procesando webhook de Mercado Pago:', err);
      res.status(200).send('Error logged');
    }
  });

  // ==========================================
  // 4. REAL-TIME VERIFICATION ENDPOINT
  // ==========================================

  app.get('/api/mercadopago/verify-payment', async (req, res) => {
    try {
      const rawPaymentId = req.query.payment_id as string | undefined;
      const paymentId = rawPaymentId && rawPaymentId !== 'null' && rawPaymentId !== 'undefined' && /^[0-9]{4,32}$/.test(rawPaymentId)
        ? rawPaymentId
        : undefined;
      const rawBookingCode = req.query.booking_code as string | undefined;
      const bookingCode = rawBookingCode && /^[A-Za-z0-9_-]{3,40}$/.test(rawBookingCode) ? rawBookingCode : undefined;
      const adminId = normalizeAdminId(req.query.admin_id);

      if (paymentId && verifiedPayments.has(paymentId)) {
        return res.json({ verified: true, ...verifiedPayments.get(paymentId) });
      }
      if (bookingCode && verifiedPayments.has(bookingCode)) {
        return res.json({ verified: true, ...verifiedPayments.get(bookingCode) });
      }

      const token = await resolveAdminAccessToken(adminId);

      if (paymentId && token) {
        try {
          let paymentData: any = null;
          const client = getMercadoPagoClient(token);
          if (client) {
            try {
              const payment = new Payment(client);
              paymentData = await payment.get({ id: paymentId });
            } catch {
              const directResp = await resilientFetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (directResp.ok) {
                paymentData = await directResp.json();
              }
            }
          }

          if (paymentData) {
            const amount = Number(paymentData.transaction_amount) || 0;
            const resolvedCode = paymentData.external_reference || bookingCode || '';
            const matchesBooking = !bookingCode || !paymentData.external_reference || paymentData.external_reference === bookingCode;
            const isApproved = paymentData.status === 'approved' && amount > 0 && matchesBooking;

            if (isApproved) {
              const record = {
                paymentId: String(paymentData.id),
                status: 'approved',
                amount,
                bookingCode: resolvedCode,
                adminId: adminId || undefined,
                approvedAt: new Date().toISOString()
              };
              verifiedPayments.set(String(paymentData.id), record);
              if (resolvedCode) {
                verifiedPayments.set(resolvedCode, record);
                await confirmBookingInFirestore(resolvedCode, String(paymentData.id), amount);
              }
            }

            return res.json({
              verified: isApproved,
              status: paymentData.status,
              paymentId: String(paymentData.id),
              amount,
              bookingCode: resolvedCode,
              approvedAt: new Date().toISOString()
            });
          }
        } catch (apiErr: any) {
          console.warn('Error consultando payment.get en MP:', apiErr?.code || apiErr?.message || apiErr);
        }
      }

      if (bookingCode && token) {
        try {
          const searchResp = await resilientFetch(
            `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(bookingCode)}&sort=date_created&criteria=desc&limit=5`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          if (searchResp.ok) {
            const searchData: any = await searchResp.json();
            const results: any[] = Array.isArray(searchData?.results) ? searchData.results : [];
            const approved = results.find(
              p => p.status === 'approved' && Number(p.transaction_amount) > 0 && (!p.external_reference || p.external_reference === bookingCode)
            );
            if (approved) {
              const pId = String(approved.id);
              const amount = Number(approved.transaction_amount) || 0;
              const record = {
                paymentId: pId,
                status: 'approved',
                amount,
                bookingCode,
                adminId: adminId || undefined,
                approvedAt: new Date().toISOString()
              };
              verifiedPayments.set(pId, record);
              verifiedPayments.set(bookingCode, record);
              await confirmBookingInFirestore(bookingCode, pId, amount);

              return res.json({ verified: true, ...record });
            }

            const latest = results[0];
            if (latest) {
              return res.json({
                verified: false,
                status: latest.status,
                paymentId: String(latest.id),
                bookingCode
              });
            }
          }
        } catch (searchErr: any) {
          console.warn('Error buscando pagos por external_reference en MP:', searchErr?.code || searchErr?.cause?.code || searchErr?.message || searchErr);
        }
      }

      res.json({ verified: false, status: 'pending' });
    } catch (err: any) {
      console.error('Error al verificar pago:', err);
      res.status(500).json({ verified: false, error: err?.message || String(err) });
    }
  });

  // ==========================================
  // 5. MERCADO PAGO AUTOMATIC REFUND ON ADMIN CANCELLATION
  // ==========================================

  app.post('/api/mercadopago/refund', async (req, res) => {
    try {
      const { bookingCode, paymentReference, amountPaid, adminId } = req.body || {};
      const cleanAdminId = normalizeAdminId(adminId);
      const paidNum = Number(amountPaid) || 0;

      if (paidNum <= 0) {
        return res.json({ ok: true, mpRefunded: false, manualRefundRequired: false, refundedAmount: 0 });
      }

      const token = await resolveAdminAccessToken(cleanAdminId);
      if (!token) {
        return res.json({
          ok: true,
          mpRefunded: false,
          manualRefundRequired: true,
          refundedAmount: paidNum,
          message: 'El complejo no tiene Mercado Pago OAuth conectado; registrá la devolución manualmente.'
        });
      }

      let mpPaymentId = '';
      if (typeof paymentReference === 'string') {
        const match = paymentReference.match(/^MP-(\d{5,32})$/);
        if (match) {
          mpPaymentId = match[1];
        }
      }

      if (!mpPaymentId && typeof bookingCode === 'string' && /^[A-Za-z0-9_-]{3,40}$/.test(bookingCode)) {
        try {
          const searchResp = await resilientFetch(
            `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(bookingCode)}&sort=date_created&criteria=desc&limit=5`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (searchResp.ok) {
            const searchData: any = await searchResp.json();
            const results: any[] = Array.isArray(searchData?.results) ? searchData.results : [];
            const approved = results.find(p => p.status === 'approved');
            if (approved?.id) {
              mpPaymentId = String(approved.id);
            }
          }
        } catch {}
      }

      if (!mpPaymentId) {
        return res.json({
          ok: true,
          mpRefunded: false,
          manualRefundRequired: true,
          refundedAmount: paidNum,
          message: 'No se encontró un ID de pago automático en Mercado Pago para esta reserva; corresponde devolución manual.'
        });
      }

      const idempotencyKey = `refund-${bookingCode || mpPaymentId}-${mpPaymentId}`;
      const refundResp = await resilientFetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(mpPaymentId)}/refunds`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify({})
        }
      );

      const refundData: any = await refundResp.json().catch(() => ({}));
      if (!refundResp.ok) {
        console.warn(`⚠️ Error reembolsando pago MP ${mpPaymentId}:`, refundData);
        return res.status(400).json({
          ok: false,
          mpRefunded: false,
          error: refundData?.message || refundData?.error || 'Mercado Pago rechazó la devolución automática.'
        });
      }

      console.log(`💸 REEMBOLSO MP EXITOSO [${cleanAdminId || 'global'}]: Pago ${mpPaymentId} | Refund ${refundData?.id || 'OK'} | $${paidNum}`);
      return res.json({
        ok: true,
        mpRefunded: true,
        refundId: String(refundData?.id || `RF-${mpPaymentId}`),
        refundedAmount: Number(refundData?.amount) || paidNum
      });
    } catch (err: any) {
      console.error('Error en /api/mercadopago/refund:', err);
      res.status(500).json({
        ok: false,
        mpRefunded: false,
        error: err?.message || 'Error de conexión al solicitar reembolso en Mercado Pago.'
      });
    }
  });

  // ==========================================
  // 6. WEB PUSH NOTIFICATIONS (SERVICE WORKER)
  // ==========================================

  app.get('/api/push/vapid-public-key', async (_req, res) => {
    try {
      const keys = await ensureVapidKeys();
      if (!keys) {
        return res.status(503).json({ supported: false, error: 'Servicio Push no disponible.' });
      }
      res.json({ supported: true, publicKey: keys.publicKey });
    } catch (err: any) {
      res.status(500).json({ supported: false, error: err?.message || 'Error obteniendo clave VAPID.' });
    }
  });

  app.post('/api/push/subscribe', async (req, res) => {
    try {
      const {
        deviceId,
        subscription,
        bookingCodes,
        bookingCode,
        clientPhone,
        clientName,
        userAgent
      } = req.body || {};

      const cleanDeviceId = String(deviceId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
      const endpoint = String(subscription?.endpoint || '').trim();
      const p256dh = String(subscription?.keys?.p256dh || '').trim();
      const auth = String(subscription?.keys?.auth || '').trim();

      if (!cleanDeviceId || !endpoint || !p256dh || !auth) {
        return res.status(400).json({ ok: false, error: 'Suscripción push inválida o incompleta.' });
      }

      const existingSubs = await loadAllPushSubscriptions();
      const existing = existingSubs.find((s) => s.id === cleanDeviceId || s.deviceId === cleanDeviceId);

      const codeSet = new Set<string>(existing?.bookingCodes || []);
      if (Array.isArray(bookingCodes)) {
        bookingCodes.forEach((c) => {
          const clean = String(c || '').trim().toUpperCase();
          if (clean) codeSet.add(clean);
        });
      }
      if (bookingCode) {
        const clean = String(bookingCode).trim().toUpperCase();
        if (clean) codeSet.add(clean);
      }

      const now = new Date().toISOString();
      const record: ServerPushSubscriptionRecord = {
        id: cleanDeviceId,
        deviceId: cleanDeviceId,
        endpoint,
        p256dh,
        auth,
        bookingCodes: Array.from(codeSet).slice(-50),
        clientPhone: String(clientPhone || existing?.clientPhone || '').trim().slice(0, 32),
        clientName: String(clientName || existing?.clientName || '').trim().slice(0, 128),
        enabled: true,
        userAgent: String(userAgent || req.headers['user-agent'] || existing?.userAgent || '').slice(0, 200),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      await savePushSubToFirestoreRest(record);
      res.json({ ok: true, id: record.id, bookingCodes: record.bookingCodes });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Error registrando suscripción Push.' });
    }
  });

  app.post('/api/push/unsubscribe', async (req, res) => {
    try {
      const cleanDeviceId = String(req.body?.deviceId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
      if (cleanDeviceId) {
        await deletePushSubFromFirestoreRest(cleanDeviceId);
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Error cancelando suscripción Push.' });
    }
  });

  app.post('/api/push/notify-booking', async (req, res) => {
    try {
      const body = req.body || {};
      const bookingCode = String(body.bookingCode || '').trim();
      if (!bookingCode) {
        return res.status(400).json({ ok: false, error: 'Se requiere bookingCode.' });
      }
      const result = await dispatchBookingPushNotification({
        eventType: String(body.eventType || 'admin_reminder'),
        bookingCode,
        clientPhone: body.clientPhone,
        pushDeviceId: body.pushDeviceId,
        targetDeviceId: body.targetDeviceId,
        excludeDeviceId: body.excludeDeviceId,
        broadcast: Boolean(body.broadcast),
        courtName: body.courtName,
        date: body.date,
        startTime: body.startTime,
        endTime: body.endTime,
        amountPaid: Number(body.amountPaid) || 0,
        balanceDue: Number(body.balanceDue) || 0,
        refundAmount: body.refundAmount !== undefined ? Number(body.refundAmount) : undefined,
        mpRefunded: Boolean(body.mpRefunded),
        customTitle: body.customTitle,
        customBody: body.customBody,
        missingPlayers: body.missingPlayers !== undefined ? Number(body.missingPlayers) : undefined,
        playerName: body.playerName,
        playerPhone: body.playerPhone,
        remainingPlayers: body.remainingPlayers !== undefined ? Number(body.remainingPlayers) : undefined,
        joinBookingCode: body.joinBookingCode,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Error enviando notificación Push.' });
    }
  });

  app.post('/api/push/broadcast', async (req, res) => {
    try {
      const body = req.body || {};
      const title = String(body.title || '').trim() || 'DeportesPMY';
      const message = String(body.body || body.message || '').trim();
      if (!message) {
        return res.status(400).json({ ok: false, error: 'El texto de la notificación no puede estar vacío.' });
      }
      const result = await dispatchBookingPushNotification({
        eventType: 'admin_broadcast',
        bookingCode: `BROADCAST-${Date.now().toString(36).toUpperCase()}`,
        broadcast: true,
        customTitle: title.slice(0, 100),
        customBody: message.slice(0, 320),
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Error enviando notificación masiva Push.' });
    }
  });

  app.post('/api/push/run-reminders', async (_req, res) => {
    try {
      const summary = await runPreMatchReminderSweep();
      res.json({ ok: true, ...summary });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Error ejecutando recordatorios previos.' });
    }
  });

  // =========================================================================
  // WHATSAPP CLOUD API (Meta Graph API) ROUTES
  // Credentials remain strictly server-side in environment variables.
  // =========================================================================
  app.get('/api/whatsapp/status', (_req, res) => {
    const cfg = resolveWhatsAppCloudConfig();
    res.json({
      configured: Boolean(cfg.accessToken && cfg.phoneNumberId),
      hasAccessToken: Boolean(cfg.accessToken),
      hasPhoneNumberId: Boolean(cfg.phoneNumberId),
      hasBookingTemplate: Boolean(cfg.bookingConfirmedTemplate),
      hasBookingApprovedTemplate: Boolean(cfg.bookingApprovedTemplate),
      hasBookingCancelledTemplate: Boolean(cfg.bookingCancelledTemplate),
      hasMissingPlayersTemplate: Boolean(cfg.missingPlayersTemplate),
      hasTournamentCreatedTemplate: Boolean(cfg.tournamentCreatedTemplate),
      apiVersion: cfg.apiVersion,
      templateLang: cfg.templateLang,
    });
  });

  app.post('/api/whatsapp/send-booking-confirmation', async (req, res) => {
    try {
      const body = req.body || {};
      const booking = body.booking || {};
      const eventType = String(body.eventType || 'confirmed');
      const customMessage = typeof body.customMessage === 'string' ? body.customMessage.trim() : '';

      const bookingCode = String(booking.bookingCode || '').trim();
      const clientPhone = String(booking.clientPhone || '').trim();
      const clientName = String(booking.clientName || 'Jugador').trim();
      const courtName = String(booking.courtName || 'Cancha').trim();
      const establishment = String(booking.establishment || 'DeportesPMY').trim();
      const dateStr = String(booking.date || '').trim();
      const startTime = String(booking.startTime || '').trim();
      const endTime = String(booking.endTime || '').trim();
      const totalAmount = Number(booking.totalAmount) || 0;
      const amountPaid = Number(booking.amountPaid) || 0;
      const balanceDue = Number(booking.balanceDue) || 0;
      const paymentMethod = String(booking.paymentMethod || '').toUpperCase();
      const address = String(booking.address || '').trim();
      const welcomeNotes = String(booking.welcomeNotes || '').trim();
      const refundAmount = Number(booking.refundAmount) || 0;
      const mpRefunded = Boolean(booking.mpRefunded);
      const refundReference = String(booking.refundReference || '').trim();

      if (!bookingCode) {
        return res.status(400).json({ ok: false, configured: false, status: 'failed', error: 'Falta bookingCode.' });
      }
      if (!clientPhone) {
        return res.status(400).json({
          ok: false,
          configured: false,
          status: 'failed',
          error: 'El cliente no tiene teléfono cargado para recibir confirmación por WhatsApp.',
        });
      }

      const cfg = resolveWhatsAppCloudConfig();
      const paymentSummary =
        balanceDue > 0
          ? `Abonado $${amountPaid.toLocaleString('es-AR')} · Saldo en cancha $${balanceDue.toLocaleString('es-AR')}`
          : `Abonado $${amountPaid.toLocaleString('es-AR')} (100% cancelado)`;

      const refundSummary =
        refundAmount > 0
          ? (mpRefunded
              ? `Devolución automática de $${refundAmount.toLocaleString('es-AR')} por Mercado Pago`
              : `Corresponde devolución de $${refundAmount.toLocaleString('es-AR')}`) +
            (refundReference ? ` (Ref: ${refundReference})` : '')
          : 'Sin importe pendiente';

      const defaultConfirmedBody =
        `¡Hola ${clientName}! Tu turno en *${establishment}* está *CONFIRMADO*.\n\n` +
        `Cancha: *${courtName}*\n` +
        `Fecha: ${dateStr}\n` +
        `Horario: ${startTime}${endTime ? ` a ${endTime}` : ''} hs\n` +
        `Código: #${bookingCode}\n` +
        `Total: $${totalAmount.toLocaleString('es-AR')} · Abonado: $${amountPaid.toLocaleString('es-AR')}` +
        (paymentMethod ? ` (${paymentMethod})` : '') +
        (balanceDue > 0 ? `\nSaldo en cancha: $${balanceDue.toLocaleString('es-AR')}` : `\nPago 100% cancelado`) +
        (address ? `\nDirección: ${address}` : '') +
        (welcomeNotes ? `\n\n${welcomeNotes}` : '');

      const defaultApprovedBody =
        `¡Hola ${clientName}! Validamos tu comprobante y tu turno en *${establishment}* quedó *APROBADO*.\n\n` +
        `Cancha: *${courtName}*\n` +
        `Fecha: ${dateStr} · ${startTime} hs\n` +
        `Código: #${bookingCode}\n` +
        `${paymentSummary}`;

      const defaultCancelledBody =
        `Hola ${clientName}, tu reserva #${bookingCode} en *${establishment}* (${courtName}, ${dateStr} ${startTime} hs) fue *CANCELADA*. ${refundSummary}.`;

      const textBody =
        customMessage ||
        (eventType === 'cancelled'
          ? defaultCancelledBody
          : eventType === 'approved'
          ? defaultApprovedBody
          : defaultConfirmedBody);

      let selectedTemplateName = '';
      let templateParams: string[] = [];

      if (eventType === 'approved' && cfg.bookingApprovedTemplate) {
        selectedTemplateName = cfg.bookingApprovedTemplate;
        templateParams = [
          clientName,
          establishment,
          courtName,
          `${dateStr} ${startTime} hs`,
          `#${bookingCode}`,
          paymentSummary,
        ];
      } else if ((eventType === 'confirmed' || eventType === 'approved') && cfg.bookingConfirmedTemplate) {
        selectedTemplateName = cfg.bookingConfirmedTemplate;
        templateParams = [
          clientName,
          establishment,
          courtName,
          `${dateStr} ${startTime} hs`,
          `#${bookingCode}`,
          paymentSummary,
        ];
      } else if (eventType === 'cancelled' && cfg.bookingCancelledTemplate) {
        selectedTemplateName = cfg.bookingCancelledTemplate;
        templateParams = [
          clientName,
          `#${bookingCode}`,
          establishment,
          `${courtName} · ${dateStr} ${startTime} hs`,
          refundSummary,
        ];
      }

      const result = await sendWhatsAppCloudMessage({
        to: clientPhone,
        textBody,
        ...(selectedTemplateName
          ? {
              templateName: selectedTemplateName,
              templateParams,
            }
          : {}),
      });

      return res.json({
        ...result,
        preview: textBody,
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        configured: false,
        status: 'failed',
        error: err?.message || 'Error enviando confirmación por WhatsApp Cloud API.',
      });
    }
  });

  app.post('/api/whatsapp/notify-missing-players', async (req, res) => {
    try {
      const body = req.body || {};
      const booking = body.booking || {};
      const eventType = String(body.eventType || 'missing_players');
      const missingPlayers = Math.max(1, Number(body.missingPlayers) || 1);
      const customNote = String(body.message || '').trim();
      const notifyAvailableToday = Boolean(body.notifyAvailableToday);
      const explicitRecipients: Array<{ id?: string; name: string; phone: string }> = Array.isArray(body.recipients)
        ? body.recipients
        : [];

      const bookingCode = String(booking.bookingCode || '').trim();
      const courtName = String(booking.courtName || 'Cancha').trim();
      const establishment = String(booking.establishment || 'DeportesPMY').trim();
      const sport = String(booking.sport || '').trim();
      const dateStr = String(booking.date || '').trim();
      const startTime = String(booking.startTime || '').trim();
      const organizerName = String(booking.clientName || 'Organizador').trim();
      const organizerPhoneNorm = formatPhoneForWhatsAppCloud(booking.clientPhone);

      if (!bookingCode) {
        return res.status(400).json({ ok: false, configured: false, sentCount: 0, failedCount: 0, totalRecipients: 0, results: [], error: 'Falta bookingCode.' });
      }

      const appBase = getAppUrl(getRequestOrigin(req) || undefined);
      const joinUrl = `${appBase}/?join_booking=${encodeURIComponent(bookingCode)}`;

      // Gather target recipients
      const recipientsMap = new Map<string, { name: string; phone: string }>();

      for (const r of explicitRecipients) {
        const formatted = formatPhoneForWhatsAppCloud(r?.phone);
        if (!formatted) continue;
        if (eventType !== 'player_joined' && organizerPhoneNorm && formatted === organizerPhoneNorm) continue;
        recipientsMap.set(formatted, { name: String(r?.name || 'Jugador').trim(), phone: r.phone });
      }

      if (notifyAvailableToday) {
        const availableToday = await loadTodayAvailablePlayersFromFirestore();
        for (const p of availableToday) {
          if (sport && p.preferredSports.length > 0 && !p.preferredSports.includes(sport)) {
            continue;
          }
          const formatted = formatPhoneForWhatsAppCloud(p.phone);
          if (!formatted) continue;
          if (organizerPhoneNorm && formatted === organizerPhoneNorm) continue;
          if (!recipientsMap.has(formatted)) {
            recipientsMap.set(formatted, { name: p.name, phone: p.phone });
          }
        }
      }

      const recipients = Array.from(recipientsMap.values());
      const cfg = resolveWhatsAppCloudConfig();
      const configured = Boolean(cfg.accessToken && cfg.phoneNumberId);

      if (recipients.length === 0) {
        return res.json({
          ok: true,
          configured,
          sentCount: 0,
          failedCount: 0,
          totalRecipients: 0,
          results: [],
        });
      }

      if (!configured) {
        const missingMsg = getMissingWhatsAppConfigError(cfg);
        return res.json({
          ok: false,
          configured: false,
          sentCount: 0,
          failedCount: recipients.length,
          totalRecipients: recipients.length,
          results: recipients.map((r) => ({
            name: r.name,
            phone: r.phone,
            ok: false,
            error: missingMsg,
          })),
          error: missingMsg,
        });
      }

      const perPlayerAmount =
        Number(body.perPlayerAmount) || Number(booking.perPlayerAmount) || 0;
      const joinedPlayerName = String(body.playerName || '').trim();
      const joinedPlayerPhone = String(body.playerPhone || '').trim();
      const remainingPlayers = Math.max(0, Number(body.remainingPlayers) || 0);

      const results = await Promise.all(
        recipients.map(async (recipient) => {
          let textBody = '';
          let useMissingTemplate = false;

          if (eventType === 'player_joined') {
            textBody =
              `¡Hola ${recipient.name}! *${joinedPlayerName || 'Un jugador'}*` +
              (joinedPlayerPhone ? ` (${joinedPlayerPhone})` : '') +
              ` se acaba de sumar a tu partido #${bookingCode} en *${courtName}* (${dateStr} ${startTime} hs). ` +
              (remainingPlayers > 0
                ? `Ahora ${remainingPlayers === 1 ? 'falta 1 jugador' : `faltan ${remainingPlayers} jugadores`}.`
                : `¡Equipo completo!`);
          } else if (eventType === 'player_payment_share') {
            textBody =
              `¡Hola ${recipient.name}! Gracias por sumarte al partido #${bookingCode} en *${establishment}* (${courtName}, ${dateStr} a las ${startTime} hs).` +
              (perPlayerAmount > 0
                ? ` La parte estimada por jugador es $${perPlayerAmount.toLocaleString('es-AR')}.`
                : '');
          } else {
            textBody =
              `¡Hola ${recipient.name}! Faltan *${missingPlayers}* ${missingPlayers === 1 ? 'jugador' : 'jugadores'} para completar un partido en *${establishment}* (${courtName}).\n` +
              `Fecha: ${dateStr} · ${startTime} hs\n` +
              `Organiza: ${organizerName}\n` +
              (customNote ? `Nota: "${customNote}"\n` : '') +
              `Sumate directo desde acá: ${joinUrl}`;
            useMissingTemplate = Boolean(cfg.missingPlayersTemplate);
          }

          const sendRes = await sendWhatsAppCloudMessage({
            to: recipient.phone,
            textBody,
            previewUrl: eventType === 'missing_players' || eventType === 'player_invite',
            ...(useMissingTemplate
              ? {
                  templateName: cfg.missingPlayersTemplate,
                  templateParams: [
                    recipient.name,
                    String(missingPlayers),
                    `${establishment} · ${courtName}`,
                    `${dateStr} ${startTime} hs`,
                    joinUrl,
                  ],
                }
              : {}),
          });

          return {
            name: recipient.name,
            phone: recipient.phone,
            ok: sendRes.ok,
            messageId: sendRes.messageId,
            error: sendRes.error,
          };
        })
      );

      const sentCount = results.filter((r) => r.ok).length;
      const failedCount = results.length - sentCount;

      return res.json({
        ok: sentCount > 0,
        configured: true,
        sentCount,
        failedCount,
        totalRecipients: results.length,
        results,
        ...(sentCount === 0 && results[0]?.error ? { error: results[0].error } : {}),
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        configured: false,
        sentCount: 0,
        failedCount: 0,
        totalRecipients: 0,
        results: [],
        error: err?.message || 'Error enviando avisos de jugadores faltantes por WhatsApp Cloud.',
      });
    }
  });

  app.post('/api/whatsapp/notify-tournament-created', async (req, res) => {
    try {
      const body = req.body || {};
      const tournament = body.tournament || {};
      const title = String(tournament.title || '').trim();
      const establishment = String(tournament.establishment || 'DeportesPMY').trim();
      const sport = String(tournament.sport || '').trim();
      const sportLabel = String(tournament.sportLabel || sport || 'Deporte').trim();
      const dateStr = String(tournament.date || '').trim();
      const endDateStr = String(tournament.endDate || '').trim();
      const startTime = String(tournament.startTime || '').trim();
      const entryFee = Number(tournament.entryFee) || 0;
      const notifyAvailableToday = body.notifyAvailableToday !== false;
      const explicitRecipients: Array<{ name: string; phone: string }> = Array.isArray(body.recipients)
        ? body.recipients
        : [];

      if (!title) {
        return res.status(400).json({
          ok: false,
          configured: false,
          sentCount: 0,
          failedCount: 0,
          totalRecipients: 0,
          results: [],
          error: 'Falta el título del torneo.',
        });
      }

      const appBase = getAppUrl(getRequestOrigin(req) || undefined);
      const tournamentsUrl = `${appBase}/?tab=torneos`;
      const scheduleStr = `${dateStr}${endDateStr ? ` al ${endDateStr}` : ''} · ${startTime} hs`;
      const feeStr = entryFee > 0 ? `$${entryFee.toLocaleString('es-AR')} por equipo` : 'Gratuita';

      const recipientsMap = new Map<string, { name: string; phone: string }>();
      for (const r of explicitRecipients) {
        const formatted = formatPhoneForWhatsAppCloud(r?.phone);
        if (!formatted) continue;
        recipientsMap.set(formatted, { name: String(r?.name || 'Jugador').trim(), phone: r.phone });
      }

      if (notifyAvailableToday) {
        const availableToday = await loadTodayAvailablePlayersFromFirestore();
        for (const p of availableToday) {
          if (sport && p.preferredSports.length > 0 && !p.preferredSports.includes(sport)) {
            continue;
          }
          const formatted = formatPhoneForWhatsAppCloud(p.phone);
          if (!formatted) continue;
          if (!recipientsMap.has(formatted)) {
            recipientsMap.set(formatted, { name: p.name, phone: p.phone });
          }
        }
      }

      const recipients = Array.from(recipientsMap.values()).slice(0, 50);
      const cfg = resolveWhatsAppCloudConfig();
      const configured = Boolean(cfg.accessToken && cfg.phoneNumberId);

      if (recipients.length === 0) {
        return res.json({
          ok: true,
          configured,
          sentCount: 0,
          failedCount: 0,
          totalRecipients: 0,
          results: [],
        });
      }

      if (!configured) {
        const missingMsg = getMissingWhatsAppConfigError(cfg);
        return res.json({
          ok: false,
          configured: false,
          sentCount: 0,
          failedCount: recipients.length,
          totalRecipients: recipients.length,
          results: recipients.map((r) => ({
            name: r.name,
            phone: r.phone,
            ok: false,
            error: missingMsg,
          })),
          error: missingMsg,
        });
      }

      const results = await Promise.all(
        recipients.map(async (recipient) => {
          const textBody =
            `¡Hola ${recipient.name}! Se abrió un nuevo torneo en *${establishment}*: *${title}*.\n\n` +
            `Deporte: ${sportLabel}\n` +
            `Fecha y horario: ${scheduleStr}\n` +
            `Inscripción: ${feeStr}\n` +
            `Inscribí a tu equipo acá: ${tournamentsUrl}`;

          const useTournamentTemplate = Boolean(cfg.tournamentCreatedTemplate);
          const sendRes = await sendWhatsAppCloudMessage({
            to: recipient.phone,
            textBody,
            previewUrl: true,
            ...(useTournamentTemplate
              ? {
                  templateName: cfg.tournamentCreatedTemplate,
                  templateParams: [
                    recipient.name,
                    establishment,
                    title,
                    sportLabel,
                    scheduleStr,
                    feeStr,
                    tournamentsUrl,
                  ],
                }
              : {}),
          });

          return {
            name: recipient.name,
            phone: recipient.phone,
            ok: sendRes.ok,
            messageId: sendRes.messageId,
            error: sendRes.error,
          };
        })
      );

      const sentCount = results.filter((r) => r.ok).length;
      return res.json({
        ok: sentCount > 0,
        configured: true,
        sentCount,
        failedCount: results.length - sentCount,
        totalRecipients: results.length,
        results,
        ...(sentCount === 0 && results[0]?.error ? { error: results[0].error } : {}),
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        configured: false,
        sentCount: 0,
        failedCount: 0,
        totalRecipients: 0,
        results: [],
        error: err?.message || 'Error enviando difusión de torneo por WhatsApp Cloud.',
      });
    }
  });

  // Ensure /api/* routes always respond with JSON (never fall through to SPA HTML)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Ruta de API no encontrada.' });
  });

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api')) {
      return res.status(err?.status || 500).json({ error: err?.message || 'Error interno en el servidor.' });
    }
    next(err);
  });

  return app;
}

let isReminderSweepRunning = false;

export async function runPreMatchReminderSweep(): Promise<{
  checked: number;
  eligible: number;
  sentCount: number;
}> {
  if (isReminderSweepRunning) {
    return { checked: 0, eligible: 0, sentCount: 0 };
  }
  if (!firebaseCfg?.projectId || !firebaseCfg?.firestoreDatabaseId || !firebaseCfg?.apiKey) {
    return { checked: 0, eligible: 0, sentCount: 0 };
  }

  isReminderSweepRunning = true;
  let checked = 0;
  let eligible = 0;
  let sentCount = 0;

  try {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseCfg.projectId}/databases/${firebaseCfg.firestoreDatabaseId}/documents`;
    const keyParam = `key=${encodeURIComponent(firebaseCfg.apiKey)}`;

    const [bookingsResp, settingsResp] = await Promise.all([
      resilientFetch(`${baseUrl}/bookings?pageSize=300&${keyParam}`),
      resilientFetch(`${baseUrl}/settings?pageSize=100&${keyParam}`),
    ]);

    if (!bookingsResp.ok) {
      return { checked: 0, eligible: 0, sentCount: 0 };
    }

    const reminderHoursMap = new Map<string, number>();
    let defaultReminderHours = 2;

    if (settingsResp.ok) {
      const settingsJson: any = await settingsResp.json();
      const settingDocs = Array.isArray(settingsJson?.documents) ? settingsJson.documents : [];
      for (const sDoc of settingDocs) {
        const docId = String(sDoc?.name || '').split('/').pop() || '';
        const hrsRaw = sDoc?.fields?.reminderHoursBefore?.doubleValue ?? sDoc?.fields?.reminderHoursBefore?.integerValue;
        const hrs = Number(hrsRaw);
        if (Number.isFinite(hrs) && hrs > 0 && hrs <= 12) {
          if (docId === 'businessProfile') {
            defaultReminderHours = hrs;
          } else if (docId.startsWith('profile_')) {
            reminderHoursMap.set(normalizeAdminId(docId.replace('profile_', '')), hrs);
          }
        }
      }
    }

    const bookingsJson: any = await bookingsResp.json();
    const docs = Array.isArray(bookingsJson?.documents) ? bookingsJson.documents : [];
    const nowMs = Date.now();

    for (const docItem of docs) {
      const docName = String(docItem?.name || '');
      const f = docItem?.fields || {};
      checked += 1;

      const status = f.status?.stringValue || '';
      const reminderSentAt = f.reminderSentAt?.stringValue || '';
      const clientPhone = f.clientPhone?.stringValue || '';
      const notes = f.notes?.stringValue || '';
      const dateStr = f.date?.stringValue || '';
      const startTime = f.startTime?.stringValue || '';

      if (status !== 'confirmed' || reminderSentAt) continue;
      if (clientPhone.startsWith('BLOQUEO') || notes.startsWith('[BLOQUEO')) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}$/.test(startTime)) continue;

      // Argentina UTC-03:00
      const kickoffMs = Date.parse(`${dateStr}T${startTime}:00-03:00`);
      if (!Number.isFinite(kickoffMs)) continue;

      const adminKey = normalizeAdminId(f.adminId?.stringValue || '');
      const leadHours = reminderHoursMap.get(adminKey) ?? defaultReminderHours;
      const minutesUntilKickoff = (kickoffMs - nowMs) / 60000;

      if (minutesUntilKickoff >= 10 && minutesUntilKickoff <= leadHours * 60) {
        eligible += 1;
        const bookingCode = f.bookingCode?.stringValue || 'PMY';
        const pushRes = await dispatchBookingPushNotification({
          eventType: 'pre_match_reminder',
          bookingCode,
          clientPhone,
          pushDeviceId: f.pushDeviceId?.stringValue || '',
          courtName: f.courtName?.stringValue || 'Cancha',
          date: dateStr,
          startTime,
          endTime: f.endTime?.stringValue || '',
          amountPaid: Number(f.amountPaid?.doubleValue ?? f.amountPaid?.integerValue ?? 0),
          balanceDue: Number(f.balanceDue?.doubleValue ?? f.balanceDue?.integerValue ?? 0),
        });

        sentCount += pushRes.sentCount || 0;

        // Mark reminderSentAt in Firestore even if matchedCount is 0 so we don't rescan endlessly
        const patchUrl = `https://firestore.googleapis.com/v1/${docName}?updateMask.fieldPaths=reminderSentAt&${keyParam}`;
        await resilientFetch(patchUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              reminderSentAt: { stringValue: new Date().toISOString() },
            },
          }),
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[Push Reminders] Error en barrido automático:', err);
  } finally {
    isReminderSweepRunning = false;
  }

  return { checked, eligible, sentCount };
}
