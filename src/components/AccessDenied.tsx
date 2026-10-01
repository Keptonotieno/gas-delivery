import React from 'react';
import { ShieldAlert, LogOut, ArrowRight, Lock } from 'lucide-react';
import { UserRole } from '../types';

interface AccessDeniedProps {
  currentRole: UserRole | string;
  targetDashboard: 'Customer' | 'Admin' | 'Driver';
  onNavigateToOwnDashboard?: () => void;
  onLogout: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  currentRole,
  targetDashboard,
  onNavigateToOwnDashboard,
  onLogout
}) => {
  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0B0F17] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#131B2A] rounded-2xl border border-gray-200 dark:border-[#202D42] shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 text-xs font-bold mb-3">
          <Lock className="w-3 h-3" />
          <span>ACCESS RESTRICTED (RBAC POLICY)</span>
        </div>

        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
          {targetDashboard} Dashboard Restricted
        </h2>

        <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed mb-6">
          You are currently signed in with a <strong className="text-gray-900 dark:text-white capitalize">{currentRole}</strong> account. 
          Under strict role-based access controls, a {currentRole} is not authorized to access the {targetDashboard} dashboard.
        </p>

        <div className="p-3.5 bg-gray-50 dark:bg-[#0B0F17]/60 rounded-xl border border-gray-200 dark:border-[#202D42] text-xs text-left text-gray-600 dark:text-slate-300 space-y-1 mb-6">
          <p className="font-semibold text-gray-900 dark:text-white">Access Control Matrix:</p>
          <p>• <strong>Customer:</strong> Access only to personal gas ordering & tracking.</p>
          <p>• <strong>Driver:</strong> Access only to assigned delivery manifest & route navigation.</p>
          <p>• <strong>Admin:</strong> Access only to central hub fleet dispatch & inventory operations.</p>
        </div>

        <div className="space-y-2.5">
          {onNavigateToOwnDashboard && (
            <button
              onClick={onNavigateToOwnDashboard}
              className="w-full py-2.5 px-4 bg-[#E04F11] hover:bg-[#C9420A] text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Go to My {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)} Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onLogout}
            className="w-full py-2.5 px-4 border border-gray-200 dark:border-[#202D42] hover:bg-gray-50 dark:hover:bg-[#1E293B] text-gray-700 dark:text-slate-200 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-gray-500" />
            <span>Sign Out & Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
