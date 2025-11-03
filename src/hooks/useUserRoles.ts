// Hook to fetch user roles from server-side user_roles table
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthProvider';

export type UserRole = {
  isSuperAdmin: boolean;
  isPuebloAdmin: boolean;
  puebloId: string | null;
  loading: boolean;
};

export function useUserRoles(): UserRole {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isPuebloAdmin, setIsPuebloAdmin] = useState(false);
  const [puebloId, setPuebloId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchRoles() {
      if (!user) {
        setIsSuperAdmin(false);
        setIsPuebloAdmin(false);
        setPuebloId(null);
        setLoading(false);
        return;
      }

      try {
        // Check for admin role (super admin)
        const { data: adminData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        // Check for pueblo_admin role and get pueblo_id from profile
        const { data: puebloAdminData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'pueblo_admin')
          .maybeSingle();

        // Get pueblo_id from profiles table
        let userPuebloId: string | null = null;
        if (puebloAdminData) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('pueblo_id')
            .eq('id', user.id)
            .maybeSingle();
          userPuebloId = profileData?.pueblo_id || null;
        }

        if (mounted) {
          setIsSuperAdmin(!!adminData);
          setIsPuebloAdmin(!!puebloAdminData);
          setPuebloId(userPuebloId);
          setLoading(false);
        }
      } catch (e) {
        console.error('Error fetching user roles:', e);
        if (mounted) {
          setIsSuperAdmin(false);
          setIsPuebloAdmin(false);
          setPuebloId(null);
          setLoading(false);
        }
      }
    }

    fetchRoles();
    return () => {
      mounted = false;
    };
  }, [user]);

  return { isSuperAdmin, isPuebloAdmin, puebloId, loading };
}
