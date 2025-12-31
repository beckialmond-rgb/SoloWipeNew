import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSupabaseData } from './useSupabaseData';

/**
 * Centralized role detection hook for SoloWipe (Phase 4: Explicit Role Field)
 * 
 * Role detection logic:
 * - Primary: Reads from profiles.role field (explicit)
 * - Fallback: Uses inference logic if role is null (temporary during migration)
 * 
 * Role values:
 * - 'owner': User has customers
 * - 'helper': User is in team_members table
 * - 'both': User has both customers and team_members entry
 * 
 * Effective role resolution:
 * - 'both' resolves to 'owner' for UI and permissions (owner wins)
 */
export function useRole() {
  const { user } = useAuth();
  
  // Fetch profile with role field
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id, 'role'],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        console.warn('[useRole] Error fetching profile role:', error);
        return null;
      }
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  // Get fallback data sources (only used if role is null)
  const { customers, assignedJobs, teamMemberships, isLoading: dataLoading } = useSupabaseData();
  
  // Compute role flags with fallback logic
  const roleFlags = useMemo(() => {
    const role = profile?.role;
    const isLoading = profileLoading || dataLoading;
    
    // If role is explicitly set, use it
    if (role === 'owner') {
      return {
        isOwner: true,
        isHelper: false,
        isBoth: false,
        effectiveRole: 'owner' as const,
        isLoading,
      };
    }
    
    if (role === 'helper') {
      return {
        isOwner: false,
        isHelper: true,
        isBoth: false,
        effectiveRole: 'helper' as const,
        isLoading,
      };
    }
    
    if (role === 'both') {
      return {
        isOwner: true,  // Owner wins
        isHelper: true,
        isBoth: true,
        effectiveRole: 'owner' as const,  // Effective role is owner
        isLoading,
      };
    }
    
    // Fallback: if role is null (temporary during migration), use inference
    // This ensures backward compatibility during rollout
    const isOwner = customers.length > 0;
    const isHelper = assignedJobs.length > 0 || (teamMemberships?.length ?? 0) > 0;
    const isBoth = isOwner && isHelper;
    
    return {
      isOwner,
      isHelper,
      isBoth,
      effectiveRole: isBoth ? 'owner' : (isOwner ? 'owner' : 'helper') as 'owner' | 'helper',
      isLoading,
    };
  }, [profile?.role, profileLoading, dataLoading, customers.length, assignedJobs.length, teamMemberships?.length]);
  
  return roleFlags;
}
