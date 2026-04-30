"use client";

import { useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TypographyH2, TypographyMuted } from "@/components/ui/typography";
import { Camera, ArrowLeft, ScanLine, RotateCcw } from "lucide-react";

function compressImage(file: File, maxSize: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      const MAX_DIM = 2200;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Compression échouée"));
            if (blob.size <= maxSize || quality <= 0.4) {
              resolve(blob);
            } else {
              quality -= 0.1;
              tryCompress();
            }
          },
          "image/webp",
          quality
        );
      };
      tryCompress();
    };
    img.onerror = () => reject(new Error("Impossible de lire l'image"));
    img.src = URL.createObjectURL(file);
  });
}

export default function StockScanPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qs = searchParams.get("demo") === "true" ? "?demo=true" : "";

  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Format non supporté");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setOriginalFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setOriginalFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const analyze = async () => {
    if (!originalFile) return;
    setAnalyzing(true);
    try {
      const compressed = await compressImage(originalFile, 1.5 * 1024 * 1024);
      const formData = new FormData();
      formData.append("image", compressed, "receipt.webp");
      formData.append("restaurant_slug", params.slug);

      const res = await fetch("/api/admin/stock/receipts", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Échec de la lecture du ticket");
        return;
      }
      toast.success("Ticket analysé");
      router.push(`/admin/${params.slug}/stock/receipts/${data.receipt.id}${qs}`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur d'analyse");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/admin/${params.slug}/stock${qs}`}>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <TypographyH2>Scanner un ticket</TypographyH2>
          <TypographyMuted>Photo d&apos;un ticket ou facture fournisseur</TypographyMuted>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />

          {!previewUrl ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Camera className="h-8 w-8" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Prenez une photo nette du ticket</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cadrez bien tous les articles, à plat et bien éclairé
                </p>
              </div>
              <Button onClick={() => inputRef.current?.click()} className="min-h-[44px] px-6">
                <Camera className="mr-2 h-4 w-4" />
                Prendre la photo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-lg border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Ticket"
                  className="max-h-[60vh] w-full object-contain"
                />
              </div>

              {analyzing ? (
                <div className="space-y-2 rounded-lg border bg-muted/50 p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm font-medium">
                    <ScanLine className="h-4 w-4 animate-pulse" />
                    Lecture du ticket en cours…
                  </div>
                  <p className="text-xs text-muted-foreground">
                    L&apos;IA extrait les articles, cela prend 5 à 10 secondes.
                  </p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={reset}
                    className="flex-1 min-h-[44px]"
                    disabled={analyzing}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reprendre
                  </Button>
                  <Button onClick={analyze} className="flex-1 min-h-[44px]" disabled={analyzing}>
                    <ScanLine className="mr-2 h-4 w-4" />
                    Analyser
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
