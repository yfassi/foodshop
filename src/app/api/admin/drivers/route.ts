import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.replace(/\s+/g, "");
  if (trimmed.startsWith("+") && /^\+\d{6,15}$/.test(trimmed)) return trimmed;
  if (/^0\d{9}$/.test(trimmed)) return `+33${trimmed.slice(1)}`;
  return null;
}

async function resolveOwnedRestaurant(slug: string, userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("restaurants")
    .select("id, owner_id, delivery_addon_active")
    .eq("slug", slug)
    .single();
  if (!data || data.owner_id !== userId) return null;
  return data;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("restaurant_slug");
    if (!slug) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const serverSupabase = await createClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const restaurant = await resolveOwnedRestaurant(slug, user.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data: drivers } = await supabase
      .from("drivers")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ drivers: drivers || [] });
  } catch (err) {
    console.error("drivers GET error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { restaurant_slug, full_name, phone, vehicle } = await request.json();
    if (!restaurant_slug || !full_name || !phone) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const phoneE164 = normalizePhone(phone);
    if (!phoneE164) {
      return NextResponse.json(
        { error: "Numéro invalide (format attendu : +33612345678)" },
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

    const restaurant = await resolveOwnedRestaurant(restaurant_slug, user.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    if (!restaurant.delivery_addon_active) {
      return NextResponse.json(
        { error: "Module Livraison non activé" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Si un user auth existe déjà avec ce phone, on lie directement.
    let user_id: string | null = null;
    const { data: existingAuth } = await supabase.auth.admin.listUsers();
    if (existingAuth?.users) {
      const match = existingAuth.users.find((u) => u.phone === phoneE164.replace("+", ""));
      if (match) user_id = match.id;
    }

    const { data: driver, error } = await supabase
      .from("drivers")
      .insert({
        restaurant_id: restaurant.id,
        user_id,
        full_name: String(full_name).trim(),
        phone: phoneE164,
        vehicle: vehicle ? String(vehicle).trim() : null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Un livreur avec ce numéro existe déjà" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ driver });
  } catch (err) {
    console.error("drivers POST error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
