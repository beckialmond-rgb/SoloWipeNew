import { useState, useMemo, useEffect } from 'react';
import { Search, UserPlus, Check, X, Plus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { JobAssignmentWithUser } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { getUserFriendlyError } from '@/lib/errorMessages';

interface Helper {
  id: string;
  email: string;
  name?: string;
  initials: string;
  isPlaceholder?: boolean; // True if helper hasn't signed up yet
}

interface HelperListProps {
  helpers: Helper[];
  currentAssignments?: JobAssignmentWithUser[];
  selectedHelperIds?: Set<string>;
  onToggleHelper?: (helperId: string) => void;
  onSelect?: (helperId: string) => void; // Legacy single-select
  onUnassign?: (userId?: string) => void;
  onAssignToMe?: () => void;
  onCreateHelper?: (name: string, email?: string) => Promise<Helper>;
  onRemoveHelper?: (helperId: string) => Promise<void>;
  currentUserId?: string;
  isLoading?: boolean;
  recentlyCreatedHelperIds?: Set<string>; // Track recently created helpers for better UX
}

export function HelperList({
  helpers,
  currentAssignments = [],
  selectedHelperIds = new Set(),
  onToggleHelper,
  onSelect,
  onUnassign,
  onAssignToMe,
  onCreateHelper,
  onRemoveHelper,
  currentUserId,
  isLoading = false,
  recentlyCreatedHelperIds = new Set()
}: HelperListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [helperEmail, setHelperEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [removingHelperId, setRemovingHelperId] = useState<string | null>(null);
  const [showEmailField, setShowEmailField] = useState(false);
  const { toast } = useToast();
  
  // Detect if search query looks like an email
  const isEmailLike = (text: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
  };
  
  // Auto-detect email from search query (memoized to prevent unnecessary recalculations)
  const detectedEmail = useMemo(() => {
    return isEmailLike(searchQuery) ? searchQuery.trim().toLowerCase() : '';
  }, [searchQuery]);
  
  const detectedName = useMemo(() => {
    return detectedEmail ? searchQuery.split('@')[0].trim() : searchQuery.trim();
  }, [searchQuery, detectedEmail]);

  // Filter helpers by search query (improved to search email prefix too)
  // Memoized for performance
  const filteredHelpers = useMemo(() => {
    if (!searchQuery.trim()) return helpers;
    
    const query = searchQuery.toLowerCase();
    return helpers.filter(helper => {
      const email = helper.email.toLowerCase();
      const name = helper.name?.toLowerCase() || '';
      const emailPrefix = email.split('@')[0];
      
      return (
        email.includes(query) ||
        name.includes(query) ||
        emailPrefix.includes(query) ||
        helper.initials.toLowerCase().includes(query)
      );
    });
  }, [helpers, searchQuery]);

  // Get initials from email or name
  const getInitials = (email: string, name?: string): string => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    // Extract initials from email (before @)
    const emailPart = email.split('@')[0];
    if (emailPart.length >= 2) {
      return emailPart.slice(0, 2).toUpperCase();
    }
    return emailPart[0]?.toUpperCase() || '?';
  };

  const isAssigned = (helperId: string) => {
    return currentAssignments.some(a => a.assigned_to_user_id === helperId);
  };

  const isSelected = (helperId: string) => {
    return selectedHelperIds.has(helperId);
  };

  const handleHelperClick = (helperId: string) => {
    if (onToggleHelper) {
      // Multi-select mode
      onToggleHelper(helperId);
    } else if (onSelect) {
      // Legacy single-select mode
      if (isAssigned(helperId) && onUnassign) {
        onUnassign(helperId);
      } else {
        onSelect(helperId);
      }
    }
  };

  const handleCreateHelper = async () => {
    if (!onCreateHelper || !detectedName || isCreating) return;
    
    setIsCreating(true);
    try {
      // Use provided email OR detected email OR empty
      const emailToUse = helperEmail.trim() || detectedEmail || undefined;
      const nameToUse = detectedName;
      
      const newHelper = await onCreateHelper(nameToUse, emailToUse);
      // Auto-select the newly created helper
      if (onToggleHelper) {
        onToggleHelper(newHelper.id);
      }
      // Clear search and email to show the new helper in the list
      setSearchQuery('');
      setHelperEmail('');
      setShowEmailField(false);
    } catch (error) {
      console.error('Failed to create helper:', error);
      const friendlyError = getUserFriendlyError(error, { 
        operation: 'Adding helper',
        entity: 'helper'
      });
      // Show error toast (parent also shows one, but this ensures it's shown)
      toast({
        title: 'Failed to add helper',
        description: friendlyError,
        variant: 'destructive',
      });
      // Don't re-throw - error is handled
    } finally {
      setIsCreating(false);
    }
  };

  const handleRemoveHelper = async (helperId: string, helperName: string) => {
    if (!onRemoveHelper || removingHelperId) return;
    
    setRemovingHelperId(helperId);
    try {
      await onRemoveHelper(helperId);
      // Remove from selection if selected
      if (onToggleHelper && selectedHelperIds.has(helperId)) {
        onToggleHelper(helperId);
      }
      toast({
        title: 'Helper removed',
        description: `${helperName} has been removed from your team.`,
      });
    } catch (error) {
      console.error('Failed to remove helper:', error);
      const friendlyError = getUserFriendlyError(error, { 
        operation: 'Removing helper',
        entity: 'helper'
      });
      toast({
        title: 'Failed to remove helper',
        description: friendlyError,
        variant: 'destructive',
      });
    } finally {
      setRemovingHelperId(null);
    }
  };

  const showAddButton = detectedName.length > 0 && 
    filteredHelpers.length === 0 && 
    onCreateHelper &&
    !isLoading;
  
  // Auto-show email field if email detected in search
  useEffect(() => {
    if (detectedEmail && showAddButton) {
      setShowEmailField(true);
      // Set email if field is empty or matches detected email (allows user to edit)
      setHelperEmail(prev => prev || detectedEmail);
    } else if (!showAddButton && !searchQuery.trim()) {
      // Only reset if search is completely cleared
      setShowEmailField(false);
      setHelperEmail('');
    }
  }, [detectedEmail, showAddButton, searchQuery]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          id="helper-search-input"
          name="helper-search"
          type="text"
          placeholder="Search helpers or type name/email to add..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-sm"
        />
      </div>

      {/* Helper list */}
      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Loading helpers...
          </div>
        ) : (
          <>
            {/* "Add as new helper" section - shows when search has no results */}
            {showAddButton && (
              <div className="space-y-3 p-3 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <div className="font-medium text-primary mb-1">
                        {isCreating ? 'Adding helper...' : `Add "${detectedName}" as new helper`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {detectedEmail 
                          ? `Email detected: ${detectedEmail}. You can edit it below.`
                          : 'Add their email (optional but recommended for better matching)'}
                      </div>
                    </div>
                    
                    {/* Email input field */}
                    <div className="space-y-1">
                      <label htmlFor="helper-email-input" className="text-xs font-medium text-foreground">
                        Email Address {detectedEmail ? '(detected)' : '(optional)'}
                      </label>
                      <input
                        id="helper-email-input"
                        name="helper-email"
                        type="email"
                        placeholder="helper@example.com"
                        value={helperEmail}
                        onChange={(e) => setHelperEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                        disabled={isCreating}
                      />
                      {detectedEmail && !helperEmail && (
                        <p className="text-xs text-muted-foreground">
                          💡 Email detected from search. Click "Add Helper" to use it, or enter a different email.
                        </p>
                      )}
                      {!detectedEmail && (
                        <p className="text-xs text-muted-foreground">
                          💡 Adding an email makes it easier to match helpers when they sign up. You can skip this and add it later.
                        </p>
                      )}
                    </div>
                    
                    {/* Add button */}
                    <Button
                      onClick={handleCreateHelper}
                      disabled={isCreating || !detectedName}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      size="sm"
                    >
                      {isCreating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Helper
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state - only show if no search query */}
            {filteredHelpers.length === 0 && !showAddButton && (
              <div className="text-center py-8 space-y-3">
                <p className="text-muted-foreground text-sm font-medium">
                  {searchQuery ? 'No helpers found' : 'No helpers available'}
                </p>
                {!searchQuery && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Type a name above to add a new helper to your team.</p>
                    <p className="text-muted-foreground/80">
                      New helpers will need to sign up before you can assign jobs to them.
                    </p>
                    {onAssignToMe && (
                      <p>Or use "Assign to me" to complete the job yourself.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Assign to me option */}
            {onAssignToMe && currentUserId && filteredHelpers.length > 0 && (
              <button
                onClick={onAssignToMe}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                  isSelected(currentUserId)
                    ? "bg-primary/10 border-primary hover:bg-primary/20"
                    : "hover:bg-muted/50 hover:border-primary/50 border-border",
                  "text-left w-full"
                )}
              >
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials('', 'Me')}
                    </AvatarFallback>
                  </Avatar>
                  {isSelected(currentUserId) && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">Assign to me</div>
                  <div className="text-sm text-muted-foreground">I'll complete this job</div>
                </div>
              </button>
            )}

            {/* Helper items */}
            {filteredHelpers.map((helper) => {
              const assigned = isAssigned(helper.id);
              const selected = isSelected(helper.id);
              const isCurrentUser = helper.id === currentUserId;
              const isPlaceholder = helper.isPlaceholder || helper.email.endsWith('@temp.helper');
              const isRecentlyCreated = recentlyCreatedHelperIds.has(helper.id);
              const canRemove = onRemoveHelper && (isPlaceholder || isRecentlyCreated) && !isCurrentUser;
              const isRemoving = removingHelperId === helper.id;

              return (
                <div
                  key={helper.id}
                  className={cn(
                    "flex items-center gap-2 group",
                    isRecentlyCreated && "animate-in fade-in slide-in-from-top-2 duration-300"
                  )}
                >
                  <button
                    onClick={() => handleHelperClick(helper.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 transition-all flex-1",
                      assigned
                        ? "bg-primary/10 border-primary hover:bg-primary/20" // Currently assigned
                        : selected
                        ? "bg-primary/5 border-primary/50 hover:bg-primary/10" // Selected but not assigned
                        : "hover:bg-muted/50 hover:border-primary/50 border-border", // Not selected
                      "text-left relative",
                      isPlaceholder && "opacity-90", // Slightly dim placeholder helpers
                      isRemoving && "opacity-50 pointer-events-none"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className={cn(
                          assigned ? "bg-primary text-primary-foreground" : selected ? "bg-primary/70 text-primary-foreground" : "bg-muted"
                        )}>
                          {helper.initials || getInitials(helper.email, helper.name)}
                        </AvatarFallback>
                      </Avatar>
                      {assigned && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background" title="Currently assigned">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      {selected && !assigned && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary/50 rounded-full flex items-center justify-center border-2 border-background" title="Selected">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate flex items-center gap-2">
                        {helper.name || helper.email.split('@')[0]}
                        {isCurrentUser && ' (You)'}
                        {isPlaceholder && (
                          <span 
                            className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded border border-border"
                            title="This helper needs to sign up before receiving job assignments"
                          >
                            Pending Signup
                          </span>
                        )}
                        {isRecentlyCreated && !isPlaceholder && (
                          <span 
                            className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded border border-green-500/20"
                            title="Recently added"
                          >
                            New
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {helper.email}
                      </div>
                    </div>
                    {assigned && onUnassign && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnassign(helper.id);
                        }}
                        title="Remove assignment"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </button>
                  {/* Remove helper button - shows for placeholders and recently created */}
                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                        isRemoving && "opacity-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveHelper(helper.id, helper.name || helper.email.split('@')[0]);
                      }}
                      disabled={isRemoving}
                      title={`Remove ${helper.name || 'helper'} from team`}
                    >
                      {isRemoving ? (
                        <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <X className="w-4 h-4 text-destructive" />
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
