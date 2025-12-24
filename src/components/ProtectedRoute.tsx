import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Using forwardRef to properly handle refs from router
export const ProtectedRoute = React.forwardRef<HTMLDivElement, ProtectedRouteProps>(
  function ProtectedRoute({ children }, _ref) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    return <>{children}</>;
  }
);
