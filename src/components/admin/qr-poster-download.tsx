"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { buildCustomerOrderUrl, generateQrDataUrl } from "@/lib/qr";

import type { QrPosterFormat } from "./qr-poster-pdf";

type Props = {
  publicId: string;
  restaurantName?: string | null;
};

export function QrPosterDownload({ publicId, restaurantName }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loadingFormat, setLoadingFormat] = useState<QrPosterFormat | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    generateQrDataUrl(buildCustomerOrderUrl(publicId), { width: 1024 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) toast.error("Impossible de générer le QR code");
      });
    return () => {
      cancelled = true;
    };
  }, [publicId]);

  const handleDownload = async (format: QrPosterFormat) => {
    if (!qrDataUrl) return;
    setLoadingFormat(format);
    try {
      const { downloadQrPoster } = await import("./qr-poster-pdf");
      await downloadQrPoster({
        format,
        qrDataUrl,
        url: buildCustomerOrderUrl(publicId),
        filename: `taapr-affiche-${publicId}-${format.toLowerCase()}.pdf`,
        restaurantName,
      });
    } catch (err) {
      console.error(err);
      toast.error("Impossible de générer l'affiche PDF");
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <div className="mt-5 flex flex-col items-center gap-4">
      <div className="rounded-xl border border-border bg-white p-4">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="QR Code"
            width={180}
            height={180}
            className="h-[180px] w-[180px]"
          />
        ) : (
          <div className="flex h-[180px] w-[180px] items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Scannez pour commander</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleDownload("A4")}
          disabled={!qrDataUrl || loadingFormat !== null}
        >
          {loadingFormat === "A4" ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-3.5 w-3.5" />
          )}
          Télécharger l&apos;affiche A4
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleDownload("A5")}
          disabled={!qrDataUrl || loadingFormat !== null}
        >
          {loadingFormat === "A5" ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-3.5 w-3.5" />
          )}
          Télécharger l&apos;affiche A5
        </Button>
      </div>
      <p className="text-center text-[11px] leading-tight text-muted-foreground">
        Affiche prête à imprimer · Format A4 (mur) ou A5 (table) · QR scannable
      </p>
    </div>
  );
}
