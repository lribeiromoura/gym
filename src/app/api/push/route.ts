import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

// Chaves VAPID padrão (podem ser sobrescritas via variáveis de ambiente NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY)
const DEFAULT_VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BC-L7rY8wN0M9V1mX7uB_p1W7zF6H4X0k9yR5L8vJ2tQ4nC6sM8dG1bA3kZ9wP5xY7uJ2mN4vQ6rT8pL1sK3wE0';
const DEFAULT_VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'p8Y2vN4mK6xJ9wL1tQ3rF5sG7dH0bA2cZ8uM5nP7vR9';

// Armazena em memória global um par VAPID válido gerado caso as variáveis não sejam chaves EC válidas
const globalForPush = globalThis as unknown as {
  vapidKeys?: { publicKey: string; privateKey: string };
  scheduledJobs?: Map<string, ReturnType<typeof setTimeout>>;
};

function getVapidKeys() {
  if (!globalForPush.vapidKeys) {
    try {
      webpush.setVapidDetails(
        'mailto:contato@ironpulse.app',
        DEFAULT_VAPID_PUBLIC_KEY,
        DEFAULT_VAPID_PRIVATE_KEY
      );
      globalForPush.vapidKeys = {
        publicKey: DEFAULT_VAPID_PUBLIC_KEY,
        privateKey: DEFAULT_VAPID_PRIVATE_KEY,
      };
    } catch {
      const generated = webpush.generateVAPIDKeys();
      webpush.setVapidDetails(
        'mailto:contato@ironpulse.app',
        generated.publicKey,
        generated.privateKey
      );
      globalForPush.vapidKeys = generated;
    }
  }
  return globalForPush.vapidKeys;
}

function getJobsMap() {
  if (!globalForPush.scheduledJobs) {
    globalForPush.scheduledJobs = new Map();
  }
  return globalForPush.scheduledJobs;
}

export async function GET() {
  const keys = getVapidKeys();
  return NextResponse.json({ publicKey: keys.publicKey });
}

export async function POST(req: NextRequest) {
  try {
    getVapidKeys();
    const jobs = getJobsMap();
    const body = await req.json();
    const { action, subscription, endTime, exerciseTitle } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Assinatura de push inválida' },
        { status: 400 }
      );
    }

    const endpointKey = subscription.endpoint as string;

    // Cancela agendamento anterior para este dispositivo, se existir
    const existingTimeout = jobs.get(endpointKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      jobs.delete(endpointKey);
    }

    if (action === 'cancel') {
      return NextResponse.json({ status: 'cancelled' });
    }

    if (action === 'schedule') {
      const delayMs = Math.max(0, Number(endTime) - Date.now());
      const title = 'Descanso Concluído! 🏋️';
      const messageBody = exerciseTitle
        ? `Hora da próxima série de ${exerciseTitle}!`
        : 'Seu tempo de descanso acabou. Hora da próxima série!';

      const timeoutId = setTimeout(async () => {
        jobs.delete(endpointKey);
        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title,
              body: messageBody,
              url: '/',
            }),
            {
              TTL: 120,
              urgency: 'high',
            }
          );
        } catch {
          // Dispositivo desconectado ou assinatura expirada
        }
      }, delayMs);

      jobs.set(endpointKey, timeoutId);

      return NextResponse.json({
        status: 'scheduled',
        delayMs,
      });
    }

    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json(
      { error: 'Falha ao processar agendamento de push' },
      { status: 500 }
    );
  }
}
