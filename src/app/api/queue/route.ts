import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST: Join the queue
export async function POST(request: Request) {
  try {
    const { restaurant_slug, session_id } = await request.json();

    if (!restaurant_slug || !session_id) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch restaurant
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, queue_enabled, queue_max_concurrent")
      .eq("slug", restaurant_slug)
      .single();

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant introuvable" },
        { status: 404 }
      );
    }

    if (!restaurant.queue_enabled) {
      return NextResponse.json({ queue_active: false, can_order: true });
    }

    // Check if this session already has a waiting/active ticket
    const { data: existing } = await supabase
      .from("queue_tickets")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("customer_session_id", session_id)
      .in("status", ["waiting", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      // Return existing ticket info
      const { count: aheadCount } = await supabase
        .from("queue_tickets")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.id)
        .eq("status", "waiting")
        .lt("position", existing.position);

      return NextResponse.json({
        queue_active: true,
        ticket: existing,
        position_ahead: existing.status === "active" ? 0 : (aheadCount || 0),
        can_order: existing.status === "active",
      });
    }

    // Get next position
    const { data: nextPos } = await supabase.rpc("next_queue_position", {
      p_restaurant_id: restaurant.id,
    });

    const position = nextPos || 1;

    // Check how many active tickets exist
    const { count: activeCount } = await supabase
      .from("queue_tickets")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", restaurant.id)
      .eq("status", "active");

    // If below max, make it active immediately
    const isActive = (activeCount || 0) < restaurant.queue_max_concurrent;

    const { data: ticket, error } = await supabase
      .from("queue_tickets")
      .insert({
        restaurant_id: restaurant.id,
        customer_session_id: session_id,
        status: isActive ? "active" : "waiting",
        position,
        ...(isActive && {
          called_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        }),
      })
      .select()
      .single();

    if (error) {
      console.error("Queue join error:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'inscription à la file" },
        { status: 500 }
      );
    }

    // Count people ahead
    const { count: aheadCount } = await supabase
      .from("queue_tickets")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", restaurant.id)
      .eq("status", "waiting")
      .lt("position", position);

    return NextResponse.json({
      queue_active: true,
      ticket,
      position_ahead: isActive ? 0 : (aheadCount || 0),
      can_order: isActive,
    });
  } catch (err) {
    console.error("Queue error:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// GET: Check queue status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurant_slug = searchParams.get("restaurant_slug");
    const session_id = searchParams.get("session_id");
    const ticket_id = searchParams.get("ticket_id");

    if (!restaurant_slug || !session_id) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch restaurant
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, queue_enabled, queue_max_concurrent")
      .eq("slug", restaurant_slug)
      .single();

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant introuvable" },
        { status: 404 }
      );
    }

    if (!restaurant.queue_enabled) {
      return NextResponse.json({ queue_active: false, can_order: true });
    }

    // Find ticket
    let query = supabase
      .from("queue_tickets")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("customer_session_id", session_id)
      .in("status", ["waiting", "active"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (ticket_id) {
      query = supabase
        .from("queue_tickets")
        .select("*")
        .eq("id", ticket_id)
        .in("status", ["waiting", "active"])
        .limit(1);
    }

    const { data: tickets } = await query;
    const ticket = tickets?.[0];

    if (!ticket) {
      return NextResponse.json({
        queue_active: true,
        ticket: null,
        can_order: false,
      });
    }

    // Check if active ticket has expired
    if (ticket.status === "active" && ticket.expires_at) {
      if (new Date(ticket.expires_at) < new Date()) {
        await supabase
          .from("queue_tickets")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("id", ticket.id);

        return NextResponse.json({
          queue_active: true,
          ticket: { ...ticket, status: "expired" },
          can_order: false,
        });
      }
    }

    // Count people ahead
    const { count: aheadCount } = await supabase
      .from("queue_tickets")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", restaurant.id)
      .eq("status", "waiting")
      .lt("position", ticket.position);

    return NextResponse.json({
      queue_active: true,
      ticket,
      position_ahead: ticket.status === "active" ? 0 : (aheadCount || 0),
      can_order: ticket.status === "active",
    });
  } catch (err) {
    console.error("Queue status error:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
