import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { AssignmentTemplate } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for managing assignment templates (Phase 7)
 * 
 * Provides:
 * - Fetch templates for current owner
 * - Create template mutation
 * - Delete template mutation
 * - Apply template to jobs mutation
 */
export function useAssignmentTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch templates for current owner
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['assignmentTemplates', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('assignment_templates')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[useAssignmentTemplates] Error fetching templates:', error);
        throw error;
      }
      
      return (data || []) as AssignmentTemplate[];
    },
    enabled: !!user,
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async ({ name, helperIds }: { name: string; helperIds: string[] }) => {
      if (!user) throw new Error('User not authenticated');
      
      // Validate inputs
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error('Template name cannot be empty');
      }
      
      if (!helperIds || helperIds.length === 0) {
        throw new Error('Template must include at least one helper');
      }
      
      // Validate all helper IDs are valid UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const invalidIds = helperIds.filter(id => !uuidRegex.test(id));
      if (invalidIds.length > 0) {
        throw new Error('Invalid helper ID(s)');
      }
      
      const { data, error } = await supabase
        .from('assignment_templates')
        .insert({
          owner_id: user.id,
          name: trimmedName,
          helper_ids: helperIds,
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useAssignmentTemplates] Error creating template:', error);
        throw error;
      }
      
      return data as AssignmentTemplate;
    },
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ['assignmentTemplates', user?.id] });
      toast({
        title: 'Template saved',
        description: `"${template.name}" has been saved.`,
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save template';
      toast({
        title: 'Failed to save template',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('assignment_templates')
        .delete()
        .eq('id', templateId)
        .eq('owner_id', user.id); // Double-check ownership
      
      if (error) {
        console.error('[useAssignmentTemplates] Error deleting template:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignmentTemplates', user?.id] });
      toast({
        title: 'Template deleted',
        description: 'Template has been deleted.',
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete template';
      toast({
        title: 'Failed to delete template',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Apply template to jobs mutation
  const applyTemplateMutation = useMutation({
    mutationFn: async ({ templateId, jobIds }: { templateId: string; jobIds: string[] }) => {
      if (!user) throw new Error('User not authenticated');
      
      // Fetch template
      const { data: template, error: fetchError } = await supabase
        .from('assignment_templates')
        .select('helper_ids')
        .eq('id', templateId)
        .eq('owner_id', user.id)
        .single();
      
      if (fetchError || !template) {
        throw new Error('Template not found');
      }
      
      if (!template.helper_ids || template.helper_ids.length === 0) {
        throw new Error('Template has no helpers');
      }
      
      // Apply template to each job using assignMultipleUsersMutation logic
      // We'll reuse the same logic but call it directly here
      const results = [];
      const errors = [];
      
      for (const jobId of jobIds) {
        try {
          const assignments = template.helper_ids.map(userId => ({
            job_id: jobId,
            assigned_to_user_id: userId,
            assigned_by_user_id: user.id,
          }));
          
          const { error: assignError } = await supabase
            .from('job_assignments')
            .upsert(assignments, {
              onConflict: 'job_id,assigned_to_user_id', // Use column names for unique constraint
            });
          
          if (assignError) {
            console.error(`[useAssignmentTemplates] Error assigning job ${jobId}:`, assignError);
            errors.push({ jobId, error: assignError });
          } else {
            results.push(jobId);
          }
        } catch (error) {
          console.error(`[useAssignmentTemplates] Error assigning job ${jobId}:`, error);
          errors.push({ jobId, error });
        }
      }
      
      // Invalidate queries to refresh job assignments
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['assignedJobs'] });
      queryClient.invalidateQueries({ queryKey: ['helpers'] });
      
      return {
        successCount: results.length,
        errorCount: errors.length,
        errors,
      };
    },
    onSuccess: (result) => {
      if (result.errorCount > 0) {
        toast({
          title: 'Partially applied',
          description: `Applied to ${result.successCount} job${result.successCount !== 1 ? 's' : ''}. ${result.errorCount} failed.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Template applied',
          description: `Applied to ${result.successCount} job${result.successCount !== 1 ? 's' : ''}.`,
        });
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply template';
      toast({
        title: 'Failed to apply template',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  return {
    templates,
    isLoading,
    createTemplate: createTemplateMutation.mutateAsync,
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    applyTemplate: applyTemplateMutation.mutateAsync,
    isCreating: createTemplateMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending,
    isApplying: applyTemplateMutation.isPending,
  };
}

