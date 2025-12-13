import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface SoftProtectedRouteProps {
  children: ReactNode;
}

export function SoftProtectedRoute({ children }: SoftProtectedRouteProps) {
  const { loading } = useAuth();

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Always render children, regardless of auth state
  // Actions will be gated by useSoftPaywall hook
  return <>{children}</>;
}
