-- Hacer el bucket documentos público para que las imágenes sean visibles
UPDATE storage.buckets 
SET public = true 
WHERE id = 'documentos';

-- Las políticas RLS ya existentes controlarán quién puede subir, actualizar y eliminar
-- Pero ahora cualquiera con la URL podrá ver las imágenes