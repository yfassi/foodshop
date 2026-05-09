import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushNotification } from "@/lib/push";

const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  preparing: {
    title: "Commande en préparation",
    body: "Votre commande {order} est en cours de préparation.",
  },
  ready: {
    title: "Commande prête !",
    body: "Votre commande {order} est prête. Rendez-vous au comptoir !",
  },
  done: {
    title: "Commande récupérée",
    body: "Votre commande {order} a été récupérée. Merci !",
  },
  cancelled: {
    title: "Commande annulée",
    body: "Votre commande {order} a été annulée.",
  },
};

export async function POST(request: Request) {
  try {
    const { order_id, status } = (await request.json()) as {
      order_id: string;
      status: string;
    };

    if (!order_id || !status) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get order info for notification
    const { data: order } = await supabase
      .from("orders")
      .select("id, display_order_number, order_number, restaurant_id")
      .eq("id", order_id)
      .single();

    if (!order) {
      return NextResponse.json(
        { error: "Commande introuvable" },
        { status: 404 }
      );
    }

    // Update order status
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", order_id);

    if (error) {
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour" },
        { status: 500 }
      );
    }

    // Send push notifications to customer
    const messageTemplate = STATUS_MESSAGES[status];
    if (messageTemplate) {
      const orderNumber =
        order.display_order_number || `#${order.order_number}`;

      // Get restaurant public_id for the URL
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("public_id")
        .eq("id", order.restaurant_id)
        .single();

      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("order_id", order_id)
        .eq("role", "customer");

      if (subscriptions?.length) {
        const expiredIds: string[] = [];

        await Promise.all(
          subscriptions.map(async (sub) => {
            const result = await sendPushNotification(
              { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
              {
                title: messageTemplate.title,
                body: messageTemplate.body.replace("{order}", orderNumber),
                url: restaurant
                  ? `/restaurant/${restaurant.public_id}/order-confirmation/${order_id}`
                  : undefined,
                tag: `order-${order_id}`,
              }
            );
            if (result.expired) expiredIds.push(sub.id);
          })
        );

        // Clean up expired subscriptions
        if (expiredIds.length > 0) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .in("id", expiredIds);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Update status error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
