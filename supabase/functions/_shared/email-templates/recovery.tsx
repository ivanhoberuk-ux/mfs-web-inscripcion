/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Restablecé tu contraseña de MFS Paraguay 🔐</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>🏠 MFS Paraguay</Heading>
          <Text style={tagline}>Movimiento Familiar de Schoenstatt</Text>
        </Section>

        <Section style={card}>
          <Heading style={h1}>🔐 Recuperá tu contraseña</Heading>
          <Text style={text}>
            ¡Hola misionero/a! 👋
          </Text>
          <Text style={text}>
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en{' '}
            <strong>{siteName}</strong>. Hacé click en el botón de abajo para elegir
            una nueva contraseña.
          </Text>

          <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
            <Button style={button} href={confirmationUrl}>
              ✨ Cambiar mi contraseña
            </Button>
          </Section>

          <Text style={smallText}>
            Si el botón no funciona, copiá y pegá este enlace en tu navegador:
          </Text>
          <Text style={linkText}>{confirmationUrl}</Text>

          <Hr style={hr} />

          <Text style={footer}>
            🛡️ Si vos no pediste cambiar la contraseña, podés ignorar este correo
            con tranquilidad. Tu contraseña seguirá siendo la misma.
          </Text>
        </Section>

        <Section style={footerSection}>
          <Text style={footerBrand}>
            Con cariño,<br />
            <strong>El equipo de MFS Paraguay</strong> 💙
          </Text>
          <Text style={footerSmall}>
            Juntos formamos una familia ✨
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

// Brand palette: youthful blue/cyan
const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: '0',
  padding: '0',
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '20px',
}
const header = {
  textAlign: 'center' as const,
  padding: '24px 0 16px',
}
const brand = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#0284c7',
  margin: '0 0 4px',
}
const tagline = {
  fontSize: '13px',
  color: '#0891b2',
  margin: '0',
  fontStyle: 'italic' as const,
}
const card = {
  backgroundColor: '#f0f9ff',
  borderRadius: '16px',
  padding: '32px 28px',
  border: '1px solid #bae6fd',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0c4a6e',
  margin: '0 0 20px',
  textAlign: 'center' as const,
}
const text = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const button = {
  backgroundColor: '#0284c7',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
}
const smallText = {
  fontSize: '13px',
  color: '#64748b',
  lineHeight: '1.5',
  margin: '0 0 8px',
}
const linkText = {
  fontSize: '12px',
  color: '#0284c7',
  wordBreak: 'break-all' as const,
  margin: '0 0 16px',
}
const hr = {
  borderColor: '#bae6fd',
  margin: '24px 0',
}
const footer = {
  fontSize: '13px',
  color: '#64748b',
  lineHeight: '1.5',
  margin: '0',
}
const footerSection = {
  textAlign: 'center' as const,
  padding: '24px 0 16px',
}
const footerBrand = {
  fontSize: '14px',
  color: '#334155',
  margin: '0 0 8px',
  lineHeight: '1.5',
}
const footerSmall = {
  fontSize: '12px',
  color: '#0891b2',
  margin: '0',
  fontStyle: 'italic' as const,
}
