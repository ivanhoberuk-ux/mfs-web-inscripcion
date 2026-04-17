---
name: Hijo menor no ocupa cupo
description: Hijos con rol 'Hijo' y edad < 15 al año del registro no consumen cupo del pueblo pero sí cuentan como personas que viajan
type: feature
---
**Regla:** Un registro con `rol = 'Hijo'` AND `(año - año_nacimiento) < 15` NO ocupa cupo del pueblo.

**Implementación BD:**
- Función `public.ocupa_cupo(rol, nacimiento, año)` returns boolean — fuente de verdad de la regla.
- `register_if_capacity` usa `ocupa_cupo`: si no ocupa, queda confirmado sin contar; si ocupa, lógica normal de cupo/lista_espera.
- `vw_ocupacion` expone columnas: `usados` (ocupan cupo), `menores` (no ocupan), `total_personas`, `libres`.
- `promover_siguiente_en_lista` solo promueve si hay cupo libre real (usando ocupa_cupo).

**UI:**
- `/pueblos`: card muestra "Misioneros" en vez de "Inscriptos", y agrega chip "Menores" + nota "Total de personas que viajan: N (incluye X menores de 15)".
- Formulario `inscribir`: al elegir rol Hijo con edad < 15 muestra aviso "NO ocupa cupo de misionero, pero queda registrado".

**Why:** Permite contar a los hijos chicos para logística (comida, transporte, talles, alergias) sin que ocupen lugar de misionero adulto.
