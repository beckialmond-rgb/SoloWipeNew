/**
 * SMS Templates Hook
 * 
 * Manages SMS templates with Supabase storage and localStorage fallback
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  SMSTemplateCategory,
  SMSTemplateCategoryConfig,
  DEFAULT_SMS_TEMPLATES,
  SMSTemplate,
} from '@/types/smsTemplates';
import { SMS_TEMPLATES_STORAGE_KEY } from '@/types/smsTemplates';

interface SMSTemplateRow {
  id: string;
  profile_id: string;
  category: SMSTemplateCategory;
  templates: SMSTemplate[];
  default_template_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database row to category config
 */
function rowToCategoryConfig(row: SMSTemplateRow): SMSTemplateCategoryConfig {
  // Validate templates array
  let templatesArray: SMSTemplate[] = [];
  if (Array.isArray(row.templates)) {
    templatesArray = row.templates.map(t => ({
      id: String(t.id || ''),
      name: String(t.name || ''),
      message: String(t.message || ''),
      isDefault: Boolean(t.isDefault),
    }));
  }

  const defaultCategoryConfig = DEFAULT_SMS_TEMPLATES[row.category] || null;
  
  return {
    category: String(row.category),
    displayName: defaultCategoryConfig?.displayName || String(row.category),
    description: defaultCategoryConfig?.description || '',
    templates: templatesArray.length > 0 ? templatesArray : (defaultCategoryConfig?.templates || []),
    defaultTemplateId: String(row.default_template_id || defaultCategoryConfig?.defaultTemplateId || 'professional'),
  };
}

/**
 * Migrate templates from localStorage to Supabase on first load
 */
async function migrateFromLocalStorage(userId: string): Promise<void> {
  try {
    const stored = localStorage.getItem(SMS_TEMPLATES_STORAGE_KEY);
    if (!stored) return;

    const parsed = JSON.parse(stored);
    
    // Check if user already has templates in database
    // Wrap in try-catch to handle case where table doesn't exist
    try {
      const { data: existing, error: checkError } = await supabase
        .from('sms_templates')
        .select('category')
        .eq('profile_id', userId)
        .limit(1);

      // If table doesn't exist (404), skip migration
      if (checkError && (checkError.code === 'PGRST116' || checkError.message?.includes('404') || checkError.message?.includes('does not exist'))) {
        console.log('[SMS Templates] Table does not exist, skipping migration');
        return;
      }

      // If templates exist in DB, don't migrate (DB takes precedence)
      if (existing && existing.length > 0) {
        // Clear localStorage after successful migration check
        localStorage.removeItem(SMS_TEMPLATES_STORAGE_KEY);
        return;
      }
    } catch (migrationCheckError) {
      // If migration check fails, just skip migration
      console.log('[SMS Templates] Migration check failed, skipping migration:', migrationCheckError);
      return;
    }

    // Migrate each category
    const categories = Object.keys(parsed) as SMSTemplateCategory[];
    for (const category of categories) {
      const config = parsed[category];
      if (config && config.templates) {
        await supabase
          .from('sms_templates')
          .upsert({
            profile_id: userId,
            category,
            templates: config.templates,
            default_template_id: config.defaultTemplateId || config.default_template_id || 'professional',
          }, {
            onConflict: 'profile_id,category',
          });
      }
    }

    // Clear localStorage after migration
    localStorage.removeItem(SMS_TEMPLATES_STORAGE_KEY);
  } catch (error) {
    console.error('[SMS Templates] Migration error:', error);
    // Don't throw - allow app to continue with defaults
  }
}

/**
 * Hook to manage SMS templates with Supabase
 */
