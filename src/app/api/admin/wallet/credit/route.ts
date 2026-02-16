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

    if (existingWallet) {
      walletId = existingWallet.id;
    } else {
      const { data: newWallet, error: walletError } = await adminSupabase
        .from("wallets")
        .insert({
          user_id: customer.id,
          restaurant_id: restaurant.id,
          balance: 0,
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

    // Use atomic credit function
    const { data: newBalance, error: creditError } = await adminSupabase.rpc(
      "credit_wallet_balance",
      {
        p_wallet_id: walletId,
        p_amount: amount,
        p_type: "topup_admin",
        p_description: description || "Credit manuel par le restaurant",
        p_created_by: user.id,
      }
    );

    if (creditError) {
      console.error("Wallet credit error:", creditError);
      return NextResponse.json(
        { error: "Erreur lors du crédit" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (err) {
    console.error("Admin wallet credit error:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
