import { apiFetch, safeParseJsonResponse } from '../utils/api';
import { Booking, BookingPushEventType, PushSubscriptionRecord } from '../types';
import {
  savePushSubscriptionToFirestore,
  deletePushSubscriptionFromFirestore,
} from './centralSync';

const STORAGE_DEVICE_ID = 'deportespmy_push_device_id_v1';
const STORAGE_TRACKED_CODES = 'deportespmy_push_booking_codes_v1';
const STORAGE_PUSH_ENABLED = 'deportespmy_push_enabled_v1';
const STORAGE_SENT_TAGS = 'deportespmy_push_local_tags_v1';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window
  );
}

export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function getOrCreatePushDeviceId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_DEVICE_ID);
    if (existing && /^[a-zA-Z0-9_-]{8,100}$/.test(existing)) {
      return existing;
    }
    const randomPart = Math.random().toString(36).slice(2, 10);
    const fresh = `dev_${Date.now().toString(36)}_${randomPart}`;
    localStorage.setItem(STORAGE_DEVICE_ID, fresh);
    return fresh;
  } catch {
    return `dev_${Date.now().toString(36)}`;
  }
}

export function getTrackedBookingCodes(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_TRACKED_CODES);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

export function addTrackedBookingCode(bookingCode?: string): string[] {
  const clean = String(bookingCode || '').trim().toUpperCase();
  const current = getTrackedBookingCodes();
  if (!clean) return current;
  if (!current.includes(clean)) {
    const next = [...current, clean].slice(-40);
    try {
      localStorage.setItem(STORAGE_TRACKED_CODES, JSON.stringify(next));
    } catch {}
    return next;
  }
  return current;
}

export function getStoredPushEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_PUSH_ENABLED) === 'true';
  } catch {
    return false;
  }
}

function setStoredPushEnabled(val: boolean): void {
  try {
    localStorage.setItem(STORAGE_PUSH_ENABLED, val ? 'true' : 'false');
  } catch {}
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn('[Push] No se pudo registrar /sw.js:', err);
    return null;
  }
}

export async function showLocalServiceWorkerNotification(payload: {
  title: string;
  body: string;
  tag: string;
  bookingCode?: string;
  joinBookingCode?: string;
  status?: string;
  url?: string;
}): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') return false;

  try {
    const sentRaw = sessionStorage.getItem(STORAGE_SENT_TAGS);
    const sentList: string[] = sentRaw ? JSON.parse(sentRaw) : [];
    if (sentList.includes(payload.tag)) {
      return false;
    }
    sessionStorage.setItem(STORAGE_SENT_TAGS, JSON.stringify([...sentList.slice(-30), payload.tag]));
  } catch {}

  const targetUrl =
    payload.url ||
    (payload.joinBookingCode
      ? `/?join_booking=${encodeURIComponent(payload.joinBookingCode)}`
      : payload.bookingCode
      ? `/?booking_code=${encodeURIComponent(payload.bookingCode)}`
      : '/');

  try {
    const reg = await registerPushServiceWorker();
    if (!reg) return false;
    const worker = reg.active || reg.waiting || reg.installing;
    if (worker) {
      worker.postMessage({
        type: 'SHOW_LOCAL_NOTIFICATION',
        payload: {
          ...payload,
          url: targetUrl,
        },
      });
      return true;
    }
    await reg.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: payload.tag,
      data: {
        url: targetUrl,
        bookingCode: payload.bookingCode || '',
        joinBookingCode: payload.joinBookingCode || '',
        status: payload.status || '',
      },
    });
    return true;
  } catch (err) {
    console.warn('[Push] Error mostrando notificación local en Service Worker:', err);
    return false;
  }
}

