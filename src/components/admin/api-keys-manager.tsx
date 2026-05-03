"use client";

import { useEffect, useState } from "react";
import { Plus, Copy, Loader2, Trash2, Key } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ApiKey } from "@/lib/types";

type Props = {
  restaurantId: string;
};

export function ApiKeysManager({ restaurantId }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{ name: string; key: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/api-keys?restaurant_id=${restaurantId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setKeys(data.keys ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurantId, name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setRevealed({ name: data.key.name, key: data.full_key });
      setCreatingOpen(false);
      setNewName("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Révoquer cette clé ? Les intégrations utilisant cette clé cesseront immédiatement de fonctionner.")) {
      return;
    }
    try {
      const res = await fetch(
        `/api/admin/api-keys?id=${id}&restaurant_id=${restaurantId}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success("Clé révoquée");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const copyKey = (k: string) => {
    navigator.clipboard.writeText(k);
    toast.success("Clé copiée");
  };

  return (
    <div className="space-y-3">
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm">Clés d&apos;API</CardTitle>
              <CardDescription className="text-xs">
                Authentifiez vos intégrations & webhooks externes
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setCreatingOpen(true)}
              disabled={loading}
            >
              <Plus className="h-3.5 w-3.5" /> Nouvelle clé
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
            </div>
          ) : keys.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Aucune clé d&apos;API. Créez-en une pour démarrer.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {k.name}{" "}
                      {k.revoked_at && (
                        <span className="ml-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                          RÉVOQUÉE
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {k.prefix}…
                      {k.last_used_at && (
                        <span className="ml-2">
                          · utilisée {new Date(k.last_used_at).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </p>
                  </div>
                  {!k.revoked_at && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(k.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={creatingOpen} onOpenChange={setCreatingOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouvelle clé d&apos;API</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nom (interne)</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ex. : Intégration n8n"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="w-full"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revealed} onOpenChange={(open) => !open && setRevealed(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clé créée — copiez-la maintenant</DialogTitle>
          </DialogHeader>
          {revealed && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                <strong>{revealed.name}</strong> — cette clé ne sera plus affichée.
                Stockez-la en lieu sûr.
              </p>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 font-mono text-xs">
                <span className="flex-1 truncate select-all">{revealed.key}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyKey(revealed.key)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setRevealed(null)} className="w-full">
              J&apos;ai copié la clé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
