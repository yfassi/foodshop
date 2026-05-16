"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FloorPlanEditor } from "@/components/admin/floor-plan-editor";
import { FeatureGate } from "@/components/upsell/feature-gate";
import type { FloorPlan } from "@/lib/types";

export default function PlanDeSallePage() {
  const params = useParams<{ publicId: string }>();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [floorPlan, setFloorPlan] = useState<FloorPlan>({ tables: [] });
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("id, floor_plan")
        .eq("public_id", params.publicId)
        .single();
      if (data) {
        setRestaurantId(data.id);
        setFloorPlan((data.floor_plan as FloorPlan) ?? { tables: [] });
      }
      setLoading(false);
      // Wait for state to settle before unlocking auto-save.
      setTimeout(() => {
        hasLoaded.current = true;
      }, 1500);
    };
    load();
  }, [params.publicId]);

  const save = useCallback(
    async (next: FloorPlan) => {
      if (!hasLoaded.current || !restaurantId) return;
      const supabase = createClient();
      const { error } = await supabase
        .from("restaurants")
        .update({ floor_plan: { ...next, updated_at: new Date().toISOString() } })
        .eq("id", restaurantId);
      if (error) toast.error("Erreur lors de la sauvegarde");
      else toast.success("Enregistré");
    },
    [restaurantId],
  );

  // Debounced auto-save when floorPlan changes (after initial load).
  useEffect(() => {
    if (!hasLoaded.current) return;
    const id = setTimeout(() => save(floorPlan), 800);
    return () => clearTimeout(id);
  }, [floorPlan, save]);

  if (loading) {
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
        icon={LayoutGrid}
        title="Plan de salle"
        subtitle="Configurez vos tables pour le service en salle."
      />
      <FeatureGate feature="floorPlan">
        <FloorPlanEditor value={floorPlan} onChange={setFloorPlan} />
      </FeatureGate>
    </div>
  );
}
