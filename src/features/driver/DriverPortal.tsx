import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DashboardSidebar } from '../../components/DashboardSidebar';
import { DashboardTopHeader } from '../../components/DashboardTopHeader';
import { ProofOfDeliveryModal } from './ProofOfDeliveryModal';
import { DeliveryIssueModal } from './DeliveryIssueModal';
import { DriverEarningsDashboard } from './DriverEarningsDashboard';
import { DriverProfileModal } from './DriverProfileModal';
import { DriverStatsSection } from './DriverStatsSection';
import { DeliveryPerformanceChart } from './DeliveryPerformanceChart';
import { TodaysWorkPanel } from './TodaysWorkPanel';
import { ActiveDeliverySection } from './ActiveDeliverySection';
import { ActiveDeliveriesView } from './ActiveDeliveriesView';
import { VehicleStatusCard } from './VehicleStatusCard';
import { DriverNotificationsCard, DriverNotificationItem } from './DriverNotificationsCard';
import { ThikaDemandDensityMap, DensityMapMode } from './ThikaDemandDensityMap';
import { AccessDenied } from '../../components/AccessDenied';
import { Order, OrderStatus, Driver, DriverStatus, DriverEarningsSummary } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import {
  Calendar,
  CheckCircle2,
  Wallet,
  AlertCircle,
  Clock,
  RefreshCw,
  LayoutDashboard,
  Package,
  Building2,
  Flame
} from 'lucide-react';

