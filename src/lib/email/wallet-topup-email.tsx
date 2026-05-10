import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface WalletTopupEmailProps {
  customerFirstName?: string;
  restaurantName: string;
  amountLabel: string; // "20,00 €"
  bonusLabel?: string | null; // "+ 5,00 €" if any bonus
  totalCreditedLabel: string; // "25,00 €"
  newBalanceLabel: string; // "47,50 €"
  topupDate: string; // "10 mai 2026"
  topupTime: string; // "21:08"
}

const COLORS = {
  paprika: "#E64A19",
  paprikaSoft: "#FFF1EB",
  cream: "#F4ECDB",
  ink: "#1A1410",
  inkSoft: "#1A141099",
  inkMute: "#1A141066",
  border: "rgba(26,20,16,0.12)",
  emerald: "#047857",
  emeraldSoft: "#D1FAE5",
};

const FONT_STACK_SERIF = "'Fraunces', 'Times New Roman', serif";
const FONT_STACK_SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const FONT_STACK_MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export function WalletTopupEmail({
  customerFirstName,
  restaurantName,
  amountLabel,
  bonusLabel,
  totalCreditedLabel,
  newBalanceLabel,
  topupDate,
  topupTime,
}: WalletTopupEmailProps) {
  const greeting = customerFirstName ? `Merci ${customerFirstName} !` : "Merci !";

  return (
    <Html>
      <Head />
      <Preview>
        Recharge confirmée chez {restaurantName} · +{totalCreditedLabel}
      </Preview>
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: COLORS.cream,
          fontFamily: FONT_STACK_SANS,
          color: COLORS.ink,
        }}
      >
        <Container
          style={{
            maxWidth: "480px",
            margin: "0 auto",
            padding: "32px 20px 48px",
          }}
        >
          {/* Restaurant wordmark */}
          <Section style={{ textAlign: "center", marginBottom: 24 }}>
            <Text
              style={{
                margin: 0,
                fontFamily: FONT_STACK_SERIF,
                fontStyle: "italic",
                fontWeight: 700,
                fontSize: 26,
                color: COLORS.paprika,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              {restaurantName}
            </Text>
          </Section>

          {/* Headline */}
          <Section style={{ textAlign: "center", marginBottom: 24 }}>
            <Heading
              as="h1"
              style={{
                margin: "0 0 10px",
                fontFamily: FONT_STACK_SERIF,
                fontWeight: 700,
                fontSize: 40,
                lineHeight: 1.05,
                letterSpacing: "-0.035em",
                color: COLORS.ink,
              }}
            >
              {greeting}
            </Heading>
            <Text
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.5,
                color: COLORS.inkSoft,
              }}
            >
              Votre solde a bien été rechargé. À utiliser dès votre prochaine
              commande chez {restaurantName}.
            </Text>
          </Section>

          {/* Receipt */}
          <Section
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 8,
              padding: "26px 24px 22px",
              boxShadow: "0 8px 24px -12px rgba(26,20,16,0.18)",
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <Text
              style={{
                margin: 0,
                textAlign: "center",
                fontFamily: FONT_STACK_MONO,
                fontSize: 9,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: COLORS.inkMute,
              }}
            >
              Reçu de recharge · {topupDate}
            </Text>

            <Text
              style={{
                margin: "20px 0 0",
                textAlign: "center",
                fontFamily: FONT_STACK_MONO,
                fontSize: 9,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: COLORS.inkMute,
              }}
            >
              Crédit ajouté
            </Text>
            <Text
              style={{
                margin: "4px 0 0",
                textAlign: "center",
                fontFamily: FONT_STACK_SERIF,
                fontWeight: 800,
                color: COLORS.emerald,
                fontSize: 44,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              + {totalCreditedLabel}
            </Text>

            <Hr
              style={{
                border: 0,
                borderTop: `1.5px dashed ${COLORS.border}`,
                margin: "22px 0 14px",
              }}
            />

            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              width="100%"
              style={{
                fontFamily: FONT_STACK_MONO,
                fontSize: 11,
                color: COLORS.ink,
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      padding: "3px 0",
                      color: COLORS.inkMute,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Recharge
                  </td>
                  <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 500 }}>
                    {amountLabel}
                  </td>
                </tr>
                {bonusLabel && (
                  <tr>
                    <td
                      style={{
                        padding: "3px 0",
                        color: COLORS.emerald,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Bonus offert
                    </td>
                    <td
                      style={{
                        padding: "3px 0",
                        textAlign: "right",
                        fontWeight: 600,
                        color: COLORS.emerald,
                      }}
                    >
                      {bonusLabel}
                    </td>
                  </tr>
                )}
                <tr>
                  <td
                    style={{
                      padding: "3px 0",
                      color: COLORS.inkMute,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Heure
                  </td>
                  <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 500 }}>
                    {topupTime}
                  </td>
                </tr>
              </tbody>
            </table>

            <Hr
              style={{
                border: 0,
                borderTop: `1.5px dashed ${COLORS.border}`,
                margin: "14px 0 18px",
              }}
            />

            <Text
              style={{
                margin: 0,
                textAlign: "center",
                fontFamily: FONT_STACK_MONO,
                fontSize: 9,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: COLORS.inkMute,
              }}
            >
              Nouveau solde
            </Text>
            <Text
              style={{
                margin: "4px 0 0",
                textAlign: "center",
                fontFamily: FONT_STACK_SERIF,
                fontWeight: 700,
                color: COLORS.ink,
                fontSize: 28,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {newBalanceLabel}
            </Text>
          </Section>

          <Text
            style={{
              margin: "28px 0 0",
              textAlign: "center",
              fontSize: 12,
              color: COLORS.inkMute,
            }}
          >
            Ce reçu fait office de confirmation de paiement. Conservez-le
            pour vos archives.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
