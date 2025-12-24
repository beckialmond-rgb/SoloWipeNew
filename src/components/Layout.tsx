import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';

export const Layout = () => {
  const location = useLocation();
  
  // Hide bottom nav on specific routes if needed (e.g., auth, welcome)
  const hideNavRoutes = ['/auth', '/forgot-password', '/reset-password', '/install', '/terms', '/privacy'];
  const shouldShowNav = !hideNavRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <main className={shouldShowNav ? "pb-20" : ""}>
        <Outlet />
      </main>
      
      {shouldShowNav && <BottomNav />}
    </div>
  );
};
