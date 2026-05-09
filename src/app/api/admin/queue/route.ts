import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// GET: Get queue tickets for admin
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurant_public_id = searchParams.get("restaurant_public_id");

    if (!restaurant_public_id) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      );
    }

    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, owner_id")
      .eq("public_id", restaurant_public_id)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { data: tickets } = await supabase
      .from("queue_tickets")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .in("status", ["waiting", "active"])
      .order("position", { ascending: true });

    return NextResponse.json({ tickets: tickets || [] });
  } catch (err) {
    console.error("Admin queue error:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST: Admin actions (call_next, complete, expire)
export async function POST(request: Request) {
  try {
    const { restaurant_public_id, action, ticket_id } = await request.json();

    if (!restaurant_public_id || !action) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      );
    }

    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, owner_id, queue_max_concurrent")
      .eq("public_id", restaurant_public_id)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    if (action === "call_next") {
      // Find next waiting ticket
      const { data: nextTicket } = await supabase
        .from("queue_tickets")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("status", "waiting")
        .order("position", { ascending: true })
        .limit(1)
        .single();

      if (!nextTicket) {
        return NextResponse.json({ message: "Aucun client en attente" });
      }

      const now = new Date();
      await supabase
        .from("queue_tickets")
        .update({
          status: "active",
          called_at: now.toISOString(),
          expires_at: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", nextTicket.id);

      return NextResponse.json({ success: true, ticket_id: nextTicket.id });
    }

    if (action === "complete" && ticket_id) {
      await supabase
        .from("queue_tickets")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket_id);

      // Auto-call next waiting ticket if below max
      const { count: activeCount } = await supabase
        .from("queue_tickets")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.id)
        .eq("status", "active");

      if ((activeCount || 0) < restaurant.queue_max_concurrent) {
        const { data: nextTicket } = await supabase
          .from("queue_tickets")
          .select("id")
          .eq("restaurant_id", restaurant.id)
          .eq("status", "waiting")
          .order("position", { ascending: true })
          .limit(1)
          .single();

        if (nextTicket) {
          const now = new Date();
          await supabase
            .from("queue_tickets")
            .update({
              status: "active",
              called_at: now.toISOString(),
              expires_at: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("id", nextTicket.id);
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === "expire" && ticket_id) {
      await supabase
        .from("queue_tickets")
        .update({
          status: "expired",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket_id);

      // Auto-call next waiting ticket if below max
      const { count: activeCount } = await supabase
        .from("queue_tickets")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.id)
        .eq("status", "active");

      if ((activeCount || 0) < restaurant.queue_max_concurrent) {
        const { data: nextTicket } = await supabase
          .from("queue_tickets")
          .select("id")
          .eq("restaurant_id", restaurant.id)
          .eq("status", "waiting")
          .order("position", { ascending: true })
          .limit(1)
          .single();

        if (nextTicket) {
          const now = new Date();
          await supabase
            .from("queue_tickets")
            .update({
              status: "active",
              called_at: now.toISOString(),
              expires_at: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("id", nextTicket.id);
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Action inconnue" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Admin queue action error:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
