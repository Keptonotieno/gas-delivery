import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, UserRole } from '../types';
import {
  Code,
  UserCheck,
  Truck,
  ShieldCheck,
  LogOut,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';

interface DevRoleSwitcherProps {
  onNavigate?: (path: string) => void;
}

const DEV_PROFILES: Record<UserRole, User> = {
  customer: {
    id: 'dev-cust-101',
    name: 'Dev Sarah (Customer)',
    email: 'dev.customer@test.com',
    role: 'customer',
    status: 'active',
    phone: '+254 798 112 233',
    address: 'Lumumba Drive, Roysambu Court Apt 4B',
    corridorZone: 'Thika Road / Roysambu / Lumumba Drive',
    avatar: 'SC'
  },
  driver: {
    id: 'dev-drv-201',
    name: 'Dev John (Driver)',
    email: 'dev.driver@test.com',
    role: 'driver',
    status: 'active',
    verificationStatus: 'approved',
    phone: '+254 712 345 678',
    vehicle: 'Toyota Hiace (KDB 123A)',
    vehicleMake: 'Toyota',
    vehicleModel: 'Hiace High Roof',
    licensePlate: 'KDB 123A',
    driverId: 'drv-dev-1',
    corridorZone: 'Thika Road / Roysambu / Lumumba Drive',
    accountActivated: true,
    nationalId: '32145678',
    drivingLicenseNo: 'DL-KEN-2022-8491',
    avatar: 'JD'
  },
  admin: {
    id: 'dev-admin-301',
    name: 'Dev Ops Manager (Admin)',
    email: 'dev.admin@test.com',
    role: 'admin',
    status: 'active',
    phone: '+254 722 800 449',
    avatar: 'AD'
  }
};

export const DevRoleSwitcher: React.FC<DevRoleSwitcherProps> = ({ onNavigate }) => {
  // CRITICAL: Strictly render ONLY in development mode (import.meta.env.DEV)
  if (!import.meta.env.DEV) {
    return null;
  }

  const { user, devSetUser, logout } = useAuth();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const navigateTo = (targetPath: string) => {
    if (onNavigate) {
      onNavigate(targetPath);
    } else {
      window.history.pushState({}, '', targetPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleEmulateRole = (role: UserRole) => {
    const mockProfile = DEV_PROFILES[role];
    devSetUser(mockProfile);

    // Route to respective dashboard bypassing standard login flow
    if (role === 'customer') {
      navigateTo('/app');
    } else if (role === 'driver') {
      navigateTo('/driver');
    } else if (role === 'admin') {
      navigateTo('/admin');
    }
  };

  const handleEmulateLogout = () => {
    logout();
    navigateTo('/login');
  };

  const currentRole = user?.role || 'guest';

  return (
    <aside
      aria-label="Development Role Switcher"
      className="fixed bottom-4 right-4 z-50 font-sans select-none"
    >
      <div className="bg-[#111827]/95 dark:bg-[#0D131F]/95 backdrop-blur-md text-white border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 min-w-64 max-w-xs">
        {/* Toolbar Header */}
        <div className="px-3.5 py-2.5 bg-gray-900/90 border-b border-gray-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="flex items-center gap-1.5 text-xs font-black tracking-wider uppercase text-amber-400">
              <Code className="w-3.5 h-3.5" />
              <span>Dev Mode</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-800 text-gray-300 font-mono font-bold uppercase">
              {currentRole}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse Dev Toolbar' : 'Expand Dev Toolbar'}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Toolbar Expanded Body */}
        {isExpanded && (
          <div className="p-3 space-y-2">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span>Emulate Session</span>
              <span className="text-[9px] text-gray-500">Auto-routes & overrides RBAC</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {/* Customer Button */}
              <button
                type="button"
                onClick={() => handleEmulateRole('customer')}
                className={`px-2 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                  currentRole === 'customer'
                    ? 'bg-[#E04F11] border-[#E04F11] text-white shadow-xs'
                    : 'bg-gray-800/80 hover:bg-gray-700/80 border-gray-700 text-gray-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span className="text-[11px]">Customer</span>
                <span className="text-[9px] opacity-70 font-mono">/app</span>
              </button>

              {/* Driver Button */}
              <button
                type="button"
                onClick={() => handleEmulateRole('driver')}
                className={`px-2 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                  currentRole === 'driver'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                    : 'bg-gray-800/80 hover:bg-gray-700/80 border-gray-700 text-gray-200'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span className="text-[11px]">Driver</span>
                <span className="text-[9px] opacity-70 font-mono">/driver</span>
              </button>

              {/* Admin Button */}
              <button
                type="button"
                onClick={() => handleEmulateRole('admin')}
                className={`px-2 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                  currentRole === 'admin'
                    ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                    : 'bg-gray-800/80 hover:bg-gray-700/80 border-gray-700 text-gray-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[11px]">Admin</span>
                <span className="text-[9px] opacity-70 font-mono">/admin</span>
              </button>
            </div>

            {/* Session Info & Reset */}
            <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px]">
              <div className="truncate text-gray-400 text-[10px] max-w-36">
                {user ? user.email : 'No active session'}
              </div>

              <button
                type="button"
                onClick={handleEmulateLogout}
                className="text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 py-1 px-1.5 rounded-md hover:bg-rose-950/40 cursor-pointer transition-colors"
                title="Log out and route to /login"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
