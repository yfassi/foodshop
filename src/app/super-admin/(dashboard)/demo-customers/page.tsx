"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FlaskConical, Trash2, Plus } from "lucide-react";

interface DemoCustomer {
  email: string;
  added_at: string;
  note: string | null;
}

export default function SuperAdminDemoCustomersPage() {
  const [customers, setCustomers] = useState<DemoCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/super-admin/demo-customers");
    if (res.ok) setCustomers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/super-admin/demo-customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), note: note.trim() || undefined }),
    });
    setSubmitting(false);
    if (res.ok) {
      setEmail("");
      setNote("");
      toast.success("Email ajouté en mode démo");
      fetchCustomers();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Erreur lors de l'ajout");
    }
  };

  const handleRemove = async (target: string) => {
    setCustomers((prev) => prev.filter((c) => c.email !== target));
    const res = await fetch(
      `/api/super-admin/demo-customers?email=${encodeURIComponent(target)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      toast.error("Erreur lors de la suppression");
      fetchCustomers();
    } else {
      toast.success("Email retiré du mode démo");
    }
  };

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-2 flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-bold">Clients en mode démo</h2>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Ces emails passent par <strong>Stripe en mode test</strong> au paiement,
          mais leurs commandes arrivent normalement chez le restaurateur (badge
          DEMO visible). Idéal pour démonstrations et tests de bout en bout.
        </p>

        {/* Add form */}
        <form
          onSubmit={handleAdd}
          className="mb-6 rounded-2xl border border-border bg-card p-4"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optionnel)"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </form>

        {/* List */}
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : customers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <FlaskConical className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucun client en mode démo.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map((c) => (
              <div
                key={c.email}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.email}</p>
                  {c.note && (
                    <p className="truncate text-xs text-muted-foreground">
                      {c.note}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Ajouté le{" "}
                    {new Date(c.added_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(c.email)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Retirer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
