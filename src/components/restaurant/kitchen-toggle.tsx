"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export function KitchenToggle({
  restaurantId,
  initialOpen,
  onToggle,
}: {
  restaurantId: string;
  initialOpen: boolean;
  onToggle?: (checked: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("restaurants")
      .update({ is_accepting_orders: checked })
      .eq("id", restaurantId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      setIsOpen(checked);
      onToggle?.(checked);
      toast.success(checked ? "Commandes ouvertes" : "Commandes fermées");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          isOpen ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
        }`}
      >
        {isOpen ? "Ouvert" : "Fermé"}
      </span>
      <Switch
        checked={isOpen}
        onCheckedChange={handleToggle}
        disabled={loading}
      />
    </div>
  );
}
