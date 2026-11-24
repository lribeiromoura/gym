import { NextRequest, NextResponse } from 'next/server';
import * as webpush from 'web-push';
import {
  MAX_PUSH_DELAY_MS,
  MAX_SCHEDULED_PUSH_JOBS,
  validatePushSubscription,
} from '@/lib/push-validation';

interface ScheduledPushEntry {
  timeoutId: ReturnType<typeof setTimeout>;
  updatedAt: number;
}

const globalForPush = globalThis as unknown as {
  vapidKeys?: { publicKey: string; privateKey: string; ephemeral: boolean };
  scheduledJobs?: Map<string, ScheduledPushEntry>;
  warnedEphemeralVapid?: boolean;
};

function getVapidKeys() {
  if (!globalForPush.vapidKeys) {
    const envPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    const envPrivate = process.env.VAPID_PRIVATE_KEY?.trim();

    if (envPublic && envPrivate) {
      try {
        webpush.setVapidDetails(
          'mailto:contato@ironpulse.app',
          envPublic,
          envPrivate
        );
        globalForPush.vapidKeys = {
          publicKey: envPublic,
          privateKey: envPrivate,
          ephemeral: false,
        };
        return globalForPush.vapidKeys;
      } catch {
        // Fallback para geração válida caso as env vars estejam malformadas
      }
    }

    const generated = webpush.generateVAPIDKeys();
    webpush.setVapidDetails(
      'mailto:contato@ironpulse.app',
      generated.publicKey,
      generated.privateKey
    );
    globalForPush.vapidKeys = { ...generated, ephemeral: true };

    if (!globalForPush.warnedEphemeralVapid) {
      globalForPush.warnedEphemeralVapid = true;
      console.warn(
        '[IronPulse Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY não configuradas; usando chaves VAPID efêmeras em memória.'
      );
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
  return NextResponse.json({
    publicKey: keys.publicKey,
    ephemeral: keys.ephemeral,
  });
}

export async function POST(req: NextRequest) {
  try {
    getVapidKeys();
    const jobs = getJobsMap();
    const body = await req.json();
    const { action, subscription: rawSub, endTime, exerciseTitle } = body ?? {};

    const subscription = validatePushSubscription(rawSub);
    if (!subscription) {
      return NextResponse.json(
        { error: 'Assinatura de push inválida ou provedor não autorizado' },
        { status: 400 }
      );
    }

    const endpointKey = subscription.endpoint;

    // Cancela agendamento anterior para este dispositivo, se existir
    const existing = jobs.get(endpointKey);
    if (existing) {
      clearTimeout(existing.timeoutId);
      jobs.delete(endpointKey);
    }

    if (action === 'cancel') {
      return NextResponse.json({ status: 'cancelled' });
    }

    if (action === 'schedule') {
      const endTimeNum = Number(endTime);
      if (!Number.isFinite(endTimeNum)) {
        return NextResponse.json(
          { error: 'Parâmetro endTime inválido' },
          { status: 400 }
        );
      }

      const delayMs = endTimeNum - Date.now();
      if (delayMs < 0 || delayMs > MAX_PUSH_DELAY_MS) {
        return NextResponse.json(
          { error: 'Intervalo de descanso fora do limite permitido (máx. 30 min)' },
          { status: 400 }
        );
      }

      if (jobs.size >= MAX_SCHEDULED_PUSH_JOBS) {
        return NextResponse.json(
          { error: 'Limite temporário de agendamentos atingido' },
          { status: 429 }
        );
      }

      const safeExerciseTitle =
        typeof exerciseTitle === 'string'
          ? exerciseTitle.trim().slice(0, 100)
          : '';
      const title = 'Descanso Concluído!';
      const messageBody = safeExerciseTitle
        ? `Hora da próxima série de ${safeExerciseTitle}!`
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

      if (typeof timeoutId.unref === 'function') {
        timeoutId.unref();
      }

      jobs.set(endpointKey, { timeoutId, updatedAt: Date.now() });

      return NextResponse.json({
        status: 'scheduled',
        delayMs,
      });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: 'Falha ao processar agendamento de push' },
      { status: 500 }
    );
  }
}
