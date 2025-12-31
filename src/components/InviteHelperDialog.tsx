import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Form validation schema
const inviteHelperSchema = z.object({
  helperEmail: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  helperName: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim().length > 0,
      'Name cannot be empty if provided'
    ),
});

type InviteHelperFormData = z.infer<typeof inviteHelperSchema>;

interface InviteHelperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent?: () => void; // Callback to refresh helper list
}

export function InviteHelperDialog({
  open,
  onOpenChange,
  onInviteSent,
}: InviteHelperDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<InviteHelperFormData>({
    resolver: zodResolver(inviteHelperSchema),
    mode: 'onChange',
    defaultValues: {
      helperEmail: '',
      helperName: '',
    },
  });

  const onSubmit = async (data: InviteHelperFormData) => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      // Let Supabase client automatically include auth token
      // The client handles authentication internally from the current session
      const { data: result, error } = await supabase.functions.invoke(
        'invite-helper',
        {
          body: {
            helperEmail: data.helperEmail.trim().toLowerCase(),
            helperName: data.helperName?.trim() || undefined,
          },
        }
      );

      // Improved error extraction for non-2xx responses
      if (error) {
        console.error('[InviteHelperDialog] Supabase error:', error);
        
        // Extract error message from FunctionsHttpError
        const errorObj = error as any;
        let errorMessage: string | null = null;
        
        // Check response body for error message (function's error response)
        if (errorObj?.context?.body?.error) {
          errorMessage = typeof errorObj.context.body.error === 'string' 
            ? errorObj.context.body.error 
            : JSON.stringify(errorObj.context.body.error);
        } else if (result?.error) {
          // Function returned error in response data
          errorMessage = typeof result.error === 'string' ? result.error : 'Failed to send invitation';
        } else if (errorObj?.message && !errorObj.message.includes('non-2xx')) {
          // Use error message if it's not the generic "non-2xx" message
          errorMessage = errorObj.message;
        }
        
        // Extract status code for better error messages
        const statusCode = errorObj?.context?.status || errorObj?.context?.response?.status;
        console.error('[InviteHelperDialog] Error details:', { 
          statusCode, 
          errorMessage, 
          errorContext: errorObj?.context 
        });
        
        // Use extracted message or provide status-specific message
        if (errorMessage) {
          throw new Error(errorMessage);
        } else if (statusCode === 401) {
          throw new Error('Authentication failed. Please sign in again.');
        } else if (statusCode === 403) {
          throw new Error('Permission denied. Only business owners can invite helpers.');
        } else if (statusCode === 400) {
          throw new Error('Invalid request. Please check the email address and try again.');
        } else if (statusCode === 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(`Failed to send invitation (${statusCode || 'unknown error'}). Please try again.`);
        }
      }

      // Check for error in response data (non-2xx responses)
      if (result?.error) {
        const errorMessage =
          typeof result.error === 'string'
            ? result.error
            : 'Failed to send invitation';
        throw new Error(errorMessage);
      }

      if (!result?.success) {
        throw new Error('Failed to send invitation. Please try again.');
      }

      // Success!
      toast({
        title: 'Invitation sent!',
        description: `An invitation has been sent to ${data.helperEmail}. They'll receive an email with a link to join your team.`,
      });

      // Reset form and close dialog
      reset();
      onOpenChange(false);

      // Refresh helper list if callback provided
      if (onInviteSent) {
        onInviteSent();
      }
    } catch (error) {
      console.error('[InviteHelperDialog] Failed to send invite:', error);

      // User-friendly error messages
      let errorTitle = 'Failed to send invitation';
      let errorDescription =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred. Please try again.';

      if (
        errorDescription.toLowerCase().includes('already registered') ||
        errorDescription.toLowerCase().includes('already exists')
      ) {
        errorTitle = 'Helper already exists';
        errorDescription =
          'This email is already registered as a helper. You can assign jobs to them directly.';
      } else if (
        errorDescription.toLowerCase().includes('not an owner') ||
        errorDescription.toLowerCase().includes('only owners')
      ) {
        errorTitle = 'Permission denied';
        errorDescription =
          'Only business owners can invite helpers. Please contact support if you believe this is an error.';
      } else if (
        errorDescription.toLowerCase().includes('network') ||
        errorDescription.toLowerCase().includes('fetch')
      ) {
        errorTitle = 'Connection problem';
        errorDescription =
          'Unable to connect to our servers. Please check your internet connection and try again.';
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return; // Prevent closing while submitting
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Helper
          </DialogTitle>
          <DialogDescription>
            Send an invitation email to a helper. They'll receive a magic link
            to sign up and join your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="helper-email">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="helper-email"
                type="email"
                placeholder="helper@example.com"
                className={errors.helperEmail ? 'border-destructive' : ''}
                {...register('helperEmail')}
                disabled={isLoading}
              />
            </div>
            {errors.helperEmail && (
              <p className="text-sm text-destructive">
                {errors.helperEmail.message}
              </p>
            )}
          </div>

          {/* Name Input (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="helper-name">
              Name <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="helper-name"
              type="text"
              placeholder="John Doe"
              className={errors.helperName ? 'border-destructive' : ''}
              {...register('helperName')}
              disabled={isLoading}
            />
            {errors.helperName && (
              <p className="text-sm text-destructive">
                {errors.helperName.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Adding a name helps identify helpers in your team list.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !isValid}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

