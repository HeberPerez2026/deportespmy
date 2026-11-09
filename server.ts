import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

// In-memory cache for verified payment statuses (keyed by external_reference or paymentId)
const verifiedPayments = new Map<string, {
  paymentId: string;
  status: string;
  amount: number;
  bookingCode: string;
  approvedAt: string;
}>();

async function startServer() {
  const app = express();
  app.use(express.json());

  const port = Number(process.env.PORT) || 3000;

  // Helper to get Mercado Pago client instance
  function getMercadoPagoClient(customToken?: string) {
    const token = customToken || process.env.MP_ACCESS_TOKEN;
    if (!token) return null;
    return new MercadoPagoConfig({ accessToken: token });
  }

  // 1. Create Mercado Pago Preference for Checkout Pro
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
        accessToken
      } = req.body;

      const client = getMercadoPagoClient(accessToken);
      const appUrl = (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL')
        ? process.env.APP_URL.replace(/\/$/, '')
        : `http://localhost:${port}`;

      const referenceCode = bookingCode || bookingId || `PMY-${Date.now()}`;
      const itemTitle = title || `Reserva ${courtName || 'Cancha'} - ${date || ''} (${startTime || ''} hs)`;
      const price = Number(unit_price) || 1000;

      // If no Mercado Pago token is configured, return clear notice with mock fallback
      if (!client) {
        console.warn('⚠️ AVISO: No se ha configurado MP_ACCESS_TOKEN en el archivo .env. Modo Simulación activo.');
        return res.json({
          id: 'pref-mock-' + Date.now(),
          init_point: `${appUrl}/?payment=success&booking_code=${encodeURIComponent(referenceCode)}&court_name=${encodeURIComponent(courtName || 'Cancha')}&booking_date=${encodeURIComponent(date || '')}&booking_time=${encodeURIComponent(startTime || '')}&simulated=true`,
          sandbox_init_point: `${appUrl}/?payment=success&booking_code=${encodeURIComponent(referenceCode)}&court_name=${encodeURIComponent(courtName || 'Cancha')}&booking_date=${encodeURIComponent(date || '')}&booking_time=${encodeURIComponent(startTime || '')}&simulated=true`,
          isSimulated: true
        });
      }

      const preference = new Preference(client);

      const backUrlSuccess = `${appUrl}/?payment=success&booking_code=${encodeURIComponent(referenceCode)}&court_name=${encodeURIComponent(courtName || 'Cancha')}&booking_date=${encodeURIComponent(date || '')}&booking_time=${encodeURIComponent(startTime || '')}`;
      const backUrlFailure = `${appUrl}/?payment=failure&booking_code=${encodeURIComponent(referenceCode)}`;
      const backUrlPending = `${appUrl}/?payment=pending&booking_code=${encodeURIComponent(referenceCode)}`;

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

      // Only attach notification_url if using a real HTTPS public domain
      if (appUrl.startsWith('https://')) {
        preferenceBody.notification_url = `${appUrl}/api/mercadopago/webhook`;
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

  // 2. Mercado Pago Webhook (IPN & Webhooks v1/v2)
  app.post('/api/mercadopago/webhook', async (req, res) => {
    try {
      const paymentId = req.body?.data?.id 
        || req.query?.['data.id'] 
        || (req.query?.topic === 'payment' ? req.query?.id : null) 
        || req.body?.id;

      if (!paymentId) {
        return res.status(200).send('Event received but no payment id');
      }

      const client = getMercadoPagoClient();
      if (!client) {
        return res.status(200).send('Client not configured');
      }

      const payment = new Payment(client);
      const paymentData = await payment.get({ id: String(paymentId) });

      if (paymentData && paymentData.status === 'approved') {
        const bookingCode = paymentData.external_reference || '';
        console.log(`✅ PAGO APROBADO: ID ${paymentId} | Código Reserva: ${bookingCode} | Monto: $${paymentData.transaction_amount}`);
        
        verifiedPayments.set(String(paymentId), {
          paymentId: String(paymentId),
          status: 'approved',
          amount: Number(paymentData.transaction_amount) || 0,
          bookingCode,
          approvedAt: new Date().toISOString()
        });

        if (bookingCode) {
          verifiedPayments.set(bookingCode, {
            paymentId: String(paymentId),
            status: 'approved',
            amount: Number(paymentData.transaction_amount) || 0,
            bookingCode,
            approvedAt: new Date().toISOString()
          });
        }
      }

      res.status(200).send('OK');
    } catch (err) {
      console.error('Error procesando webhook de Mercado Pago:', err);
      res.status(200).send('Error logged');
    }
  });

  // 3. Direct verification endpoint for the frontend return page
  app.get('/api/mercadopago/verify-payment', async (req, res) => {
    try {
      const paymentId = req.query.payment_id as string | undefined;
      const bookingCode = req.query.booking_code as string | undefined;

      // Check in-memory verified cache first
      if (paymentId && verifiedPayments.has(paymentId)) {
        return res.json({ verified: true, ...verifiedPayments.get(paymentId) });
      }
      if (bookingCode && verifiedPayments.has(bookingCode)) {
        return res.json({ verified: true, ...verifiedPayments.get(bookingCode) });
      }

      // If we have a payment_id from Mercado Pago query params, verify directly with API
      if (paymentId) {
        const client = getMercadoPagoClient();
        if (client) {
          const payment = new Payment(client);
          const paymentData = await payment.get({ id: paymentId });
          const isApproved = paymentData.status === 'approved';

          return res.json({
            verified: isApproved,
            status: paymentData.status,
            paymentId: String(paymentData.id),
            amount: paymentData.transaction_amount,
            bookingCode: paymentData.external_reference,
            approvedAt: new Date().toISOString()
          });
        }
      }

      // If simulated or no token, return verified if collection_status=approved
      const collectionStatus = req.query.collection_status as string | undefined;
      const status = req.query.status as string | undefined;
      if (collectionStatus === 'approved' || status === 'success') {
        return res.json({
          verified: true,
          status: 'approved',
          paymentId: paymentId || 'MP-MOCK-' + Date.now(),
          bookingCode: bookingCode || 'PMY-LOCAL',
          isSimulated: true
        });
      }

      res.json({ verified: false });
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
