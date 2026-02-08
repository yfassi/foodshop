"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Wallet } from "lucide-react";

interface ClientEntry {
  wallet_id: string;
  user_id: string;
  full_name: string;
  email: string;
  balance: number;
  updated_at: string;
}

export default function ClientsPage() {
  const params = useParams<{ slug: string }>();
  const [clients, setClients] = useState<ClientEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Credit form
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [creditEmail, setCreditEmail] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const [crediting, setCrediting] = useState(false);

  const fetchClients = async () => {
    const res = await fetch(
      `/api/admin/wallet/list?restaurant_slug=${params.slug}`
    );
    const data = await res.json();
    setClients(data.clients || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  const handleCredit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountCents = Math.round(parseFloat(creditAmount) * 100);
    if (!creditEmail || isNaN(amountCents) || amountCents <= 0) {
      toast.error("Email et montant valide requis");
      return;
    }

    setCrediting(true);

    try {
      const res = await fetch("/api/admin/wallet/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_slug: params.slug,
          customer_email: creditEmail,
          amount: amountCents,
          description: creditDescription || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur");
      }

      toast.success("Solde credite avec succes !");
      setCreditEmail("");
      setCreditAmount("");
      setCreditDescription("");
      setShowCreditForm(false);
      fetchClients();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors du credit"
      );
    } finally {
      setCrediting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 md:px-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Clients</h2>
          <Button
            onClick={() => setShowCreditForm(!showCreditForm)}
            variant="outline"
            size="sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Crediter
          </Button>
        </div>

        {/* Credit form */}
        {showCreditForm && (
          <form
            onSubmit={handleCredit}
            className="mb-4 rounded-xl border border-border bg-card p-4"
          >
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              Crediter un client
            </h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-email" className="text-xs">
                  Email du client
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
                  Montant (EUR)
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
                  placeholder="Credit fidélité"
                />
              </div>
              <Button
                type="submit"
                disabled={crediting}
                className="w-full"
              >
                {crediting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crediter le solde
              </Button>
            </div>
          </form>
        )}

        {/* Client list */}
        {clients.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Wallet className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucun client avec un solde pour le moment.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {clients.map((client) => (
              <div
                key={client.wallet_id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
              >
                <div>
                  <p className="text-sm font-semibold">{client.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {client.email}
                  </p>
                </div>
                <p className="text-sm font-bold text-primary">
                  {formatPrice(client.balance)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
