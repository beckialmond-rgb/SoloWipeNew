import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface TemplateNameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Dialog for entering template name when saving an assignment template
 */
export function TemplateNameDialog({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}: TemplateNameDialogProps) {
  const [templateName, setTemplateName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTemplateName('');
      setError(null);
    }
  }, [isOpen]);

  const handleSave = async () => {
    const trimmed = templateName.trim();
    
    if (!trimmed) {
      setError('Template name cannot be empty');
      return;
    }
    
    if (trimmed.length > 100) {
      setError('Template name must be 100 characters or less');
      return;
    }
    
    setError(null);
    
    try {
      await onSave(trimmed);
      onClose();
    } catch (err) {
      // Error handling is done in the parent component
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Give this template a name so you can quickly apply it to multiple jobs later.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Input
            value={templateName}
            onChange={(e) => {
              setTemplateName(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Team A Morning Round"
            disabled={isLoading}
            autoFocus
            maxLength={100}
          />
          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !templateName.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

