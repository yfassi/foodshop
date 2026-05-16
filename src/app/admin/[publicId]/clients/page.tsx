"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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
import { TypographyMuted } from "@/components/ui/typography";
import { toast } from "sonner";
import {
  ChevronRight,
  Loader2,
  Plus,
  Search,
  Users,
  Sparkles,
  Gift,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { computeLoyalty, LOYALTY_TIERS, type LoyaltyTier } from "@/lib/loyalty";
import { ClientDetailSheet } from "@/components/admin/client-detail-sheet";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

interface ClientEntry {
  wallet_id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string;
  balance: number;
  updated_at: string;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
  points_earned: number;
  points_used: number;
  points_balance: number;
}

type SortKey = "name" | "balance" | "orders" | "spent" | "last" | "points";

const TIER_FILTERS = [
  { key: "all" as const, label: "Tous" },
  ...LOYALTY_TIERS.map((t) => ({ key: t.key as LoyaltyTier["key"] | "all", label: `${t.icon} ${t.label}` })),
];

function shortDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function ClientsPage() {
  const params = useParams<{ publicId: string }>();
  const [clients, setClients] = useState<ClientEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<LoyaltyTier["key"] | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("last");
  const [sortAsc, setSortAsc] = useState(false);

  // Detail sheet
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Credit dialog (création/recherche par email — pour ajouter un nouveau client)
  const [creditOpen, setCreditOpen] = useState(false);
  const [creditEmail, setCreditEmail] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const [crediting, setCrediting] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/wallet/list?restaurant_public_id=${params.publicId}`
      );
      const data = await res.json();
      setClients(data.clients || []);
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [params.publicId]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(creditAmount) * 100);
    if (!creditEmail || isNaN(amountCents) || amountCents <= 0) {
      toast.error("Email et montant valides requis");
      return;
    }
    setCrediting(true);
    try {
      const res = await fetch("/api/admin/wallet/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_public_id: params.publicId,
          customer_email: creditEmail,
          amount: amountCents,
          description: creditDescription || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success("Solde crédité");
      setCreditEmail("");
      setCreditAmount("");
      setCreditDescription("");
      setCreditOpen(false);
      fetchClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setCrediting(false);
    }
  };

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = clients;
    if (q) {
      list = list.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q)
      );
    }
    if (tierFilter !== "all") {
      list = list.filter(
        (c) => computeLoyalty(c.order_count, c.total_spent).tier.key === tierFilter
      );
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.full_name.localeCompare(b.full_name);
          break;
        case "balance":
          cmp = a.balance - b.balance;
          break;
        case "orders":
          cmp = a.order_count - b.order_count;
          break;
        case "spent":
          cmp = a.total_spent - b.total_spent;
          break;
        case "last":
          cmp =
            (a.last_order_at ? new Date(a.last_order_at).getTime() : 0) -
            (b.last_order_at ? new Date(b.last_order_at).getTime() : 0);
          break;
        case "points":
          cmp = a.points_balance - b.points_balance;
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [clients, search, tierFilter, sortKey, sortAsc]);

  const onSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const openDetail = (userId: string) => {
    setSelectedUserId(userId);
    setSheetOpen(true);
  };

  // Loyalty rollup across visible client base
  const loyaltyRollup = useMemo(() => {
    let earned = 0;
    let used = 0;
    let activeMembers = 0;
    for (const c of clients) {
      earned += c.points_earned ?? 0;
      used += c.points_used ?? 0;
      if ((c.points_earned ?? 0) > 0 || (c.points_used ?? 0) > 0) {
        activeMembers += 1;
      }
    }
    return {
      earned,
      used,
      outstanding: Math.max(0, earned - used),
      activeMembers,
    };
  }, [clients]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-6xl">
        <AdminPageHeader
          kicker="Carnet client"
          icon={Users}
          title="Clients"
          subtitle={
            <TypographyMuted className="text-xs">
              {clients.length} client{clients.length > 1 ? "s" : ""} ·{" "}
              {filteredSorted.length} affiché
              {filteredSorted.length > 1 ? "s" : ""}
            </TypographyMuted>
          }
          actions={
            <Button
              onClick={() => setCreditOpen(true)}
              variant="outline"
              size="sm"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Créditer un client
            </Button>
          }
        />

        {/* Loyalty rollup — visible only when at least one client touched points */}
        {(loyaltyRollup.earned > 0 || loyaltyRollup.used > 0) && (
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-4">
            <RollupTile
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label="Membres fidélité"
              value={String(loyaltyRollup.activeMembers)}
            />
            <RollupTile
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label="Points gagnés"
              value={loyaltyRollup.earned.toLocaleString("fr-FR")}
              mono
            />
            <RollupTile
              icon={<Gift className="h-3.5 w-3.5" />}
              label="Points utilisés"
              value={loyaltyRollup.used.toLocaleString("fr-FR")}
              mono
              accent={loyaltyRollup.used > 0}
            />
            <RollupTile
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label="En circulation"
              value={loyaltyRollup.outstanding.toLocaleString("fr-FR")}
              mono
            />
          </div>
        )}

        {/* Filters bar */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, email, téléphone…"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
            {TIER_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTierFilter(key)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  tierFilter === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filteredSorted.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <TypographyMuted className="text-sm">
              {clients.length === 0
                ? "Aucun client pour le moment."
                : "Aucun résultat avec ces filtres."}
            </TypographyMuted>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <Th onClick={() => onSort("name")} active={sortKey === "name"} asc={sortAsc}>
                      Client
                    </Th>
                    <Th>Statut</Th>
                    <Th onClick={() => onSort("points")} active={sortKey === "points"} asc={sortAsc} align="right">
                      Points
                    </Th>
                    <Th onClick={() => onSort("balance")} active={sortKey === "balance"} asc={sortAsc} align="right">
                      Solde
                    </Th>
                    <Th onClick={() => onSort("orders")} active={sortKey === "orders"} asc={sortAsc} align="right">
                      Commandes
                    </Th>
                    <Th onClick={() => onSort("spent")} active={sortKey === "spent"} asc={sortAsc} align="right">
                      Dépensé
                    </Th>
                    <Th onClick={() => onSort("last")} active={sortKey === "last"} asc={sortAsc} align="right">
                      Dernière
                    </Th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSorted.map((c) => {
                    const loy = computeLoyalty(c.order_count, c.total_spent);
                    return (
                      <tr
                        key={c.user_id}
                        onClick={() => openDetail(c.user_id)}
                        className="cursor-pointer transition-colors hover:bg-accent/40"
                      >
                        <td className="px-3 py-2.5">
                          <p className="font-medium leading-tight">{c.full_name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {c.email || "—"}
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="text-[10px]">
                            {loy.tier.icon} {loy.tier.label}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {c.points_balance > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                              title={`Gagnés ${c.points_earned} · Utilisés ${c.points_used}`}
                            >
                              <Sparkles className="h-3 w-3" />
                              {c.points_balance}
                            </span>
                          ) : c.points_used > 0 ? (
                            <span
                              className="text-[11px] text-muted-foreground"
                              title={`Gagnés ${c.points_earned} · Utilisés ${c.points_used}`}
                            >
                              0
                              <span className="ml-1 text-muted-foreground/60">
                                (−{c.points_used})
                              </span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                          <span className={c.balance > 0 ? "text-primary" : ""}>
                            {formatPrice(c.balance)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                          {c.order_count}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatPrice(c.total_spent)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[11px] text-muted-foreground tabular-nums">
                          {shortDate(c.last_order_at)}
                        </td>
                        <td className="px-2 text-right">
                          <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/60" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ClientDetailSheet
        userId={selectedUserId}
        restaurantPublicId={params.publicId}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onChanged={fetchClients}
      />

      {/* Credit by email dialog (créer wallet via email) */}
      <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créditer un client</DialogTitle>
            <DialogDescription>
              Recherche par email. Si le client n&apos;a pas encore de portefeuille,
              il sera créé.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCredit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-email" className="text-xs">
                Email
              </Label>
              <Input
                id="c-email"
                type="email"
                value={creditEmail}
                onChange={(e) => setCreditEmail(e.target.value)}
                placeholder="client@email.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-amount" className="text-xs">
                Montant (€)
              </Label>
              <Input
                id="c-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="10.00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-desc" className="text-xs">
                Description (optionnel)
              </Label>
              <Input
                id="c-desc"
                value={creditDescription}
                onChange={(e) => setCreditDescription(e.target.value)}
                placeholder="Crédit fidélité"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={crediting} className="w-full">
                {crediting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créditer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RollupTile({
  icon,
  label,
  value,
  mono,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-3 py-2 ${
        accent
          ? "bg-amber-50 dark:bg-amber-500/10"
          : "bg-muted/40"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <p
        className={`mt-0.5 text-base font-semibold text-foreground ${
          mono ? "font-mono tabular-nums" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  asc,
  align,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  asc?: boolean;
  align?: "left" | "right";
}) {
  return (
    <th
      onClick={onClick}
      className={`px-3 py-2 ${align === "right" ? "text-right" : "text-left"} ${onClick ? "cursor-pointer select-none hover:text-foreground" : ""} ${active ? "text-foreground" : ""}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active && <span className="text-[8px]">{asc ? "▲" : "▼"}</span>}
      </span>
    </th>
  );
}
