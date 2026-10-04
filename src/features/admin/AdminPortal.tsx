import React, { useState, useEffect } from 'react';
import { GasDeliverLogo } from '../../components/GasDeliverLogo';
import { AccessDenied } from '../../components/AccessDenied';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import { DispatchBoard } from './DispatchBoard';
import { FleetStatusPanel } from './FleetStatusPanel';
import { InventoryView } from './InventoryView';
import { AnalyticsView } from './AnalyticsView';
import { OperationsCenterView } from './OperationsCenterView';
import { DispatchCenterView } from './DispatchCenterView';
import { DriversView } from './DriversView';
import { EmployeesView } from './EmployeesView';
import { SettingsView } from './SettingsView';
import { IntegrationsView } from './IntegrationsView';
import { GasBrandsView } from './GasBrandsView';
import { ArchiveManagerView } from './ArchiveManagerView';
import { CustomersView } from './CustomersView';
import { DriverVerificationsView } from './DriverVerificationsView';
import { OperationsControlMenu } from './OperationsControlMenu';
import { ThemeToggle } from '../../components/ThemeToggle';
import { Order, Driver, Product, DashboardMetrics, OrderStatus } from '../../types';
import { api } from '../../services/api';
import { formatKSh } from '../../utils/format';
import { 
  Bell, 
  ChevronDown, 
  ChevronRight,
  User as UserIcon, 
  UserCheck,
  LogOut, 
  ArrowUpRight, 
  Clock, 
  Truck, 
  RefreshCw, 
  Layers,
  LayoutDashboard,
  ShoppingCart,
  Send,
  Radio,
  Users,
  Database,
  BarChart3,
  Settings,
  Search,
  Menu,
  X,
  Flame,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Shield,
  MapPin,
  Check,
  Package,
  Archive,
  RotateCcw,
  Trash2
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const { user, logout } = useAuth();
  const { subscribe, unreadNotifications, clearNotifications, isConnected } = useRealtime();

  // Strict Role Check: Customers and Drivers cannot access Admin Dashboard
  if (user?.role !== 'admin') {
    return (
      <AccessDenied
        currentRole={user?.role || 'unauthorized'}
        targetDashboard="Admin"
        onLogout={logout}
      />
    );
  }

  const [activeTab, setActiveTab] = useState<string>('Overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [liveToast, setLiveToast] = useState<{ id: string; title: string; message: string; type: 'order' | 'driver' | 'system' } | null>(null);

  const [employeesSubFilter, setEmployeesSubFilter] = useState<'all' | 'drivers' | 'workers' | 'archived'>('all');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'notifications' | 'security' | 'integrations' | 'audit_logs'>('general');
  const [customersCount, setCustomersCount] = useState<number>(0);
  const [pendingVerificationsCount, setPendingVerificationsCount] = useState<number>(0);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ordData, drvData, prdData, metData, custList, verificationsList] = await Promise.all([
        api.getOrders({ includeArchived: true }).catch(() => []),
        api.getDrivers().catch(() => []),
        api.getProducts().catch(() => []),
        api.getAnalytics().catch(() => null),
        api.getCustomers().catch(() => []),
        api.getDriverVerifications('pending').catch(() => [])
      ]);
      setOrders(ordData);
      setDrivers(drvData);
      setProducts(prdData);
      if (metData) {
        setMetrics(metData);
      }
      if (Array.isArray(custList)) {
        setCustomersCount(custList.length);
      }
      if (Array.isArray(verificationsList)) {
        setPendingVerificationsCount(verificationsList.length);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe = subscribe((event) => {
      // Real-time synchronization
      loadData();

      // Show real-time notification toasts for key operations and patch state immediately
      if (event.type === 'DRIVER_APPLICATION_SUBMITTED') {
        const app = event.data?.application;
        setPendingVerificationsCount((prev) => prev + 1);
        setLiveToast({
          id: `toast-${Date.now()}`,
          type: 'driver',
          title: 'New Driver Application',
          message: `${app?.applicantName || 'Driver'} applied with ${app?.licensePlate || 'vehicle'} in ${app?.corridorZone || 'Nairobi'}`
        });
        setTimeout(() => setLiveToast(null), 5000);
      } else if (event.type === 'CUSTOMER_REGISTERED' || event.type === 'USER_REGISTERED') {
        const cust = event.data?.customer || event.data?.user;
        setCustomersCount((prev) => prev + 1);
        setLiveToast({
          id: `toast-${Date.now()}`,
          type: 'system',
          title: 'New Customer Registered',
          message: `${cust?.name || 'A customer'} just created an account (${cust?.email || ''})`
        });
        setTimeout(() => setLiveToast(null), 5000);
      } else if (event.type === 'ORDER_CREATED') {
        const ord = event.data;
        if (ord && ord.id) {
          setOrders((prev) => {
            if (prev.some((o) => o.id === ord.id)) return prev;
            return [ord, ...prev];
          });
        }
        setLiveToast({
          id: `toast-${Date.now()}`,
          type: 'order',
          title: 'New Order Created',
          message: `Order #${ord?.id || ''} from ${ord?.customerName || 'Customer'} (${ord?.cylinderSummary || 'Cylinder'})`
        });
        setTimeout(() => setLiveToast(null), 5000);
      } else if (event.type === 'DRIVER_ASSIGNED') {
        const payload = event.data;
        const ord = payload?.order;
        if (ord && ord.id) {
          setOrders((prev) => prev.map((o) => (o.id === ord.id ? { ...o, ...ord } : o)));
        }
        const ordId = payload?.order?.id || payload?.id;
        const drvName = payload?.driver?.name || payload?.driverName || 'Courier';
        setLiveToast({
          id: `toast-${Date.now()}`,
          type: 'driver',
          title: 'Courier Assigned',
          message: `${drvName} assigned to Order #${ordId}`
        });
        setTimeout(() => setLiveToast(null), 5000);
      } else if (event.type === 'CUSTOMER_LOCATION_UPDATED') {
        const { orderId, customerLiveLocation } = event.data || {};
        if (orderId && customerLiveLocation) {
          setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, customerLiveLocation } : o))
          );
        }
        setLiveToast({
          id: `toast-${Date.now()}`,
          type: 'system',
          title: 'Customer Doorstep Location Updated',
          message: `Real-time doorstep coordinates updated for Order #${orderId || ''}`
        });
        setTimeout(() => setLiveToast(null), 5000);
      } else if (event.type === 'ORDER_UPDATED') {
        const ord = event.data;
        if (ord && ord.id) {
          setOrders((prev) => prev.map((o) => (o.id === ord.id ? { ...o, ...ord } : o)));
        }
        if (ord?.status === 'Delivered') {
          setLiveToast({
            id: `toast-${Date.now()}`,
            type: 'order',
            title: 'Delivery Completed (POD)',
            message: `Order #${ord.id} safely delivered with verified customer signoff.`
          });
          setTimeout(() => setLiveToast(null), 5000);
        }
      } else if (event.type === 'ORDER_ARCHIVED') {
        const ord = event.data;
        setLiveToast({
          id: `toast-${Date.now()}`,
          type: 'order',
          title: 'Order Soft-Deleted',
          message: `Order #${ord?.id || ''} has been archived with audit reason.`
        });
        setTimeout(() => setLiveToast(null), 5000);
      } else if (event.type === 'ORDER_RESTORED') {
        const ord = event.data;
        setLiveToast({
          id: `toast-${Date.now()}`,
          type: 'order',
          title: 'Order Restored',
          message: `Order #${ord?.id || ''} restored to active operations.`
        });
        setTimeout(() => setLiveToast(null), 5000);
      }
    });

    return () => unsubscribe();
  }, [subscribe]);

  const handleAssignDriver = async (orderId: string, driverId: string) => {
    await api.assignDriver(orderId, driverId);
    await loadData();
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    await api.updateOrderStatus(orderId, status);
    await loadData();
  };

  const navItems = [
    { key: 'Overview', label: 'Overview', icon: LayoutDashboard, indicator: 'none' },
    { key: 'Orders', label: 'Orders', icon: ShoppingCart, indicator: 'check', badge: orders.filter(o => !o.isArchived && (o.status === 'Pending' || o.status === 'Preparing')).length },
    { key: 'Customers', label: 'Customers', icon: UserCheck, indicator: 'check', badge: customersCount },
    { key: 'Dispatch', label: 'Dispatch', icon: Radio, indicator: 'chevron', badge: orders.filter(o => !o.isArchived && (o.status === 'Out for Delivery' || o.status === 'Dispatched')).length },
    { key: 'Inventory', label: 'Inventory', icon: Package, indicator: 'check' },
    { key: 'Brands', label: 'Gas Brands', icon: Flame, indicator: 'check' },
    { key: 'Drivers', label: 'Drivers', icon: Truck, indicator: 'chevron', badge: drivers.filter(d => d.status === 'Available').length },
    { key: 'Verifications', label: 'Driver Verifications', icon: ShieldCheck, indicator: 'check', badge: pendingVerificationsCount },
    { key: 'Employees', label: 'Employees', icon: Users, indicator: 'chevron', hasSubmenu: true },
    { key: 'Archive', label: 'Archive / Soft Delete', icon: Archive, indicator: 'check', badge: orders.filter(o => o.isArchived || o.status === 'Archived').length },
    { key: 'Analytics', label: 'Analytics', icon: BarChart3, indicator: 'check' },
    { key: 'Integrations', label: 'Integrations', icon: Layers, indicator: 'check' },
    { key: 'Settings', label: 'Settings', icon: Settings, indicator: 'chevron', hasSubmenu: true }
  ];

  const getPageTitle = () => {
    switch (activeTab) {
      case 'Overview':
        return 'Operations Center';
      case 'Orders':
        return 'Orders & Customer Requests';
      case 'Customers':
        return 'Customer Directory & Accounts';
      case 'Dispatch':
        return 'Live Dispatch Board & Telemetry';
      case 'Drivers':
        return 'Field Fleet & Courier Tracking';
      case 'Verifications':
        return 'Driver Verifications & Compliance';
      case 'Employees':
        return 'Staff & Driver Directory';
      case 'Archive':
        return 'Archive & Soft Delete Manager';
      case 'Inventory':
        return 'Cylinder Stock & Refill Logistics';
      case 'Brands':
        return 'Kenyan LPG Brand Registry & Soft Delete';
      case 'Analytics':
        return 'Operations & Revenue Analytics';
      case 'Integrations':
        return 'Third-Party Services & Integrations';
      case 'Settings':
        return 'Logistics Hub Settings';
      default:
        return 'Admin Operations';
    }
  };

  const getPageSubtitle = () => {
    switch (activeTab) {
      case 'Overview':
        return 'Real-time dispatch, fleet telemetry, and LPG inventory control';
      case 'Orders':
        return 'Comprehensive order log, status tracking, and fulfillment workflow';
      case 'Customers':
        return 'Registered public customers, account status enforcement, and order history';
      case 'Dispatch':
        return 'Live route dispatching and driver allocation across Nairobi corridors';
      case 'Drivers':
        return 'Driver statuses, GPS telemetry, active routes, and performance ratings';
      case 'Verifications':
        return 'Kenyan National IDs, NTSA driver licenses, vehicle compliance records, and driver onboarding approvals';
      case 'Employees':
        return 'Worker registration, driver license verification, suspensions, and terminations';
      case 'Archive':
        return 'Audit soft-deleted orders, discontinued products, and former staff with 1-click restore';
      case 'Inventory':
        return 'Warehouse stock balance, empty returns, safety seals, and tare weights';
      case 'Brands':
        return 'Kenyan LPG Brand Registry & Soft Delete';
      case 'Analytics':
        return 'Operations & Revenue Analytics';
      case 'Integrations':
        return 'Third-Party Services & Integrations';
      case 'Settings':
        return 'Logistics Hub Settings';
      default:
        return 'GasDeliver logistics management portal';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-gray-900 font-sans antialiased">
      {/* ========================================================================= */}
      {/* 1. FIXED LIGHT ENTERPRISE SIDEBAR (DESKTOP) - MATCHING DESIGN REFERENCE */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 text-slate-700 fixed inset-y-0 left-0 z-40 select-none">
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E04F11] flex items-center justify-center text-white font-black text-sm shadow-xs shrink-0">
              <Flame className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="font-black text-slate-900 text-base tracking-tight leading-none">
                GasDeliver
              </div>
              <span className="text-[11px] text-slate-400 font-medium tracking-tight">
                - Safe Gas. On Time.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            PRO
          </span>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Main Logistics
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <div key={item.key} className="space-y-0.5">
                <button
                  onClick={() => {
                    setActiveTab(item.key);
                    if (item.key === 'Employees') {
                      setEmployeesSubFilter('all');
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50/80 text-blue-700 font-bold border border-blue-100 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.indicator === 'check' && (
                      <Check className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    )}
                    {item.indicator === 'chevron' && (
                      <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    )}
                  </div>
                </button>

                {/* Submenu for Employees matching image.png */}
                {item.key === 'Employees' && item.hasSubmenu && isActive && (
                  <div className="pl-9 pr-2 py-1 space-y-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('Employees');
                        setEmployeesSubFilter('all');
                      }}
                      className={`w-full text-left py-1 text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                        employeesSubFilter === 'all'
                          ? 'text-blue-700 font-bold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${employeesSubFilter === 'all' ? 'bg-blue-600' : 'bg-slate-300'}`} />
                      <span>All Staff</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('Employees');
                        setEmployeesSubFilter('drivers');
                      }}
                      className={`w-full text-left py-1 text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                        employeesSubFilter === 'drivers'
                          ? 'text-blue-700 font-bold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${employeesSubFilter === 'drivers' ? 'bg-blue-600' : 'bg-slate-300'}`} />
                      <span>Drivers</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('Employees');
                        setEmployeesSubFilter('workers');
                      }}
                      className={`w-full text-left py-1 text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                        employeesSubFilter === 'workers'
                          ? 'text-blue-700 font-bold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${employeesSubFilter === 'workers' ? 'bg-blue-600' : 'bg-slate-300'}`} />
                      <span>Workers</span>
                    </button>
                  </div>
                )}

                {/* Submenu for Settings */}
                {item.key === 'Settings' && item.hasSubmenu && isActive && (
                  <div className="pl-9 pr-2 py-1 space-y-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('Settings');
                        setSettingsSubTab('general');
                      }}
                      className={`w-full text-left py-1 text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                        settingsSubTab === 'general'
                          ? 'text-blue-700 font-bold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${settingsSubTab === 'general' ? 'bg-blue-600' : 'bg-slate-300'}`} />
                      <span>General</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('Settings');
                        setSettingsSubTab('notifications');
                      }}
                      className={`w-full text-left py-1 text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                        settingsSubTab === 'notifications'
                          ? 'text-blue-700 font-bold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${settingsSubTab === 'notifications' ? 'bg-blue-600' : 'bg-slate-300'}`} />
                      <span>Notifications</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('Settings');
                        setSettingsSubTab('security');
                      }}
                      className={`w-full text-left py-1 text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                        settingsSubTab === 'security'
                          ? 'text-blue-700 font-bold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${settingsSubTab === 'security' ? 'bg-blue-600' : 'bg-slate-300'}`} />
                      <span>Security</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('Integrations');
                      }}
                      className="w-full text-left py-1 text-xs flex items-center gap-2 cursor-pointer transition-colors text-slate-500 hover:text-slate-900"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      <span>Integrations</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('Settings');
                        setSettingsSubTab('audit_logs');
                      }}
                      className={`w-full text-left py-1 text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                        settingsSubTab === 'audit_logs'
                          ? 'text-blue-700 font-bold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${settingsSubTab === 'audit_logs' ? 'bg-blue-600' : 'bg-slate-300'}`} />
                      <span>Audit Logs</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Employees Control Card Matching Reference */}
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs">
            <div className="text-[11px] font-bold text-slate-700 mb-2">Employees Control</div>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <button 
                onClick={() => { setActiveTab('Employees'); setEmployeesSubFilter('all'); }}
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Table View"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setActiveTab('Settings')}
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
            <button 
              onClick={() => setActiveTab('Employees')}
              className="w-full py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer text-center"
            >
              Add actions
            </button>
          </div>
        </div>

        {/* Profile, Theme & Logout (Bottom of Sidebar Matching Reference) */}
        <div className="p-3 border-t border-slate-200 space-y-2 bg-white">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-slate-500">Theme</span>
            <ThemeToggle variant="segmented" />
          </div>
          <button
            onClick={() => setActiveTab('Settings')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <UserIcon className="w-4 h-4 text-slate-400" />
            <span>Profile</span>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE DRAWER OVERLAY */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 bg-white text-slate-700 flex flex-col h-full z-50 p-4 border-r border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#E04F11] flex items-center justify-center text-white font-bold text-xs">
                  <Flame className="w-4 h-4 fill-white" />
                </div>
                <div>
                  <span className="font-black text-slate-900 text-sm">GasDeliver</span>
                  <div className="text-[10px] text-slate-400">Safe Gas. On Time.</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-1 flex-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <div key={item.key} className="space-y-0.5">
                    <button
                      key={item.key}
                      onClick={() => {
                        setActiveTab(item.key);
                        if (item.key !== 'Employees') {
                          setMobileMenuOpen(false);
                        } else {
                          setEmployeesSubFilter('all');
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold ${
                        isActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {item.badge}
                        </span>
                      )}
                    </button>

                    {item.key === 'Employees' && item.hasSubmenu && isActive && (
                      <div className="pl-8 pr-2 py-1 space-y-1">
                        <button
                          onClick={() => {
                            setEmployeesSubFilter('all');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full text-left py-1 text-xs ${employeesSubFilter === 'all' ? 'text-blue-700 font-bold' : 'text-slate-500'}`}
                        >
                          • All Staff
                        </button>
                        <button
                          onClick={() => {
                            setEmployeesSubFilter('drivers');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full text-left py-1 text-xs ${employeesSubFilter === 'drivers' ? 'text-blue-700 font-bold' : 'text-slate-500'}`}
                        >
                          • Drivers
                        </button>
                        <button
                          onClick={() => {
                            setEmployeesSubFilter('workers');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full text-left py-1 text-xs ${employeesSubFilter === 'workers' ? 'text-blue-700 font-bold' : 'text-slate-500'}`}
                        >
                          • Workers
                        </button>
                      </div>
                    )}

                    {item.key === 'Settings' && item.hasSubmenu && isActive && (
                      <div className="pl-8 pr-2 py-1 space-y-1">
                        <button
                          onClick={() => {
                            setSettingsSubTab('general');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full text-left py-1 text-xs ${settingsSubTab === 'general' ? 'text-blue-700 font-bold' : 'text-slate-500'}`}
                        >
                          • General
                        </button>
                        <button
                          onClick={() => {
                            setSettingsSubTab('notifications');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full text-left py-1 text-xs ${settingsSubTab === 'notifications' ? 'text-blue-700 font-bold' : 'text-slate-500'}`}
                        >
                          • Notifications
                        </button>
                        <button
                          onClick={() => {
                            setSettingsSubTab('security');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full text-left py-1 text-xs ${settingsSubTab === 'security' ? 'text-blue-700 font-bold' : 'text-slate-500'}`}
                        >
                          • Security
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('Integrations');
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left py-1 text-xs text-slate-500"
                        >
                          • Integrations
                        </button>
                        <button
                          onClick={() => {
                            setSettingsSubTab('audit_logs');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full text-left py-1 text-xs ${settingsSubTab === 'audit_logs' ? 'text-blue-700 font-bold' : 'text-slate-500'}`}
                        >
                          • Audit Logs
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">Theme</span>
                <ThemeToggle variant="segmented" />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-700 font-bold">Admin</div>
                <button onClick={logout} className="text-rose-600 text-xs font-semibold">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE */}
      {/* ========================================================================= */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Sticky Operations Header */}
        <header className="bg-white/95 backdrop-blur-xs border-b border-slate-200/90 sticky top-0 z-30 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Quick Search matching image.png */}
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employees, drivers, orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50/90 hover:bg-slate-100/70 focus:bg-white border border-slate-200/90 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#E04F11] transition-all"
              />
            </div>

            <div className="truncate sm:hidden">
              <h1 className="text-base font-bold text-slate-900 truncate">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Quick Search on Right (Matching image.png) */}
            <div className="relative hidden md:block">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-36 pl-8 pr-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#E04F11] transition-all"
              />
            </div>

            {/* Live SSE Telemetry Status */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-50 border border-slate-200 text-slate-700">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-mono text-[10px] tracking-wider uppercase text-slate-600">
                {isConnected ? 'Realtime Sync Active' : 'Connecting...'}
              </span>
            </div>

            {/* Calendar / Date Button matching reference */}
            <button
              onClick={() => setActiveTab('Orders')}
              title="Filter by date range"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
            </button>

            {/* Refresh Button */}
            <button
              onClick={loadData}
              title="Refresh operational feeds"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#E04F11]' : ''}`} />
            </button>

            {/* Dark/Light Theme Toggle */}
            <ThemeToggle />

            {/* Notifications with real badge */}
            <button
              onClick={clearNotifications}
              title="Notifications"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 relative transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-rose-600 text-white rounded-full text-[10px] font-black flex items-center justify-center animate-bounce">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </button>

            {/* Profile Menu: AD + Admin + Administrator */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-950 text-white flex items-center justify-center font-bold text-[11px]">
                  AD
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 leading-none">
                    Admin
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold mt-0.5">
                    Administrator
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <OperationsControlMenu
                    ordersCount={orders.length}
                    driversCount={drivers.length}
                    onRefresh={loadData}
                    onLogout={logout}
                    onNavigateToDispatch={() => {
                      setActiveTab('Dispatch');
                      setProfileDropdownOpen(false);
                    }}
                    onClose={() => setProfileDropdownOpen(false)}
                  />
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto relative">
          {/* Real-time Event Toast Banner */}
          {liveToast && (
            <div className="fixed top-20 right-6 z-50 max-w-sm w-full bg-white rounded-xl shadow-lg border border-slate-200 p-3.5 flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0 animate-ping" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 tracking-tight">
                  {liveToast.title}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                  {liveToast.message}
                </div>
              </div>
              <button
                onClick={() => setLiveToast(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Tab Views */}
          {activeTab === 'Overview' && metrics && (
            <OperationsCenterView
              orders={orders}
              drivers={drivers}
              products={products}
              metrics={metrics}
              onNavigateToDispatch={(orderId) => {
                setActiveTab('Dispatch');
                if (orderId) {
                  const target = orders.find((o) => o.id === orderId);
                  if (target) setSelectedOrder(target);
                }
              }}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'Orders' && (
            <DispatchBoard
              orders={orders}
              drivers={drivers}
              onAssignDriver={handleAssignDriver}
              onUpdateStatus={handleUpdateStatus}
              onSelectOrder={(order) => setSelectedOrder(order)}
              onDeleteOrder={async (orderId, reason) => {
                await api.deleteOrder(orderId, reason);
                await loadData();
              }}
              onRestoreOrder={async (orderId) => {
                await api.restoreOrder(orderId);
                await loadData();
              }}
            />
          )}

          {activeTab === 'Customers' && (
            <CustomersView
              onRefresh={loadData}
              onNavigateToOrders={(orderId) => {
                setActiveTab('Orders');
                if (orderId) {
                  const target = orders.find((o) => o.id === orderId);
                  if (target) setSelectedOrder(target);
                }
              }}
            />
          )}

          {activeTab === 'Dispatch' && (
            <DispatchCenterView
              orders={orders}
              drivers={drivers}
              onAssignDriver={handleAssignDriver}
              onRefresh={loadData}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'Drivers' && (
            <DriversView drivers={drivers} orders={orders} onRefresh={loadData} />
          )}

          {activeTab === 'Verifications' && (
            <DriverVerificationsView onRefreshParent={loadData} />
          )}

          {activeTab === 'Employees' && (
            <EmployeesView 
              onRefresh={loadData}
              subFilter={employeesSubFilter}
              onSubFilterChange={setEmployeesSubFilter}
              onNavigateToSettings={() => setActiveTab('Settings')}
              globalSearchQuery={searchQuery}
            />
          )}

          {activeTab === 'Archive' && (
            <ArchiveManagerView
              onRefresh={loadData}
              onNavigateToEmployees={() => setActiveTab('Employees')}
              onNavigateToOrders={() => setActiveTab('Orders')}
            />
          )}

          {activeTab === 'Inventory' && (
            <InventoryView products={products} onRefresh={loadData} />
          )}

          {activeTab === 'Brands' && (
            <GasBrandsView onRefresh={loadData} />
          )}

          {activeTab === 'Analytics' && metrics && (
            <AnalyticsView
              metrics={metrics}
              orders={orders}
              isLoading={isLoading}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'Integrations' && (
            <IntegrationsView onNavigateTab={(tab) => {
              if (tab === 'settings') {
                setActiveTab('Settings');
              } else {
                setActiveTab(tab);
              }
            }} />
          )}

          {activeTab === 'Settings' && (
            <SettingsView onRefresh={loadData} defaultSubTab={settingsSubTab} />
          )}
        </main>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Order #{selectedOrder.id}</h3>
                <span className="text-xs text-gray-400">{selectedOrder.createdAt}</span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div>
                <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block mb-1">
                  Customer
                </span>
                <p className="font-bold text-gray-900 text-base">{selectedOrder.customerName}</p>
                <p className="text-gray-500">{selectedOrder.customerPhone}</p>
              </div>

              <div>
                <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block mb-1">
                  Delivery Destination
                </span>
                <p className="text-gray-800">{selectedOrder.deliveryAddress.street}</p>
                <p className="text-gray-800">
                  {selectedOrder.deliveryAddress.city}, {selectedOrder.deliveryAddress.zipCode}
                </p>
                {selectedOrder.deliveryAddress.landmark && (
                  <p className="text-gray-500 italic mt-1">
                    Note: {selectedOrder.deliveryAddress.landmark}
                  </p>
                )}
              </div>

              <div>
                <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block mb-1">
                  Items & Pricing
                </span>
                <p className="font-semibold text-gray-900">{selectedOrder.cylinderSummary}</p>
                <p className="text-base font-extrabold text-[#E04F11] mt-1">
                  Total: {formatKSh(selectedOrder.total)} ({selectedOrder.paymentMethod || 'M-Pesa'})
                </p>
              </div>

              <div>
                <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block mb-1">
                  Driver & Status
                </span>
                <p className="text-gray-800">
                  Assigned Driver: <strong>{selectedOrder.driverName || 'None assigned yet'}</strong>
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={async () => {
                      await handleUpdateStatus(selectedOrder.id, 'Dispatched');
                      setSelectedOrder(null);
                    }}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 font-semibold rounded-lg text-xs hover:bg-blue-100 cursor-pointer"
                  >
                    Set Dispatched
                  </button>
                  <button
                    onClick={async () => {
                      await handleUpdateStatus(selectedOrder.id, 'Out for Delivery');
                      setSelectedOrder(null);
                    }}
                    className="px-3 py-1.5 bg-[#FFF5EE] text-[#E04F11] font-semibold rounded-lg text-xs hover:bg-[#FEECE2] cursor-pointer"
                  >
                    Set Out for Delivery
                  </button>
                  <button
                    onClick={async () => {
                      await handleUpdateStatus(selectedOrder.id, 'Delivered');
                      setSelectedOrder(null);
                    }}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-semibold rounded-lg text-xs hover:bg-emerald-100 cursor-pointer"
                  >
                    Mark Delivered
                  </button>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  {selectedOrder.isArchived || selectedOrder.status === 'Archived' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await api.restoreOrder(selectedOrder.id);
                        await loadData();
                        setSelectedOrder(null);
                      }}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-xs hover:bg-emerald-100 cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore Order to Active</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        await api.deleteOrder(selectedOrder.id, 'Soft-deleted by Administrator via Order Detail Dialog');
                        await loadData();
                        setSelectedOrder(null);
                      }}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 font-bold rounded-lg text-xs hover:bg-rose-100 cursor-pointer flex items-center gap-1.5"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Soft Delete / Archive Order</span>
                    </button>
                  )}
                  <span className="text-[11px] text-gray-400">
                    {selectedOrder.isArchived ? 'Archived record' : 'Audit-logged soft delete'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
