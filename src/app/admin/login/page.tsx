"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("Email ou mot de passe incorrect");
      setLoading(false);
      return;
    }

    // Find restaurants owned by this user (a user may own several)
    const { data: restaurants } = await supabase
      .from("restaurants")
      .select("public_id")
      .eq("owner_id", data.user.id)
      .order("created_at", { ascending: true });

    if (restaurants && restaurants.length > 0) {
      router.push(`/admin/${restaurants[0].public_id}`);
    } else {
      router.push("/admin/onboarding");
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      toast.error("Entrez votre email d'abord");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
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
      kicker="★ ESPACE RESTAURATEUR"
      title={
        <>
          Bonsoir, <em>connectez-vous.</em>
          <span className="dot" />
        </>
      }
      subtitle="Pilotez votre service depuis votre dashboard Taapr."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/admin/signup" className="as-link">
            Créer mon restaurant →
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
            placeholder="contact@restaurant.fr"
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

        <button type="submit" disabled={loading} className="auth-primary">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Connexion <span className="arrow">→</span></>}
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

      <div className="auth-divider">
        <Link href="/admin/chez-momo?demo=true" className="auth-secondary">
          Entrer en mode démo
        </Link>
      </div>
    </AuthShell>
  );
}
