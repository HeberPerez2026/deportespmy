import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

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
  return val.trim().replace(/^["']+|["']+$/g, '').trim();
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

    return patchResp.ok;
  } catch (err) {
    console.warn(`[Firestore REST] Error confirmando reserva ${bookingCode}:`, err);
    return false;
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
      (reqOrigin.endsWith('.run.app') ||
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
