'use client';

const PUSH_SUBSCRIPTION_STORAGE_KEY = 'ironpulse-push-sub-v1';

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

export function getNotificationPermissionState():
  | NotificationPermission
  | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Solicita permissão de notificação no iPhone (PWA na Tela de Início iOS 16.4+) / Android / Desktop
 * e registra a PushSubscription VAPID para Web Push em segundo plano.
 */
export async function enableRestTimerNotifications(): Promise<{
  granted: boolean;
  pushSubscribed: boolean;
  reason?: string;
}> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      granted: false,
      pushSubscribed: false,
      reason:
        'No iPhone, adicione o app à Tela de Início (Compartilhar -> Adicionar à Tela de Início) para habilitar notificações.',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        granted: false,
        pushSubscribed: false,
        reason: 'Permissão de notificação negada nas configurações do aparelho.',
      };
    }

    if (!('serviceWorker' in navigator)) {
      return { granted: true, pushSubscribed: false };
    }

    const registration = await navigator.serviceWorker.ready;

    // Tenta registrar assinatura Web Push VAPID com o backend Next.js
    if ('pushManager' in registration) {
      try {
        const res = await fetch('/api/push');
        if (res.ok) {
          const { publicKey } = await res.json();
          if (publicKey) {
            let sub = await registration.pushManager.getSubscription();
            if (!sub) {
              sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                  publicKey
                ) as unknown as BufferSource,
              });
            }
            localStorage.setItem(
              PUSH_SUBSCRIPTION_STORAGE_KEY,
              JSON.stringify(sub.toJSON())
            );
            return { granted: true, pushSubscribed: true };
          }
        }
      } catch {
        // Fallback para notificação via Service Worker local
      }
    }

    return { granted: true, pushSubscribed: false };
  } catch {
    return {
      granted: false,
      pushSubscribed: false,
      reason: 'Não foi possível solicitar permissão de notificações.',
    };
  }
}

/**
 * Agenda a notificação do fim do descanso tanto no Service Worker local
 * quanto via Web Push (APNs/FCM) se houver assinatura ativa.
 */
export async function scheduleRestNotification(
  endTimeMs: number,
  exerciseTitle?: string
): Promise<void> {
  if (typeof window === 'undefined') return;

  const title = exerciseTitle || 'Próxima série';

  // 1. Envia para o Service Worker local
  if ('serviceWorker' in navigator && Notification?.permission === 'granted') {
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.active?.postMessage({
          type: 'SCHEDULE_REST_NOTIFICATION',
          endTime: endTimeMs,
          exerciseTitle: title,
        });
      })
      .catch(() => {});
  }

  // 2. Agenda Web Push no servidor para acordar o iPhone com a tela bloqueada
  try {
    let rawSub = localStorage.getItem(PUSH_SUBSCRIPTION_STORAGE_KEY);
    if (
      !rawSub &&
      'serviceWorker' in navigator &&
      Notification?.permission === 'granted'
    ) {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager?.getSubscription();
      if (existing) {
        rawSub = JSON.stringify(existing.toJSON());
        localStorage.setItem(PUSH_SUBSCRIPTION_STORAGE_KEY, rawSub);
      }
    }

    if (rawSub) {
      const subscription = JSON.parse(rawSub);
      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'schedule',
          subscription,
          endTime: endTimeMs,
          exerciseTitle: title,
        }),
      });
    }
  } catch {
    // Ignora falhas de rede offline
  }
}

/**
 * Cancela qualquer notificação de descanso agendada (quando o usuário pula ou descarta o timer).
 */
export async function cancelRestNotification(): Promise<void> {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.active?.postMessage({
          type: 'CANCEL_REST_NOTIFICATION',
        });
      })
      .catch(() => {});
  }

  try {
    const rawSub = localStorage.getItem(PUSH_SUBSCRIPTION_STORAGE_KEY);
    if (rawSub) {
      const subscription = JSON.parse(rawSub);
      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          subscription,
        }),
      });
    }
  } catch {
    // Ignora falhas offline
  }
}

/**
 * Dispara notificação imediata caso a transição para zero ocorra com o app minimizado
 */
export async function triggerImmediateRestNotification(
  exerciseTitle?: string
): Promise<void> {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return;
  }

  const body = `Hora da próxima série${
    exerciseTitle ? ` de ${exerciseTitle}` : ''
  }!`;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification('Descanso Concluído! 🏋️', {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'ironpulse-rest-timer',
      });
      return;
    }
  } catch {
    // Fallback para Notification API direta
  }

  try {
    new Notification('Descanso Concluído! 🏋️', {
      body,
      icon: '/icons/icon-192.png',
      tag: 'ironpulse-rest-timer',
    });
  } catch {
    // Ignore
  }
}
