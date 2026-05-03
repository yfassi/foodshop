import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";

const COLORS = {
  cream: "#F4ECDB",
  creamDeep: "#EBDFC4",
  paprika: "#E64A19",
  ink: "#1A1410",
  inkSoft: "#1A141099",
  white: "#FFFFFF",
};

let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) return;
  fontsRegistered = true;
  const base =
    typeof window !== "undefined" ? window.location.origin : "";
  Font.register({
    family: "Fraunces",
    fonts: [
      {
        src: `${base}/fonts/pdf/Fraunces-BoldItalic.ttf`,
        fontWeight: 700,
        fontStyle: "italic",
      },
    ],
  });
  Font.register({
    family: "Familjen",
    fonts: [
      { src: `${base}/fonts/pdf/FamiljenGrotesk-Regular.ttf`, fontWeight: 400 },
      {
        src: `${base}/fonts/pdf/FamiljenGrotesk-SemiBold.ttf`,
        fontWeight: 600,
      },
    ],
  });
  Font.register({
    family: "Caveat",
    fonts: [{ src: `${base}/fonts/pdf/Caveat-Bold.ttf`, fontWeight: 700 }],
  });
  Font.register({
    family: "DMMono",
    fonts: [{ src: `${base}/fonts/pdf/DMMono-Regular.ttf`, fontWeight: 400 }],
  });
  Font.registerHyphenationCallback((word) => [word]);
}

export type QrPosterFormat = "A4" | "A5";

type Sizes = {
  pad: number;
  brand: number;
  brandDot: number;
  kicker: number;
  title: number;
  titleLine: number;
  qr: number;
  qrPad: number;
  qrBorder: number;
  qrRadius: number;
  caveat: number;
  url: number;
  rule: number;
  blockGap: number;
};

const SIZES: Record<QrPosterFormat, Sizes> = {
  A4: {
    pad: 48,
    brand: 26,
    brandDot: 7,
    kicker: 10,
    title: 40,
    titleLine: 1.08,
    qr: 240,
    qrPad: 18,
    qrBorder: 2,
    qrRadius: 14,
    caveat: 22,
    url: 11,
    rule: 1.5,
    blockGap: 24,
  },
  A5: {
    pad: 32,
    brand: 19,
    brandDot: 5,
    kicker: 8,
    title: 26,
    titleLine: 1.08,
    qr: 168,
    qrPad: 12,
    qrBorder: 1.5,
    qrRadius: 10,
    caveat: 16,
    url: 8.5,
    rule: 1,
    blockGap: 16,
  },
};

