/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { AuthPage } from './features/auth/AuthPage';
import { CustomerPortal } from './features/customer/CustomerPortal';
import { AdminPortal } from './features/admin/AdminPortal';
import { DriverPortal } from './features/driver/DriverPortal';
import { DriverActivationPage } from './features/auth/DriverActivationPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UnauthorizedPage } from './components/UnauthorizedPage';

const MainRouter: React.FC = () => {
  const { user, isLoading, logout } = useAuth();

  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');

  const [activationToken, setActivationToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  });

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      const params = new URLSearchParams(window.location.search);
      setActivationToken(params.get('token'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync browser path with user portal on initial load or login if at root
  useEffect(() => {
    if (user && (currentPath === '/' || currentPath === '/login')) {
      if (user.role === 'admin') {
        window.history.replaceState({}, '', '/admin');
        setCurrentPath('/admin');
      } else if (user.role === 'driver') {
        window.history.replaceState({}, '', '/driver');
        setCurrentPath('/driver');
      } else if (user.role === 'customer') {
        window.history.replaceState({}, '', '/app');
        setCurrentPath('/app');
      }
    }
  }, [user, currentPath]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] dark:bg-[#0B0F17]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#E04F11] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-gray-600 dark:text-slate-400">
            Starting GasDeliver...
          </span>
        </div>
      </div>
    );
  }

  // Driver Activation Link flow
  if (activationToken) {
    return (
      <DriverActivationPage
        token={activationToken}
        onNavigateToLogin={(email) => {
          window.history.replaceState({}, document.title, '/login');
          setActivationToken(null);
          setCurrentPath('/login');
        }}
      />
    );
  }

  // Helper function to render active route
  const renderRoute = () => {
    // 1. Standalone Unauthorized Page route (/unauthorized)
    if (currentPath === '/unauthorized') {
      return (
        <UnauthorizedPage
          currentRole={user?.role}
          onNavigate={navigate}
          onLogout={logout}
        />
      );
    }

    // 2. Public / Unauthenticated Onboarding & Sign-Up Routes
    if (currentPath === '/driver-signup' || currentPath === '/apply-driver' || currentPath === '/driver/apply') {
      return (
        <AuthPage
          initialMode="driver-signup"
          onSuccess={() => navigate('/driver')}
        />
      );
    }

    if (currentPath === '/signup' || currentPath === '/customer-signup' || currentPath === '/register') {
      return (
        <AuthPage
          initialMode="customer-signup"
          onSuccess={() => navigate('/app')}
        />
      );
    }

    // 3. Login Route (/login or unauthenticated root /)
    if (currentPath === '/login' || (!user && currentPath === '/')) {
      if (user) {
        // Already authenticated, forward to dashboard
        const target = user.role === 'admin' ? '/admin' : user.role === 'driver' ? '/driver' : '/app';
        navigate(target);
        return null;
      }
      return (
        <AuthPage
          initialMode="signin"
          onSuccess={() => {
            const cached = localStorage.getItem('gasdeliver_user');
            if (cached) {
              try {
                const u = JSON.parse(cached);
                const target = u.role === 'admin' ? '/admin' : u.role === 'driver' ? '/driver' : '/app';
                navigate(target);
                return;
              } catch {
                // ignore
              }
            }
            if (user) {
              const target = user.role === 'admin' ? '/admin' : user.role === 'driver' ? '/driver' : '/app';
              navigate(target);
            }
          }}
        />
      );
    }

    // ==========================================
    // 4. STRICT PROTECTED ROUTES (RBAC WRAPPERS)
    // ==========================================

    // A. Customer Portal (/app, /app/*, /customer)
    if (currentPath.startsWith('/app') || currentPath.startsWith('/customer')) {
      return (
        <ProtectedRoute allowedRoles={['customer']} onNavigate={navigate}>
          <CustomerPortal />
        </ProtectedRoute>
      );
    }

    // B. Driver Portal (/driver, /driver/*)
    if (currentPath.startsWith('/driver')) {
      return (
        <ProtectedRoute allowedRoles={['driver']} onNavigate={navigate}>
          <DriverPortal />
        </ProtectedRoute>
      );
    }

    // C. Admin Operations Center (/admin, /admin/*)
    if (currentPath.startsWith('/admin')) {
      return (
        <ProtectedRoute allowedRoles={['admin']} onNavigate={navigate}>
          <AdminPortal />
        </ProtectedRoute>
      );
    }

    // Root fallback: if authenticated, route to respective dashboard; if not, route to signin
    if (user) {
      if (user.role === 'admin') {
        return (
          <ProtectedRoute allowedRoles={['admin']} onNavigate={navigate}>
            <AdminPortal />
          </ProtectedRoute>
        );
      }
      if (user.role === 'driver') {
        return (
          <ProtectedRoute allowedRoles={['driver']} onNavigate={navigate}>
            <DriverPortal />
          </ProtectedRoute>
        );
      }
      return (
        <ProtectedRoute allowedRoles={['customer']} onNavigate={navigate}>
          <CustomerPortal />
        </ProtectedRoute>
      );
    }

    // Unauthenticated fallback
    return (
      <AuthPage
        initialMode="signin"
        onSuccess={() => {}}
      />
    );
  };

  return (
    <>
      {/* Primary Application Route */}
      {renderRoute()}
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RealtimeProvider>
          <MainRouter />
        </RealtimeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
