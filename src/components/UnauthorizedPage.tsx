import React from 'react';
import { ShieldAlert, LogOut, ArrowRight, Lock, Home } from 'lucide-react';
import { UserRole } from '../types';

interface UnauthorizedPageProps {
  currentRole?: UserRole | string;
  allowedRoles?: UserRole[];
  onNavigate?: (path: string) => void;
  onLogout: () => void;
}

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({
  currentRole = 'unauthorized',
  allowedRoles = [],
  onNavigate,
  onLogout
}) => {
  const getDefaultDashboard = (role: string) => {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'driver':
        return '/driver';
      case 'customer':
      default:
        return '/app';
    }
  };

  const handleReturnToDashboard = () => {
    const target = getDefaultDashboard(currentRole);
    if (onNavigate) {
      onNavigate(target);
    } else {
      window.history.pushState({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleGoToLogin = () => {
    onLogout();
    if (onNavigate) {
      onNavigate('/login');
    } else {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0B0F17] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#131B2A] rounded-2xl border border-gray-200 dark:border-[#202D42] shadow-sm p-8 text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-5 shadow-2xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 text-xs font-black tracking-wide uppercase mb-3">
          <Lock className="w-3.5 h-3.5" />
          <span>403 UNAUTHORIZED (RBAC ENFORCED)</span>
        </div>

        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
          Access Restricted
        </h1>

        <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 leading-relaxed mb-6">
          Your account is registered as a{' '}
          <strong className="text-gray-900 dark:text-white uppercase font-bold px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-[#202D42]">
            {currentRole}
          </strong>
          . You do not have sufficient permissions to view this route.
        </p>

        {allowedRoles.length > 0 && (
          <div className="p-3.5 bg-gray-50 dark:bg-[#0B0F17]/60 rounded-xl border border-gray-200 dark:border-[#202D42] text-xs text-left space-y-1.5 mb-6">
            <div className="font-bold text-gray-900 dark:text-white">Route Guard Policy:</div>
            <div className="text-gray-600 dark:text-slate-400">
              Required Clearance:{' '}
              <strong className="text-[#E04F11]">
                {allowedRoles.map((r) => r.toUpperCase()).join(' or ')}
              </strong>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-slate-400">
              Access attempts are logged for operational security and compliance.
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          <button
            onClick={handleReturnToDashboard}
            className="w-full py-2.5 px-4 bg-[#E04F11] hover:bg-[#C9420A] text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>
              Return to My {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)} Dashboard
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleGoToLogin}
            className="w-full py-2.5 px-4 border border-gray-200 dark:border-[#202D42] hover:bg-gray-50 dark:hover:bg-[#1E293B] text-gray-700 dark:text-slate-200 font-semibold rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-gray-500" />
            <span>Sign Out & Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
