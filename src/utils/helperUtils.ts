/**
 * Helper Utility Functions
 * 
 * Centralized utilities for helper-related operations including:
 * - Placeholder helper detection
 * - Helper status determination
 * - Validation functions
 */

export type HelperStatus = 
  | 'active'           // Helper is active and billing
  | 'inactive'         // Helper is inactive (billing stopped)
  | 'pending_invite'   // Invite sent but not accepted
  | 'pending_signup';  // Placeholder helper, needs to sign up

export interface HelperStatusInfo {
  status: HelperStatus;
  isPlaceholder: boolean;
  hasPendingInvite: boolean;
  isActive: boolean;
}

/**
 * Determines if a helper is a placeholder (hasn't signed up yet)
 * 
 * A placeholder helper:
 * - Exists in team_members table
 * - Has a helper_id that may not exist in auth.users
 * - May have a temp email (@temp.helper) or real email
 * 
 * @param helperId - The helper's user ID
 * @param helperEmail - The helper's email address
 * @param hasAuthUser - Whether the helper exists in auth.users
 * @returns true if helper is a placeholder
 */
export function isPlaceholderHelper(
  helperId: string | null,
  helperEmail: string | null,
  hasAuthUser: boolean = false
): boolean {
  // If helper has no ID, they're definitely a placeholder
  if (!helperId) {
    return true;
  }

  // If helper doesn't exist in auth.users, they're a placeholder
  if (!hasAuthUser) {
    return true;
  }

  // If email ends with @temp.helper, they're a placeholder
  if (helperEmail?.endsWith('@temp.helper')) {
    return true;
  }

  return false;
}

/**
 * Determines helper status based on various flags
 * 
 * @param isActive - Whether helper billing is active
 * @param billingStartedAt - When billing started (null if never started)
 * @param billingStoppedAt - When billing stopped (null if active)
 * @param hasPendingInvite - Whether invite was sent but not accepted
 * @param isPlaceholder - Whether helper is a placeholder (hasn't signed up)
 * @returns Helper status information
 */
export function getHelperStatus(
  isActive: boolean,
  billingStartedAt: string | null,
  billingStoppedAt: string | null,
  hasPendingInvite: boolean,
  isPlaceholder: boolean
): HelperStatusInfo {
  // If placeholder and has pending invite, status is pending_invite
  if (isPlaceholder && hasPendingInvite) {
    return {
      status: 'pending_invite',
      isPlaceholder: true,
      hasPendingInvite: true,
      isActive: false,
    };
  }

  // If placeholder but no invite, status is pending_signup
  if (isPlaceholder) {
    return {
      status: 'pending_signup',
      isPlaceholder: true,
      hasPendingInvite: false,
      isActive: false,
    };
  }

  // If not active, status is inactive
  if (!isActive) {
    return {
      status: 'inactive',
      isPlaceholder: false,
      hasPendingInvite: false,
      isActive: false,
    };
  }

  // Active helper
  return {
    status: 'active',
    isPlaceholder: false,
    hasPendingInvite: false,
    isActive: true,
  };
}

/**
 * Gets a human-readable label for helper status
 * 
 * @param status - The helper status
 * @returns Human-readable label
 */
export function getHelperStatusLabel(status: HelperStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'pending_invite':
      return 'Pending Invite';
    case 'pending_signup':
      return 'Pending Signup';
    default:
      return 'Unknown';
  }
}

/**
 * Gets a color variant for helper status badge
 * 
 * @param status - The helper status
 * @returns Color variant for badge component
 */
export function getHelperStatusBadgeVariant(status: HelperStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'inactive':
      return 'secondary';
    case 'pending_invite':
      return 'outline';
    case 'pending_signup':
      return 'outline';
    default:
      return 'secondary';
  }
}

/**
 * Validates that a helper can be assigned to a job
 * 
 * @param isActive - Whether helper billing is active
 * @param isPlaceholder - Whether helper is a placeholder
 * @returns Object with validation result and error message if invalid
 */
export function validateHelperAssignment(
  isActive: boolean,
  isPlaceholder: boolean
): { valid: boolean; error?: string } {
  if (isPlaceholder) {
    return {
      valid: false,
      error: 'This helper needs to sign up first before you can assign jobs. They\'re already added to your team! Once they create an account, you\'ll be able to assign jobs immediately.',
    };
  }

  if (!isActive) {
    return {
      valid: false,
      error: 'This helper is inactive and cannot be assigned to jobs. Please activate them first.',
    };
  }

  return { valid: true };
}

/**
 * Formats helper name for display
 * 
 * @param name - Helper's name (may be null)
 * @param email - Helper's email (fallback if name is null)
 * @returns Formatted name for display
 */
export function formatHelperName(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) {
    return name.trim();
  }

  if (email) {
    // Extract name from email (part before @)
    const emailPart = email.split('@')[0];
    // Capitalize first letter
    return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
  }

  return 'Unknown Helper';
}

/**
 * Gets helper initials for avatar display
 * 
 * @param name - Helper's name (may be null)
 * @param email - Helper's email (fallback if name is null)
 * @returns Initials (max 2 characters)
 */
export function getHelperInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      // First letter of first name + first letter of last name
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
    }
    // Single name - use first two letters
    return name.trim().toUpperCase().slice(0, 2);
  }

  if (email) {
    // Extract initials from email (part before @)
    const emailPart = email.split('@')[0];
    if (emailPart.length >= 2) {
      return emailPart.slice(0, 2).toUpperCase();
    }
    return emailPart[0]?.toUpperCase() || '?';
  }

  return '?';
}

