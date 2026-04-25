import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { STOCK_UNITS, type StockUnit, type StockReceiptOCRData, type OCRReceiptItem } from "@/lib/types";

export const maxDuration = 60;

const EXTRACT_TOOL = {
  name: "extract_receipt",
  description:
    "Extract structured data from a restaurant supplier receipt or invoice. Identify the supplier, date, total amount, and each line item with quantity and unit.",
  input_schema: {
    type: "object" as const,
    properties: {
      supplier: {
        type: ["string", "null"],
        description: "Nom du fournisseur (magasin, grossiste). null si non visible.",
      },
      date: {
        type: ["string", "null"],
        description: "Date du ticket au format ISO YYYY-MM-DD. null si non visible.",
      },
      total_cents: {
        type: ["integer", "null"],
        description: "Montant total TTC en centimes (ex: 4250 pour 42,50 €). null si non visible.",
      },
      items: {
        type: "array",
        description: "Liste des articles achetés.",
        items: {
          type: "object",
          properties: {
            raw_name: {
              type: "string",
              description: "Nom de l'article tel qu'écrit sur le ticket.",
            },
            qty: {
              type: "number",
              description: "Quantité achetée. Convertir en unité standard si possible.",
            },
            unit: {
              type: "string",
              enum: STOCK_UNITS,
              description: "Unité de mesure standard. kg/g pour poids, L/ml pour liquide, pcs pour pièces, cartons pour cartons/packs.",
            },
            price_cents: {
              type: ["integer", "null"],
              description: "Prix total TTC de cette ligne en centimes. null si non visible.",
            },
          },
          required: ["raw_name", "qty", "unit", "price_cents"],
          additionalProperties: false,
        },
      },
    },
    required: ["supplier", "date", "total_cents", "items"],
    additionalProperties: false,
  },
};

function fuzzyMatch(name: string, candidates: { id: string; name: string }[]): string | null {
  const target = name.toLowerCase().trim();
  for (const c of candidates) {
    const candidate = c.name.toLowerCase().trim();
    if (candidate === target) return c.id;
    if (candidate.includes(target) || target.includes(candidate)) return c.id;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");
    const slug = formData.get("restaurant_slug");

    if (!(file instanceof File) || typeof slug !== "string") {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image trop volumineuse (max 10 Mo)" }, { status: 413 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "OCR non configuré" }, { status: 500 });
    }

    const serverSupabase = await createClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, owner_id, stock_addon_active")
      .eq("slug", slug)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    if (!restaurant.stock_addon_active) {
      return NextResponse.json({ error: "Module Stock non activé" }, { status: 403 });
    }

    // Upload to storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "image/png" ? "png" : "webp";
    const path = `${restaurant.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("stock-receipts")
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("storage upload error:", uploadError);
      return NextResponse.json({ error: "Échec de l'upload" }, { status: 500 });
    }

    const { data: signed } = await supabase.storage
      .from("stock-receipts")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    const imageUrl = signed?.signedUrl ?? path;

    // Insert receipt row (status=pending)
    const { data: receipt, error: insertError } = await supabase
      .from("stock_receipts")
      .insert({
        restaurant_id: restaurant.id,
        image_url: imageUrl,
        status: "pending",
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError || !receipt) {
      return NextResponse.json({ error: insertError?.message || "Erreur DB" }, { status: 500 });
    }

    // Call Claude vision with tool use
    const anthropic = new Anthropic();
    const mediaType = (file.type === "image/png" ? "image/png" : "image/webp") as
      | "image/png"
      | "image/webp"
      | "image/jpeg"
      | "image/gif";

    let ocrData: StockReceiptOCRData | null = null;
    let claudeError: string | null = null;

    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        tools: [EXTRACT_TOOL],
        tool_choice: { type: "tool", name: "extract_receipt" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: buffer.toString("base64"),
                },
              },
              {
                type: "text",
                text: "Analyse ce ticket/facture de fournisseur de restaurant et extrais les informations structurées en utilisant l'outil extract_receipt.",
              },
            ],
          },
        ],
      });

      const toolBlock = response.content.find((b) => b.type === "tool_use");
      if (!toolBlock || toolBlock.type !== "tool_use") {
        claudeError = "Aucune extraction structurée retournée";
      } else {
        const raw = toolBlock.input as {
          supplier?: string | null;
          date?: string | null;
          total_cents?: number | null;
          items?: Array<{
            raw_name: string;
            qty: number;
            unit: string;
            price_cents?: number | null;
          }>;
        };

        // Fetch existing stock items for fuzzy match
        const { data: existingItems } = await supabase
          .from("stock_items")
          .select("id, name")
          .eq("restaurant_id", restaurant.id);

        const items: OCRReceiptItem[] = (raw.items ?? []).map((it) => {
          const safeUnit = STOCK_UNITS.includes(it.unit as StockUnit)
            ? (it.unit as StockUnit)
            : "pcs";
          return {
            raw_name: String(it.raw_name).trim(),
            qty: Math.max(0, Number(it.qty) || 0),
            unit: safeUnit,
            price_cents: it.price_cents ?? null,
            matched_stock_item_id: fuzzyMatch(it.raw_name, existingItems ?? []),
          };
        });

        ocrData = {
          items,
          supplier: raw.supplier ?? null,
          date: raw.date ?? null,
          total_cents: raw.total_cents ?? null,
        };
      }
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        claudeError = `IA: ${err.message}`;
      } else {
        claudeError = "Erreur IA inconnue";
      }
      console.error("Claude OCR error:", err);
    }

    if (!ocrData) {
      await supabase
        .from("stock_receipts")
        .update({ status: "failed", error_message: claudeError })
        .eq("id", receipt.id);
      return NextResponse.json(
        { error: claudeError || "Échec de la lecture", receipt_id: receipt.id },
        { status: 500 }
      );
    }

    // Update receipt with OCR data
    const { data: updated, error: updateError } = await supabase
      .from("stock_receipts")
      .update({
        status: "processed",
        ocr_data: ocrData,
        supplier_name: ocrData.supplier ?? null,
        receipt_date: ocrData.date ?? null,
        total_amount_cents: ocrData.total_cents ?? null,
      })
      .eq("id", receipt.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ receipt: updated });
  } catch (err) {
    console.error("stock receipts POST error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
