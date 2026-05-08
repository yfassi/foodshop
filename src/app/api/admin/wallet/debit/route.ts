import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { restaurant_slug, wallet_id, amount, description } =
      (await request.json()) as {
        restaurant_slug: string;
        wallet_id: string;
        amount: number; // cents, positif
        description?: string;
      };

    if (!restaurant_slug || !wallet_id || !amount || amount <= 0) {
      return NextResponse.json({ error: "Donnees manquantes" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    const adminSupabase = createAdminClient();
    const { data: restaurant } = await adminSupabase
      .from("restaurants")
      .select("id, owner_id")
      .eq("slug", restaurant_slug)
      .single();
    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    // Vérifier le wallet appartient bien à ce resto
    const { data: wallet } = await adminSupabase
      .from("wallets")
      .select("id, balance")
      .eq("id", wallet_id)
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();
    if (!wallet) {
      return NextResponse.json({ error: "Portefeuille introuvable" }, { status: 404 });
    }
    if (wallet.balance < amount) {
      return NextResponse.json(
        { error: "Solde insuffisant pour ce débit" },
        { status: 400 }
      );
    }

    // Update atomic
    const { data: updated, error: errUpd } = await adminSupabase
      .from("wallets")
      .update({ balance: wallet.balance - amount })
      .eq("id", wallet_id)
      .gte("balance", amount)
      .select("balance")
      .single();
    if (errUpd || !updated) {
      return NextResponse.json({ error: "Échec de la mise à jour" }, { status: 500 });
    }

    // Log transaction (type 'refund' = correction admin négative)
    await adminSupabase.from("wallet_transactions").insert({
      wallet_id,
      type: "refund",
      amount: -amount,
      balance_after: updated.balance,
      description: description || "Débit manuel par le restaurant",
      created_by: user.id,
    });

    return NextResponse.json({ success: true, balance: updated.balance });
  } catch (err) {
    console.error("Admin wallet debit error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
