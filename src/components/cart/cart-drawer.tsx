"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/format";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { CartItem } from "./cart-item";
import { CartSuggestions } from "./cart-suggestions";
import { Trash2, ChevronLeft, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { CategoryWithProducts } from "@/lib/types";
import { QueueWaiting } from "@/components/queue/queue-waiting";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  slug: string;
  disabled?: boolean;
  categories?: CategoryWithProducts[];
  queueEnabled?: boolean;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("queue_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("queue_session_id", id);
  }
  return id;
}

export function CartDrawer({ open, onClose, slug, disabled, categories, queueEnabled }: CartDrawerProps) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const clearCart = useCartStore((s) => s.clearCart);
  const [queueState, setQueueState] = useState<"checking" | "waiting" | "ready" | "not_required">(
    queueEnabled ? "checking" : "not_required"
  );
  const [sessionId] = useState(() => getSessionId());

  // Reset queue state when drawer opens and queue is enabled
  useEffect(() => {
    if (open && queueEnabled) {
      setQueueState("checking");
      // Quick check if queue is active
      fetch(`/api/queue?restaurant_slug=${slug}&session_id=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.queue_active) {
            setQueueState("not_required");
          } else if (data.can_order) {
            setQueueState("ready");
          } else if (data.ticket) {
            setQueueState("waiting");
          } else {
            // Need to join queue
            setQueueState("waiting");
          }
        })
        .catch(() => {
          setQueueState("not_required");
        });
    } else if (!queueEnabled) {
      setQueueState("not_required");
    }
  }, [open, queueEnabled, slug, sessionId]);

  const handleCheckout = () => {
    onClose();
    router.push(`/${slug}/checkout`);
  };

  const handleQueueReady = useCallback(() => {
    setQueueState("ready");
  }, []);

  const handleQueueNotRequired = useCallback(() => {
    setQueueState("not_required");
  }, []);

  const canCheckout = queueState === "ready" || queueState === "not_required";

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="flex items-center justify-between pb-3">
          <DrawerTitle className="text-lg font-bold">
            Mon panier
          </DrawerTitle>
          {items.length > 0 && (
            <button
              onClick={() => {
                toast("Vider le panier ?", {
                  action: {
                    label: "Confirmer",
                    onClick: () => clearCart(),
                  },
                });
              }}
              className="flex h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-destructive transition-colors active:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Vider
            </button>
          )}
        </DrawerHeader>

        <div className="overflow-y-auto px-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <ShoppingBag className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="mb-1 text-sm font-medium text-muted-foreground">
                Votre panier est vide
              </p>
              <p className="mb-4 text-xs text-muted-foreground/70">
                Parcourez le menu pour ajouter des articles
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="rounded-lg"
              >
                Voir le menu
              </Button>
            </div>
          ) : (
            <>
              {items.map((item) => <CartItem key={item.id} item={item} />)}

              {/* Suggestions */}
              {categories && categories.length > 0 && (
                <CartSuggestions categories={categories} />
              )}
            </>
          )}
        </div>

        {items.length > 0 && (
          <DrawerFooter className="border-t border-border pt-3">
            {/* Queue waiting overlay */}
            {queueEnabled && queueState === "waiting" && (
              <QueueWaiting
                slug={slug}
                sessionId={sessionId}
                onReady={handleQueueReady}
                onNotRequired={handleQueueNotRequired}
              />
            )}

            {/* Normal checkout flow */}
            {(canCheckout || queueState === "checking") && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total</span>
                  <span className="price-mono text-lg font-bold">
                    {formatPrice(totalPrice())}
                  </span>
                </div>
                <Button
                  onClick={handleCheckout}
                  disabled={disabled || queueState === "checking"}
                  className="h-14 w-full rounded-xl text-base font-bold"
                  size="lg"
                >
                  {disabled ? (
                    "Commandes fermees"
                  ) : queueState === "checking" ? (
                    "Vérification..."
                  ) : (
                    <>
                      Commander <span aria-hidden>—</span>{" "}
                      <span className="price-mono">{formatPrice(totalPrice())}</span>
                    </>
                  )}
                </Button>
                <button
                  onClick={onClose}
                  className="flex h-11 w-full items-center justify-center gap-1 rounded-lg text-sm text-muted-foreground transition-colors active:bg-accent active:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Continuer mes achats
                </button>
              </>
            )}
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
