const CACHE_NAME = 'ironpulse-pwa-v2';

// Timeout ativo no Service Worker para o cronômetro de descanso
let restTimerTimeoutId = null;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// 1. Agendamento local no Service Worker (dispara mesmo com a aba em segundo plano)
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  if (data.type === 'SCHEDULE_REST_NOTIFICATION') {
    if (restTimerTimeoutId) {
      clearTimeout(restTimerTimeoutId);
      restTimerTimeoutId = null;
    }

    const delayMs = Math.max(0, (data.endTime || 0) - Date.now());
    const exerciseTitle = data.exerciseTitle || 'Próxima série';

    if (delayMs > 0) {
      restTimerTimeoutId = setTimeout(() => {
        restTimerTimeoutId = null;
        self.registration.showNotification('Descanso Concluído! 🏋️', {
          body: `Hora da próxima série de ${exerciseTitle}!`,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'ironpulse-rest-timer',
          renotify: true,
          requireInteraction: true,
          vibrate: [250, 120, 250, 120, 350],
          data: { url: '/' },
        });
      }, delayMs);
    }
  } else if (data.type === 'CANCEL_REST_NOTIFICATION') {
    if (restTimerTimeoutId) {
      clearTimeout(restTimerTimeoutId);
      restTimerTimeoutId = null;
    }
    self.registration
      .getNotifications({ tag: 'ironpulse-rest-timer' })
      .then((notifications) => {
        notifications.forEach((n) => n.close());
      })
      .catch(() => {});
  }
});

// 2. Web Push (APNs iOS / FCM Android) enviado pelo servidor quando o app está bloqueado
self.addEventListener('push', (event) => {
  if (restTimerTimeoutId) {
    clearTimeout(restTimerTimeoutId);
    restTimerTimeoutId = null;
  }

  let payload = {
    title: 'Descanso Concluído! 🏋️',
    body: 'Seu tempo de descanso acabou. Hora da próxima série!',
    url: '/',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'ironpulse-rest-timer',
      renotify: true,
      requireInteraction: true,
      vibrate: [250, 120, 250, 120, 350],
      data: { url: payload.url || '/' },
    })
  );
});

// Ao tocar na notificação no iPhone/Android, foca ou abre o app direto no treino
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(
            (event.notification.data && event.notification.data.url) || '/'
          );
        }
      })
  );
});
