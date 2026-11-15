import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
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
  const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
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
    const resp = await fetch(url);
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
    await fetch(`${base}?${updateMask}&key=${encodeURIComponent(firebaseCfg.apiKey)}`, {
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
    const queryResp = await fetch(queryUrl, {
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

    // Avoid overwriting if already confirmed with same reference
    if (currentStatus === 'confirmed' && fields.paymentReference?.stringValue === `MP-${paymentId}`) {
      return true;
    }

    const effectivePaid = paidAmount > 0 ? paidAmount : (Number(fields.amountPaid?.doubleValue ?? fields.amountPaid?.integerValue ?? 0) || totalAmount * 0.5);
    const balanceDue = Math.max(0, totalAmount - effectivePaid);
    const paymentStatus = balanceDue <= 0 ? 'total_pagado' : 'seña_pagada';

    const patchUrl = `https://firestore.googleapis.com/v1/${docName}?updateMask.fieldPaths=status&updateMask.fieldPaths=paymentStatus&updateMask.fieldPaths=amountPaid&updateMask.fieldPaths=balanceDue&updateMask.fieldPaths=paymentReference&updateMask.fieldPaths=whatsappSent&updateMask.fieldPaths=whatsappSentAt&key=${encodeURIComponent(firebaseCfg.apiKey)}`;

    const patchResp = await fetch(patchUrl, {
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
  if (!record.refreshToken || !process.env.MP_CLIENT_ID || !process.env.MP_CLIENT_SECRET) {
    return record;
  }

  // Refresh if expiresAt is missing or within 1 hour
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
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: record.refreshToken
    });

    const resp = await fetch('https://api.mercadopago.com/oauth/token', {
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

async function resolveAdminAccessToken(adminId?: string, explicitToken?: string): Promise<string | null> {
  const cleanId = normalizeAdminId(adminId);
  if (explicitToken && explicitToken.trim()) {
    if (cleanId && !adminTokensStore.has(cleanId)) {
      adminTokensStore.set(cleanId, { adminId: cleanId, accessToken: explicitToken.trim() });
    }
    return explicitToken.trim();
  }

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

  return process.env.MP_ACCESS_TOKEN || null;
}

async function startServer() {
  const app = express();
  app.use(express.json());

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

  function getOAuthRedirectUri(): string {
    // Strictly use APP_URL from environment per AI Studio OAuth rules
    const envUrl = process.env.APP_URL;
    const base = (envUrl && envUrl !== 'MY_APP_URL' && envUrl.trim().length > 0)
      ? envUrl.trim().replace(/\/$/, '')
      : `http://localhost:${port}`;
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
    const configured = Boolean(process.env.MP_CLIENT_ID && process.env.MP_CLIENT_SECRET);
    let connectedRecord: AdminTokenRecord | null = null;

    if (adminId) {
      connectedRecord = adminTokensStore.get(adminId) || await fetchAdminTokensFromFirestore(adminId);
    }

    res.json({
      configured,
      callbackUrl: getOAuthRedirectUri(),
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

    const clientId = process.env.MP_CLIENT_ID;
    const clientSecret = process.env.MP_CLIENT_SECRET;
    const redirectUri = getOAuthRedirectUri();

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        configured: false,
        callbackUrl: redirectUri,
        error: 'Faltan configurar MP_CLIENT_ID y MP_CLIENT_SECRET en las variables de entorno de AI Studio.'
      });
    }

    const statePayload = Buffer.from(JSON.stringify({
      adminId,
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
    try {
      if (state) {
        const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
        adminId = normalizeAdminId(decoded?.adminId);
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

    const clientId = process.env.MP_CLIENT_ID;
    const clientSecret = process.env.MP_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.send(renderCallbackHtml(
        { type: 'MP_OAUTH_ERROR', error: 'Credenciales de plataforma MP_CLIENT_ID / MP_CLIENT_SECRET no configuradas.' },
        'Error de servidor',
        'Faltan configurar MP_CLIENT_ID y MP_CLIENT_SECRET en el servidor.',
        true
      ));
    }

    try {
      const redirectUri = getOAuthRedirectUri();
      const tokenBody = new URLSearchParams({
        client_secret: clientSecret,
        client_id: clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      });

      const tokenResp = await fetch('https://api.mercadopago.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: tokenBody.toString()
      });

      const tokenData: any = await tokenResp.json();
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

      // Fetch connected seller profile info (/users/me)
      let nickname = '';
      let email = '';
      let mpUserId = tokenData.user_id ? String(tokenData.user_id) : '';
      try {
        const userResp = await fetch('https://api.mercadopago.com/users/me', {
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
        accessToken,
        origin
      } = req.body;

      const cleanAdminId = normalizeAdminId(adminId);
      const resolvedToken = await resolveAdminAccessToken(cleanAdminId, accessToken);
      const client = getMercadoPagoClient(resolvedToken);

      const appUrl = getAppUrl(origin);
      const referenceCode = bookingCode || bookingId || `PMY-${Date.now()}`;
      const itemTitle = title || `Reserva ${courtName || 'Cancha'} - ${date || ''} (${startTime || ''} hs)`;
      const price = Number(unit_price) || 1000;

      if (!client) {
        return res.status(400).json({
          error: 'El complejo aún no vinculó su cuenta de Mercado Pago por OAuth.',
          requiresOAuth: true
        });
      }

      const preference = new Preference(client);
      const adminQueryParam = cleanAdminId ? `&admin_id=${encodeURIComponent(cleanAdminId)}` : '';

      const backUrlSuccess = `${appUrl}/?payment=success&status=approved&collection_status=approved&booking_code=${encodeURIComponent(referenceCode)}&court_name=${encodeURIComponent(courtName || 'Cancha')}&booking_date=${encodeURIComponent(date || '')}&booking_time=${encodeURIComponent(startTime || '')}${adminQueryParam}`;
      const backUrlFailure = `${appUrl}/?payment=failure&status=rejected&collection_status=rejected&booking_code=${encodeURIComponent(referenceCode)}${adminQueryParam}`;
      const backUrlPending = `${appUrl}/?payment=pending&status=pending&collection_status=pending&booking_code=${encodeURIComponent(referenceCode)}${adminQueryParam}`;

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

      // Attach webhook notification_url scoped to admin_id if HTTPS
      if (appUrl.startsWith('https://')) {
        preferenceBody.notification_url = `${appUrl}/api/mercadopago/webhook?booking_code=${encodeURIComponent(referenceCode)}${adminQueryParam}`;
      }

      const result = await preference.create({ body: preferenceBody });

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

      const payment = new Payment(client);
      const paymentData = await payment.get({ id: String(paymentId) });

      if (paymentData && paymentData.status === 'approved') {
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
      const paymentId = rawPaymentId && rawPaymentId !== 'null' && rawPaymentId !== 'undefined' ? rawPaymentId : undefined;
      const bookingCode = req.query.booking_code as string | undefined;
      const adminId = normalizeAdminId(req.query.admin_id);

      // 1. Check in-memory verified cache first
      if (paymentId && verifiedPayments.has(paymentId)) {
        return res.json({ verified: true, ...verifiedPayments.get(paymentId) });
      }
      if (bookingCode && verifiedPayments.has(bookingCode)) {
        return res.json({ verified: true, ...verifiedPayments.get(bookingCode) });
      }

      const token = await resolveAdminAccessToken(adminId);

      // 2. If we have a payment_id, verify directly with Mercado Pago API
      if (paymentId && token) {
        const client = getMercadoPagoClient(token);
        if (client) {
          try {
            const payment = new Payment(client);
            const paymentData = await payment.get({ id: paymentId });
            const isApproved = paymentData.status === 'approved';
            const resolvedCode = paymentData.external_reference || bookingCode || '';
            const amount = Number(paymentData.transaction_amount) || 0;

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
          } catch (apiErr) {
            console.warn('Error consultando payment.get en MP:', apiErr);
          }
        }
      }

      // 3. Search Mercado Pago payments by external_reference (enables automatic polling confirmation)
      if (bookingCode && token) {
        try {
          const searchResp = await fetch(
            `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(bookingCode)}&sort=date_created&criteria=desc&limit=5`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          if (searchResp.ok) {
            const searchData: any = await searchResp.json();
            const results: any[] = Array.isArray(searchData?.results) ? searchData.results : [];
            const approved = results.find(p => p.status === 'approved');
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
        } catch (searchErr) {
          console.warn('Error buscando pagos por external_reference en MP:', searchErr);
        }
      }

      res.json({ verified: false, status: 'pending' });
    } catch (err: any) {
      console.error('Error al verificar pago:', err);
      res.status(500).json({ verified: false, error: err?.message || String(err) });
    }
  });

  // Vite middleware for SPA
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  app.use(vite.middlewares);

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor DeportesPMY iniciado en http://localhost:${port}`);
  });
}

startServer();
