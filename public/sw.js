/* Service Worker de Notificaciones Push — DeportesPMY */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'DeportesPMY · Estado de tu reserva',
    body: 'Tenés una actualización en el estado de tu turno.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'deportespmy-booking-update',
    url: '/',
    bookingCode: '',
    status: '',
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = {
        ...payload,
        ...parsed,
      };
    }
  } catch {
    try {
      const text = event.data ? event.data.text() : '';
      if (text) {
        payload.body = text;
      }
    } catch {}
  }

  const joinCode = payload.joinBookingCode ? String(payload.joinBookingCode) : '';
  const targetUrl =
    payload.url ||
    (joinCode
      ? `/?join_booking=${encodeURIComponent(joinCode)}`
      : payload.bookingCode
      ? `/?booking_code=${encodeURIComponent(payload.bookingCode)}`
      : '/');

  const options = {
    body: payload.body,
    icon: payload.icon || '/icon.svg',
    badge: payload.badge || '/icon.svg',
    tag: payload.tag || (payload.bookingCode ? `booking-${payload.bookingCode}` : 'deportespmy-push'),
    renotify: true,
    requireInteraction: false,
    vibrate: [180, 90, 180],
    data: {
      url: targetUrl,
      bookingCode: payload.bookingCode || '',
      joinBookingCode: joinCode,
      status: payload.status || '',
      receivedAt: Date.now(),
    },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title, options),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
        for (const client of clientsList) {
          client.postMessage({
            type: 'PUSH_RECEIVED',
            payload: {
              ...payload,
              joinBookingCode: joinCode,
              url: targetUrl,
            },
          });
        }
      }),
    ])
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SHOW_LOCAL_NOTIFICATION' && data.payload) {
    const p = data.payload;
    const joinCode = p.joinBookingCode ? String(p.joinBookingCode) : '';
    const targetUrl =
      p.url ||
      (joinCode
        ? `/?join_booking=${encodeURIComponent(joinCode)}`
        : p.bookingCode
        ? `/?booking_code=${encodeURIComponent(p.bookingCode)}`
        : '/');

    event.waitUntil(
      self.registration.showNotification(p.title || 'DeportesPMY', {
        body: p.body || 'Actualización en el estado de tu reserva.',
        icon: p.icon || '/icon.svg',
        badge: p.badge || '/icon.svg',
        tag: p.tag || (p.bookingCode ? `booking-${p.bookingCode}` : 'deportespmy-local'),
        renotify: true,
        vibrate: [150, 75, 150],
        data: {
          url: targetUrl,
          bookingCode: p.bookingCode || '',
          joinBookingCode: joinCode,
          status: p.status || '',
        },
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin) {
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              url: targetUrl,
              bookingCode: data.bookingCode || '',
              joinBookingCode: data.joinBookingCode || '',
              status: data.status || '',
              payload: {
                url: targetUrl,
                bookingCode: data.bookingCode || '',
                joinBookingCode: data.joinBookingCode || '',
                status: data.status || '',
              },
            });
            return client.focus();
          }
        } catch {}
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
