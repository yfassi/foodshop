"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Mail,
  Phone,
  Receipt,
  ShoppingBag,
  Sparkles,
  Trash2,
  UserCircle,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice, formatDate } from "@/lib/format";
import { computeLoyalty, type LoyaltyResult } from "@/lib/loyalty";

type WalletTx = {
  id: string;
  type: "topup_stripe" | "topup_admin" | "payment" | "refund";
  amount: number;
  balance_after: number;
  description: string | null;
  order_id: string | null;
  created_at: string;
};

type ClientOrder = {
  id: string;
  order_number: number;
  display_order_number: string | null;
  status: "new" | "preparing" | "ready" | "done" | "cancelled";
  total_price: number;
  items: Array<{ product_name: string; quantity: number; line_total: number }>;
  created_at: string;
  payment_method: string;
  paid: boolean;
};

type ClientDetail = {
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string | null;
  wallet: { id: string; balance: number; updated_at: string } | null;
  stats: {
    order_count: number;
    total_spent: number;
    avg_ticket: number;
    first_order_at: string | null;
    last_order_at: string | null;
  };
  transactions: WalletTx[];
  orders: ClientOrder[];
};

const TX_LABEL: Record<WalletTx["type"], string> = {
  topup_stripe: "Recharge en ligne",
  topup_admin: "Crédit manuel",
  payment: "Paiement commande",
  refund: "Remboursement",
};

const ORDER_STATUS: Record<ClientOrder["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "Nouvelle", variant: "default" },
  preparing: { label: "En préparation", variant: "secondary" },
  ready: { label: "Prête", variant: "secondary" },
  done: { label: "Récupérée", variant: "outline" },
  cancelled: { label: "Annulée", variant: "destructive" },
};

