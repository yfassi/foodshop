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
  publicId: string;
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

export function CartDrawer({ open, onClose, publicId, disabled, categories, queueEnabled }: CartDrawerProps) {
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
      fetch(`/api/queue?restaurant_public_id=${publicId}&session_id=${sessionId}`)
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
  }, [open, queueEnabled, publicId, sessionId]);

  const handleCheckout = () => {
    onClose();
    router.push(`/restaurant/${publicId}/checkout`);
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
        <DrawerHeader className="flex items-center justify-between gap-2 border-b border-[#dbd7d2] bg-white pb-3">
          <div className="min-w-0">
            <DrawerTitle className="text-[17px] font-extrabold tracking-[-0.015em] text-[#1c1410]">
              Mon panier
            </DrawerTitle>
            {items.length > 0 && (
              <p className="mt-0.5 text-[11px] text-[#68625e]">
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
              className="flex h-9 items-center gap-1.5 rounded-full border-[1.5px] border-[#dbd7d2] bg-white px-3 text-[11px] font-semibold text-[#68625e] transition-colors hover:border-[#bf000f] hover:text-[#bf000f] active:bg-[#fbdadd]/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Vider
            </button>
          )}
        </DrawerHeader>

        <div className="overflow-y-auto px-4">
          {items.length === 0 ? (
            /* Empty state — kit: circular icon container, Poppins 800 title */
            <div className="flex flex-col items-center gap-2.5 px-6 py-12 text-center">
              <div className="grid h-[72px] w-[72px] place-items-center rounded-full border border-[#dbd7d2] bg-[#fdf9f3]">
                <ShoppingBag className="h-8 w-8 text-[#a89e94]" />
              </div>
              <p className="text-[17px] font-extrabold tracking-[-0.02em] text-[#1c1410]">
                Panier vide
              </p>
              <p className="max-w-[24ch] text-[13px] leading-snug text-[#68625e]">
                Ajoutez des plats pour commencer.
              </p>
              <button
                onClick={onClose}
                className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#d7352d] px-5 text-[13px] font-bold uppercase tracking-[0.06em] text-white shadow-[0_0_20px_#d7352d4d] transition-colors active:bg-[#bf2c25]"
              >
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
                publicId={publicId}
                sessionId={sessionId}
                onReady={handleQueueReady}
                onNotRequired={handleQueueNotRequired}
              />
            )}

            {(canCheckout || queueState === "checking") && (
              <>
                {/* Total box — kit: ticket-paper style, dashed divider, Space Mono */}
                <div className="rounded-[14px] border-[1.5px] border-[#dbd7d2] bg-white p-4">
                  <div className="flex items-center justify-between text-[15px] font-extrabold text-[#1c1410]">
                    <span>Total</span>
                    <span className="font-mono">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Checkout button — kit: pill-shaped, tomato red primary */}
                <button
                  onClick={handleCheckout}
                  disabled={disabled || queueState === "checking"}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#d7352d] px-4 text-[14px] font-bold uppercase tracking-[0.06em] text-white shadow-[0_0_20px_#d7352d4d] transition-all active:bg-[#bf2c25] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="flex h-10 w-full items-center justify-center gap-1 text-[13px] text-[#68625e] transition-colors active:text-[#1c1410]"
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
