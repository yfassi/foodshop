import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushNotification } from "@/lib/push";
import { formatPrice } from "@/lib/format";

export async function notifyAdmins(
  restaurantId: string,
  restaurantPublicId: string,
  displayOrderNumber: string,
  totalPrice: number
) {
  try {
    const supabase = createAdminClient();
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("restaurant_id", restaurantId)
      .eq("role", "admin");

    if (!subscriptions?.length) return;

    const expiredIds: string[] = [];
    await Promise.all(
      subscriptions.map(async (sub) => {
        const result = await sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          {
            title: "Nouvelle commande",
            body: `Commande ${displayOrderNumber} — ${formatPrice(totalPrice)}`,
            url: `/admin/${restaurantPublicId}`,
            tag: "new-order",
          }
        );
        if (result.expired) expiredIds.push(sub.id);
      })
    );

    if (expiredIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredIds);
    }
  } catch (err) {
    console.error("Admin push error:", err);
  }
}
