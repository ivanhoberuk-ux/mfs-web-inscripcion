## Cambios solicitados

### 1. Edad mínima para Tío: 30 años

**Backend (migración):**
- En `register_if_capacity`, agregar validación: si `p_rol = 'Tio'` y edad calculada al 1-ene del año de misión < 30 → `RAISE EXCEPTION 'Para inscribirse como Tío debes tener al menos 30 años cumplidos'`.

**Frontend (`app/(tabs)/inscribir.tsx`):**
- Agregar misma validación client-side al seleccionar rol Tío + fecha de nacimiento.
- Mensaje claro al usuario.

---

### 2. Nuevo rol "Asesor" (religiosos acompañantes)

**Características:**
- No ocupa cupo de ningún pueblo.
- Puede indicar múltiples pueblos que acompaña (referencial).
- Subtipo: Padre de Schoenstatt / Diocesano / Hermana de María.
- Requiere validación por super_admin antes de quedar confirmado.

**Backend (migración):**
- Agregar valores al enum `estado_registro`: `'pendiente_validacion'` (si no existe).
- Agregar columnas a `registros`:
  - `tipo_asesor text` (nullable) — 'padre_schoenstatt' | 'diocesano' | 'hermana_maria'
  - `pueblos_acompaña uuid[]` (nullable) — array de pueblo_ids referenciales
- Actualizar constraint del check de `rol` para incluir `'Asesor'` (o eliminar check si ya es libre).
- Actualizar función `ocupa_cupo`: si `rol = 'Asesor'` → `false`.
- Actualizar `register_if_capacity`:
  - Aceptar nuevos parámetros `p_tipo_asesor`, `p_pueblos_acompaña`.
  - Si `rol = 'Asesor'`: no validar cupo, insertar con `estado = 'pendiente_validacion'`, `pueblo_id` puede ser un pueblo "principal" o nulo (mantener NOT NULL → usar primer pueblo del array como referencia).
  - Validar que `tipo_asesor` no sea null si rol = Asesor.
- Nueva RPC `validar_asesor(p_registro_id)` solo super_admin → cambia estado a `'confirmado'`.

**Frontend:**
- `inscribir.tsx`: agregar opción "Asesor" en selector de rol. Al elegirlo:
  - Mostrar selector de subtipo (Padre Schoenstatt / Diocesano / Hermana de María).
  - Mostrar multi-select de pueblos que acompaña (referencial).
  - Ocultar/relajar campos no aplicables (padre/madre, talle si no corresponde, etc.).
  - Al enviar, mostrar mensaje: "Tu inscripción quedó pendiente de validación por un administrador".
- Panel admin (`admin.tsx` o nuevo): listar asesores pendientes con botón "Validar".
- Página de inicio (`app/(tabs)/index.tsx`): nueva sección "Asesores de este año" mostrando nombre, tipo de asesor y pueblos que acompañan (solo los confirmados del año activo).

---

### 3. Mostrar pueblo y estado de inscripción en home del misionero

**Frontend (`app/(tabs)/index.tsx` o componente equivalente):**
- Junto al `DocumentosEstadoCard`, agregar tarjeta con:
  - Nombre del pueblo al que se inscribió.
  - Estado: ✅ Confirmada / ⏳ Lista de espera / 🕓 Pendiente de validación (asesor).
  - Año de la misión.
- Datos: consultar `registros` por email del usuario actual (RLS ya lo permite), join con `pueblos`.

---

### Detalles técnicos

```text
Migración SQL (resumen):
  - ALTER TYPE estado_registro ADD VALUE 'pendiente_validacion' (si falta)
  - ALTER TABLE registros ADD COLUMN tipo_asesor text, pueblos_acompaña uuid[]
  - DROP CHECK rol → CHECK rol IN ('Tio','Misionero','Hijo','Asesor')
  - CREATE OR REPLACE FUNCTION ocupa_cupo (agregar Asesor → false)
  - CREATE OR REPLACE FUNCTION register_if_capacity (edad Tío + lógica Asesor)
  - CREATE FUNCTION validar_asesor(uuid) RETURNS void

Archivos a editar:
  - app/(tabs)/inscribir.tsx (UI + validación cliente)
  - app/(tabs)/index.tsx (asesores del año + tarjeta estado inscripción)
  - app/(tabs)/admin.tsx (panel de validación de asesores)
  - src/lib/api.ts (nuevos parámetros en registerIfCapacity + funciones fetchAsesores, validarAsesor, fetchMiInscripcion)
```

---

¿Procedo con esta implementación?