/**
 * SMS Template Picker Component
 * 
 * A "Ladder-Safe" bottom sheet that appears when user clicks an SMS button,
 * allowing them to choose from pre-written templates before sending.
 */

import { useState, useEffect } from 'react';
import { MessageSquare, Check, Copy } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  SMSTemplateCategory,
  SMSTemplateContext,
  SMSTemplate,
  DEFAULT_SMS_TEMPLATES,
} from '@/types/smsTemplates';
import {
  replaceTemplateVariables,
  getDefaultTemplateId,
} from '@/utils/smsTemplateUtils';
import { useSMSTemplates } from '@/hooks/useSMSTemplates';

interface SMSTemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  category: SMSTemplateCategory;
  context: SMSTemplateContext;
  onSelectTemplate: (message: string) => void;
}

export function SMSTemplatePicker({
  isOpen,
  onClose,
  category,
  context,
  onSelectTemplate,
}: SMSTemplatePickerProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [previewMessages, setPreviewMessages] = useState<Record<string, string>>({});
  const { templates } = useSMSTemplates();
  const { toast } = useToast();
  
  // Debug logging
  useEffect(() => {
    console.log('[SMSTemplatePicker] Props changed', {
      isOpen,
      category,
      hasContext: !!context,
      contextKeys: context ? Object.keys(context) : [],
    });
  }, [isOpen, category, context]);
  
  const categoryConfig = templates[category] || DEFAULT_SMS_TEMPLATES[category];
  const defaultTemplateId = categoryConfig && categoryConfig.defaultTemplateId 
    ? String(categoryConfig.defaultTemplateId)
    : (categoryConfig && Array.isArray(categoryConfig.templates) && categoryConfig.templates.length > 0 && categoryConfig.templates[0]?.id)
      ? String(categoryConfig.templates[0].id)
      : 'professional';

  // Reset selection when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplateId(null);
    }
  }, [isOpen]);

  // Generate preview messages when context changes
  useEffect(() => {
    if (!categoryConfig || !categoryConfig.templates || !Array.isArray(categoryConfig.templates)) return;
    
    try {
      const previews: Record<string, string> = {};
      categoryConfig.templates.forEach(template => {
        if (!template || !template.id) return;
        try {
          const templateMessage = String(template.message || '');
          previews[String(template.id)] = replaceTemplateVariables(templateMessage, context);
        } catch (error) {
          console.error(`[SMSTemplatePicker] Error generating preview for template ${template.id}:`, error);
          previews[String(template.id)] = String(template.message || ''); // Fallback to original template
        }
      });
      setPreviewMessages(previews);
    } catch (error) {
      console.error('[SMSTemplatePicker] Error generating previews:', error);
    }
  }, [category, context, categoryConfig]);

  // Set default selection when modal opens
  useEffect(() => {
    if (isOpen && !selectedTemplateId) {
      setSelectedTemplateId(defaultTemplateId);
    }
  }, [isOpen, defaultTemplateId, selectedTemplateId]);

  const handleSelectTemplate = (template: SMSTemplate) => {
    setSelectedTemplateId(template.id);
  };

  const handleSend = () => {
    if (!selectedTemplateId || !categoryConfig || !categoryConfig.templates || !Array.isArray(categoryConfig.templates)) return;
    
    try {
      const selectedTemplate = categoryConfig.templates.find(t => t && t.id && String(t.id) === String(selectedTemplateId));
      if (!selectedTemplate || !selectedTemplate.message) {
        console.error('[SMSTemplatePicker] Selected template not found:', selectedTemplateId);
        toast({
          title: 'Error',
          description: 'Template not found. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      const templateMessage = String(selectedTemplate.message || '');
      const finalMessage = replaceTemplateVariables(templateMessage, context);
      onSelectTemplate(finalMessage);
      onClose();
      
      // Show success feedback
      toast({
        title: 'SMS ready',
        description: 'Message prepared. Your SMS app will open now.',
      });
    } catch (error) {
      console.error('[SMSTemplatePicker] Error sending template:', error);
      toast({
        title: 'Error',
        description: 'Failed to prepare message. Please try again.',
        variant: 'destructive',
      });
      // Still close the picker even if there's an error
      onClose();
    }
  };

  const handleCopyMessage = async () => {
    if (!selectedTemplateId) return;
    const message = previewMessages[selectedTemplateId];
    if (message) {
      try {
        await navigator.clipboard.writeText(message);
        // Could add a toast here if needed
      } catch (error) {
        console.error('[SMSTemplatePicker] Error copying message:', error);
      }
    }
  };

  return (
    <Drawer 
      open={isOpen && !!category} 
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DrawerContent className="max-h-[90vh] overflow-hidden flex flex-col">
        <DrawerHeader className="text-left pb-3 flex-shrink-0">
          <DrawerTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="w-5 h-5" />
            Choose SMS Template
          </DrawerTitle>
          <DrawerDescription className="text-sm">
            {categoryConfig?.displayName || 'SMS Template'} - {categoryConfig?.description || 'Choose a message template'}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-2 space-y-3 overflow-y-auto flex-1 min-h-0">
          {categoryConfig && categoryConfig.templates && Array.isArray(categoryConfig.templates) ? categoryConfig.templates.map((template) => {
            if (!template || !template.id) return null;
            const isSelected = String(selectedTemplateId) === String(template.id);
            const preview = previewMessages[String(template.id)] || '';

            return (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={cn(
                  "w-full text-left p-4 rounded-lg border-2 transition-all",
                  "min-h-[60px] touch-manipulation", // 60px for ladder-safe tapping (larger than 44px minimum)
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "active:scale-[0.98] active:bg-primary/10", // Visual feedback on tap
                  isSelected
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className={cn(
                      "font-semibold",
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {String(template.name || '')}
                    </span>
                    {template.isDefault && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Default
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pl-7 break-words">
                  {preview && preview.trim() ? preview : (String(template.message || '').replace(/\{\{[^}]+\}\}/g, '[Missing Data]'))}
                </p>
                {preview && (
                  <div className="pl-7 mt-1.5">
                    <span className={cn(
                      "text-xs",
                      preview.length > 160 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                    )}>
                      {preview.length} character{preview.length !== 1 ? 's' : ''}
                      {preview.length > 160 && preview.length <= 320 && ' (2 messages)'}
                      {preview.length > 320 && ` (${Math.ceil(preview.length / 153)} messages)`}
                    </span>
                  </div>
                )}
              </button>
            );
          }) : (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <p>No templates available</p>
            </div>
          )}
        </div>

        <div className="px-4 pb-safe pt-3 border-t space-y-2 flex-shrink-0 bg-background">
          <div className="flex gap-2">
            <Button
              onClick={handleCopyMessage}
              variant="outline"
              className="flex-1 min-h-[44px] touch-manipulation"
              disabled={!selectedTemplateId}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Message
            </Button>
            <Button
              onClick={handleSend}
              className="flex-1 min-h-[44px] touch-manipulation"
              disabled={!selectedTemplateId}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Send SMS
            </Button>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full min-h-[44px] touch-manipulation"
          >
            Cancel
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

