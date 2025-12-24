/**
 * Error message utilities
 * Provides user-friendly, actionable error messages
 */

export interface ErrorContext {
  operation?: string;
  entity?: string;
  field?: string;
}

/**
 * Convert technical error messages into user-friendly, actionable messages
 */
export function getUserFriendlyError(error: unknown, context?: ErrorContext): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
    return 'Network connection error. Please check your internet connection and try again.';
  }

  // Authentication errors
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('not authenticated')) {
    return 'Your session has expired. Please sign in again.';
  }

  if (lowerMessage.includes('session') && lowerMessage.includes('expired')) {
    return 'Your session has expired. Please sign in again.';
  }

  // Rate limiting
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Validation errors
  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
    if (context?.field) {
      return `Invalid ${context.field}. Please check and try again.`;
    }
    return 'Invalid data. Please check your input and try again.';
  }

  // Not found errors
  if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist')) {
    if (context?.entity) {
      return `${context.entity} not found. It may have been deleted.`;
    }
    return 'Item not found. It may have been deleted.';
  }

  // Already exists errors
  if (lowerMessage.includes('already exists') || lowerMessage.includes('duplicate')) {
    if (context?.entity) {
      return `This ${context.entity.toLowerCase()} already exists.`;
    }
    return 'This item already exists.';
  }

  // Permission errors
  if (lowerMessage.includes('permission') || lowerMessage.includes('forbidden') || lowerMessage.includes('not allowed')) {
    return 'You do not have permission to perform this action.';
  }

  // Database errors (generic)
  if (lowerMessage.includes('database') || lowerMessage.includes('sql') || lowerMessage.includes('constraint')) {
    return 'A database error occurred. Please try again. If the problem persists, contact support.';
  }

  // Job completion limit
  if (lowerMessage.includes('limit reached') || lowerMessage.includes('upgrade to continue')) {
    return 'You have reached the free job limit. Upgrade to continue completing jobs.';
  }

  // GoCardless errors
  if (lowerMessage.includes('gocardless') || lowerMessage.includes('direct debit')) {
    if (lowerMessage.includes('not connected') || lowerMessage.includes('not configured')) {
      return 'Direct Debit is not connected. Please connect GoCardless in Settings.';
    }
    if (lowerMessage.includes('expired') || lowerMessage.includes('reconnect')) {
      return 'Your Direct Debit connection has expired. Please reconnect in Settings.';
    }
    if (lowerMessage.includes('mandate') && lowerMessage.includes('active')) {
      return 'Customer does not have an active Direct Debit mandate.';
    }
    return 'Direct Debit error. Please check your connection in Settings and try again.';
  }

  // Stripe/subscription errors
  if (lowerMessage.includes('stripe') || lowerMessage.includes('subscription') || lowerMessage.includes('payment')) {
    if (lowerMessage.includes('card') || lowerMessage.includes('payment method')) {
      return 'Payment method error. Please update your payment method in Settings.';
    }
    return 'Payment error. Please try again or contact support.';
  }

  // Timeout errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return 'Request timed out. Please try again.';
  }

  // Service unavailable
  if (lowerMessage.includes('service unavailable') || lowerMessage.includes('503')) {
    return 'Service is temporarily unavailable. Please try again in a few moments.';
  }

  // Generic 500 errors
  if (lowerMessage.includes('500') || lowerMessage.includes('internal server error')) {
    return 'Server error. Please try again. If the problem persists, contact support.';
  }

  // Generic 400 errors
  if (lowerMessage.includes('400') || lowerMessage.includes('bad request')) {
    return 'Invalid request. Please check your input and try again.';
  }

  // If we have context, add it to generic errors
  if (context?.operation) {
    return `${context.operation} failed. ${errorMessage}. Please try again.`;
  }

  // Default: return the error message but truncate if too long
  if (errorMessage.length > 200) {
    return errorMessage.substring(0, 200) + '...';
  }

  return errorMessage || 'An unexpected error occurred. Please try again.';
}

/**
 * Get actionable error message with suggested next steps
 */
export function getActionableError(error: unknown, context?: ErrorContext): {
  message: string;
  action?: string;
  actionLabel?: string;
} {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // GoCardless not connected
  if (lowerMessage.includes('gocardless') && (lowerMessage.includes('not connected') || lowerMessage.includes('not configured'))) {
    return {
      message: 'Direct Debit is not connected.',
      action: '/settings',
      actionLabel: 'Go to Settings',
    };
  }

  // GoCardless expired
  if (lowerMessage.includes('gocardless') && (lowerMessage.includes('expired') || lowerMessage.includes('reconnect'))) {
    return {
      message: 'Your Direct Debit connection has expired.',
      action: '/settings',
      actionLabel: 'Reconnect in Settings',
    };
  }

  // Limit reached
  if (lowerMessage.includes('limit reached') || lowerMessage.includes('upgrade to continue')) {
    return {
      message: 'You have reached the free job limit.',
      action: '/settings',
      actionLabel: 'Upgrade Now',
    };
  }

  // Session expired
  if (lowerMessage.includes('session') && lowerMessage.includes('expired')) {
    return {
      message: 'Your session has expired.',
      action: '/auth',
      actionLabel: 'Sign In',
    };
  }

  // Default
  return {
    message: getUserFriendlyError(error, context),
  };
}

