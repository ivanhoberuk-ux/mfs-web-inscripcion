# Ciclo anual: de misiones a sitio institucional (y viceversa)

## La idea

La app pasa a tener **dos modos**, controlados desde Admin, sin borrar nada:

1. **Modo Misión** (hoy): inscripciones, documentos, mi familia, pueblos, torneo.
2. **Modo Institucional** (entre temporadas): la portada muestra quiénes somos, fotos/resumen de la misión pasada, contacto y un aviso de "Inscripciones 2027 próximamente". Se ocultan las pestañas de inscripción/documentos/baja.

Cuando llega el momento, el super admin crea la configuración 2027 con sus fechas y la activa: la app vuelve sola a Modo Misión, con los pueblos y cupos listos y **cero registros nuevos**, porque todo se filtra por año.

## Por qué esto funciona sin borrar datos

Ya existe `registros.año` y `configuracion_inscripcion` (una fila por año, una sola activa). Los registros de 2026 quedan intactos como histórico; 2027 simplemente arranca vacío.

## Cambios necesarios

### 1. Base de datos
- Nueva columna `configuracion_inscripcion.modo` (`'mision'` | `'institucional'`), o equivalente booleano `misiones_finalizadas`.
- `estado_inscripcion()` devuelve un nuevo estado `institucional` cuando el año activo está cerrado y marcado como finalizado.
- `registros.año` deja de tener default fijo 2026: el default pasa a leerse del año activo (`register_if_capacity` ya recibe/deduce el año).
- Nueva RPC `abrir_anio(p_año, fechas...)`: crea la configuración del nuevo año, la marca activa (el trigger desactiva las demás) y deja el modo en `mision`.

### 2. Frontend — año dinámico
Hoy hay `.eq('año', 2026)` fijo en `app/(tabs)/mi-familia.tsx` y varias veces en `app/(tabs)/documentos.tsx`. Se reemplaza por un hook único `useAñoActivo()` que lee el año activo de la configuración (con caché en memoria).

### 3. Frontend — modo institucional
- `app/(tabs)/_layout.tsx`: ocultar **Inscribirme**, **Mi Familia**, **Docs** y **Baja** cuando el modo es institucional (los admins siguen viendo Inscriptos/Admin/Histórico).
- `app/(tabs)/index.tsx`: si el modo es institucional, en lugar de las tarjetas de inscripción se muestra la portada institucional.
- Nuevo componente `src/components/PortadaInstitucional.tsx`: quiénes somos, resumen de la misión del año que terminó (cantidad de misioneros y pueblos, calculado de la base), contactos, y aviso de la próxima temporada.

### 4. Frontend — panel de temporada (Admin)
Nueva tarjeta **"🗓️ Temporada"** en Admin:
- Estado actual (año activo + modo).
- Botón **"Cerrar temporada 2026 → modo institucional"**.
- Botón **"Abrir inscripciones 2027"**: pide las 3 fechas (anticipada, general, cierre) + vencimiento de lista de espera, crea la config y activa el año.
- Aviso claro de que los datos de años anteriores no se tocan.

### 5. Histórico
`app/(tabs)/historico.tsx` ya lee por año; se verifica que liste todos los años con registros para consultar quiénes misionaron cada año.

## Decisiones a confirmar

- Qué contenido concreto querés en la portada institucional (texto, fotos, links a redes).
- Si en modo institucional el usuario común debe seguir viendo su inscripción pasada y sus documentos en modo lectura, o se ocultan del todo.
- Si el torneo sigue visible en modo institucional (hoy ya tiene su propio switch, así que puede quedar independiente).
