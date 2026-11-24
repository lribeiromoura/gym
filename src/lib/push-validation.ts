export const MAX_PUSH_DELAY_MS = 30 * 60 * 1000; // 30 minutos
export const MAX_SCHEDULED_PUSH_JOBS = 500;

const ALLOWED_PUSH_HOST_EXACT = new Set([
  'fcm.googleapis.com',
  'android.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
]);

const ALLOWED_PUSH_HOST_SUFFIXES = [
  '.push.apple.com',
  '.notify.windows.com',
  '.push.services.mozilla.com',
];

/**
 * Valida se o endpoint de Web Push pertence a um provedor oficial (HTTPS),
 * prevenindo SSRF e abuso do relay de notificações.
 */
export function isAllowedPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) return false;
  try {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (ALLOWED_PUSH_HOST_EXACT.has(host)) return true;
    return ALLOWED_PUSH_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
  } catch {
    return false;
  }
}

export interface ValidatedPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function validatePushSubscription(
  sub: unknown
): ValidatedPushSubscription | null {
  if (!sub || typeof sub !== 'object') return null;
  const candidate = sub as Record<string, unknown>;
  if (!isAllowedPushEndpoint(candidate.endpoint)) return null;
  const keys = candidate.keys as Record<string, unknown> | undefined;
  if (
    !keys ||
    typeof keys !== 'object' ||
    typeof keys.p256dh !== 'string' ||
    keys.p256dh.length < 10 ||
    typeof keys.auth !== 'string' ||
    keys.auth.length < 10
  ) {
    return null;
  }
  return {
    endpoint: candidate.endpoint,
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  };
}
