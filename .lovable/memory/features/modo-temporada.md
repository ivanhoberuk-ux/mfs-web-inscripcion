---
name: Modo temporada (misión / institucional)
description: Ciclo anual de la app; modo institucional entre temporadas y apertura de un nuevo año de inscripciones sin borrar datos
type: feature
---

`configuracion_inscripcion.modo` = `'mision'` | `'institucional'` (una fila por año, una sola `activo`).

- `estado_inscripcion(año)` devuelve `'institucional'` cuando la temporada activa está en ese modo.
- En modo institucional se ocultan las tabs Inscribirme, Mi Familia, Docs y Baja, y el home muestra `PortadaInstitucional` (resumen de la misión pasada + "Inscripciones N+1 próximamente").
- `registros.año` tiene default `public.anio_activo()` — nunca hardcodear el año en el frontend; usar `fetchAñoActivo()` / `useAñoActivo()`.
- RPCs solo super_admin: `set_modo_temporada(año, modo)` y `abrir_anio(año, fechas...)` (crea/activa el año siguiente, modo misión).
- UI: `TemporadaPanel` en Admin → Configuración de inscripción.
- Nunca se borran registros de años anteriores: el histórico se consulta por `registros.año`.
