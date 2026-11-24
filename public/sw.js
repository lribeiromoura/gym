const CACHE_NAME = 'ironpulse-pwa-v3';
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Timeout ativo no Service Worker para o cronômetro de descanso
let restTimerTimeoutId = null;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((oldKey) => caches.delete(oldKey))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // Não intercepta APIs nem requisições de origens externas
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone))
            .catch(() => {});
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          const rootFallback = await caches.match('/');
          if (rootFallback) return rootFallback;
        }
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      })
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
        self.registration.showNotification('Descanso Concluído!', {
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
    title: 'Descanso Concluído!',
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