function buildStyles(s: Sizes) {
  return StyleSheet.create({
    page: {
      backgroundColor: COLORS.cream,
      padding: s.pad,
      fontFamily: "Familjen",
      color: COLORS.ink,
      flexDirection: "column",
      justifyContent: "space-between",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    brandRow: { flexDirection: "row", alignItems: "flex-end" },
    brand: {
      fontFamily: "Fraunces",
      fontWeight: 700,
      fontStyle: "italic",
      color: COLORS.paprika,
      fontSize: s.brand,
      lineHeight: 1,
      letterSpacing: -0.6,
    },
    brandDot: {
      width: s.brandDot,
      height: s.brandDot,
      borderRadius: s.brandDot,
      backgroundColor: COLORS.ink,
      marginLeft: 3,
      marginBottom: 2,
    },
    serviceCompris: {
      fontFamily: "Caveat",
      fontWeight: 700,
      color: COLORS.ink,
      fontSize: s.brand * 0.78,
    },
    rule: {
      height: s.rule,
      backgroundColor: COLORS.ink,
      marginTop: s.blockGap * 0.55,
      opacity: 0.18,
    },
    hero: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      paddingTop: s.blockGap * 0.5,
      paddingBottom: s.blockGap * 0.5,
    },
    kicker: {
      fontFamily: "DMMono",
      fontSize: s.kicker,
      color: COLORS.paprika,
      letterSpacing: 2.4,
      marginBottom: s.blockGap * 0.7,
    },
    title: {
      fontFamily: "Fraunces",
      fontWeight: 700,
      fontStyle: "italic",
      color: COLORS.ink,
      fontSize: s.title,
      lineHeight: s.titleLine,
      letterSpacing: -1.2,
      textAlign: "center",
      maxWidth: "92%",
    },
    titleAccent: { color: COLORS.paprika },
    qrCard: {
      marginTop: s.blockGap * 1.1,
      padding: s.qrPad,
      backgroundColor: COLORS.white,
      borderRadius: s.qrRadius,
      borderWidth: s.qrBorder,
      borderStyle: "solid",
      borderColor: COLORS.ink,
      alignItems: "center",
      justifyContent: "center",
    },
    qr: { width: s.qr, height: s.qr },
    caveat: {
      fontFamily: "Caveat",
      fontWeight: 700,
      color: COLORS.paprika,
      fontSize: s.caveat,
      marginTop: s.blockGap * 0.9,
      textAlign: "center",
    },
    footer: {
      alignItems: "center",
      flexDirection: "column",
      gap: s.blockGap * 0.35,
    },
    urlBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: s.pad * 0.18,
      paddingHorizontal: s.pad * 0.5,
      backgroundColor: COLORS.creamDeep,
      borderRadius: s.qrRadius * 0.75,
    },
    urlArrow: {
      fontFamily: "Familjen",
      fontWeight: 600,
      color: COLORS.paprika,
      fontSize: s.url * 1.1,
      lineHeight: 1,
    },
    url: {
      fontFamily: "DMMono",
      fontSize: s.url,
      color: COLORS.ink,
    },
    finePrint: {
      fontFamily: "Familjen",
      fontWeight: 400,
      fontSize: s.url * 0.85,
      color: COLORS.inkSoft,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
  });
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

type Props = {
  format: QrPosterFormat;
  qrDataUrl: string;
  url: string;
  restaurantName?: string | null;
};

export function QrPosterDocument({
  format,
  qrDataUrl,
  url,
  restaurantName,
}: Props) {
  const s = SIZES[format];
  const styles = buildStyles(s);
  const titleStart = "Passez votre commande";
  const titleEndPrefix = "en ligne ";
  const titleEndSuffix = "directement.";
  return (
    <Document
      title={`Affiche QR ${format}${restaurantName ? ` — ${restaurantName}` : ""}`}
      author="TaapR"
      creator="TaapR"
    >
      <Page size={format} style={styles.page}>
        <View>
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Text style={styles.brand}>taapr</Text>
              <View style={styles.brandDot} />
            </View>
            <Text style={styles.serviceCompris}>service compris.</Text>
          </View>
          <View style={styles.rule} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.kicker}>COMMANDEZ EN UN SCAN</Text>
          <Text style={styles.title}>
            {titleStart}
            {"\n"}
            <Text style={styles.titleAccent}>{titleEndPrefix}</Text>
            {titleEndSuffix}
          </Text>
          <View style={styles.qrCard}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={qrDataUrl} style={styles.qr} />
          </View>
          <Text style={styles.caveat}>
            Scannez avec votre téléphone
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.urlBox}>
            <Text style={styles.urlArrow}>›</Text>
            <Text style={styles.url}>{stripProtocol(url)}</Text>
          </View>
          <Text style={styles.finePrint}>
            {restaurantName ? `${restaurantName} · ` : ""}propulsé par TaapR
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadQrPoster(opts: {
  format: QrPosterFormat;
  qrDataUrl: string;
  url: string;
  filename: string;
  restaurantName?: string | null;
}) {
  registerFonts();
  const blob = await pdf(
    <QrPosterDocument
      format={opts.format}
      qrDataUrl={opts.qrDataUrl}
      url={opts.url}
      restaurantName={opts.restaurantName}
    />,
  ).toBlob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = opts.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
