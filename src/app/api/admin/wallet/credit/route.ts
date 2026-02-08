import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { restaurant_slug, customer_email, amount, description } =
      (await request.json()) as {
        restaurant_slug: string;
        customer_email: string;
        amount: number; // in cents
        description?: string;
      };

    if (!restaurant_slug || !customer_email || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Donnees manquantes" },
        { status: 400 }
      );
    }

    // Verify admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Verify restaurant ownership
    const { data: restaurant } = await adminSupabase
      .from("restaurants")
      .select("id, owner_id")
      .eq("slug", restaurant_slug)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    // Find customer by email
    const { data: userData } = await adminSupabase.auth.admin.listUsers();
    const customer = userData?.users?.find(
      (u) => u.email === customer_email
    );

    if (!customer) {
      return NextResponse.json(
        { error: "Client introuvable avec cet email" },
        { status: 404 }
      );
    }

    // Get or create wallet
    const { data: existingWallet } = await adminSupabase
      .from("wallets")
      .select("id, balance")
      .eq("user_id", customer.id)
      .eq("restaurant_id", restaurant.id)
      .single();

    let walletId: string;
    let newBalance: number;

    if (existingWallet) {
      walletId = existingWallet.id;
      newBalance = existingWallet.balance + amount;
      await adminSupabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("id", walletId);
    } else {
      newBalance = amount;
      const { data: newWallet, error: walletError } = await adminSupabase
        .from("wallets")
        .insert({
          user_id: customer.id,
          restaurant_id: restaurant.id,
          balance: amount,
        })
        .select("id")
        .single();

      if (walletError || !newWallet) {
        return NextResponse.json(
          { error: "Erreur lors de la creation du portefeuille" },
          { status: 500 }
        );
      }
      walletId = newWallet.id;
    }

    // Record transaction
    await adminSupabase.from("wallet_transactions").insert({
      wallet_id: walletId,
      type: "topup_admin",
      amount,
      balance_after: newBalance,
      description: description || "Credit manuel par le restaurant",
      created_by: user.id,
    });

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (err) {
    console.error("Admin wallet credit error:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
