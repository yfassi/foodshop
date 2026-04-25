import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { STOCK_UNITS, type StockUnit } from "@/lib/types";

async function authorize(restaurant_slug: string) {
  const serverSupabase = await createClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return { error: "Non autorisé", status: 401 as const };

  const supabase = createAdminClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, owner_id, stock_addon_active")
    .eq("slug", restaurant_slug)
    .single();

  if (!restaurant || restaurant.owner_id !== user.id) {
    return { error: "Non autorisé", status: 403 as const };
  }
  if (!restaurant.stock_addon_active) {
    return { error: "Module Stock non activé", status: 403 as const };
  }
  return { restaurant, supabase };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { restaurant_slug, name, unit, reorder_threshold, notes } = body;

    if (!restaurant_slug) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }
    const auth = await authorize(restaurant_slug);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { restaurant, supabase } = auth;

    const update: Record<string, unknown> = {};
    if (typeof name === "string") update.name = name.trim();
    if (typeof unit === "string") {
      if (!STOCK_UNITS.includes(unit as StockUnit)) {
        return NextResponse.json({ error: "Unité invalide" }, { status: 400 });
      }
      update.unit = unit;
    }
    if (reorder_threshold !== undefined) {
      update.reorder_threshold =
        reorder_threshold === null || reorder_threshold === ""
          ? null
          : Math.max(0, Number(reorder_threshold));
    }
    if (notes !== undefined) {
      update.notes = notes ? String(notes).trim() : null;
    }

    const { data, error } = await supabase
      .from("stock_items")
      .update(update)
      .eq("id", id)
      .eq("restaurant_id", restaurant.id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Un item avec ce nom existe déjà" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ item: data });
  } catch (err) {
    console.error("stock items PATCH error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const slug = url.searchParams.get("restaurant_slug");
    if (!slug) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }
    const auth = await authorize(slug);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { restaurant, supabase } = auth;

    const { error } = await supabase
      .from("stock_items")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurant.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("stock items DELETE error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
