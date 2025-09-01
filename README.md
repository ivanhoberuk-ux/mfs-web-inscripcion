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
