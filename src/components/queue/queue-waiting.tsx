"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { QueueTicket } from "@/lib/types";
import { Clock, ChefHat, Users, Loader2 } from "lucide-react";

interface QueueWaitingProps {
  publicId: string;
  sessionId: string;
  onReady: () => void;
  onNotRequired: () => void;
}

export function QueueWaiting({
  publicId,
  sessionId,
  onReady,
  onNotRequired,
}: QueueWaitingProps) {
  const [ticket, setTicket] = useState<QueueTicket | null>(null);
  const [positionAhead, setPositionAhead] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [dots, setDots] = useState(0);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        restaurant_public_id: publicId,
        session_id: sessionId,
      });
      if (ticket?.id) {
        params.set("ticket_id", ticket.id);
      }

      const res = await fetch(`/api/queue?${params}`);
      const data = await res.json();

      if (!data.queue_active) {
        onNotRequired();
        return;
      }

      if (data.can_order) {
        setTicket(data.ticket);
        setPositionAhead(0);
        onReady();
        return;
      }

      if (data.ticket) {
        setTicket(data.ticket);
        setPositionAhead(data.position_ahead || 0);
      }
    } catch {
      // Silent fail
    }
  }, [publicId, sessionId, ticket?.id, onReady, onNotRequired]);

  // Initial check: see if we already have a ticket
  useEffect(() => {
    const initialCheck = async () => {
      try {
        const params = new URLSearchParams({
          restaurant_public_id: publicId,
          session_id: sessionId,
        });
        const res = await fetch(`/api/queue?${params}`);
        const data = await res.json();

        if (!data.queue_active) {
          onNotRequired();
          return;
        }

        if (data.can_order) {
          setTicket(data.ticket);
          onReady();
          return;
        }

        if (data.ticket) {
          // Already have a ticket, show waiting
          setTicket(data.ticket);
          setPositionAhead(data.position_ahead || 0);
        } else {
          // No ticket yet, show join button
          setNeedsJoin(true);
        }
      } catch {
        onNotRequired();
      }
      setLoading(false);
    };

    initialCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicId, sessionId]);

  // Join queue (explicit user action)
  const joinQueue = async () => {
    setJoining(true);
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_public_id: publicId,
          session_id: sessionId,
        }),
      });
      const data = await res.json();

      if (!data.queue_active) {
        onNotRequired();
        return;
      }

      if (data.can_order) {
        setTicket(data.ticket);
        onReady();
        return;
      }

      setTicket(data.ticket);
      setPositionAhead(data.position_ahead || 0);
      setNeedsJoin(false);
    } catch {
      // Silent fail
    }
    setJoining(false);
  };

  // Poll for status updates every 5 seconds
  useEffect(() => {
    if (!ticket || ticket.status === "active") return;
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [ticket, checkStatus]);

  // Real-time updates
  useEffect(() => {
    if (!ticket) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`queue-${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "queue_tickets",
          filter: `id=eq.${ticket.id}`,
        },
        (payload) => {
          const updated = payload.new as QueueTicket;
          setTicket(updated);
          if (updated.status === "active") {
            onReady();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket?.id, onReady]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">
          Vérification de la file d&apos;attente...
        </p>
      </div>
    );
  }

  // Show join button for users who haven't joined yet
  if (needsJoin) {
    return (
      <div className="flex flex-col items-center px-4 py-8">
        <div className="relative mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/10">
            <Users className="h-10 w-10 text-orange-500" />
          </div>
        </div>

        <h2 className="mb-2 text-lg font-bold text-center">
          File d&apos;attente active
        </h2>
        <p className="mb-6 max-w-xs text-center text-sm text-muted-foreground">
          Le restaurant limite les commandes simultanées pour garantir la qualité.
          Rejoignez la file pour commander dès que possible.
        </p>

        <Button
          onClick={joinQueue}
          disabled={joining}
          className="h-12 w-full max-w-xs rounded-xl text-base font-bold"
          size="lg"
        >
          {joining ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Users className="mr-2 h-4 w-4" />
          )}
          Rejoindre la file d&apos;attente
        </Button>

        <p className="mt-4 max-w-xs text-center text-xs text-muted-foreground">
          Vous pouvez parcourir le menu et préparer votre panier en attendant.
        </p>
      </div>
    );
  }

  if (!ticket) return null;

  const estimatedMinutes = positionAhead * 3; // ~3 min per person

  return (
    <div className="flex flex-col items-center px-4 py-8">
      {/* Animated cooking illustration */}
      <div className="relative mb-8">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary/10">
          <ChefHat className="h-14 w-14 text-primary animate-bounce" style={{ animationDuration: "2s" }} />
        </div>
        {/* Pulsing ring */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
        {/* Steam animation */}
        <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-4 w-1 rounded-full bg-muted-foreground/30 animate-steam"
              style={{
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Title */}
      <h2 className="mb-2 text-xl font-bold text-center">
        Cuisine en pleine activité !
      </h2>
      <p className="mb-8 max-w-xs text-center text-sm text-muted-foreground">
        Pour vous offrir la meilleure expérience, nous limitons les commandes
        simultanées. Votre tour arrive bientôt{".".repeat(dots)}
      </p>

      {/* Position card */}
      <div className="mb-6 w-full max-w-xs overflow-hidden rounded-2xl border border-border bg-card">
        {/* Ticket number */}
        <div className="bg-primary/5 px-5 py-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Votre ticket
          </p>
          <p className="mt-1 text-4xl font-black tabular-nums text-primary">
            #{ticket.position}
          </p>
        </div>

        <div className="divide-y divide-border">
          {/* People ahead */}
          <div className="flex items-center gap-3 px-5 py-3.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {positionAhead === 0
                  ? "Vous êtes le prochain !"
                  : `${positionAhead} personne${positionAhead > 1 ? "s" : ""} devant vous`}
              </p>
            </div>
          </div>

          {/* Estimated wait */}
          <div className="flex items-center gap-3 px-5 py-3.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {estimatedMinutes <= 1
                  ? "Moins d'une minute"
                  : `~${estimatedMinutes} minutes d'attente`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2">
        {Array.from({ length: Math.min(positionAhead + 1, 5) }).map((_, i) => (
          <div
            key={i}
            className={`h-2.5 rounded-full transition-all duration-500 ${
              i === 0
                ? "w-8 bg-primary animate-pulse"
                : "w-2.5 bg-muted-foreground/20"
            }`}
          />
        ))}
      </div>

      {/* Info text */}
      <p className="mt-8 max-w-xs text-center text-xs text-muted-foreground">
        Vous pouvez parcourir le menu et préparer votre panier en attendant.
        Vous pourrez commander dès que ce sera votre tour.
      </p>
    </div>
  );
}
