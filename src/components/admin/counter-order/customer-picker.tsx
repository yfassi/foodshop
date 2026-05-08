"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { Search, User as UserIcon, X, Loader2, UserX } from "lucide-react";

export interface SelectedCustomer {
  user_id: string | null;
  wallet_id: string | null;
  full_name: string;
  email: string;
  balance: number;
}

interface CustomerHit {
  user_id: string;
  wallet_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  balance: number;
}

interface CustomerPickerProps {
  slug: string;
  selected: SelectedCustomer | null;
  onSelect: (customer: SelectedCustomer | null) => void;
  guestName: string;
  onGuestNameChange: (name: string) => void;
  isGuest: boolean;
  onGuestModeChange: (isGuest: boolean) => void;
}

export function CustomerPicker({
  slug,
  selected,
  onSelect,
  guestName,
  onGuestNameChange,
  isGuest,
  onGuestModeChange,
}: CustomerPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isGuest || selected) {
      setResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/customers/search?restaurant_slug=${encodeURIComponent(
            slug
          )}&q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        setResults(data.customers || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(handle);
  }, [query, slug, isGuest, selected]);

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <UserIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{selected.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {selected.email}
          </p>
          {selected.balance > 0 && (
            <p className="mt-0.5 text-xs font-medium text-primary">
              Solde&nbsp;: {formatPrice(selected.balance)}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onSelect(null)}
          aria-label="Retirer le client"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="space-y-2 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Client non inscrit
          </p>
          <button
            type="button"
            onClick={() => {
              onGuestModeChange(false);
              onGuestNameChange("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Annuler
          </button>
        </div>
        <Input
          autoFocus
          value={guestName}
          onChange={(e) => onGuestNameChange(e.target.value)}
          placeholder="Prénom du client"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un client par nom, email, téléphone…"
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {results.length > 0 && (
        <div className="max-h-56 overflow-y-auto rounded-xl border border-border bg-card">
          {results.map((c) => (
            <button
              key={c.user_id}
              type="button"
              onClick={() =>
                onSelect({
                  user_id: c.user_id,
                  wallet_id: c.wallet_id,
                  full_name: c.full_name,
                  email: c.email,
                  balance: c.balance,
                })
              }
              className="flex w-full items-center gap-3 border-b border-border/60 p-3 text-left transition-colors last:border-b-0 hover:bg-accent/40"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.email}
                </p>
              </div>
              {c.balance > 0 && (
                <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {formatPrice(c.balance)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          Aucun client trouvé.
        </p>
      )}

      <button
        type="button"
        onClick={() => onGuestModeChange(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      >
        <UserX className="h-3.5 w-3.5" />
        Client non inscrit
      </button>
    </div>
  );
}
