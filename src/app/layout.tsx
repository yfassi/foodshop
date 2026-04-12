import type { Metadata, Viewport } from "next";
import { Inter, Poppins, Space_Grotesk, Space_Mono, Caveat } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const ferron = localFont({
  src: "../../public/fonts/Ferron-Regular.otf",
  variable: "--font-ferron",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "TaapR - La commande en ligne pour les restaurants | 0% commission",
  description:
    "TaapR permet à vos clients de commander depuis leur smartphone via QR code. Paiement sécurisé Stripe, 0% de commission, abonnement fixe à partir de 29€/mois.",
  keywords: [
    "commande en ligne restaurant",
    "QR code restaurant",
    "menu digital",
    "commande smartphone restaurant",
    "0 commission restaurant",
    "caisse enregistreuse",
    "food truck commande en ligne",
    "TaapR",
  ],
  openGraph: {
    title: "TaapR - La commande en ligne pour les restaurants",
    description:
      "Vos clients scannent, commandent et paient depuis leur téléphone. 0% de commission, abonnement fixe.",
    type: "website",
    locale: "fr_FR",
    siteName: "TaapR",
  },
  twitter: {
    card: "summary_large_image",
    title: "TaapR - La commande en ligne pour les restaurants",
    description:
      "Vos clients scannent, commandent et paient depuis leur téléphone. 0% de commission.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${inter.variable} ${poppins.variable} ${spaceGrotesk.variable} ${spaceMono.variable} ${caveat.variable} ${ferron.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Aller au contenu principal
        </a>
        <main id="main-content">
          {children}
        </main>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
