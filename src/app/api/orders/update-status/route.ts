import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendPushNotification } from "@/lib/push";
import type { OrderStatus } from "@/lib/types";

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

const ALLOWED_STATUSES: OrderStatus[] = [
  "new",
  "preparing",
  "ready",
  "done",
  "cancelled",
];

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

    if (!ALLOWED_STATUSES.includes(status as OrderStatus)) {
      return NextResponse.json(
        { error: "Statut invalide" },
        { status: 400 }
      );
    }

    const serverSupabase = await createClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: order } = await supabase
      .from("orders")
      .select("id, display_order_number, order_number, restaurant_id, driver_id")
      .eq("id", order_id)
      .single();

    if (!order) {
      return NextResponse.json(
        { error: "Commande introuvable" },
        { status: 404 }
      );
    }

    // Autorisation : owner du restaurant OU driver assigné à la commande
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, slug, owner_id")
      .eq("id", order.restaurant_id)
      .single();

    const isOwner = restaurant?.owner_id === user.id;

    let isAssignedDriver = false;
    if (!isOwner && order.driver_id) {
      const { data: driver } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", user.id)
        .eq("id", order.driver_id)
        .eq("is_active", true)
        .maybeSingle();
      isAssignedDriver = !!driver;
    }

    if (!isOwner && !isAssignedDriver) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

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

    const messageTemplate = STATUS_MESSAGES[status];
    if (messageTemplate) {
      const orderNumber =
        order.display_order_number || `#${order.order_number}`;

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
                  ? `/${restaurant.slug}/order-confirmation/${order_id}`
                  : undefined,
                tag: `order-${order_id}`,
              }
            );
            if (result.expired) expiredIds.push(sub.id);
          })
        );

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
