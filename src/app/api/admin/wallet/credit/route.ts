import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { restaurant_public_id, customer_email, wallet_id, amount, description } =
      (await request.json()) as {
        restaurant_public_id: string;
        customer_email?: string;
        wallet_id?: string;
        amount: number; // in cents
        description?: string;
      };

    if (!restaurant_public_id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Donnees manquantes" },
        { status: 400 }
      );
    }
    if (!customer_email && !wallet_id) {
      return NextResponse.json(
        { error: "Email ou wallet_id requis" },
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
      .eq("public_id", restaurant_public_id)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    let walletId: string;

    if (wallet_id) {
      // Path direct : on vérifie que le wallet appartient bien à ce resto
      const { data: w } = await adminSupabase
        .from("wallets")
        .select("id")
        .eq("id", wallet_id)
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();
      if (!w) {
        return NextResponse.json(
          { error: "Portefeuille introuvable" },
          { status: 404 }
        );
      }
      walletId = w.id;
    } else {
      // Path email : recherche du user via listUsers paginé
      const targetEmail = (customer_email || "").toLowerCase();
      let customerId: string | null = null;
      const PER_PAGE = 1000;
      for (let page = 1; page <= 50; page += 1) {
        const { data: usersPage, error: errUsers } =
          await adminSupabase.auth.admin.listUsers({ page, perPage: PER_PAGE });
        if (errUsers) break;
        const found = usersPage.users.find(
          (u) => (u.email || "").toLowerCase() === targetEmail
        );
        if (found) {
          customerId = found.id;
          break;
        }
        if (usersPage.users.length < PER_PAGE) break;
      }
      if (!customerId) {
        return NextResponse.json(
          { error: "Client introuvable avec cet email" },
          { status: 404 }
        );
      }

      const { data: existingWallet } = await adminSupabase
        .from("wallets")
        .select("id")
        .eq("user_id", customerId)
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();
      if (existingWallet) {
        walletId = existingWallet.id;
      } else {
        const { data: newWallet, error: walletError } = await adminSupabase
          .from("wallets")
          .insert({
            user_id: customerId,
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
