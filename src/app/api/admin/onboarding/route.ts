import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface OnboardingBody {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  opening_hours: Record<string, { open: string; close: string }[]>;
  order_types?: string[];
  accepted_payment_methods: string[];
  logo_url?: string;
  email?: string;
  password?: string;
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OnboardingBody;
    const { name, description, address, phone, opening_hours, order_types, accepted_payment_methods, logo_url, email, password } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Nom requis" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Determine the owner: either create a new account or use existing session
    let ownerId: string;

    if (email && password) {
      // New account flow: create user then use their ID
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Le mot de passe doit contenir au moins 6 caractères" },
          { status: 400 }
        );
      }

      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (userError) {
        if (userError.message?.includes("already been registered")) {
          return NextResponse.json(
            { error: "Un compte existe déjà avec cet email" },
            { status: 409 }
          );
        }
        console.error("Signup error:", userError);
        return NextResponse.json({ error: "Erreur lors de la création du compte" }, { status: 400 });
      }

      ownerId = userData.user.id;
    } else {
      // Existing session flow
      const supabaseAuth = await createClient();
      const {
        data: { user },
      } = await supabaseAuth.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
      }

      ownerId = user.id;
    }

    // Check user doesn't already own a restaurant
    const { data: owned } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", ownerId)
      .single();

    if (owned) {
      return NextResponse.json(
        { error: "Vous avez déjà un restaurant" },
        { status: 409 }
      );
    }

    // Generate unique slug from name
    const baseSlug = toSlug(name);
    let slug = baseSlug;
    let suffix = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: existing } = await supabase
        .from("restaurants")
        .select("id")
        .eq("slug", slug)
        .single();

      if (!existing) break;

      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }

    // Create restaurant
    const { error } = await supabase.from("restaurants").insert({
      name,
      slug,
      description: description || null,
      address: address || null,
      phone: phone || null,
      logo_url: logo_url || null,
      opening_hours,
      order_types: order_types && order_types.length > 0 ? order_types : ["dine_in", "takeaway"],
      accepted_payment_methods,
      owner_id: ownerId,
      is_accepting_orders: true,
    });

    if (error) {
      console.error("Onboarding insert error:", error);
      return NextResponse.json(
        { error: "Erreur lors de la création du restaurant" },
        { status: 500 }
      );
    }

    return NextResponse.json({ slug });
  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
