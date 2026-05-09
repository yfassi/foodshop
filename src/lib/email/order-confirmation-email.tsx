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
  Link as EmailLink,
} from "@react-email/components";
import * as React from "react";

export interface OrderConfirmationEmailProps {
  customerFirstName?: string;
  restaurantName: string;
  orderNumber: string;            // human-facing, e.g. "CB-042"
  orderDate: string;              // already formatted: "9 mai 2026"
  orderTime: string;              // "13:42"
  orderTypeLabel?: string | null; // "Sur place" / "À emporter" / "Livraison"
  paymentLabel: string;           // "Carte" / "Solde" / "Sur place"
  items: Array<{
    quantity: number;
    name: string;
    isMenu?: boolean;
    modifiers?: string[];
    lineTotalLabel: string;       // already formatted "12,00 €"
  }>;
  totalLabel: string;             // "24,00 €"
  notes?: string | null;
  trackingUrl: string;            // absolute url to order-confirmation page
  brandColors?: {
    paprika: string;
    cream: string;
    ink: string;
  };
}

const COLORS = {
  paprika: "#E64A19",
  paprikaSoft: "#FFF1EB",
  cream: "#F4ECDB",
  creamDeep: "#EBDFC4",
  ink: "#1A1410",
  inkSoft: "#1A141099",
  inkMute: "#1A141066",
  border: "rgba(26,20,16,0.12)",
};

