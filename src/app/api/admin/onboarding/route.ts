import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface OnboardingBody {
  name: string;
  slug: string;
  description?: string;
  address?: string;
  phone?: string;
  opening_hours: Record<string, { open: string; close: string }[]>;
  accepted_payment_methods: string[];
}

export async function POST(request: Request) {
  try {
    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const body = (await request.json()) as OnboardingBody;
    const { name, slug, description, address, phone, opening_hours, accepted_payment_methods } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Nom et slug requis" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Ce slug est deja pris" },
        { status: 409 }
      );
    }

    // Check user doesn't already own a restaurant
    const { data: owned } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (owned) {
      return NextResponse.json(
        { error: "Vous avez deja un restaurant" },
        { status: 409 }
      );
    }

    // Create restaurant
    const { error } = await supabase.from("restaurants").insert({
      name,
      slug,
      description: description || null,
      address: address || null,
      phone: phone || null,
      opening_hours,
      accepted_payment_methods,
      owner_id: user.id,
      is_accepting_orders: true,
    });

    if (error) {
      console.error("Onboarding insert error:", error);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    return NextResponse.json({ slug });
  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
