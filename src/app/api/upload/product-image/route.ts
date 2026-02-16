import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // Verify authentication
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const restaurantId = formData.get("restaurantId") as string | null;
    const productId = formData.get("productId") as string | null;

    if (!file || !restaurantId || !productId) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // Verify restaurant ownership
    const supabase = createAdminClient();
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("id", restaurantId)
      .eq("owner_id", user.id)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Format accepté : JPG, PNG ou WebP" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "L'image ne doit pas dépasser 5 Mo" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${restaurantId}/${productId}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, new Uint8Array(arrayBuffer), {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Product image upload error:", uploadError);
      return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("products")
      .update({ image_url: imageUrl })
      .eq("id", productId);

    if (updateError) {
      console.error("Product image DB update error:", updateError);
      return NextResponse.json({ error: "Image uploadée mais erreur de sauvegarde" }, { status: 500 });
    }

    return NextResponse.json({ url: imageUrl });
  } catch (err) {
    console.error("Product image upload API error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
