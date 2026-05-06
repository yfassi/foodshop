import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushNotification } from "@/lib/push";

export const runtime = "nodejs";

interface PushSubRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface RestoSummary {
  restaurant_id: string;
  restaurant_slug: string;
  restaurant_name: string;
  low_count: number;
  ingredient_ids: string[];
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  // Auth: bearer token check (Vercel cron sends "Authorization: Bearer $CRON_SECRET")
  const auth = request.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 500 });
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  // Active stock restaurants
  const { data: restos } = await supabase
    .from("restaurants")
    .select("id, slug, name")
    .eq("stock_module_active", true)
    .eq("stock_enabled", true);

  if (!restos || restos.length === 0) {
    return NextResponse.json({ ok: true, restos: 0, sent: 0 });
  }

  const summaries: RestoSummary[] = [];

  for (const r of restos) {
    // Find low-threshold ingredients not yet alerted today
    const { data: ingredients } = await supabase
      .from("ingredients")
      .select("id, name, current_qty, low_threshold")
      .eq("restaurant_id", r.id)
      .gt("low_threshold", 0);

    const lows = (ingredients || []).filter(
      (i) => Number(i.current_qty) <= Number(i.low_threshold)
    );
    if (lows.length === 0) continue;

    const ids = lows.map((i) => i.id);
    const { data: alreadyToday } = await supabase
      .from("stock_alerts_log")
      .select("ingredient_id")
      .eq("restaurant_id", r.id)
      .eq("sent_at", today)
      .in("ingredient_id", ids);
    const sentIds = new Set((alreadyToday || []).map((row) => row.ingredient_id));
    const toAlert = lows.filter((i) => !sentIds.has(i.id));
    if (toAlert.length === 0) continue;

    summaries.push({
      restaurant_id: r.id,
      restaurant_slug: r.slug,
      restaurant_name: r.name,
      low_count: toAlert.length,
      ingredient_ids: toAlert.map((i) => i.id),
    });
  }

  let totalSent = 0;
  const expiredEndpoints: string[] = [];

  for (const s of summaries) {
    // Push subscriptions targeted to admins of this restaurant
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("restaurant_id", s.restaurant_id)
      .eq("role", "admin")
      .returns<PushSubRow[]>();

    const payload = {
      title: "Stock bas",
      body:
        s.low_count === 1
          ? "1 article à recommander avant ce soir."
          : `${s.low_count} articles à recommander avant ce soir.`,
      url: `/admin/${s.restaurant_slug}/stock`,
      tag: `stock-low-${s.restaurant_id}`,
    };

    for (const sub of subs || []) {
      const result = await sendPushNotification(sub, payload);
      if (result.expired) expiredEndpoints.push(sub.endpoint);
      totalSent += 1;
    }

    // Log idempotence rows
    const rows = s.ingredient_ids.map((ingredient_id) => ({
      restaurant_id: s.restaurant_id,
      ingredient_id,
      sent_at: today,
    }));
    if (rows.length) {
      await supabase
        .from("stock_alerts_log")
        .upsert(rows, { onConflict: "ingredient_id,sent_at", ignoreDuplicates: true });
    }
  }

  if (expiredEndpoints.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
  }

  return NextResponse.json({
    ok: true,
    restos: summaries.length,
    sent: totalSent,
  });
}
