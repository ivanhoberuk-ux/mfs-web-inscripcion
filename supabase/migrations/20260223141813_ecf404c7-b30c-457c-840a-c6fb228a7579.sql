
-- Enable RLS on unprotected tables
ALTER TABLE public.document_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indexed_files ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for document_rows
CREATE POLICY "admin_all_document_rows" ON public.document_rows
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Admin-only policies for document_metadata
CREATE POLICY "admin_all_document_metadata" ON public.document_metadata
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Admin-only policies for documents
CREATE POLICY "admin_all_documents" ON public.documents
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Admin-only policies for indexed_files
CREATE POLICY "admin_all_indexed_files" ON public.indexed_files
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
