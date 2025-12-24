/**
 * SMS Templates Management Page
 * 
 * Allows cleaners to customize SMS templates for each category
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Save, RotateCcw, Check } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  SMSTemplateCategory,
  SMSTemplateCategoryConfig,
  DEFAULT_SMS_TEMPLATES,
  SMS_TEMPLATES_STORAGE_KEY,
} from '@/types/smsTemplates';
import {
  getTemplatesForCategory,
} from '@/utils/smsTemplateUtils';
import { useSMSTemplates } from '@/hooks/useSMSTemplates';

const CATEGORY_INFO: Record<SMSTemplateCategory, { icon: string; description: string }> = {
  tomorrow_reminder: {
    icon: '📅',
    description: 'Sent the day before scheduled jobs',
  },
  receipt: {
    icon: '🧾',
    description: 'Sent after job completion',
  },
  direct_debit_invite: {
    icon: '💳',
    description: 'Invitations to set up Direct Debit',
  },
  unpaid_reminder: {
    icon: '💰',
    description: 'Reminders for unpaid jobs',
  },
  rain_check: {
    icon: '🌧️',
    description: 'Weather-related rescheduling messages',
  },
  on_my_way: {
    icon: '🚗',
    description: 'Notifying customers you\'re on your way',
  },
  review_request: {
    icon: '⭐',
    description: 'Asking satisfied customers for reviews',
  },
  referral: {
    icon: '🎁',
    description: 'Family & friends referral with first clean free',
  },
  price_increase: {
    icon: '📈',
    description: 'Price increase notifications',
  },
  general: {
    icon: '💬',
    description: 'General customer messages',
  },
};

export function SMSTemplates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { templates, isLoading, saveTemplate, saveAllTemplates, isSaving } = useSMSTemplates();
  const [selectedCategory, setSelectedCategory] = useState<SMSTemplateCategory | null>(null);
  const [editedTemplates, setEditedTemplates] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const handleCategorySelect = (category: SMSTemplateCategory) => {
    setSelectedCategory(category);
    // Initialize edited templates for this category
    const categoryConfig = templates[category] || DEFAULT_SMS_TEMPLATES[category];
    if (!categoryConfig || !categoryConfig.templates || !Array.isArray(categoryConfig.templates)) {
      console.error('[SMSTemplates] Invalid category config:', category, categoryConfig);
      return;
    }
    const initial: Record<string, string> = {};
    categoryConfig.templates.forEach(template => {
      if (template && template.id && template.message) {
        initial[`${category}_${template.id}`] = String(template.message);
      }
    });
    setEditedTemplates(initial);
    setHasChanges(false);
  };

  const handleTemplateChange = (category: SMSTemplateCategory, templateId: string, newMessage: string) => {
    const key = `${category}_${templateId}`;
    setEditedTemplates(prev => ({
      ...prev,
      [key]: newMessage,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedCategory) return;

    try {
      const baseConfig = templates[selectedCategory] || DEFAULT_SMS_TEMPLATES[selectedCategory];
      if (!baseConfig || !baseConfig.templates || !Array.isArray(baseConfig.templates)) {
        toast({
          title: 'Error',
          description: 'Invalid template configuration. Please refresh the page.',
          variant: 'destructive',
        });
        return;
      }

      const categoryConfig = { ...baseConfig };

      // Update each template message
      categoryConfig.templates = categoryConfig.templates.map(template => {
        if (!template || !template.id) return template;
        const key = `${selectedCategory}_${template.id}`;
        const editedMessage = editedTemplates[key];
        return editedMessage !== undefined
          ? { ...template, message: String(editedMessage).trim() }
          : template;
      });

      // Save to Supabase
      await saveTemplate({ category: selectedCategory, config: categoryConfig });
      setHasChanges(false);
      
      // Reset edited templates to reflect saved state
      const updated: Record<string, string> = {};
      categoryConfig.templates.forEach(template => {
        if (template && template.id && template.message) {
          updated[`${selectedCategory}_${template.id}`] = String(template.message);
        }
      });
      setEditedTemplates(updated);

      toast({
        title: 'Templates saved',
        description: `${categoryConfig.displayName} templates have been updated.`,
      });
    } catch (error) {
      console.error('[SMSTemplates] Error saving templates:', error);
      toast({
        title: 'Error saving templates',
        description: 'Failed to save templates. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReset = async () => {
    if (!selectedCategory) return;

    const defaultConfig = DEFAULT_SMS_TEMPLATES[selectedCategory];
    if (!defaultConfig || !defaultConfig.templates || !Array.isArray(defaultConfig.templates)) {
      console.error('[SMSTemplates] Invalid default config for category:', selectedCategory);
      return;
    }
    const reset: Record<string, string> = {};
    defaultConfig.templates.forEach(template => {
      if (template && template.id && template.message) {
        reset[`${selectedCategory}_${template.id}`] = String(template.message);
      }
    });
    setEditedTemplates(reset);
    setHasChanges(true);
  };

  const handleResetAll = async () => {
    try {
      // Save defaults to Supabase
      await saveAllTemplates(DEFAULT_SMS_TEMPLATES);
      if (selectedCategory) {
        handleCategorySelect(selectedCategory);
      }
      toast({
        title: 'All templates reset',
        description: 'All templates have been reset to defaults.',
      });
    } catch (error) {
      console.error('[SMSTemplates] Error resetting templates:', error);
      toast({
        title: 'Error resetting templates',
        description: 'Failed to reset templates. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const selectedCategoryConfig = selectedCategory 
    ? (templates[selectedCategory] || DEFAULT_SMS_TEMPLATES[selectedCategory] || null)
    : null;

  // Show loading state if templates are still loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header showLogo={true} />
        <main className="px-4 py-6 max-w-2xl mx-auto space-y-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showLogo={true} />
      <main className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="touch-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">SMS Templates</h1>
            <p className="text-sm text-muted-foreground">Customize your message templates</p>
          </div>
        </div>

        {/* Category List */}
        {!selectedCategory ? (
          <div className="space-y-3">
            {Object.values(templates).map((categoryConfig) => {
              if (!categoryConfig || !categoryConfig.category) return null;
              const categoryInfo = CATEGORY_INFO[categoryConfig.category] || { icon: '💬', description: 'Template category' };
              const templateCount = Array.isArray(categoryConfig.templates) ? categoryConfig.templates.length : 0;
              return (
                <button
                  key={categoryConfig.category}
                  onClick={() => handleCategorySelect(categoryConfig.category)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border-2 border-border",
                    "hover:border-primary/50 hover:bg-muted/50",
                    "transition-all touch-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{categoryInfo.icon}</span>
                        <h3 className="font-semibold text-foreground">{categoryConfig.displayName || categoryConfig.category}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {categoryInfo.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {templateCount} template{templateCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-muted-foreground">
                      →
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Reset All Button */}
            <Button
              onClick={handleResetAll}
              variant="outline"
              className="w-full mt-4"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset All to Defaults
            </Button>
          </div>
        ) : (
          /* Template Editor */
          <div className="space-y-4">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => {
                if (hasChanges) {
                  if (window.confirm('You have unsaved changes. Are you sure you want to go back?')) {
                    setSelectedCategory(null);
                    setHasChanges(false);
                  }
                } else {
                  setSelectedCategory(null);
                }
              }}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Categories
            </Button>

            {/* Category Header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{(CATEGORY_INFO[selectedCategory] || {}).icon || '💬'}</span>
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedCategoryConfig?.displayName || selectedCategoryConfig?.category}</h2>
                <p className="text-sm text-muted-foreground">{(CATEGORY_INFO[selectedCategory] || {}).description || ''}</p>
              </div>
            </div>

            {/* Template Editor List */}
            <div className="space-y-6">
              {selectedCategoryConfig && Array.isArray(selectedCategoryConfig.templates) && selectedCategoryConfig.templates.map((template) => {
                if (!template || !template.id) return null;
                const key = `${selectedCategory}_${template.id}`;
                const currentMessage = editedTemplates[key] ?? String(template.message || '');

                return (
                  <div
                    key={template.id}
                    className="p-4 rounded-lg border-2 border-border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Label htmlFor={key} className="font-semibold text-foreground">
                        {template.name}
                        {template.isDefault && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            Default
                          </span>
                        )}
                      </Label>
                    </div>
                    <Textarea
                      id={key}
                      value={currentMessage}
                      onChange={(e) => handleTemplateChange(selectedCategory, template.id, e.target.value)}
                      className="min-h-[120px] font-mono text-sm"
                      placeholder="Enter your template message..."
                    />
                    <div className="text-xs text-muted-foreground">
                      <p className="mb-1">Available variables:</p>
                      <div className="flex flex-wrap gap-2">
                        <code className="px-2 py-1 bg-muted rounded">&#123;&#123;customer_name&#125;&#125;</code>
                        <code className="px-2 py-1 bg-muted rounded">&#123;&#123;customer_firstName&#125;&#125;</code>
                        <code className="px-2 py-1 bg-muted rounded">&#123;&#123;customer_addressLine1&#125;&#125;</code>
                        {selectedCategory === 'receipt' && (
                          <>
                            <code className="px-2 py-1 bg-muted rounded">&#123;&#123;job_total&#125;&#125;</code>
                            <code className="px-2 py-1 bg-muted rounded">&#123;&#123;photo_url&#125;&#125;</code>
                          </>
                        )}
                        {selectedCategory !== 'receipt' && (
                          <code className="px-2 py-1 bg-muted rounded">&#123;&#123;price&#125;&#125;</code>
                        )}
                        <code className="px-2 py-1 bg-muted rounded">&#123;&#123;business_name&#125;&#125;</code>
                        {selectedCategory === 'direct_debit_invite' && (
                          <code className="px-2 py-1 bg-muted rounded">&#123;&#123;dd_link&#125;&#125;</code>
                        )}
                        {selectedCategory === 'tomorrow_reminder' && (
                          <code className="px-2 py-1 bg-muted rounded">&#123;&#123;scheduled_date&#125;&#125;</code>
                        )}
                        {selectedCategory === 'unpaid_reminder' && (
                          <code className="px-2 py-1 bg-muted rounded">&#123;&#123;completed_date&#125;&#125;</code>
                        )}
                        {selectedCategory === 'referral' && (
                          <code className="px-2 py-1 bg-muted rounded">&#123;&#123;referral_code&#125;&#125;</code>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Default
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1"
                disabled={!hasChanges}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default SMSTemplates;
