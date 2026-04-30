import { Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getTierLabel } from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/types";

type Props = {
  current: SubscriptionTier;
  required: SubscriptionTier;
  feature: string;
  description?: string;
};

export function TierLockBanner({ current, required, feature, description }: Props) {
  return (
    <Card size="sm" className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">
              {feature} — disponible dès {getTierLabel(required)}
            </CardTitle>
            {description && (
              <CardDescription className="text-xs">{description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          Plan actuel : <strong>{getTierLabel(current)}</strong>. Passez à{" "}
          <strong>{getTierLabel(required)}</strong> pour activer cette fonctionnalité.
          Contactez le support pour mettre à jour votre abonnement.
        </p>
      </CardContent>
    </Card>
  );
}
