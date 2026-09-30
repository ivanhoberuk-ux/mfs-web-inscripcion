# Fondo paraguayo contemporáneo

## Resultado
Incorporar una identidad paraguaya sutil y juvenil en todo el sitio, manteniendo intactas la paleta, los datos y la lógica.

## Implementación
1. Agregar `react-native-svg` si no está disponible.
2. Crear un fondo reutilizable con ñandutíes geométricos, cintas tricolores y dos niveles de intensidad.
3. Integrarlo en toda la navegación con intensidad suave y usar la versión normal en Inicio.
4. Sustituir parte de la decoración del bloque principal por ñandutíes blancos translúcidos.
5. Añadir el detalle tricolor al encabezado de computadora y a la barra inferior móvil.
6. Verificar legibilidad, ausencia de desbordes y rendimiento visual en 360 px y 1440 px.

## Límites
- Sin cambios en base de datos, funciones del servidor, permisos, rutas ni lógica.
- La paleta actual se mantiene exactamente igual.
- La animación se limita a web, respeta reducción de movimiento y queda estática en Android.

## Detalles técnicos
- El fondo será una capa absoluta sin interacción y recortada por su contenedor.
- Los patrones usarán SVG vectorial y posiciones adaptables para evitar scroll horizontal.
- Inicio anulará la intensidad suave global para evitar duplicar el patrón.
