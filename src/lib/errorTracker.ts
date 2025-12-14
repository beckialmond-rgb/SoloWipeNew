// Error tracking utility for production monitoring
// Captures and logs errors with context for debugging

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

  constructor() {
    this.isEnabled = import.meta.env.PROD;
    this.setupGlobalHandlers();
    this.loadStoredErrors();
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

    // Always log to console
    console.error('[ErrorTracker]', trackedError);

    // Store error
    this.errors.push(trackedError);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
    this.saveErrors();

    // In production, could send to external service
    if (this.isEnabled) {
      this.reportError(trackedError);
    }
  }

  private reportError(error: TrackedError) {
    // Placeholder for external error reporting service
    // Could integrate with Sentry, LogRocket, etc.
    console.log('[ErrorTracker] Would report to external service:', error);
  }

  captureMessage(message: string, context: ErrorContext = {}) {
    this.captureError(new Error(message), context);
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
      },
    };

    return JSON.stringify(report, null, 2);
  }
}

export const errorTracker = new ErrorTracker();
