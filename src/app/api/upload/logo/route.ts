import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function ensureBucket(supabase: ReturnType<typeof createAdminClient>) {
  const { data } = await supabase.storage.getBucket("restaurant-logos");
  if (!data) {
    await supabase.storage.createBucket("restaurant-logos", { public: true });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    const MAX_SIZE = 2 * 1024 * 1024;
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Format accepté : JPG, PNG, WebP ou SVG" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Le logo ne doit pas dépasser 2 Mo" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Ensure the storage bucket exists
    await ensureBucket(supabase);

    const ext = file.name.split(".").pop() || "png";
    const filePath = `temp-onboarding/${Date.now()}/logo.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("restaurant-logos")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Logo upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message || "Erreur lors de l'upload" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("restaurant-logos")
      .getPublicUrl(filePath);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("Upload API error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
