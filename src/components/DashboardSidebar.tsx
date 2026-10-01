import React from 'react';
import { Home, Clock, FileText, Truck, Settings, LogOut } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

interface DashboardSidebarProps {
  activeNavId: string;
  onSelectNav: (id: string) => void;
  onLogout: () => void;
  userRole?: 'customer' | 'driver' | 'admin';
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeNavId,
  onSelectNav,
  onLogout,
  userRole = 'customer'
}) => {
  const customerNavItems: SidebarNavItem[] = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'history', label: 'Order History', icon: Clock },
    { id: 'orders', label: 'Active Orders', icon: FileText },
    { id: 'deliveries', label: 'Delivery Corridor', icon: Truck },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const driverNavItems: SidebarNavItem[] = [
    { id: 'home', label: 'Operations', icon: Home },
    { id: 'history', label: 'Shift History', icon: Clock },
    { id: 'orders', label: 'Route Queue', icon: FileText },
    { id: 'vehicle', label: 'Vehicle & Safety', icon: Truck },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const navItems = userRole === 'driver' ? driverNavItems : customerNavItems;

  return (
    <>
      {/* DESKTOP / TABLET NARROW VERTICAL SIDEBAR (fixed or flex on md+) */}
      <aside className="hidden md:flex flex-col items-center justify-between w-16 lg:w-18 bg-white border-r border-gray-200 py-4 shrink-0 select-none z-30 min-h-screen">
        {/* Top Section with App Icon & Navigation Items */}
        <div className="flex flex-col items-center w-full gap-5">
          {/* Top Logo Glyph */}
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#E04F11] shadow-2xs mb-2">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path
                d="M12 2C10.5 4.5 9 6.8 9 9.5C9 11.2 9.7 12.7 10.8 13.8C10.3 12.9 10 11.7 10 10.5C10 8.5 11 6.8 12 5.5C13 6.8 14 8.5 14 10.5C14 11.7 13.7 12.9 13.2 13.8C14.3 12.7 15 11.2 15 9.5C15 6.8 13.5 4.5 12 2Z"
                fill="#E04F11"
              />
              <path
                d="M6 14.5C6 11.8 7.3 9.4 9 8C7.5 9.8 6.8 12 6.8 14.5C6.8 17.5 9.1 20 12 20C14.9 20 17.2 17.5 17.2 14.5C17.2 12 16.5 9.8 15 8C16.7 9.4 18 11.8 18 14.5C18 18.1 15.3 21 12 21C8.7 21 6 18.1 6 14.5Z"
                fill="#2563EB"
              />
            </svg>
          </div>

          {/* Navigation Items List */}
          <nav className="flex flex-col items-center gap-3 w-full px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNavId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectNav(item.id)}
                  title={item.label}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer group relative ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[1.8]" />
                  {/* Tooltip on hover */}
                  <span className="absolute left-14 px-2 py-1 bg-gray-900 text-white text-[11px] font-semibold rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Theme & Logout */}
        <div className="w-full px-2 pt-3 border-t border-gray-100 flex flex-col items-center gap-2">
          <ThemeToggle className="w-10 h-10" />
          <button
            onClick={onLogout}
            title="Sign Out"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer group relative"
          >
            <LogOut className="w-5 h-5 stroke-[1.8]" />
            <span className="absolute left-14 px-2 py-1 bg-gray-900 text-white text-[11px] font-semibold rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md">
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR (for small touch devices) */}
      <nav 
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#131B2A]/95 backdrop-blur-md border-t border-gray-200 dark:border-[#202D42] px-2 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-lg"
      >
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeNavId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectNav(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-colors min-h-[44px] min-w-[56px] cursor-pointer ${
                isActive 
                  ? 'text-blue-600 dark:text-blue-400 font-bold' 
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 stroke-[1.9]" />
              </div>
              <span className="text-[10px] tracking-tight leading-none">{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onLogout}
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 min-h-[44px] min-w-[56px] cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/30">
            <LogOut className="w-4 h-4" />
          </div>
          <span className="text-[10px] leading-none">Exit</span>
        </button>
      </nav>
    </>
  );
};