export async function enableDevicePushNotifications(params?: {
  bookingCode?: string;
  clientPhone?: string;
  clientName?: string;
  silentWelcome?: boolean;
}): Promise<{
  ok: boolean;
  permission: NotificationPermission | 'unsupported';
  hasWebPushEndpoint: boolean;
  message: string;
}> {
  if (!isPushSupported()) {
    return {
      ok: false,
      permission: 'unsupported',
      hasWebPushEndpoint: false,
      message: 'Tu navegador no soporta Service Workers ni notificaciones Push.',
    };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    setStoredPushEnabled(false);
    return {
      ok: false,
      permission,
      hasWebPushEndpoint: false,
      message:
        permission === 'denied'
          ? 'Bloqueaste los avisos en el navegador. Habilitalos desde el ícono de candado junto a la URL.'
          : 'No se otorgó permiso para mostrar notificaciones.',
    };
  }

  const reg = await registerPushServiceWorker();
  if (!reg) {
    return {
      ok: false,
      permission,
      hasWebPushEndpoint: false,
      message: 'No se pudo inicializar el Service Worker para notificaciones.',
    };
  }

  const deviceId = getOrCreatePushDeviceId();
  const bookingCodes = addTrackedBookingCode(params?.bookingCode);
  let subscriptionJson: PushSubscriptionJSON | null = null;

  if ('pushManager' in reg) {
    try {
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        subscriptionJson = existingSub.toJSON();
      } else {
        const keyResp = await apiFetch('/api/push/vapid-public-key', {
          headers: { Accept: 'application/json' },
        });
        const keyData = await safeParseJsonResponse(keyResp);
        if (keyResp.ok && keyData?.publicKey) {
          const applicationServerKey = urlBase64ToUint8Array(String(keyData.publicKey));
          const createdSub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey as unknown as BufferSource,
          });
          subscriptionJson = createdSub.toJSON();
        }
      }
    } catch (subErr) {
      console.warn('[Push] PushManager subscribe falló (se usará Service Worker local como respaldo):', subErr);
    }
  }

  const hasWebPushEndpoint = Boolean(
    subscriptionJson?.endpoint && subscriptionJson?.keys?.p256dh && subscriptionJson?.keys?.auth
  );

  if (hasWebPushEndpoint && subscriptionJson) {
    const now = new Date().toISOString();
    const record: PushSubscriptionRecord = {
      id: deviceId,
      deviceId,
      endpoint: String(subscriptionJson.endpoint),
      p256dh: String(subscriptionJson.keys?.p256dh || ''),
      auth: String(subscriptionJson.keys?.auth || ''),
      bookingCodes,
      clientPhone: (params?.clientPhone || '').trim(),
      clientName: (params?.clientName || '').trim(),
      enabled: true,
      userAgent: navigator.userAgent.slice(0, 180),
      createdAt: now,
      updatedAt: now,
    };

    savePushSubscriptionToFirestore(record).catch(() => {});

    try {
      await apiFetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          deviceId,
          subscription: subscriptionJson,
          bookingCodes,
          bookingCode: params?.bookingCode,
          clientPhone: params?.clientPhone,
          clientName: params?.clientName,
          userAgent: navigator.userAgent,
        }),
      });
    } catch {}
  }

  setStoredPushEnabled(true);

  if (!params?.silentWelcome) {
    await showLocalServiceWorkerNotification({
      title: 'Notificaciones activadas · DeportesPMY',
      body: 'Te avisaremos directo en este dispositivo cuando se confirme o actualice el estado de tu reserva.',
      tag: `push-welcome-${Date.now()}`,
      bookingCode: params?.bookingCode,
      url: params?.bookingCode ? `/?booking_code=${encodeURIComponent(params.bookingCode)}` : '/',
    });
  }

  return {
    ok: true,
    permission,
    hasWebPushEndpoint,
    message: hasWebPushEndpoint
      ? 'Notificaciones Push activadas en este dispositivo.'
      : 'Avisos del navegador activados mediante Service Worker.',
  };
}

export async function syncTrackedBookingWithPush(params: {
  bookingCode: string;
  clientPhone?: string;
  clientName?: string;
}): Promise<void> {
  const bookingCodes = addTrackedBookingCode(params.bookingCode);
  if (!isPushSupported() || Notification.permission !== 'granted') return;

  try {
    const reg = await registerPushServiceWorker();
    if (!reg || !('pushManager' in reg)) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const subJson = sub.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) return;

    const deviceId = getOrCreatePushDeviceId();
    const now = new Date().toISOString();
    const record: PushSubscriptionRecord = {
      id: deviceId,
      deviceId,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
      bookingCodes,
      clientPhone: (params.clientPhone || '').trim(),
      clientName: (params.clientName || '').trim(),
      enabled: true,
      userAgent: navigator.userAgent.slice(0, 180),
      createdAt: now,
      updatedAt: now,
    };

    savePushSubscriptionToFirestore(record).catch(() => {});

    await apiFetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        deviceId,
        subscription: subJson,
        bookingCodes,
        bookingCode: params.bookingCode,
        clientPhone: params.clientPhone,
        clientName: params.clientName,
      }),
    });
  } catch {}
}

export async function disableDevicePushNotifications(): Promise<void> {
  const deviceId = getOrCreatePushDeviceId();
  setStoredPushEnabled(false);

  if (isPushSupported()) {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = reg && 'pushManager' in reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await sub.unsubscribe();
      }
    } catch {}
  }

  deletePushSubscriptionFromFirestore(deviceId).catch(() => {});
  try {
    await apiFetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
  } catch {}
}

export async function sendBookingPushNotification(params: {
  booking: Booking;
  eventType: BookingPushEventType;
  mpRefunded?: boolean;
  customTitle?: string;
  customBody?: string;
}): Promise<{ ok: boolean; sentCount: number; matchedCount: number }> {
  const { booking, eventType, mpRefunded, customTitle, customBody } = params;
  try {
    const resp = await apiFetch('/api/push/notify-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        eventType,
        bookingCode: booking.bookingCode,
        clientPhone: booking.clientPhone,
        pushDeviceId: booking.pushDeviceId,
        courtName: booking.courtName,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        amountPaid: booking.amountPaid,
        balanceDue: booking.balanceDue,
        refundAmount: booking.refundAmount,
        mpRefunded,
        customTitle,
        customBody,
      }),
    });
    if (!resp.ok) {
      return { ok: false, sentCount: 0, matchedCount: 0 };
    }
    const data = await safeParseJsonResponse(resp);
    return {
      ok: Boolean(data?.ok),
      sentCount: Number(data?.sentCount) || 0,
      matchedCount: Number(data?.matchedCount) || 0,
    };
  } catch {
    return { ok: false, sentCount: 0, matchedCount: 0 };
  }
}

