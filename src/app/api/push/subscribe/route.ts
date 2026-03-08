import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    // Upsert by endpoint
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
