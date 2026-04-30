import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface OnboardingBody {
  name: string;
  description?: string;
  restaurant_type?: string;
  address?: string;
  phone?: string;
  opening_hours: Record<string, { open: string; close: string }[]>;
  order_types?: string[];
  accepted_payment_methods: string[];
  logo_url?: string;
  email?: string;
  password?: string;
  queue_enabled?: boolean;
  queue_max_concurrent?: number;
  subscription_tier?: string;
  delivery_addon_active?: boolean;
  stock_addon_active?: boolean;
}

const VALID_TIERS = new Set(["essentiel", "pro", "business"]);

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
    const formData = await request.formData();
    const body = JSON.parse(formData.get("data") as string) as OnboardingBody;
    const verificationFile = formData.get("verification_document") as File | null;

    const {
      name,
      description,
      restaurant_type,
      address,
      phone,
      opening_hours,
      order_types,
      accepted_payment_methods,
      logo_url,
      email,
      password,
      queue_enabled,
      queue_max_concurrent,
      subscription_tier,
      delivery_addon_active,
      stock_addon_active,
    } = body;

    const tier = subscription_tier && VALID_TIERS.has(subscription_tier)
      ? subscription_tier
      : "essentiel";
    // Delivery is only valid on Pro/Business
    const deliveryActive =
      !!delivery_addon_active && (tier === "pro" || tier === "business");
    const stockActive = !!stock_addon_active;

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

    // Upload verification document if provided
    let verification_document_url: string | null = null;
    if (verificationFile && verificationFile.size > 0) {
      const ext = verificationFile.name.split(".").pop() || "pdf";
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const buffer = Buffer.from(await verificationFile.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(filePath, buffer, {
          contentType: verificationFile.type,
        });

      if (uploadError) {
        console.error("Verification doc upload error:", uploadError);
        return NextResponse.json(
          { error: "Erreur lors de l'envoi du document de vérification" },
          { status: 500 }
        );
      }

      const { data: urlData } = supabase.storage
        .from("verification-documents")
        .getPublicUrl(filePath);
      verification_document_url = urlData.publicUrl;
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

    // Create restaurant (verification_status defaults to 'pending')
    const { error } = await supabase.from("restaurants").insert({
      name,
      slug,
      description: description || null,
      restaurant_type: restaurant_type || null,
      address: address || null,
      phone: phone || null,
      logo_url: logo_url || null,
      opening_hours,
      order_types: order_types && order_types.length > 0 ? order_types : ["dine_in", "takeaway"],
      accepted_payment_methods,
      owner_id: ownerId,
      is_accepting_orders: true,
      verification_status: "pending",
      verification_document_url,
      subscription_tier: tier,
      delivery_addon_active: deliveryActive,
      stock_addon_active: stockActive,
      ...(queue_enabled != null && { queue_enabled }),
      ...(queue_max_concurrent != null && { queue_max_concurrent }),
    });

    if (error) {
      console.error("Onboarding insert error:", error);
      return NextResponse.json(
        { error: `Erreur lors de la création du restaurant: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ slug });
  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