export async function sendGlobalBroadcastPush(params: {
  title: string;
  body: string;
}): Promise<{ ok: boolean; sentCount: number; matchedCount: number; error?: string }> {
  const cleanTitle = params.title.trim() || 'DeportesPMY';
  const cleanBody = params.body.trim();
  if (!cleanBody) {
    return { ok: false, sentCount: 0, matchedCount: 0, error: 'Escribí un mensaje para enviar.' };
  }
  try {
    const resp = await apiFetch('/api/push/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ title: cleanTitle, body: cleanBody }),
    });
    const data = await safeParseJsonResponse(resp);
    if (!resp.ok) {
      return { ok: false, sentCount: 0, matchedCount: 0, error: data?.error || 'Error enviando aviso Push.' };
    }
    try {
      window.dispatchEvent(new CustomEvent('deportespmy:push_banner', {
        detail: { title: cleanTitle, body: cleanBody },
      }));
    } catch {}
    return {
      ok: Boolean(data?.ok),
      sentCount: Number(data?.sentCount) || 0,
      matchedCount: Number(data?.matchedCount) || 0,
    };
  } catch (err: any) {
    return { ok: false, sentCount: 0, matchedCount: 0, error: err?.message || 'Error de conexión al enviar Push.' };
  }
}

export async function sendMatchLookingForPlayersPush(params: {
  booking: Booking;
  missingPlayers: number;
  message?: string;
}): Promise<{ ok: boolean; sentCount: number; matchedCount: number }> {
  const { booking, missingPlayers, message } = params;
  const myDeviceId = getOrCreatePushDeviceId();
  try {
    const resp = await apiFetch('/api/push/notify-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        eventType: 'looking_for_players',
        broadcast: true,
        excludeDeviceId: myDeviceId,
        bookingCode: booking.bookingCode,
        joinBookingCode: booking.bookingCode,
        courtName: booking.courtName,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        missingPlayers,
        playerName: booking.clientName,
        customBody: message?.trim() || undefined,
      }),
    });
    if (!resp.ok) {
      return { ok: false, sentCount: 0, matchedCount: 0 };
    }
    const data = await safeParseJsonResponse(resp);
    return {
      ok: Boolean(data?.ok),
      sentCount: Number(data?.sentCount) || 0,
      matchedCount: Number(data?.matchedCount) || 0,
    };
  } catch {
    return { ok: false, sentCount: 0, matchedCount: 0 };
  }
}

export async function sendPlayerJoinedMatchPush(params: {
  booking: Booking;
  playerName: string;
  playerPhone: string;
  remainingPlayers: number;
}): Promise<{ ok: boolean; sentCount: number; matchedCount: number }> {
  const { booking, playerName, playerPhone, remainingPlayers } = params;
  try {
    const resp = await apiFetch('/api/push/notify-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        eventType: 'player_joined_match',
        bookingCode: booking.bookingCode,
        clientPhone: booking.clientPhone,
        pushDeviceId: booking.pushDeviceId,
        courtName: booking.courtName,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        playerName,
        playerPhone,
        remainingPlayers,
      }),
    });
    if (!resp.ok) {
      return { ok: false, sentCount: 0, matchedCount: 0 };
    }
    const data = await safeParseJsonResponse(resp);
    return {
      ok: Boolean(data?.ok),
      sentCount: Number(data?.sentCount) || 0,
      matchedCount: Number(data?.matchedCount) || 0,
    };
  } catch {
    return { ok: false, sentCount: 0, matchedCount: 0 };
  }
}

export async function sendPlayerInviteMatchPush(params: {
  booking: Booking;
  targetDeviceId?: string;
  targetPhone?: string;
  missingPlayers: number;
}): Promise<{ ok: boolean; sentCount: number; matchedCount: number }> {
  const { booking, targetDeviceId, targetPhone, missingPlayers } = params;
  try {
    const resp = await apiFetch('/api/push/notify-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        eventType: 'player_invite_match',
        bookingCode: booking.bookingCode,
        joinBookingCode: booking.bookingCode,
        targetDeviceId,
        clientPhone: targetPhone,
        courtName: booking.courtName,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        playerName: booking.clientName,
        missingPlayers,
      }),
    });
    if (!resp.ok) {
      return { ok: false, sentCount: 0, matchedCount: 0 };
    }
    const data = await safeParseJsonResponse(resp);
    return {
      ok: Boolean(data?.ok),
      sentCount: Number(data?.sentCount) || 0,
      matchedCount: Number(data?.matchedCount) || 0,
    };
  } catch {
    return { ok: false, sentCount: 0, matchedCount: 0 };
  }
}
