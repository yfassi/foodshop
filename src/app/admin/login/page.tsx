"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      // User has account but no restaurant yet — go to onboarding
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
      redirectTo: `${window.location.origin}/admin/login`,
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
        <h1 className="mb-6 text-center text-xl font-bold">
          Espace Restaurateur
        </h1>

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
              placeholder="admin@chezmomo.fr"
              required
              className="mt-1.5 h-12"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1.5 h-12"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl font-semibold"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Se connecter"
            )}
          </Button>
        </form>

        <button
          type="button"
          onClick={handleResetPassword}
          disabled={loading || resetSent}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
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
            className="flex h-12 w-full items-center justify-center rounded-xl bg-amber-50 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
          >
            Entrer en mode démo
          </Link>
        </div>
      </div>
    </div>
  );
}
