"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { AnimatedBackground } from "@/components/animated-background";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setReady(true);
        }
      }
    );

    const timeout = setTimeout(() => {
      setReady((current) => {
        if (!current) setInvalidLink(true);
        return current;
      });
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
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
      console.error("[reset-password]", error);
      toast.error(`Erreur : ${error.message}`);
      setLoading(false);
      return;
    }

    toast.success("Mot de passe modifié avec succès !");
    router.push(`/${slug}`);
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4">
      <AnimatedBackground />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card/95 p-6 shadow-xl shadow-black/[0.04] backdrop-blur-sm">
        <Link
          href={`/${slug}/login`}
          className="mb-6 inline-flex h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <h2 className="mb-1 text-xl font-bold">Nouveau mot de passe</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Choisissez un nouveau mot de passe pour votre compte
        </p>

        {!ready && !invalidLink ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              Vérification du lien en cours...
            </p>
          </div>
        ) : invalidLink ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Ce lien est invalide ou expiré.
            </p>
            <Button
              onClick={() => router.push(`/${slug}/login`)}
              variant="outline"
              className="mt-4 h-12 w-full rounded-xl font-semibold"
            >
              Retour à la connexion
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password" className="text-sm font-medium">
                Nouveau mot de passe
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 caractères"
                  autoComplete="new-password"
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

            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmer le mot de passe
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répéter le mot de passe"
                autoComplete="new-password"
                required
                className="mt-1.5 h-12"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="h-12 w-full rounded-xl font-semibold"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Réinitialiser le mot de passe"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
