import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRecovering: boolean;
}

// Patterns that indicate a stale cache/module resolution error
const CACHE_ERROR_PATTERNS = [
  'forwardRef',
  'Cannot read properties of undefined',
  'Cannot read properties of null',
  'is not a function',
  'is not defined',
  'Failed to fetch dynamically imported module',
  'Loading chunk',
  'ChunkLoadError',
  'Unexpected token',
  'SyntaxError',
];

// Patterns that indicate Supabase configuration errors
const SUPABASE_ERROR_PATTERNS = [
  'Missing VITE_SUPABASE',
  'Invalid Supabase',
  'Failed to initialize Supabase',
  'Supabase',
];

function isStaleModuleError(error: Error): boolean {
  const message = error.message || '';
  const stack = error.stack || '';
  const combined = `${message} ${stack}`;
  
  return CACHE_ERROR_PATTERNS.some(pattern => 
    combined.toLowerCase().includes(pattern.toLowerCase())
  );
}

function isSupabaseError(error: Error): boolean {
  const message = error.message || '';
  const stack = error.stack || '';
  const combined = `${message} ${stack}`;
  
  return SUPABASE_ERROR_PATTERNS.some(pattern => 
    combined.toLowerCase().includes(pattern.toLowerCase())
  );
}

async function clearAllCaches(): Promise<void> {
  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
      console.log('[ErrorBoundary] Service workers unregistered');
    }

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('[ErrorBoundary] Caches cleared:', cacheNames);
    }

    // Clear localStorage PWA-related items
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('workbox') || key.includes('sw') || key.includes('pwa'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('[ErrorBoundary] Cache cleanup complete');
  } catch (e) {
    console.error('[ErrorBoundary] Error during cache cleanup:', e);
  }
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isRecovering: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Auto-recover from stale module errors
    if (isStaleModuleError(error) && !this.state.isRecovering) {
      console.log('[ErrorBoundary] Detected stale module error, initiating auto-recovery...');
      this.handleAutoRecovery();
    }
  }

  handleAutoRecovery = async () => {
    this.setState({ isRecovering: true });
    
    try {
      await clearAllCaches();
      
      // Small delay to ensure cleanup is complete
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (e) {
      console.error('[ErrorBoundary] Auto-recovery failed:', e);
      this.setState({ isRecovering: false });
    }
  };

  handleReload = async () => {
    this.setState({ isRecovering: true });
    await clearAllCaches();
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, isRecovering: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isModuleError = this.state.error && isStaleModuleError(this.state.error);

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              {this.state.isRecovering ? (
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-destructive" />
              )}
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {this.state.isRecovering ? 'Updating app...' : 'Something went wrong'}
              </h1>
              <p className="text-muted-foreground">
                {this.state.isRecovering 
                  ? 'Clearing cached files and reloading with the latest version.'
                  : isSupabaseError(this.state.error!)
                    ? 'Supabase configuration error. Please check your environment variables in Netlify. See console for details.'
                    : isModuleError
                      ? 'A cached version of the app is out of date. Click below to load the latest version.'
                      : 'We\'re sorry, but something unexpected happened. Please try reloading the app.'
                }
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-muted/50 rounded-lg p-4 text-left">
                <p className="text-sm font-mono text-destructive break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {!this.state.isRecovering && (
              <div className="flex flex-col gap-3">
                <Button
                  onClick={this.handleReload}
                  className="w-full min-h-[44px]"
                  size="lg"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {isModuleError ? 'Update & Reload' : 'Reload App'}
                </Button>
                
                {!isModuleError && (
                  <Button
                    onClick={this.handleReset}
                    variant="outline"
                    className="w-full min-h-[44px]"
                    size="lg"
                  >
                    Try Again
                  </Button>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {this.state.isRecovering 
                ? 'This should only take a moment...'
                : 'If this problem persists, please contact support.'
              }
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Export utility for manual cache clearing from other components
export { clearAllCaches };