const FONT_STACK_SERIF = "'Fraunces', 'Times New Roman', serif";
const FONT_STACK_SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const FONT_STACK_MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export function OrderConfirmationEmail({
  customerFirstName,
  restaurantName,
  orderNumber,
  orderDate,
  orderTime,
  orderTypeLabel,
  paymentLabel,
  items,
  totalLabel,
  notes,
  trackingUrl,
}: OrderConfirmationEmailProps) {
  const greeting = customerFirstName
    ? `Merci ${customerFirstName} !`
    : "Commande reçue !";
  const cleanNumber = orderNumber.replace(/^#/, "");

  return (
    <Html>
      <Head />
      <Preview>
        Commande #{cleanNumber} confirmée chez {restaurantName} · {totalLabel}
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
          {/* Wordmark — restaurant name takes the lead (TaapR is white-label) */}
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

          {/* Header */}
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
              Voici votre ticket de caisse. On s&apos;occupe du reste, vous
              serez prévenu(e) dès que la commande est prête.
            </Text>
          </Section>

          {/* Receipt — paper-style */}
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
              Ticket de caisse · {orderDate}
            </Text>
            <Text
              style={{
                margin: "16px 0 4px",
                textAlign: "center",
                fontFamily: FONT_STACK_MONO,
                fontSize: 9,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: COLORS.inkMute,
              }}
            >
              Numéro de commande
            </Text>
            <Text
              style={{
                margin: "0 0 4px",
                textAlign: "center",
                fontFamily: FONT_STACK_SERIF,
                fontWeight: 800,
                color: COLORS.ink,
                fontSize: 38,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              #{cleanNumber}
            </Text>

            <Hr
              style={{
                border: 0,
                borderTop: `1.5px dashed ${COLORS.border}`,
                margin: "18px 0",
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
                {orderTypeLabel && (
                  <tr>
                    <td
                      style={{
                        padding: "3px 0",
                        color: COLORS.inkMute,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Type
                    </td>
                    <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 500 }}>
                      {orderTypeLabel}
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
                    {orderTime}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "3px 0",
                      color: COLORS.inkMute,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Paiement
                  </td>
                  <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 500 }}>
                    {paymentLabel}
                  </td>
                </tr>
              </tbody>
            </table>

            <Hr
              style={{
                border: 0,
                borderTop: `1.5px dashed ${COLORS.border}`,
                margin: "18px 0",
              }}
            />

            {/* Items */}
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              width="100%"
              style={{ fontSize: 13, color: COLORS.ink }}
            >
              <tbody>
                {items.map((item, i) => (
                  <React.Fragment key={i}>
                    <tr>
                      <td style={{ padding: "4px 0", fontWeight: 500 }}>
                        <span
                          style={{
                            fontFamily: FONT_STACK_MONO,
                            color: COLORS.paprika,
                            fontWeight: 700,
                            marginRight: 4,
                          }}
                        >
                          {item.quantity}×
                        </span>
                        {item.name}
                        {item.isMenu && (
                          <span
                            style={{
                              marginLeft: 6,
                              color: COLORS.inkMute,
                              fontSize: 10,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                            }}
                          >
                            (menu)
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "4px 0",
                          textAlign: "right",
                          fontFamily: FONT_STACK_MONO,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.lineTotalLabel}
                      </td>
                    </tr>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <tr>
                        <td
                          colSpan={2}
                          style={{
                            padding: "0 0 4px 14px",
                            fontFamily: FONT_STACK_SERIF,
                            fontStyle: "italic",
                            fontSize: 11,
                            color: COLORS.inkMute,
                          }}
                        >
                          {item.modifiers.join(" · ")}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            <Hr
              style={{
                border: 0,
                borderTop: `1.5px dashed ${COLORS.border}`,
                margin: "18px 0",
              }}
            />

            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
              <tbody>
                <tr>
                  <td
                    style={{
                      fontFamily: FONT_STACK_SERIF,
                      fontStyle: "italic",
                      fontWeight: 800,
                      fontSize: 22,
                      color: COLORS.ink,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Total
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: FONT_STACK_SERIF,
                      fontWeight: 800,
                      fontSize: 22,
                      color: COLORS.paprika,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {totalLabel}
                  </td>
                </tr>
              </tbody>
            </table>

            <Text
              style={{
                margin: "16px 0 0",
                textAlign: "center",
                fontFamily: "'Caveat', cursive",
                fontSize: 22,
                color: COLORS.paprika,
              }}
            >
              À très vite !
            </Text>
          </Section>

          {/* CTA */}
          <Section style={{ textAlign: "center", marginTop: 24 }}>
            <EmailLink
              href={trackingUrl}
              style={{
                display: "inline-block",
                backgroundColor: COLORS.paprika,
                color: COLORS.cream,
                padding: "14px 26px",
                borderRadius: 999,
                fontFamily: FONT_STACK_SANS,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Suivre ma commande →
            </EmailLink>
          </Section>

          {/* Note */}
          {notes && (
            <Section
              style={{
                marginTop: 18,
                padding: "12px 16px",
                backgroundColor: "#FFFFFF",
                border: `1px dashed ${COLORS.border}`,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  margin: 0,
                  fontFamily: FONT_STACK_MONO,
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: COLORS.paprika,
                  fontWeight: 600,
                }}
              >
                Note pour la cuisine
              </Text>
              <Text
                style={{
                  margin: "6px 0 0",
                  fontFamily: FONT_STACK_SERIF,
                  fontStyle: "italic",
                  fontSize: 14,
                  lineHeight: 1.4,
                  color: COLORS.ink,
                }}
              >
                {notes}
              </Text>
            </Section>
          )}

          {/* Footer — discreet "powered by" */}
          <Section style={{ marginTop: 32, textAlign: "center" }}>
            <Text
              style={{
                margin: 0,
                fontFamily: FONT_STACK_SANS,
                fontSize: 12,
                color: COLORS.inkSoft,
              }}
            >
              Propulsé par{" "}
              <span
                style={{
                  fontFamily: FONT_STACK_SERIF,
                  fontStyle: "italic",
                  fontWeight: 700,
                  color: COLORS.ink,
                  letterSpacing: "-0.02em",
                }}
              >
                TaapR
              </span>
            </Text>
            <Text
              style={{
                margin: "4px 0 0",
                fontFamily: FONT_STACK_MONO,
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: COLORS.inkMute,
              }}
            >
              La suite tout-en-un pour les restaurateurs
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default OrderConfirmationEmail;
