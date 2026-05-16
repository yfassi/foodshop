"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { QueueManager } from "@/components/admin/queue-manager";

export default function FileAttentePage() {
  const params = useParams<{ publicId: string }>();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [maxConcurrent, setMaxConcurrent] = useState(5);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("id, queue_enabled, queue_max_concurrent")
        .eq("public_id", params.publicId)
        .single();
      if (data) {
        setRestaurantId(data.id);
        setEnabled(data.queue_enabled ?? false);
        setMaxConcurrent(data.queue_max_concurrent ?? 5);
      }
      setLoading(false);
      setTimeout(() => {
        hasLoaded.current = true;
      }, 1500);
    };
    load();
  }, [params.publicId]);

  const save = useCallback(
    async (next: { enabled: boolean; maxConcurrent: number }) => {
      if (!hasLoaded.current || !restaurantId) return;
      const supabase = createClient();
      const { error } = await supabase
        .from("restaurants")
        .update({
          queue_enabled: next.enabled,
          queue_max_concurrent: next.maxConcurrent,
        })
        .eq("id", restaurantId);
      if (error) toast.error("Erreur lors de la sauvegarde");
      else toast.success("Enregistré");
    },
    [restaurantId],
  );

  useEffect(() => {
    if (!hasLoaded.current) return;
    const id = setTimeout(() => save({ enabled, maxConcurrent }), 600);
    return () => clearTimeout(id);
  }, [enabled, maxConcurrent, save]);

  if (loading || !restaurantId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="Réglages"
        icon={Users}
        title="File d'attente digitale"
        subtitle="Limitez le nombre de clients qui commandent en même temps."
      />

      <div className="space-y-4">
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm">File d&apos;attente digitale</CardTitle>
                <CardDescription className="text-xs">
                  Limitez les commandes simultanées pendant les heures de pointe.
                </CardDescription>
              </div>
            </div>
            <CardAction>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                aria-label="Activer la file d'attente"
              />
            </CardAction>
          </CardHeader>
        </Card>

        {enabled && (
          <>
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-sm">Commandes simultanées max</CardTitle>
                <CardDescription className="text-xs">
                  Nombre de clients pouvant commander en même temps.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0"
                    onClick={() => setMaxConcurrent(Math.max(1, maxConcurrent - 1))}
                    aria-label="Diminuer"
                  >
                    −
                  </Button>
                  <span className="min-w-[3rem] text-center text-2xl font-bold tabular-nums">
                    {maxConcurrent}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0"
                    onClick={() => setMaxConcurrent(Math.min(50, maxConcurrent + 1))}
                    aria-label="Augmenter"
                  >
                    +
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="pt-4">
                <p className="mb-3 text-sm font-medium">File d&apos;attente en cours</p>
                <QueueManager publicId={params.publicId} restaurantId={restaurantId} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
