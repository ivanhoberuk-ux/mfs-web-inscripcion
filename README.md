# 🌿 Misiones Familiares Schoenstattianas del Paraguay – MFS Web

Aplicación oficial de inscripciones de las **Misiones Familiares de Schoenstatt Paraguay** (https://mfspy.org.py).

## 🧭 Qué hace
- Inscripción de misioneros, tíos, hijos y asesores por pueblo, con cupos controlados en el servidor.
- Lista de espera automática por pueblo, con promoción y confirmación del lugar.
- Subida de documentos (cédula, firma, permiso del menor, aceptación del protocolo) con compresión de imágenes.
- Panel de administración por roles (super admin, admin de pueblo, co-admin) con exportaciones a Excel.
- Monitoreo: chequeo de temporada, auditoría, alertas técnicas y tareas programadas.
- Torneo deportivo: fixture, horarios y resultados.

## ⚙️ Stack
| Área | Tecnología |
|------|------------|
| Frontend | Expo Router + React Native Web (TypeScript) |
| Backend | Supabase (Postgres + RLS, Auth, Storage, Edge Functions) |
| Emails | Lovable Emails (desde Edge Functions) |
| Hosting | Build estático web (`dist/`) |

## 🛠️ Desarrollo local
```bash
npm install
npx expo start --web
```

## ☁️ Despliegue
- Build web: `npm run build:web` → carpeta `dist/`.
- El archivo `_redirects` (`/* /index.html 200`) permite que Expo Router maneje las rutas.
- Las Edge Functions están en `supabase/functions/` y se despliegan en el proyecto Supabase.

## 📁 Estructura
```
app/                 # Rutas (Expo Router)
  (tabs)/            # Pantallas principales
src/
  components/        # Componentes reutilizables y paneles admin
  lib/               # API, Supabase, documentos, PDF, utilidades
  context/           # AuthProvider
supabase/functions/  # Edge Functions (emails, cron, bajas, alertas)
```

## 👨‍💻 Autor
Iván Hoberuk – Coordinador de Misiones Familiares Schoenstattianas, Paraguay.

Proyecto sin fines de lucro con propósito apostólico y comunitario.
© Misiones Familiares Schoenstattianas del Paraguay. Todos los derechos reservados.
