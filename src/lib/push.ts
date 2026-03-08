import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:support@taapr.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<{ expired?: boolean }> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return {};
  } catch (err: unknown) {
    const error = err as { statusCode?: number };
    if (error.statusCode === 410 || error.statusCode === 404) {
      return { expired: true };
    }
    console.error("Push send error:", err);
    return {};
  }
}
