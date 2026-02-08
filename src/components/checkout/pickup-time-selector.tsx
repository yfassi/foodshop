"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generatePickupTimeSlots } from "@/lib/constants";

export function PickupTimeSelector({
  value,
  onChange,
  ranges,
}: {
  value: string;
  onChange: (value: string) => void;
  ranges: { open: string; close: string }[];
}) {
  const slots = generatePickupTimeSlots(ranges);

  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun creneau disponible pour aujourd&apos;hui.
      </p>
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-12 text-sm font-medium">
        <SelectValue placeholder="Choisir un creneau" />
      </SelectTrigger>
      <SelectContent>
        {slots.map((slot) => (
          <SelectItem key={slot} value={slot} className="text-sm font-medium">
            {slot}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
