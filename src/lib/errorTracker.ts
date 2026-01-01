// Error tracking utility for production monitoring
// Captures and logs errors with context for debugging
// Supports optional Sentry integration via VITE_SENTRY_DSN

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

interface TrackedError {
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: string;
  url: string;
  userAgent: string;
}

class ErrorTracker {
  private isEnabled: boolean;
  private errors: TrackedError[] = [];
  private maxErrors = 50;
  private sentryDsn: string | null = null;
  private sentryInitialized: boolean = false;

  constructor() {
    this.isEnabled = import.meta.env.PROD;
    this.sentryDsn = import.meta.env.VITE_SENTRY_DSN || null;
    this.setupGlobalHandlers();
    this.loadStoredErrors();
    this.initializeSentry();
  }

  private async initializeSentry() {
    // Only initialize Sentry if DSN is provided
    if (!this.sentryDsn) {
      return;
    }

    try {
      // Dynamic import to avoid bundling Sentry if not configured
      // Use catch to handle case where module doesn't exist
      const Sentry = await import('@sentry/react').catch(() => null);
      
      if (!Sentry) {
        console.warn('[ErrorTracker] @sentry/react not installed, skipping Sentry initialization');
        return;
      }
      
      Sentry.init({
        dsn: this.sentryDsn,
        environment: import.meta.env.MODE || 'production',
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
        tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        beforeSend(event, hint) {
          // Filter out known non-critical errors
          const error = hint.originalException;
          if (error instanceof Error) {
            // Ignore network errors when offline
            if (!navigator.onLine && error.message.includes('fetch')) {
              return null;
            }
            // Ignore chunk load errors (handled by ErrorBoundary)
            if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
              return null;
            }
          }
          return event;
        },
      });

      this.sentryInitialized = true;
      console.log('[ErrorTracker] Sentry initialized');
    } catch (error) {
      console.warn('[ErrorTracker] Failed to initialize Sentry:', error);
      // Continue without Sentry - local tracking still works
    }
  }

  private setupGlobalHandlers() {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        component: 'global',
        action: 'unhandled_error',
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      this.captureError(error, {
        component: 'global',
        action: 'unhandled_rejection',
      });
    });
  }

  private loadStoredErrors() {
    try {
      const stored = localStorage.getItem('error_log');
      if (stored) {
        this.errors = JSON.parse(stored);
      }
    } catch {
      this.errors = [];
    }
  }

  private saveErrors() {
    try {
      localStorage.setItem('error_log', JSON.stringify(this.errors));
    } catch {
      // Storage full, clear old errors
      this.errors = this.errors.slice(-10);
      try {
        localStorage.setItem('error_log', JSON.stringify(this.errors));
      } catch {
        // Still failing, give up
      }
    }
  }

  captureError(error: Error, context: ErrorContext = {}) {
    const trackedError: TrackedError = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Always log to console in development
    if (import.meta.env.DEV) {
      console.error('[ErrorTracker]', trackedError);
    }

    // Store error locally
    this.errors.push(trackedError);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
    this.saveErrors();

    // Report to external service if enabled
    if (this.isEnabled || import.meta.env.DEV) {
      this.reportError(trackedError, error, context);
    }
  }

  private async reportError(trackedError: TrackedError, error: Error, context: ErrorContext) {
    // Report to Sentry if initialized
    if (this.sentryInitialized) {
      try {
        const Sentry = await import('@sentry/react').catch(() => null);
        if (!Sentry) {
          return; // Sentry not available
        }
        Sentry.captureException(error, {
          tags: {
            component: context.component || 'unknown',
            action: context.action || 'unknown',
          },
          extra: {
            ...context.extra,
            url: trackedError.url,
            userAgent: trackedError.userAgent,
          },
          user: context.userId ? { id: context.userId } : undefined,
        });
      } catch (sentryError) {
        console.warn('[ErrorTracker] Failed to report to Sentry:', sentryError);
      }
    }

    // In development, log to console
    if (import.meta.env.DEV) {
      console.log('[ErrorTracker] Error tracked:', {
        message: trackedError.message,
        context,
        url: trackedError.url,
      });
    }
  }

  captureMessage(message: string, context: ErrorContext = {}) {
    this.captureError(new Error(message), context);
  }

  setUser(userId: string | null, email?: string) {
    if (this.sentryInitialized) {
      import('@sentry/react').then((Sentry) => {
        Sentry.setUser(userId ? { id: userId, email } : null);
      }).catch(() => {
        // Ignore if Sentry not available
      });
    }
  }

  addBreadcrumb(message: string, category: string, level: 'info' | 'warning' | 'error' = 'info', data?: Record<string, unknown>) {
    if (this.sentryInitialized) {
      import('@sentry/react').then((Sentry) => {
        Sentry.addBreadcrumb({
          message,
          category,
          level,
          data,
          timestamp: Date.now() / 1000,
        });
      }).catch(() => {
        // Ignore if Sentry not available
      });
    }
  }

  getErrors(): TrackedError[] {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
    localStorage.removeItem('error_log');
  }

  // Generate error report for support
  generateReport(): string {
    const report = {
      errors: this.errors,
      deviceInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        online: navigator.onLine,
      },
      appInfo: {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        sentryEnabled: this.sentryInitialized,
      },
    };

    return JSON.stringify(report, null, 2);
  }
}

export const errorTracker = new ErrorTracker();
