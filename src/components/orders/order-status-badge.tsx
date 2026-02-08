import { ORDER_STATUS_CONFIG } from "@/lib/constants";
import type { OrderStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = ORDER_STATUS_CONFIG[status];

  return (
    <Badge
      variant="outline"
      className={`rounded-full text-xs font-medium ${config.bgClass} ${config.color}`}
    >
      {config.label}
    </Badge>
  );
}
