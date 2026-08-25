# Project Memory

## Core
- **Stack:** Expo Router, Supabase (RLS). Production: mfspy.org.py. GitHub sync active.
- **Dev Env:** NEVER use Lovable Vite preview. Use local `npx expo start --web`.
- **Roles:** Hierarchical RBAC (super_admin, pueblo_admin, co_admin_pueblo, usuario).
- **Design:** Youthful, friendly, blue/cyan palette. Use emojis (🏠✍️🏕️) in UI.
- **Layout:** Scrollable screens require `paddingBottom: 120` to avoid tab bar overlap.
- **Waitlist:** Automatic. Cancellations trigger Edge Function to promote next user.
- **Hijo menor:** rol='Hijo' AND edad exacta <12 al 1-ene del año NO ocupa cupo (función `ocupa_cupo`); cuenta en `menores`/`total_personas` de vw_ocupacion.
- **Año:** nunca hardcodear el año; usar `fetchAñoActivo()` / `useAñoActivo()`.

## Memories
- [Role Access Control](mem://features/role-based-access-control) — Hierarchical roles and specific data access permissions
- [Document Security](mem://features/document-visibility-and-security) — 'documentos' bucket access via signed URLs and RLS
- [Yearly Registration](mem://features/year-over-year-registration) — Annual logic via 'año' column
- [Modo temporada](mem://features/modo-temporada) — Modo misión vs institucional, año activo dinámico y apertura de nuevo año
- [Waitlist System](mem://features/waitlist-system) — Enum states and per-pueblo automatic promotion logic
- [Resend Integration](mem://integrations/resend-email-service) — Email service configuration for transactional messages
- [Cancellation Flow](mem://features/self-cancellation-with-auto-promotion) — User withdrawal via 'gestionar-baja' edge function
- [Data Export](mem://features/document-filtering-and-export) — Excel/CSV export capabilities restricted by admin role
- [Chatbot](mem://features/chatbot-integration) — n8n webhook integration for 'Misionerito' UI assistant
- [Visual Style](mem://design/visual-style-direction) — Design constraints, UI emojis, and friendly aesthetic
- [History Access](mem://features/historical-data-access) — UI and logic for viewing past years' registration data
- [T-shirt Sizes](mem://features/registration-tshirt-size) — Paraguayan size nomenclature mapping (e.g., XS = PP)
- [Document Reminders](mem://features/daily-document-reminders) — Daily 09:00 PYT cron job alerting users of missing docs
- [Deployment Config](mem://constraints/deployment-configuration) — Domain, build scripts, and Supabase auth URL rules
- [Preview Constraint](mem://constraints/preview-incompatibility) — Detailed incompatibility between Lovable preview and Expo
- [Secrets & Vault](mem://security/secrets-and-vault) — Supabase vault usage and CRON_SECRET for Edge Functions
- [Layout Spacing](mem://design/layout-spacing-constraints) — Bottom padding (120px) and tab bar sizing constraints
- [Role: Hijo](mem://features/registration-role-hijo) — 'Hijo' role logic bypassing 'Permiso del Menor' requirement
- [Hijo menor sin cupo](mem://features/hijo-menor-no-cupo) — Hijos <12 años (fecha exacta) no ocupan cupo pero cuentan en total_personas
