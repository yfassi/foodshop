import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  rateLimit,
  rateLimitResponse,
  getClientIp,
} from "@/lib/rate-limit";

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
}

const MIN_PASSWORD_LENGTH = 10;
const MAX_VERIFICATION_DOC_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_VERIFICATION_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

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
    // Rate limit: 5 onboardings / 15 min / IP — protection contre spam signup
    const ip = getClientIp(request);
    const rl = rateLimit(`onboarding:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.ok) return rateLimitResponse(rl);

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
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    // Verification document validation (taille + MIME)
    if (verificationFile && verificationFile.size > 0) {
      if (verificationFile.size > MAX_VERIFICATION_DOC_SIZE) {
        return NextResponse.json(
          { error: "Document trop volumineux (10 Mo max)" },
          { status: 400 }
        );
      }
      if (!ALLOWED_VERIFICATION_MIMES.includes(verificationFile.type)) {
        return NextResponse.json(
          { error: "Format de document non accepté (PDF, JPG, PNG, WEBP)" },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminClient();

    // Determine the owner: either create a new account or use existing session
    let ownerId: string;

    if (email && password) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
          {
            error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`,
          },
          { status: 400 }
        );
      }

      // Utilise le client anon (signUp) pour beneficier du rate-limiting Supabase
      // et du flow email-confirmation standard. Evite admin.createUser qui cree
      // des comptes confirmes sans protection.
      const anonClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: userData, error: userError } = await anonClient.auth.signUp({
        email,
        password,
      });

      if (userError || !userData.user) {
        if (userError?.message?.toLowerCase().includes("already registered")) {
          return NextResponse.json(
            { error: "Un compte existe déjà avec cet email" },
            { status: 409 }
          );
        }
        console.error("Signup error:", userError?.message);
        return NextResponse.json(
          { error: "Erreur lors de la création du compte" },
          { status: 400 }
        );
      }

      ownerId = userData.user.id;
    } else {
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

    // Upload verification document if provided — bucket prive, on stocke le PATH
    // (pas l'URL publique qui n'existe plus). La lecture se fait via signed URL
    // cote super-admin.
    let verification_document_path: string | null = null;
    if (verificationFile && verificationFile.size > 0) {
      const mimeToExt: Record<string, string> = {
        "application/pdf": "pdf",
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };
      const ext = mimeToExt[verificationFile.type] || "bin";
      const filePath = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const buffer = Buffer.from(await verificationFile.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(filePath, buffer, {
          contentType: verificationFile.type,
        });

      if (uploadError) {
        console.error("Verification doc upload error:", uploadError.message);
        return NextResponse.json(
          { error: "Erreur lors de l'envoi du document de vérification" },
          { status: 500 }
        );
      }

      verification_document_path = filePath;
    }

    // Generate unique slug from name
    const baseSlug = toSlug(name);
    let slug = baseSlug;
    let suffix = 0;

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
      order_types:
        order_types && order_types.length > 0
          ? order_types
          : ["dine_in", "takeaway"],
      accepted_payment_methods,
      owner_id: ownerId,
      is_accepting_orders: true,
      verification_status: "pending",
      verification_document_url: verification_document_path,
      ...(queue_enabled != null && { queue_enabled }),
      ...(queue_max_concurrent != null && { queue_max_concurrent }),
    });

    if (error) {
      console.error("Onboarding insert error:", error.message);
      return NextResponse.json(
        { error: "Erreur lors de la création du restaurant" },
        { status: 500 }
      );
    }

    return NextResponse.json({ slug });
  } catch (err) {
    console.error(
      "Onboarding error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
