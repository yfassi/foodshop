import { NextResponse } from "next/server";
import { randomBytes, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generatePublicId } from "@/lib/public-id";

const ALLOWED_VERIFICATION_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const VERIFICATION_MAX_BYTES = 5 * 1024 * 1024;
const VERIFICATION_EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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
  subscription_tier?: "essentiel" | "pro" | "groupe";
  /** Optional add-ons selected during onboarding. Activates the corresponding
   *  module flags. The user later confirms billing via Stripe Customer Portal. */
  addons?: ("livraison" | "stock")[];
  billing_period?: "monthly" | "annual";
}

const VALID_TIERS = new Set(["essentiel", "pro", "groupe"]);
const VALID_ADDONS = new Set(["livraison", "stock"]);

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// 6 hex chars \u2192 16M combinations: unguessable, collision-proof at our scale
function shortId() {
  return randomBytes(3).toString("hex");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const body = JSON.parse(formData.get("data") as string) as OnboardingBody;
    const verificationFile = formData.get("verification_document") as File | null;

    const { name, description, restaurant_type, address, phone, opening_hours, order_types, accepted_payment_methods, logo_url, email, password, queue_enabled, queue_max_concurrent, subscription_tier, addons, billing_period } = body;

    const tier =
      subscription_tier && VALID_TIERS.has(subscription_tier)
        ? subscription_tier
        : "essentiel";
    const safeAddons = Array.isArray(addons)
      ? addons.filter((a) => VALID_ADDONS.has(a))
      : [];
    const wantsLivraison = safeAddons.includes("livraison");
    const wantsStock = safeAddons.includes("stock");

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
      });

      if (userError) {
        console.error("Signup error:", userError);
        return NextResponse.json(
          { error: "Erreur lors de la création du compte" },
          { status: 400 }
        );
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

    // For new account creation, prevent the same email from going through the
    // signup flow twice (existing users can add more restaurants from the
    // logged-in session flow above).
    if (email && password) {
      const { data: alreadyOwned } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", ownerId)
        .limit(1);

      if (alreadyOwned && alreadyOwned.length > 0) {
        return NextResponse.json(
          { error: "Vous avez déjà un restaurant" },
          { status: 409 }
        );
      }
    }

    // Upload verification document if provided
    let verification_document_url: string | null = null;
    if (verificationFile && verificationFile.size > 0) {
      if (!ALLOWED_VERIFICATION_MIME.has(verificationFile.type)) {
        return NextResponse.json(
          { error: "Format invalide (PDF, JPG, PNG ou WebP requis)" },
          { status: 400 }
        );
      }

      if (verificationFile.size > VERIFICATION_MAX_BYTES) {
        return NextResponse.json(
          { error: "Document trop volumineux (5 MB max)" },
          { status: 400 }
        );
      }

      const ext = VERIFICATION_EXT_BY_MIME[verificationFile.type];
      const filePath = `${randomUUID()}.${ext}`;
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

      verification_document_url = filePath;
    }

    // Slug = readable name + unguessable short ID. Retry on the astronomically
    // rare collision (16M combinations).
    const baseSlug = toSlug(name) || "restaurant";
    let slug = `${baseSlug}-${shortId()}`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: existing } = await supabase
        .from("restaurants")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${shortId()}`;
    }

    // Create restaurant (verification_status defaults to 'pending')
    const public_id = generatePublicId();
    const { error } = await supabase.from("restaurants").insert({
      name,
      slug,
      public_id,
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
      delivery_addon_active: wantsLivraison,
      delivery_enabled: wantsLivraison,
      stock_module_active: wantsStock,
      stock_enabled: wantsStock,
      ...(queue_enabled != null && { queue_enabled }),
      ...(queue_max_concurrent != null && { queue_max_concurrent }),
    });

    // billing_period is captured for future Stripe Checkout integration but is
    // not persisted yet — restaurants currently set up billing post-onboarding
    // via the Stripe Customer Portal. Remove this line once the plan-checkout
    // flow lands.
    void billing_period;

    if (error) {
      console.error("Onboarding insert error:", error);
      const parts = [
        error.message,
        error.code ? `code=${error.code}` : null,
        error.details ? `details=${error.details}` : null,
        error.hint ? `hint=${error.hint}` : null,
      ].filter(Boolean);
      return NextResponse.json(
        {
          error: `Erreur lors de la création du restaurant: ${parts.join(" · ")}`,
          debug: {
            code: error.code ?? null,
            message: error.message ?? null,
            details: error.details ?? null,
            hint: error.hint ?? null,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ slug, public_id });
  } catch (err) {
    console.error("Onboarding error:", err);
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : null;
    return NextResponse.json(
      {
        error: `Erreur serveur: ${message}`,
        debug: { message, stack },
      },
      { status: 500 }
    );
  }
}
