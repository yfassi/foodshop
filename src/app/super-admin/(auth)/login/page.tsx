"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("Email ou mot de passe incorrect");
      setLoading(false);
      return;
    }

    // Verify super admin access via API
    const res = await fetch("/api/super-admin/stats?period=today");
    if (!res.ok) {
      await supabase.auth.signOut();
      toast.error("Acces non autorise");
      setLoading(false);
      return;
    }

    router.push("/super-admin");
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      toast.error("Entrez votre email d'abord");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/super-admin/reset-password`,
    });

    if (error) {
      toast.error("Erreur lors de l'envoi du lien");
    } else {
      setResetSent(true);
      toast.success("Lien de réinitialisation envoyé par email");
    }
    setLoading(false);
  };

  return (
    <AuthShell
      kicker="★ SUPER ADMIN"
      title={
        <>
          Accès <em>protégé.</em>
          <span className="dot" />
        </>
      }
      subtitle="Cette zone est réservée à l'équipe Taapr."
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--paprika)]/10 text-[var(--paprika)]">
          <Shield className="h-5 w-5" />
        </div>
        <div className="font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
          Authentification renforcée
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@taapr.fr"
            required
            className="mt-1.5 h-12"
          />
        </div>

        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1.5 h-12"
          />
        </div>

        <button type="submit" disabled={loading} className="auth-primary">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>Connexion <span className="arrow">→</span></>
          )}
        </button>
      </form>

      <button
        type="button"
        onClick={handleResetPassword}
        disabled={loading || resetSent}
        className="auth-quiet mt-3"
      >
        {resetSent ? "Lien envoyé, vérifiez vos emails" : "Mot de passe oublié ?"}
      </button>
    </AuthShell>
  );
}
