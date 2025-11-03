-- Fix security issues: Remove public insert policy and secure views

-- 1. Drop the overly permissive public insert policy on registros
DROP POLICY IF EXISTS registros_insert_any ON public.registros;

-- 2. Drop registros_activos view as it has no RLS and may bypass security
-- Alternative: The base registros table with proper RLS is sufficient
DROP VIEW IF EXISTS public.registros_activos CASCADE;

-- 3. Ensure registros table has proper insert restrictions
-- Only admins and pueblo admins with matching pueblo_id can insert
-- Drop existing policy first if it exists
DROP POLICY IF EXISTS registros_insert_restricted ON public.registros;

CREATE POLICY registros_insert_restricted ON public.registros
  FOR INSERT
  WITH CHECK (
    public.is_super_admin() OR 
    (public.is_pueblo_admin() AND pueblo_id = public.get_user_pueblo_id())
  );

-- 4. Note: The register_if_capacity function uses SECURITY DEFINER 
-- and handles public registration with proper capacity checks.
-- This is the intended path for public registrations.