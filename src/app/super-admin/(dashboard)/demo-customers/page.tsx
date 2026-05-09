"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FlaskConical,
  Trash2,
  Plus,
  KeyRound,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";

interface DemoCustomer {
  email: string;
  added_at: string;
  note: string | null;
}

interface RevealedPassword {
  email: string;
  password: string;
  context: "created" | "regenerated";
}

export default function SuperAdminDemoCustomersPage() {
  const [customers, setCustomers] = useState<DemoCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealedPassword | null>(null);
  const [copied, setCopied] = useState(false);

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
    const target = email.trim().toLowerCase();
    const res = await fetch("/api/super-admin/demo-customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: target, note: note.trim() || undefined }),
    });
    setSubmitting(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Erreur lors de l'ajout");
      return;
    }
    setEmail("");
    setNote("");
    fetchCustomers();
    if (data.created && data.password) {
      setRevealed({ email: target, password: data.password, context: "created" });
    } else {
      toast.success("Email ajouté en mode démo (compte déjà existant)");
    }
  };

  const handleRegenerate = async (target: string) => {
    setRegenerating(target);
    const res = await fetch("/api/super-admin/demo-customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: target }),
    });
    setRegenerating(null);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Erreur lors de la régénération");
      return;
    }
    setRevealed({ email: target, password: data.password, context: "regenerated" });
  };

  const handleRemove = async (target: string) => {
    if (!confirm(`Retirer ${target} du mode démo ? (le compte Supabase n'est pas supprimé)`)) {
      return;
    }
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

  const handleCopy = async () => {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const closeReveal = () => {
    setRevealed(null);
    setCopied(false);
  };

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-2 flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-bold">Clients en mode démo</h2>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Ajoute un email ici pour créer un compte client lié au{" "}
          <strong>mode démo Stripe</strong>. Le mot de passe est généré et
          affiché <strong>une seule fois</strong> — note-le. Tu peux toujours
          en régénérer un nouveau plus tard.
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
            {submitting ? "Création..." : "Ajouter"}
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleRegenerate(c.email)}
                    disabled={regenerating === c.email}
                    className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    aria-label="Régénérer le mot de passe"
                    title="Régénérer le mot de passe"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {regenerating === c.email ? "..." : "Mot de passe"}
                    </span>
                  </button>
                  <button
                    onClick={() => handleRemove(c.email)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Retirer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={revealed !== null} onOpenChange={(open) => !open && closeReveal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-600" />
              {revealed?.context === "created"
                ? "Compte démo créé"
                : "Nouveau mot de passe"}
            </DialogTitle>
            <DialogDescription>{revealed?.email}</DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Ce mot de passe ne sera <strong>plus affiché</strong>. Copie-le
                maintenant. Tu pourras toujours en régénérer un nouveau plus
                tard.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2">
            <code className="flex-1 select-all break-all font-mono text-base">
              {revealed?.password}
            </code>
            <button
              onClick={handleCopy}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              aria-label="Copier"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>

          <button
            onClick={closeReveal}
            className="h-10 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            J&apos;ai copié le mot de passe
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
