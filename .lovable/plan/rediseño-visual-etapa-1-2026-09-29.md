# Rediseño visual — Etapa 1

## Resultado
Renovar la identidad visual, la navegación adaptable y la página de inicio sin cambiar datos, permisos, rutas ni comportamiento.

## Implementación
1. Actualizar los tokens globales de color, degradados, radios, sombras y tipografía.
2. Instalar y cargar Plus Jakarta Sans con fallback inmediato, conservando compatibilidad web y Android.
3. Modernizar Button, Card, Field y estilos compartidos, incluyendo variantes, estados y badges reutilizables.
4. Rehacer la navegación: barra inferior limpia en celular y encabezado superior con links y sesión en pantallas anchas.
5. Reorganizar Inicio con portada protagonista, resumen, torneo, sección personal, accesos, banda espiritual, sesión y pie.
6. Revisar contraste en pantallas afectadas por la nueva paleta y corregir únicamente los casos ilegibles.
7. Verificar el resultado en 360 px y 1440 px, además del estado de compilación.

## Límites
- Sin cambios en Supabase, funciones del servidor ni lógica de negocio.
- Se conservan rutas, permisos, condiciones por rol, modo de temporada y contenido actual.
- Las demás pantallas solo reciben los cambios globales de paleta, fuente y componentes base.

## Detalles técnicos
- Expo Router + React Native Web, manteniendo funcionamiento móvil.
- `useWindowDimensions` para alternar navegación móvil/escritorio y limitar contenido a unos 1120 px.
- Animaciones con React Native Animated y reducción de movimiento cuando la plataforma lo permita.
