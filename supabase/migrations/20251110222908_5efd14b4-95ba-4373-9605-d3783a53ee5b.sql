-- Mejorar la política de pueblo_admin para lectura de documentos
DROP POLICY IF EXISTS "pueblo_admin_select_documents" ON storage.objects;

CREATE POLICY "pueblo_admin_select_documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documentos'
  AND (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'pueblo_admin'
    )
    AND EXISTS (
      SELECT 1 
      FROM registros r
      WHERE name LIKE 'registros/' || r.id::text || '/%'
      AND r.pueblo_id = (SELECT get_user_pueblo_id())
    )
  )
);

-- Mejorar la política de pueblo_admin para inserción de documentos
DROP POLICY IF EXISTS "pueblo_admin_insert_documents" ON storage.objects;

CREATE POLICY "pueblo_admin_insert_documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documentos'
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'pueblo_admin'
  )
  AND EXISTS (
    SELECT 1 
    FROM registros r
    WHERE name LIKE 'registros/' || r.id::text || '/%'
    AND r.pueblo_id = (SELECT get_user_pueblo_id())
  )
);

-- Agregar políticas de actualización y eliminación para pueblo_admin
CREATE POLICY "pueblo_admin_update_documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documentos'
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'pueblo_admin'
  )
  AND EXISTS (
    SELECT 1 
    FROM registros r
    WHERE name LIKE 'registros/' || r.id::text || '/%'
    AND r.pueblo_id = (SELECT get_user_pueblo_id())
  )
);

CREATE POLICY "pueblo_admin_delete_documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documentos'
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'pueblo_admin'
  )
  AND EXISTS (
    SELECT 1 
    FROM registros r
    WHERE name LIKE 'registros/' || r.id::text || '/%'
    AND r.pueblo_id = (SELECT get_user_pueblo_id())
  )
);