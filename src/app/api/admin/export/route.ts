import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tierAtLeast } from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/types";

type ExportType = "orders" | "clients";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(row.map(csvEscape).join(","));
  return lines.join("\n");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const restaurantId = url.searchParams.get("restaurant_id");
  const type = url.searchParams.get("type") as ExportType | null;

  if (!restaurantId || !type) {
    return NextResponse.json({ error: "restaurant_id et type requis" }, { status: 400 });
  }
  if (type !== "orders" && type !== "clients") {
    return NextResponse.json({ error: "type invalide" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: resto } = await supabase
    .from("restaurants")
    .select("id, owner_id, subscription_tier, name")
    .eq("id", restaurantId)
    .single();

  if (!resto || resto.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!tierAtLeast(resto.subscription_tier as SubscriptionTier, "pro")) {
    return NextResponse.json(
      { error: "Export disponible dès le plan Pro" },
      { status: 403 },
    );
  }

  const slug = resto.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
  const today = new Date().toISOString().slice(0, 10);

  if (type === "orders") {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, created_at, order_type, status, total_price, payment_method, paid, customer_info, pickup_time",
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      console.error("Admin export orders error:", error);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    type OrderRow = {
      id: string;
      order_number: number | null;
      created_at: string;
      order_type: string | null;
      status: string;
      total_price: number;
      payment_method: string;
      paid: boolean;
      customer_info: { name?: string; phone?: string; email?: string } | null;
      pickup_time: string | null;
    };

    const rows = ((data ?? []) as OrderRow[]).map((o) => {
      const ci = o.customer_info ?? {};
      return [
        o.id,
        o.order_number ?? "",
        o.created_at,
        o.order_type ?? "",
        o.status,
        o.total_price,
        o.payment_method,
        o.paid ? "1" : "0",
        ci.name ?? "",
        ci.phone ?? "",
        ci.email ?? "",
        o.pickup_time ?? "",
      ];
    });

    const csv = rowsToCsv(
      [
        "id",
        "order_number",
        "created_at",
        "order_type",
        "status",
        "total_price_cents",
        "payment_method",
        "paid",
        "customer_name",
        "customer_phone",
        "customer_email",
        "pickup_time",
      ],
      rows,
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="commandes-${slug}-${today}.csv"`,
      },
    });
  }

  // type === "clients" — wallet rows joined to customer_profiles
  const { data, error } = await supabase
    .from("wallets")
    .select(
      "id, user_id, balance, created_at, customer_profiles!wallets_user_id_fkey ( full_name, phone )",
    )
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.error("Admin export wallets error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  type WalletRow = {
    id: string;
    user_id: string;
    balance: number;
    created_at: string;
    customer_profiles: { full_name: string | null; phone: string | null } | null;
  };

  const rows = ((data ?? []) as unknown as WalletRow[]).map((w) => [
    w.user_id,
    w.customer_profiles?.full_name ?? "",
    w.customer_profiles?.phone ?? "",
    w.balance,
    w.created_at,
  ]);

  const csv = rowsToCsv(
    [
      "user_id",
      "full_name",
      "phone",
      "wallet_balance_cents",
      "created_at",
    ],
    rows,
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clients-${slug}-${today}.csv"`,
    },
  });
}
