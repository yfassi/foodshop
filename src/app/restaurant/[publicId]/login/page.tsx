"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";

export default function CustomerLoginPage() {
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

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

    // Full reload to ensure auth state propagates to all components
    window.location.href = `/restaurant/${publicId}/order`;
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      toast.error("Entrez votre email d'abord");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restaurant/${publicId}/reset-password`,
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
      kicker="★ ESPACE CLIENT"
      title={
        <>
          Bonjour, <em>connectez-vous.</em>
          <span className="dot" />
        </>
      }
      subtitle="Retrouvez vos commandes et points de fidélité."
      backHref={`/restaurant/${publicId}/order`}
      backLabel="Retour au menu"
      brandHref={null}
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href={`/restaurant/${publicId}/signup`} className="as-link">
            Créer un compte →
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            autoComplete="email"
            required
            className="mt-1.5 h-12"
          />
        </div>

        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative mt-1.5">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              autoComplete="current-password"
              required
              className="h-12 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-[var(--ink-mute)] transition-colors hover:text-[var(--paprika)]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="auth-primary"
        >
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
