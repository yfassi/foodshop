import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function ensureBucket(supabase: ReturnType<typeof createAdminClient>) {
  const { data } = await supabase.storage.getBucket("product-images");
  if (!data) {
    await supabase.storage.createBucket("product-images", { public: true });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const restaurantId = formData.get("restaurantId") as string | null;
    const productId = formData.get("productId") as string | null;

    if (!file || !restaurantId || !productId) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Format accepté : JPG, PNG ou WebP" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "L'image ne doit pas dépasser 5 Mo" }, { status: 400 });
    }

    const supabase = createAdminClient();
    await ensureBucket(supabase);

    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${restaurantId}/${productId}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Product image upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message || "Erreur lors de l'upload" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Update the product with the new image URL
    await supabase
      .from("products")
      .update({ image_url: imageUrl })
      .eq("id", productId);

    return NextResponse.json({ url: imageUrl });
  } catch (err) {
    console.error("Product image upload API error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