interface Props {
  userId: string | null;
  restaurantPublicId: string;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function ClientDetailSheet({
  userId,
  restaurantPublicId,
  open,
  onClose,
  onChanged,
}: Props) {
  const [data, setData] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Edit profile
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Credit / debit forms
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDesc, setCreditDesc] = useState("");
  const [debitAmount, setDebitAmount] = useState("");
  const [debitDesc, setDebitDesc] = useState("");
  const [walletBusy, setWalletBusy] = useState(false);

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/clients/${userId}?restaurant_public_id=${restaurantPublicId}`
      );
      if (!res.ok) throw new Error("Erreur de chargement");
      const json: ClientDetail = await res.json();
      setData(json);
      setEditFullName(json.full_name);
      setEditEmail(json.email);
      setEditPhone(json.phone || "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [userId, restaurantPublicId]);

  useEffect(() => {
    if (open && userId) load();
    if (!open) {
      setData(null);
      setCreditAmount("");
      setCreditDesc("");
      setDebitAmount("");
      setDebitDesc("");
    }
  }, [open, userId, load]);

  const saveProfile = async () => {
    if (!userId) return;
    setSavingProfile(true);
    try {
      const res = await fetch(
        `/api/admin/clients/${userId}?restaurant_public_id=${restaurantPublicId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: editFullName,
            email: editEmail,
            phone: editPhone || null,
          }),
        }
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Erreur");
      toast.success("Profil mis à jour");
      await load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSavingProfile(false);
    }
  };

  const doCredit = async () => {
    if (!data?.wallet) return;
    const cents = Math.round(parseFloat(creditAmount) * 100);
    if (!cents || cents <= 0) return toast.error("Montant invalide");
    setWalletBusy(true);
    try {
      const res = await fetch("/api/admin/wallet/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_public_id: restaurantPublicId,
          wallet_id: data.wallet.id,
          amount: cents,
          description: creditDesc || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Erreur");
      toast.success("Crédit effectué");
      setCreditAmount("");
      setCreditDesc("");
      await load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setWalletBusy(false);
    }
  };

  const doDebit = async () => {
    if (!data?.wallet) return;
    const cents = Math.round(parseFloat(debitAmount) * 100);
    if (!cents || cents <= 0) return toast.error("Montant invalide");
    setWalletBusy(true);
    try {
      const res = await fetch("/api/admin/wallet/debit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_public_id: restaurantPublicId,
          wallet_id: data.wallet.id,
          amount: cents,
          description: debitDesc || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Erreur");
      toast.success("Débit effectué");
      setDebitAmount("");
      setDebitDesc("");
      await load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setWalletBusy(false);
    }
  };

  const doDelete = async () => {
    if (!userId) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/clients/${userId}?restaurant_public_id=${restaurantPublicId}`,
        { method: "DELETE" }
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Erreur");
      toast.success(
        j.fully_deleted ? "Client supprimé" : "Client détaché de ce restaurant"
      );
      onChanged();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const loyalty: LoyaltyResult | null = data
    ? computeLoyalty(data.stats.order_count, data.stats.total_spent)
    : null;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{data?.full_name || "Client"}</SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-2 text-xs">
              {data?.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {data.email}
                </span>
              )}
              {data?.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {data.phone}
                </span>
              )}
              {loyalty && (
                <Badge variant="outline" className="text-[10px]">
                  {loyalty.tier.icon} {loyalty.tier.label}
                </Badge>
              )}
            </SheetDescription>
          </SheetHeader>

          {loading || !data ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="profile" className="flex flex-1 flex-col overflow-hidden">
              <TabsList className="mx-6 mt-3 grid grid-cols-4">
                <TabsTrigger value="profile" className="text-xs">
                  <UserCircle className="mr-1 h-3.5 w-3.5" />
                  Profil
                </TabsTrigger>
                <TabsTrigger value="loyalty" className="text-xs">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Fidélité
                </TabsTrigger>
                <TabsTrigger value="payments" className="text-xs">
                  <Wallet className="mr-1 h-3.5 w-3.5" />
                  Paiements
                </TabsTrigger>
                <TabsTrigger value="orders" className="text-xs">
                  <ShoppingBag className="mr-1 h-3.5 w-3.5" />
                  Commandes
                </TabsTrigger>
              </TabsList>

              {/* Profil */}
              <TabsContent value="profile" className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                  <div className="space-y-4 p-6">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nom complet</Label>
                      <Input
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email</Label>
                      <Input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Téléphone</Label>
                      <Input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={saveProfile}
                        disabled={savingProfile}
                        className="flex-1"
                      >
                        {savingProfile && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Enregistrer
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDeleteOpen(true)}
                        title="Supprimer le client"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <Separator className="my-2" />

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <Stat label="Inscrit le" value={data.created_at ? formatDate(data.created_at) : "—"} />
                      <Stat label="Solde" value={data.wallet ? formatPrice(data.wallet.balance) : "—"} />
                      <Stat label="Commandes" value={String(data.stats.order_count)} />
                      <Stat label="Total dépensé" value={formatPrice(data.stats.total_spent)} />
                      <Stat label="Panier moyen" value={data.stats.avg_ticket > 0 ? formatPrice(data.stats.avg_ticket) : "—"} />
                      <Stat label="Dernière commande" value={data.stats.last_order_at ? formatDate(data.stats.last_order_at) : "—"} />
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Fidélité */}
              <TabsContent value="loyalty" className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                  <div className="space-y-4 p-6">
                    {loyalty && (
                      <>
                        <div className="rounded-xl border border-border bg-card p-5">
                          <div className="mb-3 flex items-center gap-3">
                            <div className="text-3xl">{loyalty.tier.icon}</div>
                            <div>
                              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                Statut
                              </p>
                              <p className="text-xl font-bold">
                                {loyalty.tier.label}
                              </p>
                            </div>
                          </div>
                          {loyalty.next ? (
                            <>
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  Prochain palier : {loyalty.next.label}
                                </span>
                                <span className="font-medium">
                                  {Math.round(loyalty.progress * 100)}%
                                </span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${Math.round(loyalty.progress * 100)}%` }}
                                />
                              </div>
                              <p className="mt-2 text-[11px] text-muted-foreground">
                                Encore {loyalty.remainingOrders} commande{loyalty.remainingOrders > 1 ? "s" : ""} ou {formatPrice(loyalty.remainingSpend)} dépensés.
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Niveau maximum atteint 🏆
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <Stat label="Commandes" value={String(data.stats.order_count)} />
                          <Stat label="Total dépensé" value={formatPrice(data.stats.total_spent)} />
                          <Stat label="Panier moyen" value={data.stats.avg_ticket > 0 ? formatPrice(data.stats.avg_ticket) : "—"} />
                          <Stat label="Client depuis" value={data.stats.first_order_at ? formatDate(data.stats.first_order_at) : "—"} />
                        </div>

                        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3">
                          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Paliers
                          </p>
                          <ul className="space-y-1 text-xs">
                            {loyalty.allTiers.map((t) => (
                              <li
                                key={t.key}
                                className={`flex items-center justify-between rounded-md px-2 py-1 ${
                                  t.key === loyalty.tier.key
                                    ? "bg-primary/10 font-medium"
                                    : ""
                                }`}
                              >
                                <span>
                                  {t.icon} {t.label}
                                </span>
                                <span className="text-muted-foreground">
                                  {t.minOrders}+ cmd · {formatPrice(t.minSpent)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Paiements */}
              <TabsContent value="payments" className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                  <div className="space-y-4 p-6">
                    {data.wallet && (
                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Solde actuel
                        </p>
                        <p className="text-2xl font-bold text-primary">
                          {formatPrice(data.wallet.balance)}
                        </p>
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border bg-card p-3">
                        <p className="mb-2 text-xs font-semibold">Créditer</p>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Montant €"
                          value={creditAmount}
                          onChange={(e) => setCreditAmount(e.target.value)}
                          className="mb-1.5 h-8 text-xs"
                        />
                        <Input
                          placeholder="Description"
                          value={creditDesc}
                          onChange={(e) => setCreditDesc(e.target.value)}
                          className="mb-2 h-8 text-xs"
                        />
                        <Button
                          onClick={doCredit}
                          disabled={walletBusy}
                          size="sm"
                          className="w-full"
                        >
                          {walletBusy && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          Créditer
                        </Button>
                      </div>
                      <div className="rounded-xl border border-border bg-card p-3">
                        <p className="mb-2 text-xs font-semibold">Débiter</p>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Montant €"
                          value={debitAmount}
                          onChange={(e) => setDebitAmount(e.target.value)}
                          className="mb-1.5 h-8 text-xs"
                        />
                        <Input
                          placeholder="Motif (correction)"
                          value={debitDesc}
                          onChange={(e) => setDebitDesc(e.target.value)}
                          className="mb-2 h-8 text-xs"
                        />
                        <Button
                          onClick={doDebit}
                          disabled={walletBusy}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          {walletBusy && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          Débiter
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Historique ({data.transactions.length})
                      </p>
                      {data.transactions.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                          Aucune transaction
                        </div>
                      ) : (
                        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                          {data.transactions.map((tx) => (
                            <li
                              key={tx.id}
                              className="flex items-center justify-between px-3 py-2.5"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">
                                  {TX_LABEL[tx.type]}
                                </p>
                                {tx.description && (
                                  <p className="truncate text-[11px] text-muted-foreground">
                                    {tx.description}
                                  </p>
                                )}
                                <p className="text-[10px] text-muted-foreground">
                                  {formatDate(tx.created_at)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p
                                  className={`text-sm font-bold ${
                                    tx.amount >= 0
                                      ? "text-primary"
                                      : "text-destructive"
                                  }`}
                                >
                                  {tx.amount >= 0 ? "+" : ""}
                                  {formatPrice(tx.amount)}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Solde {formatPrice(tx.balance_after)}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Commandes */}
              <TabsContent value="orders" className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                  <div className="space-y-3 p-6">
                    {data.orders.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                        Aucune commande
                      </div>
                    ) : (
                      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                        {data.orders.map((o) => {
                          const status = ORDER_STATUS[o.status];
                          return (
                            <li key={o.id} className="px-3 py-3">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs font-semibold">
                                    #{o.display_order_number || o.order_number}
                                  </span>
                                  <Badge
                                    variant={status.variant}
                                    className="text-[9px]"
                                  >
                                    {status.label}
                                  </Badge>
                                </div>
                                <span className="text-sm font-bold">
                                  {formatPrice(o.total_price)}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                {formatDate(o.created_at)}
                              </p>
                              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                                {o.items
                                  .map(
                                    (it) =>
                                      `${it.quantity > 1 ? `${it.quantity}× ` : ""}${it.product_name}`
                                  )
                                  .join(" · ")}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce client ?</DialogTitle>
            <DialogDescription>
              Le portefeuille et l&apos;historique de paiements pour ce restaurant
              seront supprimés. Les commandes restent dans l&apos;historique de la
              caisse mais sont détachées du client. Si le client n&apos;a aucune
              activité dans un autre restaurant, son compte global sera supprimé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={doDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
