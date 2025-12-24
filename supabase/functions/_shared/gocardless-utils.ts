/**
 * GoCardless Integration Utilities
 * Shared utilities for all GoCardless edge functions
 * Implements best practices: retry logic, error handling, validation
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
}

/**
 * Retry a function with exponential backoff
 * Best practice: Handle transient failures gracefully
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    retryableStatuses = [429, 500, 502, 503, 504],
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Check if error explicitly marks itself as non-retryable
      if (error instanceof Error && (error as any).isRetryable === false) {
        logError('RETRY_LOGIC', error, { attempt, maxRetries, reason: 'Error marked as non-retryable' });
        throw error;
      }

      // Check if error is retryable based on status code
      const isRetryableByStatus = error instanceof Error && 
        ('status' in error || 'response' in error) &&
        (retryableStatuses.includes((error as any).status) || 
         retryableStatuses.includes((error as any).response?.status));

      // Check if error is explicitly marked as retryable (timeout, network error)
      const isRetryableByFlag = error instanceof Error && (error as any).isRetryable === true;

      const isRetryable = isRetryableByStatus || isRetryableByFlag;

      // Don't retry on last attempt or if error is not retryable
      if (attempt === maxRetries || !isRetryable) {
        if (attempt === maxRetries) {
          logError('RETRY_LOGIC', error, { attempt, maxRetries, reason: 'Max retries reached' });
        } else {
          logError('RETRY_LOGIC', error, { attempt, maxRetries, reason: 'Error not retryable' });
        }
        throw error;
      }

      // Log retry attempt
      logInfo('RETRY_LOGIC', `Retrying after ${delay}ms`, { attempt: attempt + 1, maxRetries, delay });

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Validate UUID format
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Validate amount (must be positive and within reasonable limits)
 */
export function isValidAmount(amount: unknown): amount is number {
  return typeof amount === 'number' && 
         !isNaN(amount) && 
         isFinite(amount) && 
         amount > 0 && 
         amount <= 100000; // Max £100,000 per payment
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(str: unknown, maxLength: number = 100): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>"'&]/g, '')
    .slice(0, maxLength)
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      ...details,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Log structured error for monitoring
 */
export function logError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
): void {
  const errorDetails = {
    context,
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : String(error),
    ...metadata,
  };

  console.error(`[${context}] ERROR:`, JSON.stringify(errorDetails, null, 2));
}

/**
 * Log structured info for monitoring
 */
export function logInfo(
  context: string,
  message: string,
  metadata?: Record<string, unknown>
): void {
  const logData = {
    context,
    timestamp: new Date().toISOString(),
    message,
    ...metadata,
  };

  console.log(`[${context}] INFO:`, JSON.stringify(logData, null, 2));
}

/**
 * Get encryption key for token encryption/decryption
 * Best practice: Use PBKDF2 with high iteration count
 */
export async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('SERVICE_ROLE_KEY');
  if (!secret) {
    throw new Error('SERVICE_ROLE_KEY environment variable is required for encryption');
  }
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret.slice(0, 32).padEnd(32, '0')),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('gocardless-token-salt'),
      iterations: 100000, // High iteration count for security
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt GoCardless access token
 * Best practice: AES-GCM with random IV
 */
export async function encryptToken(token: string): Promise<string> {
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for GCM
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(token)
  );
  
  // Combine IV and encrypted data, then base64 encode
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt GoCardless access token
 * Best practice: Support legacy tokens for migration
 */
export async function decryptToken(encrypted: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const decoder = new TextDecoder();
    
    // Decode base64
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    
    // Extract IV (first 12 bytes) and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );
    
    return decoder.decode(decrypted);
  } catch (error) {
    // Fallback for legacy Base64 encoded tokens (migration support)
    console.log('[GC-UTILS] Attempting legacy token decryption');
    try {
      const decoded = atob(encrypted);
      if (decoded.startsWith('gc_token_')) {
        return decoded.replace('gc_token_', '');
      }
    } catch {
      // Not a legacy token either
    }
    throw new Error('Failed to decrypt token');
  }
}

/**
 * Create a timeout promise that rejects after specified milliseconds
 */
function createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

/**
 * Make GoCardless API request with retry logic, timeout, and network failure handling
 * Best practice: Retry transient failures, validate responses, handle timeouts
 */
export async function makeGoCardlessRequest(
  url: string,
  options: RequestInit,
  accessToken: string,
  retryOptions?: RetryOptions & { timeout?: number }
): Promise<Response> {
  const environment = Deno.env.get('GOCARDLESS_ENVIRONMENT') || 'sandbox';
  const apiUrl = environment === 'live'
    ? 'https://api.gocardless.com'
    : 'https://api-sandbox.gocardless.com';

  const fullUrl = url.startsWith('http') ? url : `${apiUrl}${url}`;
  const timeoutMs = retryOptions?.timeout || 30000; // Default 30 seconds

  return retryWithBackoff(async () => {
    try {
      // Race between fetch and timeout
      const fetchPromise = fetch(fullUrl, {
        ...options,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'GoCardless-Version': '2015-07-06',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const response = await Promise.race([
        fetchPromise,
        createTimeoutPromise(timeoutMs),
      ]);

      // Throw error for non-2xx responses to trigger retry logic
      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`GoCardless API error: ${response.status} ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).response = { status: response.status, body: errorText };
        
        // Don't retry on 4xx errors (except 429 rate limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          (error as any).isRetryable = false;
        }
        
        throw error;
      }

      return response;
    } catch (error: unknown) {
      // Handle network errors and timeouts
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          const timeoutError = new Error('GoCardless API request timed out');
          (timeoutError as any).isRetryable = true;
          (timeoutError as any).isTimeout = true;
          throw timeoutError;
        }
        
        // Network errors are retryable
        if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
          const networkError = new Error('Network error connecting to GoCardless');
          (networkError as any).isRetryable = true;
          (networkError as any).isNetworkError = true;
          throw networkError;
        }
      }
      
      throw error;
    }
  }, retryOptions);
}

/**
 * Validate GoCardless access token by making a test API call
 * Best practice: Validate tokens before use to provide better error messages
 */
export async function validateGoCardlessToken(accessToken: string): Promise<boolean> {
  try {
    const response = await makeGoCardlessRequest('/creditors', {
      method: 'GET',
    }, accessToken, {
      maxRetries: 1, // Only one retry for validation
      initialDelay: 500,
    });

    return response.ok;
  } catch (error) {
    logError('TOKEN_VALIDATION', error);
    return false;
  }
}

/**
 * CORS headers with security best practices
 */
export function getCorsHeaders(origin?: string | null): Record<string, string> {
  // In production, restrict to specific origins
  // For now, allow all origins but log for monitoring
  const allowedOrigin = origin || '*';
  
  if (origin && !origin.includes('localhost') && !origin.includes('solowipe.co.uk')) {
    logInfo('CORS', `Request from unexpected origin: ${origin}`);
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-signature',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
  };
}

