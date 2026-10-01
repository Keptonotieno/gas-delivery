import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { UnauthorizedPage } from './UnauthorizedPage';

export interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  onNavigate?: (path: string) => void;
  unauthorizedMode?: 'page' | 'redirect' | 'logout';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
  onNavigate,
  unauthorizedMode = 'page'
}) => {
  const { user, isLoading, logout } = useAuth();

  const handleRedirect = (targetPath: string) => {
    if (onNavigate) {
      onNavigate(targetPath);
    } else {
      window.history.pushState({}, '', targetPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      handleRedirect('/login');
    }
  }, [user, isLoading]);

  // 1. If still loading auth state, show loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] dark:bg-[#0B0F17]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#E04F11] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-gray-600 dark:text-slate-400">
            Verifying security credentials...
          </span>
        </div>
      </div>
    );
  }

  // 2. If no user is logged in, redirect to /login
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] dark:bg-[#0B0F17]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-[#E04F11] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-gray-500">Redirecting to sign-in...</span>
        </div>
      </div>
    );
  }

  // 3. If user's role is not included in allowedRoles, enforce RBAC
  if (!allowedRoles.includes(user.role)) {
    if (unauthorizedMode === 'logout') {
      logout();
      handleRedirect('/login');
      return null;
    }

    if (unauthorizedMode === 'redirect') {
      handleRedirect('/unauthorized');
      return null;
    }

    // Render Unauthorized Page with RBAC context
    return (
      <UnauthorizedPage
        currentRole={user.role}
        allowedRoles={allowedRoles}
        onNavigate={onNavigate}
        onLogout={logout}
      />
    );
  }

  // Authorized: render protected content
  return <>{children}</>;
};
