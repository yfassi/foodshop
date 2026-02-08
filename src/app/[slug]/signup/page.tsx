"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CustomerSignupPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Sign up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      toast.error("Erreur lors de la creation du compte");
      setLoading(false);
      return;
    }

    // Create customer profile via API (uses admin client to bypass RLS)
    const profileRes = await fetch("/api/customer/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: data.user.id, full_name: fullName.trim() }),
    });

    if (!profileRes.ok) {
      const profileData = await profileRes.json();
      console.error("Profile creation error:", profileData.error);
      toast.error("Compte cree mais erreur lors de la creation du profil");
      setLoading(false);
      router.push(`/${slug}`);
      return;
    }

    toast.success("Compte cree avec succes !");
    router.push(`/${slug}`);
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      <Link
        href={`/${slug}`}
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      <h2 className="mb-6 text-xl font-bold">Creer un compte</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Prenom / Nom</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ali Benzema"
            required
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            required
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 caracteres"
            required
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeter le mot de passe"
            required
            className="h-12"
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !fullName || !email || !password || !confirmPassword}
          className="h-12 w-full font-semibold"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Creer mon compte
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Deja un compte ?{" "}
        <Link
          href={`/${slug}/login`}
          className="font-medium text-primary hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
