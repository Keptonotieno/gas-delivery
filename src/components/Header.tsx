import React, { useState } from 'react';
import { GasDeliverLogo } from './GasDeliverLogo';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import { Bell, ChevronDown, User as UserIcon, Settings, LogOut, Menu, X, ArrowRightLeft } from 'lucide-react';
import { UserRole } from '../types';

interface HeaderProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab = 'Order',
  onTabChange,
  onOpenProfile
}) => {
  const { user, logout } = useAuth();
  const { unreadNotifications, clearNotifications } = useRealtime();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { key: 'Order', label: 'Order' },
    { key: 'My Orders', label: 'My Orders' },
    { key: 'Addresses', label: 'Addresses' },
    { key: 'Support', label: 'Support' }
  ];

  return (
    <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left Brand + Role Pill */}
        <div className="flex items-center gap-3">
          <GasDeliverLogo size="md" />
          {user?.role && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FFF5EE] text-[#E04F11] border border-[#FEECE2] capitalize">
              {user.role}
            </span>
          )}
        </div>

        {/* Center Navigation - Desktop */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = currentTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onTabChange?.(item.key)}
                className={`text-sm font-medium transition-colors cursor-pointer py-1 relative ${
                  isActive
                    ? 'text-[#E04F11] font-semibold'
                    : 'text-[#4B5563] hover:text-[#111827]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-[-17px] left-0 right-0 h-[2.5px] bg-[#E04F11] rounded-t-sm" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Verified Customer Portal Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-bold text-emerald-800">Customer Portal</span>
          </div>

          {/* Notifications */}
          <button
            onClick={clearNotifications}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#E04F11] rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* User Profile Pill Menu */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
            >
              <div className="w-8 h-8 rounded-full bg-[#E04F11] text-white flex items-center justify-center font-bold text-xs">
                {user?.avatar || 'WM'}
              </div>
              <span className="hidden sm:inline-block text-sm font-semibold text-gray-800">
                {user?.name ? `${user.name.split(' ')[0]} ${user.name.split(' ')[1]?.[0] || ''}.` : 'Wanjiru M.'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in-50 zoom-in-95">
                  <div className="px-3.5 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-400 font-medium">Signed in as</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user?.name || 'Priya Sharma'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenProfile?.();
                    }}
                    className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                  >
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    My Profile
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onTabChange?.('Settings');
                    }}
                    className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    Settings
                  </button>

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                onTabChange?.(item.key);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                currentTab === item.key
                  ? 'bg-[#FFF5EE] text-[#E04F11] font-bold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}

          <div className="pt-3 border-t border-gray-100 mt-2 px-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-xs font-bold text-gray-900">{user?.name}</p>
                <p className="text-[11px] text-gray-500">{user?.email}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Customer
              </span>
            </div>
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="w-full mt-2 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
