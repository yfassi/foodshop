"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { AnimatedBackground } from "@/components/animated-background";

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

    // Find the restaurant owned by this user
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("slug")
      .eq("owner_id", data.user.id)
      .single();

    if (restaurant) {
      router.push(`/admin/${restaurant.slug}`);
    } else {
      toast.info(
        "Votre restaurant n'est pas encore configuré. Reprenons là où vous en étiez.",
        { duration: 5000 }
      );
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
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4">
      <AnimatedBackground />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card/95 p-6 shadow-xl shadow-black/[0.04] backdrop-blur-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold">
            T
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Espace Restaurateur
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Connectez-vous à votre compte</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
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
            <Label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </Label>
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
                className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-muted-foreground transition-colors active:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl font-semibold"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Connexion"
            )}
          </Button>
        </form>

        <button
          type="button"
          onClick={handleResetPassword}
          disabled={loading || resetSent}
          className="mt-3 flex h-11 w-full items-center justify-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {resetSent ? "Lien envoyé, vérifiez vos emails" : "Mot de passe oublié ?"}
        </button>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link
            href="/admin/signup"
            className="font-medium text-primary hover:underline"
          >
            Créer mon restaurant
          </Link>
        </p>

        <div className="mt-4 border-t border-border pt-4">
          <Link
            href="/admin/chez-momo?demo=true"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/80"
          >
            Entrer en mode démo
          </Link>
        </div>
      </div>
    </div>
  );
}
