import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface SubscribeBody {
  endpoint: string;
  p256dh: string;
  auth: string;
  restaurant_id?: string;
  order_id?: string;
  role: "customer" | "admin";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubscribeBody;
    const { endpoint, p256dh, auth, restaurant_id, order_id, role } = body;

    if (!endpoint || !p256dh || !auth || !role) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      );
    }

    if (role === "admin" && !restaurant_id) {
      return NextResponse.json(
        { error: "restaurant_id requis pour les admins" },
        { status: 400 }
      );
    }

    if (role === "customer" && !order_id) {
      return NextResponse.json(
        { error: "order_id requis pour les clients" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    if (role === "admin") {
      const authClient = await createClient();
      const {
        data: { user },
      } = await authClient.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
      }

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("id", restaurant_id!)
        .eq("owner_id", user.id)
        .single();

      if (!restaurant) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
      }
    } else {
      const { data: order } = await supabase
        .from("orders")
        .select("id")
        .eq("id", order_id!)
        .single();

      if (!order) {
        return NextResponse.json(
          { error: "Commande introuvable" },
          { status: 404 }
        );
      }
    }

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        endpoint,
        p256dh,
        auth,
        restaurant_id: restaurant_id || null,
        order_id: order_id || null,
        role,
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      console.error("Push subscribe error:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
