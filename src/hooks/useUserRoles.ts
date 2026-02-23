// Hook to fetch user roles from server-side user_roles table
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthProvider';

export type UserRole = {
  isSuperAdmin: boolean;
  isPuebloAdmin: boolean;
  isCoAdmin: boolean;
  puebloId: string | null;
  loading: boolean;
};

export function useUserRoles(): UserRole {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isPuebloAdmin, setIsPuebloAdmin] = useState(false);
  const [isCoAdmin, setIsCoAdmin] = useState(false);
  const [puebloId, setPuebloId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchRoles() {
      if (!user) {
        setIsSuperAdmin(false);
        setIsPuebloAdmin(false);
        setIsCoAdmin(false);
        setPuebloId(null);
        setLoading(false);
        return;
      }

      try {
        // Fetch all roles for user
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const roles = rolesData?.map(r => r.role) || [];
        const hasAdmin = roles.includes('admin');
        const hasPuebloAdmin = roles.includes('pueblo_admin');
        const hasCoAdmin = roles.includes('co_admin_pueblo');

        // Get pueblo_id from profiles table if pueblo_admin or co_admin
        let userPuebloId: string | null = null;
        if (hasPuebloAdmin || hasCoAdmin) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('pueblo_id')
            .eq('id', user.id)
            .maybeSingle();
          userPuebloId = profileData?.pueblo_id || null;
        }

        if (mounted) {
          setIsSuperAdmin(hasAdmin);
          setIsPuebloAdmin(hasPuebloAdmin);
          setIsCoAdmin(hasCoAdmin);
          setPuebloId(userPuebloId);
          setLoading(false);
        }
      } catch (e) {
        console.error('Error fetching user roles:', e);
        if (mounted) {
          setIsSuperAdmin(false);
          setIsPuebloAdmin(false);
          setIsCoAdmin(false);
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

  return { isSuperAdmin, isPuebloAdmin, isCoAdmin, puebloId, loading };
}
