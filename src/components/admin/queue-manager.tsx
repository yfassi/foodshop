"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Users,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import type { QueueTicket } from "@/lib/types";

interface QueueManagerProps {
  publicId: string;
  restaurantId: string;
}

export function QueueManager({ publicId, restaurantId }: QueueManagerProps) {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/queue?restaurant_public_id=${publicId}`
      );
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      // Silent fail
    }
    setLoading(false);
  }, [publicId]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Real-time updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-queue")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_tickets",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, fetchTickets]);

  const handleAction = async (action: string, ticketId?: string) => {
    setActionLoading(action + (ticketId || ""));
    try {
      const res = await fetch("/api/admin/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_public_id: publicId,
          action,
          ticket_id: ticketId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          action === "call_next"
            ? "Client suivant appelé"
            : action === "complete"
              ? "Ticket complété"
              : "Ticket expiré"
        );
        fetchTickets();
      } else if (data.message) {
        toast.info(data.message);
      }
    } catch {
      toast.error("Erreur");
    }
    setActionLoading(null);
  };

  const waitingTickets = tickets.filter((t) => t.status === "waiting");
  const activeTickets = tickets.filter((t) => t.status === "active");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-lg bg-orange-500/10 px-3 py-2">
          <Clock className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-semibold text-orange-600">
            {waitingTickets.length} en attente
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2">
          <PlayCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm font-semibold text-green-600">
            {activeTickets.length} actifs
          </span>
        </div>
      </div>

      {/* Call next button */}
      {waitingTickets.length > 0 && (
        <Button
          onClick={() => handleAction("call_next")}
          disabled={actionLoading === "call_next"}
          className="w-full"
        >
          {actionLoading === "call_next" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Users className="mr-2 h-4 w-4" />
          )}
          Appeler le client suivant
        </Button>
      )}

      {/* Active tickets */}
      {activeTickets.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            En train de commander
          </h4>
          <div className="space-y-2">
            {activeTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
                    {ticket.position}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Ticket #{ticket.position}</p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.expires_at &&
                        `Expire ${formatTimeLeft(ticket.expires_at)}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleAction("complete", ticket.id)}
                    disabled={actionLoading === `complete${ticket.id}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-green-600 transition-colors hover:bg-green-100 dark:hover:bg-green-900/50"
                    title="Marquer comme complété"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleAction("expire", ticket.id)}
                    disabled={actionLoading === `expire${ticket.id}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-100 dark:hover:bg-red-900/50"
                    title="Expirer le ticket"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waiting tickets */}
      {waitingTickets.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            File d&apos;attente
          </h4>
          <div className="space-y-1.5">
            {waitingTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                    {ticket.position}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Ticket #{ticket.position}</p>
                    <p className="text-xs text-muted-foreground">
                      En attente depuis{" "}
                      {formatTimeSince(ticket.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {tickets.length === 0 && (
        <div className="flex flex-col items-center py-8 text-center">
          <Users className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Aucun client dans la file d&apos;attente
          </p>
        </div>
      )}
    </div>
  );
}

function formatTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "expiré";
  const minutes = Math.ceil(diff / 60000);
  return `dans ${minutes} min`;
}

function formatTimeSince(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "quelques secondes";
  if (minutes === 1) return "1 minute";
  return `${minutes} minutes`;
}
