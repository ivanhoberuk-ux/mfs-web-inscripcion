# Rediseño visual — Etapa 2, Parte A

## Resultado
Actualizar las páginas públicas y del usuario para que compartan el estilo fresco, luminoso y paraguayo del nuevo inicio, sin alterar datos, permisos ni comportamiento.

## Implementación
1. Rediseñar acceso y recuperación con composición dividida en computadora y tarjeta centrada en celular.
2. Reorganizar visualmente la inscripción en cinco secciones, con progreso, selectores modernos y acción móvil accesible.
3. Renovar las páginas de pueblos, detalle y búsqueda con encabezados claros, grillas y estados de cupo.
4. Convertir documentos y firma en una experiencia de tarjetas de estado, zonas de carga y vistas previas limpias.
5. Actualizar Mi Familia, baja y las tarjetas compartidas con avatares, chips e iconografía consistente.
6. Modernizar el chat con encabezado degradado y mensajes redondeados.
7. Verificar las páginas representativas a 360 px y 1440 px, además de tipado y compilación.

## Límites
- Solo apariencia: se preservan consultas, RPC, validaciones, rutas, permisos y textos legales.
- Sin cambios en base de datos ni funciones del servidor.
- Se mantiene exactamente la paleta actual y el fondo paraguayo compartido.

## Detalles técnicos
- Se reutilizarán los tokens de `designSystem`, los componentes base y `Ionicons`.
- Los contenedores tendrán un ancho máximo cercano a 1120 px y 120 px de espacio inferior cuando sean desplazables.
- Los cambios visuales extensos del formulario se harán agrupando el JSX existente, sin mover ni duplicar su estado o sus controladores.
