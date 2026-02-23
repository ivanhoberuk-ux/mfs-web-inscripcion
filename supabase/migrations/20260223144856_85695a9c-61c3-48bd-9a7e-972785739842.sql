
-- A) Ensure documentos bucket is PRIVATE (idempotent)
UPDATE storage.buckets SET public = false WHERE id = 'documentos';

-- Clean up broken storage policies that reference wrong role 'super_admin' (actual role is 'admin')
DROP POLICY IF EXISTS "super_admin_select_documents" ON storage.objects;
DROP POLICY IF EXISTS "super_admin_insert_documents" ON storage.objects;
DROP POLICY IF EXISTS "super_admin_update_documents" ON storage.objects;
DROP POLICY IF EXISTS "super_admin_delete_documents" ON storage.objects;

-- Clean up old admin policies that use deprecated is_admin() function
DROP POLICY IF EXISTS "admin_read_documentos" ON storage.objects;
DROP POLICY IF EXISTS "admin_upload_documentos" ON storage.objects;
DROP POLICY IF EXISTS "admin_update_documentos" ON storage.objects;
DROP POLICY IF EXISTS "admin_delete_documentos" ON storage.objects;
DROP POLICY IF EXISTS "admin_insert_documentos" ON storage.objects;

-- C) Enable vault extension for secure cron secret storage
CREATE EXTENSION IF NOT EXISTS supabase_vault SCHEMA vault;

-- Remove the old cron job with hardcoded anon key
SELECT cron.unschedule('daily-doc-reminders');
