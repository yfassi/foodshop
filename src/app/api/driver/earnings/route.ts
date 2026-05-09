import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Period = "day" | "week" | "month";

function periodStart(p: Period): Date {
  const now = new Date();
  if (p === "day") {
    now.setHours(0, 0, 0, 0);
    return now;
  }
  if (p === "week") {
    const d = new Date(now);
    const diff = (d.getDay() + 6) % 7; // lundi = 0
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  return d;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get("restaurant_public_id");
    const period = (searchParams.get("period") || "day") as Period;
    if (!publicId) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const serverSupabase = await createClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("public_id", publicId)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
    }

    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", user.id)
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();

    if (!driver) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const start = periodStart(period).toISOString();
    const { data: orders } = await supabase
      .from("orders")
      .select("id, delivery_fee, delivery_tip, delivered_at")
      .eq("driver_id", driver.id)
      .eq("delivery_status", "delivered")
      .gte("delivered_at", start);

    const list = orders || [];
    const deliveriesCount = list.length;
    const totalFees = list.reduce((s, o) => s + (o.delivery_fee || 0), 0);
    const totalTips = list.reduce((s, o) => s + (o.delivery_tip || 0), 0);

    return NextResponse.json({
      period,
      deliveriesCount,
      totalFees,
      totalTips,
      gross: totalFees + totalTips,
    });
  } catch (err) {
    console.error("earnings error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
