"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Store } from "lucide-react";
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
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-10">
      <AnimatedBackground />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card/95 p-6 shadow-xl shadow-black/[0.04] backdrop-blur-sm sm:p-8">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Store className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Espace restaurateur
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Connectez-vous à votre back-office
            </p>
          </div>
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
              autoComplete="email"
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
                className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground active:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !email || !password}
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

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground/70">
          <span className="h-px flex-1 bg-border" />
          <span>ou</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Link
          href="/admin/onboarding"
          className="flex h-12 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-accent/50"
        >
          Créer mon restaurant
        </Link>
      </div>
    </div>
  );
}