export const DriverPortal: React.FC = () => {
  const { user, logout } = useAuth();
  const { subscribe, isConnected } = useRealtime();

  // Role Protection
  if (user?.role !== 'driver') {
    return (
      <AccessDenied
        currentRole={user?.role || 'unauthorized'}
        targetDashboard="Driver"
        onLogout={logout}
      />
    );
  }

  // Navigation state
  const [activeNavId, setActiveNavId] = useState<string>('home');
  const [driver, setDriver] = useState<Driver | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allCorridorOrders, setAllCorridorOrders] = useState<Order[]>([]);
  const [densityMode, setDensityMode] = useState<DensityMapMode>('subtle');
  const [selectedDemandZoneId, setSelectedDemandZoneId] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<DriverEarningsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Selected active order override (if driver selects a different queued order)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Modals
  const [showPodModal, setShowPodModal] = useState<boolean>(false);
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false);
  const [showEarningsModal, setShowEarningsModal] = useState<boolean>(false);
  const [showQueueModal, setShowQueueModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Notice Banner
  const [actionNotice, setActionNotice] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);
  const [isSubmittingPod, setIsSubmittingPod] = useState<boolean>(false);
  const [podErrorMessage, setPodErrorMessage] = useState<string | null>(null);

  // Live Notifications
  const [notifications, setNotifications] = useState<DriverNotificationItem[]>([]);

  // Load Driver Profile, Orders & Real Earnings Data from Backend
  const loadDriverData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [allDrivers, allOrders] = await Promise.all([
        api.getDrivers(),
        api.getOrders()
      ]);

      // Match current logged-in driver from API or state
      const currentDriver =
        allDrivers.find(
          (d) =>
            d.id === user?.id ||
            d.email === user?.email ||
            d.phone === user?.phone
        ) || allDrivers[0] || null;

      setDriver(currentDriver);

      // Filter orders assigned to this driver or active delivery corridor
      const driverOrders = currentDriver
        ? allOrders.filter(
            (o) =>
              o.driverId === currentDriver.id ||
              o.driverName === currentDriver.name ||
              (o.status === 'Assigned' && !o.driverId) ||
              o.status === 'Dispatched' ||
              o.status === 'En Route' ||
              o.status === 'Out for Delivery' ||
              o.status === 'Arrived'
          )
        : [];

      setOrders(driverOrders);
      setAllCorridorOrders(allOrders);

      // Load Real Driver Earnings from Backend API
      if (currentDriver?.id) {
        try {
          const earningsData = await api.getDriverEarnings(currentDriver.id);
          setEarnings(earningsData);
        } catch (earningsErr) {
          console.error('Failed to load driver earnings from backend', earningsErr);
        }
      }
    } catch (err) {
      console.error('Failed to load driver data', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDriverData();

    // Subscribe to real-time events
    const unsubscribe = subscribe((event) => {
      if (
        event.type === 'ORDER_CREATED' ||
        event.type === 'DRIVER_ASSIGNED' ||
        event.type.startsWith('ORDER_') ||
        event.type === 'CUSTOMER_LOCATION_UPDATED' ||
        event.type === 'DELIVERY_DISPATCHED'
      ) {
        loadDriverData();

        if (event.type === 'ORDER_CREATED') {
          const ord = event.data;
          setActionNotice({
            type: 'info',
            message: `New Order #${ord?.id || ''} added to corridor pool (${ord?.cylinderBrand || ''} ${ord?.thikaHighwayZone || ''}).`
          });
          setNotifications((prev) => [
            {
              id: `notif-${Date.now()}`,
              title: `New Order in Corridor (${ord?.thikaHighwayZone || 'Thika Road'})`,
              message: `Order #${ord?.id || ''} - ${ord?.cylinderSummary || 'Gas cylinder delivery request'}.`,
              time: 'Just now',
              severity: 'info'
            },
            ...prev
          ]);
          setTimeout(() => setActionNotice(null), 6000);
        } else if (event.type === 'DRIVER_ASSIGNED') {
          const payload = event.data;
          const assignedDriverId = payload?.driver?.id || payload?.driverId;
          const currentId = driver?.id || user?.id;
          const isAssignedToMe = Boolean(currentId && assignedDriverId === currentId);

          const ord = payload?.order || payload;
          if (ord && ord.id) {
            setAllCorridorOrders((prev) => [ord, ...prev.filter((o) => o.id !== ord.id)]);
            if (isAssignedToMe) {
              setOrders((prev) => [ord, ...prev.filter((o) => o.id !== ord.id)]);
              setSelectedOrderId(ord.id);
            }
          }

          if (isAssignedToMe) {
            const custName = ord?.customerName || 'Customer';
            const gasDetails = ord?.cylinderSummary || `${ord?.cylinderBrand || 'Gas'} ${ord?.cylinderSize || ''}`;
            setActionNotice({
              type: 'success',
              message: `Order #${ord?.id} for ${custName} (${gasDetails}) assigned to you. Live customer GPS & order details are now active.`
            });
            setNotifications((prev) => [
              {
                id: `notif-${Date.now()}`,
                title: 'New Gas Delivery Assigned',
                message: `Order #${ord?.id} for ${custName} (${gasDetails}) is now in your active queue.`,
                time: 'Just now',
                severity: 'success'
              },
              ...prev
            ]);
            setTimeout(() => setActionNotice(null), 8000);
          }
        } else if (event.type === 'CUSTOMER_LOCATION_UPDATED') {
          const { orderId, customerLiveLocation } = event.data || {};
          if (orderId && customerLiveLocation) {
            setOrders((prev) =>
              prev.map((o) => (o.id === orderId ? { ...o, customerLiveLocation } : o))
            );
            setAllCorridorOrders((prev) =>
              prev.map((o) => (o.id === orderId ? { ...o, customerLiveLocation } : o))
            );
          }
          setActionNotice({
            type: 'info',
            message: 'Customer shared updated live doorstep GPS coordinates.'
          });
          setNotifications((prev) => [
            {
              id: `notif-${Date.now()}`,
              title: 'Customer Doorstep GPS Updated',
              message: 'Live coordinates refreshed from customer device.',
              time: 'Just now',
              severity: 'info'
            },
            ...prev
          ]);
          setTimeout(() => setActionNotice(null), 6000);
        } else if (event.type === 'ORDER_UPDATED') {
          const ord = event.data;
          if (ord && ord.id) {
            setOrders((prev) => prev.map((o) => (o.id === ord.id ? { ...o, ...ord } : o)));
            setAllCorridorOrders((prev) => prev.map((o) => (o.id === ord.id ? { ...o, ...ord } : o)));
          }
        }
      }
    });

    return () => unsubscribe();
  }, [loadDriverData, subscribe, user?.id]);

  // Determine Active Delivery with Priority Hierarchy
  const activeOrder = useMemo(() => {
    if (selectedOrderId) {
      const found = orders.find((o) => o.id === selectedOrderId);
      if (found) return found;
    }

    // 1. Highest: Arrived
    const arrived = orders.find((o) => o.status === 'Arrived');
    if (arrived) return arrived;

    // 2. En Route / Out for Delivery
    const enRoute = orders.find(
      (o) => o.status === 'En Route' || o.status === 'Out for Delivery'
    );
    if (enRoute) return enRoute;

    // 3. Accepted
    const accepted = orders.find((o) => o.status === 'Accepted');
    if (accepted) return accepted;

    // 4. Assigned / Dispatched
    const assigned = orders.find(
      (o) => o.status === 'Assigned' || o.status === 'Dispatched'
    );
    if (assigned) return assigned;

    // Fallback: Most recent incomplete order or first order
    return (
      orders.find((o) => o.status !== 'Delivered' && o.status !== 'Cancelled') ||
      orders[0] ||
      null
    );
  }, [orders, selectedOrderId]);

  // Completed deliveries count
  const completedOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === 'Delivered').length;
  }, [orders]);

  // Online / Offline Toggle
  const handleToggleOnline = async () => {
    if (!driver) return;
    try {
      setIsUpdatingStatus(true);
      const newStatus: DriverStatus =
        driver.status === 'Online' ? 'Offline' : 'Online';
      const updated = await api.updateDriverStatus(driver.id, newStatus);
      setDriver(updated);
      setActionNotice({
        type: 'success',
        message: `Driver operational status switched to ${newStatus}.`
      });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (e) {
      console.error('Failed to toggle status', e);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Google Maps Navigation URL
  const navigationUrl = useMemo(() => {
    if (!activeOrder) return 'https://maps.google.com';
    if (
      activeOrder.customerLiveLocation?.isSharing &&
      activeOrder.customerLiveLocation.lat
    ) {
      return `https://www.google.com/maps/dir/?api=1&destination=${activeOrder.customerLiveLocation.lat},${activeOrder.customerLiveLocation.lng}`;
    }
    const street = activeOrder.deliveryAddress?.street || 'Lumumba Drive, near TRM';
    const zone = activeOrder.deliveryAddress?.thikaHighwayZone || 'Roysambu';
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${street}, ${zone}, Nairobi, Kenya`
    )}`;
  }, [activeOrder]);

  // Start Navigation Action (Opens in new tab/window)
  const handleStartNavigation = () => {
    window.open(navigationUrl, '_blank', 'noopener,noreferrer');
  };

  // Mark Arrived Action
  const handleMarkArrived = async () => {
    if (!activeOrder) return;
    try {
      setIsUpdatingStatus(true);
      await api.updateOrderStatus(activeOrder.id, 'Arrived');
      setActionNotice({
        type: 'success',
        message: `Order #${activeOrder.id} marked as Arrived at Gate.`
      });
      setTimeout(() => setActionNotice(null), 5000);
      loadDriverData();
    } catch (err) {
      console.error('Failed to mark order as arrived', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Confirm Delivery / Complete POD Handler
  const handleCompleteDeliveryPod = async (podData: any) => {
    if (!activeOrder) return;
    try {
      setIsSubmittingPod(true);
      setPodErrorMessage(null);

      await api.updateOrderStatus(activeOrder.id, 'Delivered', {
        deliveredAt: new Date().toISOString(),
        photoUrl: podData.photoUrl || podData.signatureUrl || undefined,
        signatureUrl: podData.signatureUrl || undefined,
        signatureName: podData.signatureName || activeOrder.customerName || undefined,
        cylindersCollectedCount: podData.cylinderExchangeCount ?? podData.cylindersCollectedCount ?? 1,
        cylindersDeliveredCount: podData.deliveredQuantity ?? podData.cylindersDeliveredCount ?? 1,
        inspectionNotes: podData.deliveryNotes || podData.inspectionNotes || 'Cylinder inspected and leak-tested.'
      });

      setShowPodModal(false);
      setActionNotice({
        type: 'success',
        message: `Delivery #${activeOrder.id} verified and completed!`
      });
      setTimeout(() => setActionNotice(null), 6000);
      loadDriverData();
    } catch (err: any) {
      setPodErrorMessage(err?.message || 'Failed to submit proof of delivery.');
    } finally {
      setIsSubmittingPod(false);
    }
  };

  // Call Customer Action
  const handleCallCustomer = () => {
    const phone = activeOrder?.customerPhone || '+254712345678';
    window.location.href = `tel:${phone}`;
  };

  // WhatsApp Customer Action
  const handleWhatsAppCustomer = () => {
    const phone = (activeOrder?.customerPhone || '+254712345678').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Jambo ${activeOrder?.customerName || 'Customer'}, this is ${driver?.name || 'Dennis'} your GasDeliver driver. I am en route with your cylinder order #${activeOrder?.id || ''}.`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  // Pending Depot Pickup Counter
  const pendingPickupCount = useMemo(() => {
    return orders.filter(
      (o) => o.pickupLocation && !o.pickupLocation.isPickedUp && o.status !== 'Delivered' && o.status !== 'Cancelled'
    ).length;
  }, [orders]);

  // General Order Status Update Handler (with instant reload)
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setIsUpdatingStatus(true);
      await api.updateOrderStatus(orderId, newStatus);
      setActionNotice({
        type: 'success',
        message: `Order #${orderId} status updated to "${newStatus}".`
      });
      setTimeout(() => setActionNotice(null), 4000);
      await loadDriverData();
    } catch (err: any) {
      console.error('Failed to update status', err);
      setActionNotice({
        type: 'warning',
        message: err?.message || 'Failed to update order status.'
      });
      setTimeout(() => setActionNotice(null), 5000);
      throw err;
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Claim Corridor Order Handler
  const handleClaimOrder = async (orderId: string) => {
    try {
      setIsUpdatingStatus(true);
      await api.claimOrder(orderId, driver?.id);
      setActionNotice({
        type: 'success',
        message: `Order #${orderId} claimed and accepted! Added to your active delivery queue.`
      });
      setTimeout(() => setActionNotice(null), 5000);
      await loadDriverData();
    } catch (err: any) {
      console.error('Failed to claim order', err);
      setActionNotice({
        type: 'warning',
        message: err?.message || 'Failed to claim delivery order.'
      });
      setTimeout(() => setActionNotice(null), 5000);
      throw err;
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0B0F17] text-gray-900 dark:text-slate-100 flex font-sans antialiased relative overflow-x-hidden">
      {/* 0. GEOSPATIAL VISUAL DENSITY MAP IN DRIVERPORTAL BACKGROUND */}
      <ThikaDemandDensityMap
        orders={allCorridorOrders.length > 0 ? allCorridorOrders : orders}
        densityMode={densityMode}
        onToggleMode={setDensityMode}
        selectedZoneId={selectedDemandZoneId}
        onSelectZone={setSelectedDemandZoneId}
        driverLocationName={driver?.name ? `Active near Exit 8 (${driver.name})` : 'Active near Exit 8 Roysambu'}
      />

      {/* 1. LEFT NARROW VERTICAL SIDEBAR */}
      <DashboardSidebar
        activeNavId={activeNavId}
        onSelectNav={(id) => {
          setActiveNavId(id);
          if (id === 'history') setShowEarningsModal(true);
          else if (id === 'settings') setShowProfileModal(true);
        }}
        onLogout={logout}
        userRole="driver"
      />

      {/* 2. MAIN APPLICATION WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 relative z-10">
        {/* Top Header: Logo, Driver Operations, Online status, Driver name, vehicle, rating, notification bell */}
        <DashboardTopHeader
          variant="driver"
          driverName={driver?.name || user?.name || 'Courier'}
          vehiclePlate={driver?.licensePlate || ''}
          rating={driver?.rating || 5.0}
          isOnline={driver?.status === 'Online' || driver?.status === 'On Delivery' || driver?.status === 'On Route'}
          onToggleOnline={handleToggleOnline}
          isUpdatingStatus={isUpdatingStatus}
          unreadCount={notifications.length}
          onNotificationsClick={() => {
            setActionNotice({
              type: 'info',
              message: `You have ${notifications.length} operational alerts in the Notifications panel below.`
            });
            setTimeout(() => setActionNotice(null), 5000);
          }}
          onProfileClick={() => setShowProfileModal(true)}
          onSettingsClick={() => setShowProfileModal(true)}
          onLogout={logout}
        />

        {/* Main Operational Container */}
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
          {/* Action Notice Alert */}
          {actionNotice && (
            <div
              className={`p-4 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between shadow-2xs animate-in fade-in ${
                actionNotice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : actionNotice.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{actionNotice.message}</span>
              </div>
              <button
                onClick={() => setActionNotice(null)}
                className="font-bold text-xs cursor-pointer ml-3 opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}

          {/* Primary View Navigation Switcher Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/95 dark:bg-[#131B2A]/95 backdrop-blur-md p-2 rounded-2xl border border-gray-200 dark:border-[#202D42] shadow-2xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveNavId('home')}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                  activeNavId === 'home'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Operational Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNavId('orders')}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                  activeNavId === 'orders'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Active Deliveries Queue</span>
                {pendingPickupCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white flex items-center gap-1 shadow-2xs animate-pulse">
                    <Building2 className="w-2.5 h-2.5" />
                    <span>{pendingPickupCount} Pickup{pendingPickupCount > 1 ? 's' : ''}</span>
                  </span>
                )}
              </button>

              {/* Quick Demand Heatmap Toggle Button */}
              <button
                type="button"
                onClick={() =>
                  setDensityMode((prev) =>
                    prev === 'subtle' ? 'vibrant' : prev === 'vibrant' ? 'overlay' : prev === 'overlay' ? 'off' : 'subtle'
                  )
                }
                className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors border ${
                  densityMode !== 'off'
                    ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 shadow-2xs'
                    : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
                title="Cycle Thika Corridor Demand Heatmap (Subtle -> Vibrant -> Full -> Off)"
              >
                <Flame className={`w-3.5 h-3.5 ${densityMode !== 'off' ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
                <span>Demand Map: {densityMode === 'subtle' ? 'Subtle (25%)' : densityMode === 'vibrant' ? 'High (65%)' : densityMode === 'overlay' ? 'Full' : 'Hidden'}</span>
              </button>
            </div>

            {/* Quick Refresh / Zone Indicator */}
            <div className="flex items-center gap-2 pr-2">
              <button
                type="button"
                onClick={() => loadDriverData()}
                className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 cursor-pointer"
                title="Refresh real-time data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* DYNAMIC VIEW ROUTING */}
          {activeNavId === 'orders' ? (
            /* Dedicated Interactive Active Deliveries & Pickup Queue View */
            <ActiveDeliveriesView
              orders={orders}
              allCorridorOrders={allCorridorOrders}
              activeOrder={activeOrder}
              driver={driver}
              isUpdatingStatus={isUpdatingStatus}
              onSelectOrder={(id) => {
                setSelectedOrderId(id);
                setActionNotice({
                  type: 'info',
                  message: `Focused route view on Order #${id}.`
                });
                setTimeout(() => setActionNotice(null), 4000);
              }}
              onUpdateStatus={handleUpdateOrderStatus}
              onClaimOrder={handleClaimOrder}
              onOpenPodModal={(ord) => {
                setSelectedOrderId(ord.id);
                setShowPodModal(true);
              }}
              onOpenIssueModal={(ord) => {
                setSelectedOrderId(ord.id);
                setShowIssueModal(true);
              }}
            />
          ) : (
            /* Standard Operations Overview Layout */
            <>
              {/* SECTION 1: DRIVER STATS (Successful Deliveries, Earnings, Rating) */}
              <DriverStatsSection
                driver={driver}
                earnings={earnings}
                completedOrdersCount={completedOrdersCount}
                isLoading={isLoading}
              />

              {/* SECTION 2: 2-COLUMN GRID (Delivery Performance Chart + Today's Work) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
                {/* Delivery Performance Recharts AreaChart (7 cols on lg) */}
                <div className="lg:col-span-7 flex flex-col">
                  <DeliveryPerformanceChart
                    earnings={earnings}
                    isLoading={isLoading}
                  />
                </div>

                {/* Today's Work Panel (5 cols on lg) */}
                <div className="lg:col-span-5 flex flex-col">
                  <TodaysWorkPanel
                    orders={orders}
                    activeOrder={activeOrder}
                    onSelectOrder={(orderId) => {
                      setSelectedOrderId(orderId);
                      setActionNotice({
                        type: 'info',
                        message: `Focus switched to Order #${orderId}.`
                      });
                      setTimeout(() => setActionNotice(null), 4000);
                    }}
                    onOpenFullQueue={() => setActiveNavId('orders')}
                  />
                </div>
              </div>

              {/* SECTION 3: ACTIVE DELIVERY / ROUTE (Full Priority Operational Card) */}
              <ActiveDeliverySection
                order={activeOrder}
                driver={driver}
                isUpdatingStatus={isUpdatingStatus}
                onStartNavigation={handleStartNavigation}
                onMarkArrived={handleMarkArrived}
                onConfirmDelivery={() => setShowPodModal(true)}
                onCallCustomer={handleCallCustomer}
                onWhatsAppCustomer={handleWhatsAppCustomer}
                onReportIssue={() => setShowIssueModal(true)}
              />

              {/* SECTION 4: VEHICLE STATUS & NOTIFICATIONS (2-Column Bottom Strip) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                {/* Vehicle Status */}
                <VehicleStatusCard
                  driver={driver}
                  onOpenVehicleModal={() => setShowProfileModal(true)}
                />

                {/* Driver Notifications */}
                <DriverNotificationsCard
                  notifications={notifications}
                />
              </div>
            </>
          )}
        </main>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: PROOF OF DELIVERY (POD)                             */}
      {/* ============================================================ */}
      {showPodModal && activeOrder && (
        <ProofOfDeliveryModal
          order={activeOrder}
          isOpen={showPodModal}
          onClose={() => setShowPodModal(false)}
          onConfirm={handleCompleteDeliveryPod}
          isSubmitting={isSubmittingPod}
          errorMessage={podErrorMessage}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL 2: REPORT DELIVERY ISSUE                               */}
      {/* ============================================================ */}
      {showIssueModal && activeOrder && (
        <DeliveryIssueModal
          order={activeOrder}
          isOpen={showIssueModal}
          onClose={() => setShowIssueModal(false)}
          onIssueReported={async (issueType, notes) => {
            setShowIssueModal(false);
            setActionNotice({
              type: 'warning',
              message: `Issue reported: "${issueType}". Central Dispatch notified.`
            });
            setTimeout(() => setActionNotice(null), 6000);
            loadDriverData();
          }}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL 3: FULL EARNINGS & CASH-OUT DASHBOARD                  */}
      {/* ============================================================ */}
      {showEarningsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-base">
                  Driver Earnings & Performance
                </h3>
              </div>
              <button
                onClick={() => setShowEarningsModal(false)}
                className="text-gray-400 hover:text-gray-700 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <DriverEarningsDashboard
              driverId={driver?.id || user?.id || ''}
              driverName={driver?.name || user?.name || 'Courier'}
              onRefreshNeeded={loadDriverData}
            />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: ROUTE QUEUE & STOP SWITCHER                         */}
      {/* ============================================================ */}
      {showQueueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-base">
                  Today's Delivery Queue
                </h3>
              </div>
              <button
                onClick={() => setShowQueueModal(false)}
                className="text-gray-400 hover:text-gray-700 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {orders.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-xs">
                  No stops queued for today.
                </div>
              ) : (
                orders.map((ord, idx) => {
                  const isCurrent = ord.id === activeOrder?.id;
                  return (
                    <div
                      key={ord.id}
                      onClick={() => {
                        setSelectedOrderId(ord.id);
                        setShowQueueModal(false);
                        setActionNotice({
                          type: 'info',
                          message: `Switched active focus to Order #${ord.id}.`
                        });
                        setTimeout(() => setActionNotice(null), 4000);
                      }}
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isCurrent
                          ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-gray-900">
                          Stop #{idx + 1}: #{ord.id}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800">
                          {ord.status}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 mt-1">{ord.customerName}</p>
                      <p className="text-gray-500 text-[11px] mt-0.5 truncate">
                        {ord.deliveryAddress?.street || 'Roysambu / TRM'}, {ord.cylinderSummary}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowQueueModal(false)}
              className="w-full min-h-[44px] py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs transition-colors cursor-pointer"
            >
              Close Queue
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: DRIVER PROFILE MODAL                                */}
      {/* ============================================================ */}
      <DriverProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        driver={driver}
        earnings={earnings}
        onOpenEarnings={() => setShowEarningsModal(true)}
      />
    </div>
  );
};
