"use client";

import { useState, useEffect, useCallback } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported =
      "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);

    if (supported) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(
    async (params: {
      restaurantId?: string;
      orderId?: string;
      role: "admin" | "customer";
    }) => {
      if (!isSupported) return false;
      setLoading(true);

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
            ),
          });
        }

        const json = subscription.toJSON();

        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
            restaurant_id: params.restaurantId,
            order_id: params.orderId,
            role: params.role,
          }),
        });

        if (res.ok) {
          setIsSubscribed(true);
          return true;
        }
        return false;
      } catch (err) {
        console.error("Push subscription error:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [isSupported]
  );

  return { isSupported, isSubscribed, loading, subscribe };
}
