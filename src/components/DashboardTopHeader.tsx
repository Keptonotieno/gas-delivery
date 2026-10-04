import React, { useState } from 'react';
import { GasDeliverLogo } from './GasDeliverLogo';
import { Bell, ChevronDown, User, Settings, LogOut, Phone } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface CustomerHeaderProps {
  variant: 'customer';
  customerName?: string;
  customerAvatar?: string;
  unreadCount?: number;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onLogout: () => void;
}

interface DriverHeaderProps {
  variant: 'driver';
  driverName?: string;
  driverAvatar?: string;
  vehiclePlate?: string;
  rating?: number;
  isOnline?: boolean;
  onToggleOnline?: () => void;
  isUpdatingStatus?: boolean;
  unreadCount?: number;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onLogout: () => void;
}

type DashboardTopHeaderProps = CustomerHeaderProps | DriverHeaderProps;

export const DashboardTopHeader: React.FC<DashboardTopHeaderProps> = (props) => {
  const [menuOpen, setMenuOpen] = useState(false);

  if (props.variant === 'customer') {
    const {
      customerName = 'Wanjiru M.',
      unreadCount = 1,
      onNotificationsClick,
      onProfileClick,
      onSettingsClick,
      onLogout
    } = props;

    return (
      <header className="bg-white dark:bg-[#131B2A] border-b border-gray-200 dark:border-[#202D42] h-14 sm:h-16 px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
        {/* Left: Brand + Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <GasDeliverLogo size="sm" />
          <span className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-white tracking-tight truncate">
            Customer Hub
          </span>
        </div>

        {/* Right: Notifications & Customer Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notification Icon */}
          <button
            type="button"
            onClick={onNotificationsClick}
            className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 relative transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.8]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {/* Customer Avatar & Name Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 p-1 pl-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
            >
              <div className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-[#E04F11] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                WM
              </div>
              <span className="hidden sm:inline-block text-sm font-semibold text-gray-800 dark:text-slate-200">
                {customerName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 dark:text-slate-400" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#131B2A] rounded-xl shadow-lg border border-gray-200 dark:border-[#202D42] py-1.5 z-40 animate-in fade-in-50 zoom-in-95">
                  <div className="px-3.5 py-2 border-b border-gray-100 dark:border-slate-800">
                    <p className="text-xs text-gray-400 dark:text-slate-500 font-medium">Signed in as</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{customerName}</p>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onProfileClick?.();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    Account Profile
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onSettingsClick?.();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    Settings
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Driver Variant
  const {
    driverName = 'Courier',
    driverAvatar,
    vehiclePlate = '',
    rating = 4.9,
    isOnline = true,
    onToggleOnline,
    isUpdatingStatus = false,
    unreadCount = 1,
    onNotificationsClick,
    onProfileClick,
    onSettingsClick,
    onLogout
  } = props;

  const driverInitials = driverAvatar || driverName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'DK';

  return (
    <header className="bg-white dark:bg-[#131B2A] border-b border-gray-200 dark:border-[#202D42] h-14 sm:h-16 px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      {/* Left: Brand + Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <GasDeliverLogo size="sm" />
        <span className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-white tracking-tight truncate">
          Driver Ops
        </span>
      </div>

      {/* Right: Online Status, Notifications, Driver Avatar & Info */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notification Icon */}
        <button
          type="button"
          onClick={onNotificationsClick}
          className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 relative transition-colors cursor-pointer"
          title="Driver Notifications"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.8]" />
          {(unreadCount ?? 1) > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
          )}
        </button>

        {/* Online / Offline Status Pill */}
        <button
          type="button"
          onClick={onToggleOnline}
          disabled={isUpdatingStatus}
          className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer border shadow-2xs ${
            isOnline
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700'
          }`}
          title="Toggle Online/Offline status"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-emerald-500' : 'bg-gray-400'
            }`}
          />
          <span className="text-[11px] sm:text-xs">{isOnline ? 'Online' : 'Offline'}</span>
        </button>

        {/* Driver Profile Block */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 sm:gap-2.5 p-1 pl-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
          >
            <div className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-gray-900 dark:bg-slate-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {driverInitials}
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold text-gray-900 dark:text-white block leading-tight">
                {driverName}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-slate-400 block">
                Vehicle: <strong className="text-gray-700 dark:text-slate-300">{vehiclePlate}</strong> · ★ {rating}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 dark:text-slate-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#131B2A] rounded-xl shadow-lg border border-gray-200 dark:border-[#202D42] py-1.5 z-40 animate-in fade-in-50 zoom-in-95">
                <div className="px-3.5 py-2 border-b border-gray-100 dark:border-slate-800">
                  <p className="text-xs text-gray-400 dark:text-slate-500 font-medium">Logged in as Driver</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{driverName}</p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">{vehiclePlate} · Thika Corridor</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onProfileClick?.();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  Driver Profile & Ratings
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onSettingsClick?.();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  Preferences
                </button>
                <div className="my-1 border-t border-gray-100 dark:border-slate-800" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
