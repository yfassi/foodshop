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
  const totalItems = useCartStore((s) => s.totalItems);
  const clearCart = useCartStore((s) => s.clearCart);
  const [queueState, setQueueState] = useState<"checking" | "waiting" | "ready" | "not_required">(
    queueEnabled ? "checking" : "not_required"
  );
  const [sessionId] = useState(() => getSessionId());

  useEffect(() => {
    if (open && queueEnabled) {
      setQueueState("checking");
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
    router.push(`/restaurant/${slug}/checkout`);
  };

  const handleQueueReady = useCallback(() => {
    setQueueState("ready");
  }, []);

  const handleQueueNotRequired = useCallback(() => {
    setQueueState("not_required");
  }, []);

  const canCheckout = queueState === "ready" || queueState === "not_required";
  const total = totalPrice();
  const count = totalItems();

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div className="min-w-0">
            <DrawerTitle className="text-[17px] font-extrabold tracking-tight">
              Mon panier
            </DrawerTitle>
            {items.length > 0 && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {count} article{count > 1 ? "s" : ""}
              </p>
            )}
          </div>
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
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-destructive active:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Vider
            </button>
          )}
        </DrawerHeader>

        <div className="overflow-y-auto px-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <div className="mb-3 grid h-[72px] w-[72px] place-items-center rounded-full bg-muted text-3xl">
                🛒
              </div>
              <p className="mb-1 text-[15px] font-bold tracking-tight">
                Panier vide
              </p>
              <p className="mb-5 max-w-[24ch] text-[12px] leading-snug text-muted-foreground">
                Ajoutez des plats pour commencer.
              </p>
              <button
                onClick={onClose}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-colors active:bg-primary/90"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Voir le menu
              </button>
            </div>
          ) : (
            <>
              <div className="pt-1">
                {items.map((item) => <CartItem key={item.id} item={item} />)}
              </div>

              {categories && categories.length > 0 && (
                <CartSuggestions categories={categories} />
              )}
            </>
          )}
        </div>

        {items.length > 0 && (
          <DrawerFooter className="border-t border-border pt-3">
            {queueEnabled && queueState === "waiting" && (
              <QueueWaiting
                slug={slug}
                sessionId={sessionId}
                onReady={handleQueueReady}
                onNotRequired={handleQueueNotRequired}
              />
            )}

            {(canCheckout || queueState === "checking") && (
              <>
                {/* Total box matching the design system */}
                <div className="rounded-2xl border-[1.5px] border-border bg-muted/40 p-4">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span className="font-mono font-medium">{formatPrice(total)}</span>
                  </div>
                  <hr className="my-2.5 border-t border-dashed border-border" />
                  <div className="flex items-center justify-between text-[15px] font-bold">
                    <span>Total</span>
                    <span className="font-mono">{formatPrice(total)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={disabled || queueState === "checking"}
                  className="mt-3 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-success px-4 text-[15px] font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all active:bg-success active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ height: 52 }}
                >
                  {disabled
                    ? "Commandes fermées"
                    : queueState === "checking"
                      ? "Vérification…"
                      : `Payer · ${formatPrice(total)}`}
                </button>
                <button
                  onClick={onClose}
                  className="flex h-10 w-full items-center justify-center gap-1 text-[13px] text-muted-foreground transition-colors active:text-foreground"
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
