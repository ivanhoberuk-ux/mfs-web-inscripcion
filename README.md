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

☁️ Despliegue (Netlify)

Conectar el repositorio GitHub en Netlify

Configurar:

Campo	Valor
Build command	npm run build:web
Publish directory	dist

(Opcional) Variables de entorno:

VITE_SUPABASE_URL = https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY = tu_anon_key


Agregar en la raíz del proyecto el archivo _redirects con:

/* /index.html 200


Esto permite que expo-router maneje correctamente las rutas.

🔐 Supabase

La app utiliza:

auth.users → autenticación por correo y contraseña

user_roles → asignación de roles (admin / user)

registros → datos de inscriptos

pueblos → listado público de pueblos y cupos

📁 Estructura de carpetas
app/                 # Rutas principales (Expo Router)
 ├─ (tabs)/          # Navegación por pestañas
 ├─ login.tsx        # Pantalla de autenticación
 ├─ admin.tsx        # Panel administrativo
 └─ pueblos/         # Vistas de pueblos e inscriptos

src/
 ├─ lib/             # APIs, Supabase, PDF, etc.
 ├─ context/         # Contexto global de AuthProvider
 └─ components/      # Componentes reutilizables

supabase/
 └─ schema.sql       # Esquema base de tablas y políticas RLS

👨‍💻 Autor

Iván Hoberuk
📍 Paraguay
🧠 Coordinador de Misiones Familiares Schoenstattianas
💻 Desarrollo web & gestión de sistemas comunitarios

🕊️ Licencia

Proyecto sin fines de lucro con propósito apostólico y comunitario.
© 2025 Misiones Familiares Schoenstattianas del Paraguay.
Todos los derechos reservados.
