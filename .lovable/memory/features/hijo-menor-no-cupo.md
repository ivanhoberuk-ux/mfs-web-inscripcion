---
name: Hijo menor no ocupa cupo
description: Hijos con rol 'Hijo' y edad exacta < 12 al 1 de enero del año de misión no consumen cupo del pueblo pero sí cuentan como personas que viajan
type: feature
---
**Regla:** Un registro con `rol = 'Hijo'` AND edad exacta < 12 años cumplidos al **1 de enero del año de misión** NO ocupa cupo del pueblo.

**Cálculo de edad:** Se usa `date_part('year', age(make_date(año,1,1), nacimiento))` — fecha exacta de cumpleaños, no solo año vs año.

**Ejemplos (misión 2026, ref 2026-01-01):**
- Nacido 2014-06-15 → 11 años → NO ocupa cupo
- Nacido 2014-01-01 → 12 años → SÍ ocupa cupo
- Nacido 2013-12-31 → 12 años → SÍ ocupa cupo

**Implementación BD:**
- Función `public.ocupa_cupo(rol, nacimiento, año)` returns boolean — fuente de verdad de la regla.
- `register_if_capacity` usa `ocupa_cupo`: si no ocupa, queda confirmado sin contar; si ocupa, lógica normal de cupo/lista_espera.
- `vw_ocupacion` expone columnas: `usados` (ocupan cupo), `menores` (no ocupan), `total_personas`, `libres`.
- `promover_siguiente_en_lista` solo promueve si hay cupo libre real (usando ocupa_cupo).

**UI:**
- `/pueblos`: card muestra "Misioneros" en vez de "Inscriptos", y agrega chip "Menores" + nota "Total de personas que viajan: N (incluye X menores de 12)".
- Formulario `inscribir`: al elegir rol Hijo con edad < 12 muestra aviso "NO ocupa cupo de misionero, pero queda registrado".

**Why:** Permite contar a los hijos chicos para logística (comida, transporte, talles, alergias) sin que ocupen lugar de misionero adulto.
