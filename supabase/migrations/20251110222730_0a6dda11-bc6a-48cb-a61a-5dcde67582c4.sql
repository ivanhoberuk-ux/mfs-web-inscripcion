-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

-- Super admins pueden leer todos los documentos
CREATE POLICY "super_admin_select_documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documentos'
  AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  )
);

-- Pueblo admins pueden leer documentos de su pueblo
CREATE POLICY "pueblo_admin_select_documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documentos'
  AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'pueblo_admin')
    AND EXISTS (
      SELECT 1 
      FROM registros r
      JOIN profiles p ON p.pueblo_id = r.pueblo_id
      WHERE r.id::text = split_part(split_part(name, '/', 2), '/', 1)
      AND p.id = auth.uid()
    )
  )
);

-- Super admins pueden insertar documentos
CREATE POLICY "super_admin_insert_documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documentos'
  AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- Pueblo admins pueden insertar documentos de su pueblo
CREATE POLICY "pueblo_admin_insert_documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documentos'
  AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'pueblo_admin')
  AND EXISTS (
    SELECT 1 
    FROM registros r
    JOIN profiles p ON p.pueblo_id = r.pueblo_id
    WHERE r.id::text = split_part(split_part(name, '/', 2), '/', 1)
    AND p.id = auth.uid()
  )
);

-- Super admins pueden actualizar documentos
CREATE POLICY "super_admin_update_documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documentos'
  AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- Super admins pueden eliminar documentos
CREATE POLICY "super_admin_delete_documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documentos'
  AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);