"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setReady(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error("Erreur lors de la réinitialisation");
      setLoading(false);
      return;
    }

    toast.success("Mot de passe modifié avec succès !");
    router.push(`/restaurant/${publicId}/order`);
  };

  if (!ready) {
    return (
      <AuthShell
        kicker="★ MOT DE PASSE"
        title={
          <>
            Vérification <em>en cours…</em>
          </>
        }
        subtitle="On confirme votre lien de réinitialisation."
        showStamp={false}
        brandHref={null}
      >
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--paprika)]" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      kicker="★ NOUVEAU MOT DE PASSE"
      title={
        <>
          On <em>réinitialise.</em>
          <span className="dot" />
        </>
      }
      subtitle="Choisissez un nouveau mot de passe pour votre compte."
      backHref={`/restaurant/${publicId}/login`}
      backLabel="Retour à la connexion"
      brandHref={null}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 caractères"
            required
            className="mt-1.5 h-12"
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Répéter le mot de passe"
            required
            className="mt-1.5 h-12"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          className="auth-primary"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>Réinitialiser <span className="arrow">→</span></>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
