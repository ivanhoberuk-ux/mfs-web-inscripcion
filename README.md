# Misiones Familias – App Cloud (Expo + Supabase)

## Qué trae
- **Inscripción** por pueblo con cupos (servidos vía Supabase).
- **Bloqueo de cupo** en el servidor con función `register_if_capacity` (transaccional).
- **Firma digital** en pantalla y **PDF de autorización** (Expo Print).
- **Subida a Storage** de autorizaciones/fichas/firma.
- **Offline-first** (caché de pueblos).

## Cómo usar
1) `npm install`
2) Renombrar `src/lib/supabase.example.ts` a `src/lib/supabase.ts` y completar `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
3) Crear en Supabase los **buckets**: `documentos` (public).
4) Ejecutar el SQL de `supabase/schema.sql` en el editor SQL del proyecto (tablas + RLS + función RPC).
5) `npx expo start`

## Notas
- El tab **Firma** permite capturar trazo y generar PDF con la firma embebida. Luego sube a Storage.
- En **Documentos** podés subir archivos/imagenes y generar el PDF de autorización con tus datos.

## Seguridad
- Las políticas RLS del SQL adjunto dejan **insertar** en `registros` (inscripción) y **leer** `pueblos` a usuarios anónimos. Lectura de `registros` y modificación de `pueblos` requieren **usuario autenticado** y pertenecer a la tabla `admins`.
- Ajustá esto según tus necesidades de privacidad.
# 🌿 Misiones Familiares – Web App (MFS WEB)

Aplicación oficial de **Misiones Familiares Schoenstattianas del Paraguay**, desarrollada en **React Native + Expo** y migrada a versión **web** con soporte para **Supabase**, **Netlify** y **GitHub Pages**.

---

## 🧭 Descripción general

Esta aplicación permite:
- Gestionar inscripciones de misioneros y tíos.
- Visualizar pueblos y cupos disponibles.
- Subir documentos y firmas digitales.
- Acceder a un panel administrativo con exportaciones CSV/JSON.
- Integrar autenticación y roles mediante **Supabase Auth**.

---

## ⚙️ Tecnologías principales

| Área | Tecnología |
|------|-------------|
| Frontend | [Expo Router](https://expo.github.io/router), React Native Web |
| Backend | [Supabase](https://supabase.com) (Auth + Storage + Postgres) |
| Hosting | [Netlify](https://www.netlify.com) |
| Lenguaje | TypeScript |
| Estilos | React Native StyleSheet (tema unificado) |
| Build Web | `expo export --platform web` (output: `/dist`) |

---

## 🛠️ Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/ivanhoberuk-ux/mfsweb.git
cd mfsweb

# 2. Instalar dependencias
npm install

# 3. Ejecutar en modo desarrollo
npm run web