export function useSMSTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all templates from Supabase
  const { data: templatesFromDB, isLoading } = useQuery({
    queryKey: ['sms_templates', user?.id],
    queryFn: async () => {
      if (!user) {
        // Return defaults if no user
        return DEFAULT_SMS_TEMPLATES;
      }

      try {
        // Migrate from localStorage on first load
        await migrateFromLocalStorage(user.id);

        const { data, error } = await supabase
          .from('sms_templates')
          .select('*')
          .eq('profile_id', user.id);

        if (error) {
          // 404 means table doesn't exist yet - this is OK, use defaults
          if (error.code === 'PGRST116' || error.message?.includes('404') || error.message?.includes('does not exist')) {
            console.log('[SMS Templates] Table does not exist yet, using defaults');
            return DEFAULT_SMS_TEMPLATES;
          }
          // For other errors, log but don't crash
          console.warn('[SMS Templates] Fetch error (non-critical):', error.message || error);
          // Fallback to defaults on error
          return DEFAULT_SMS_TEMPLATES;
        }

        // Convert rows to category configs
        const categoryConfigs: Partial<Record<SMSTemplateCategory, SMSTemplateCategoryConfig>> = {};
        
        if (data && Array.isArray(data) && data.length > 0) {
          data.forEach((row: any) => {
            try {
              // Validate row structure before processing
              if (row && row.category && typeof row.category === 'string') {
                const category = row.category as SMSTemplateCategory;
                categoryConfigs[category] = rowToCategoryConfig({
                  id: String(row.id || ''),
                  profile_id: String(row.profile_id || ''),
                  category: category,
                  templates: Array.isArray(row.templates) ? row.templates : [],
                  default_template_id: String(row.default_template_id || 'professional'),
                  created_at: String(row.created_at || ''),
                  updated_at: String(row.updated_at || ''),
                });
              }
            } catch (error) {
              console.error('[SMS Templates] Error processing row:', error, row);
              // Skip invalid rows and continue
            }
          });
        }

        // Merge with defaults to ensure all categories exist
        // Ensure all default categories are present and valid
        const merged: Record<SMSTemplateCategory, SMSTemplateCategoryConfig> = { ...DEFAULT_SMS_TEMPLATES };
        
        // Only override with valid category configs
        Object.keys(categoryConfigs).forEach((category) => {
          const config = categoryConfigs[category as SMSTemplateCategory];
          if (config && config.category && config.templates && Array.isArray(config.templates)) {
            merged[category as SMSTemplateCategory] = config;
          }
        });

        return merged;
      } catch (error) {
        console.error('[SMS Templates] Unexpected error:', error);
        return DEFAULT_SMS_TEMPLATES;
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Save templates mutation
  const saveMutation = useMutation({
    mutationFn: async ({ category, config }: { category: SMSTemplateCategory; config: SMSTemplateCategoryConfig }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('sms_templates')
        .upsert({
          profile_id: user.id,
          category,
          templates: config.templates,
          default_template_id: config.defaultTemplateId,
        }, {
          onConflict: 'profile_id,category',
        });

      if (error) {
        // If table doesn't exist, log but don't crash
        if (error.code === 'PGRST116' || error.message?.includes('404') || error.message?.includes('does not exist')) {
          console.warn('[SMS Templates] Table does not exist, cannot save. Please run database migration.');
          return; // Don't throw, just return silently
        }
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate query to refetch
      queryClient.invalidateQueries({ queryKey: ['sms_templates', user?.id] });
    },
  });

  // Save all templates
  const saveAllMutation = useMutation({
    mutationFn: async (templates: Record<SMSTemplateCategory, SMSTemplateCategoryConfig>) => {
      if (!user) throw new Error('User not authenticated');

      const rows = Object.entries(templates)
        .filter(([_, config]) => config && config.templates && Array.isArray(config.templates))
        .map(([category, config]) => {
          // Sanitize templates array
          const sanitizedTemplates = config.templates.map(t => ({
            id: String(t.id || ''),
            name: String(t.name || ''),
            message: String(t.message || ''),
            isDefault: Boolean(t.isDefault),
          }));
          
          return {
            profile_id: user.id,
            category: String(category),
            templates: sanitizedTemplates,
            default_template_id: String(config.defaultTemplateId || 'professional'),
          };
        });

      const { error } = await supabase
        .from('sms_templates')
        .upsert(rows, {
          onConflict: 'profile_id,category',
        });

      if (error) {
        // If table doesn't exist, log but don't crash
        if (error.code === 'PGRST116' || error.message?.includes('404') || error.message?.includes('does not exist')) {
          console.warn('[SMS Templates] Table does not exist, cannot save. Please run database migration.');
          return; // Don't throw, just return silently
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms_templates', user?.id] });
    },
  });

  return {
    templates: templatesFromDB || DEFAULT_SMS_TEMPLATES,
    isLoading,
    saveTemplate: saveMutation.mutateAsync,
    saveAllTemplates: saveAllMutation.mutateAsync,
    isSaving: saveMutation.isPending || saveAllMutation.isPending,
  };
}

