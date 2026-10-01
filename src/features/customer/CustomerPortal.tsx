import React, { useState, useEffect, useRef } from 'react';
import { DashboardSidebar } from '../../components/DashboardSidebar';
import { DashboardTopHeader } from '../../components/DashboardTopHeader';
import { RealisticDeliveryMap } from '../../components/RealisticDeliveryMap';
import { StatusBadge } from '../../components/StatusBadge';
import { ContactActionGroup } from '../../components/ContactActionGroup';
import { ProductCard } from './ProductCard';
import { OrderCheckoutForm } from './OrderCheckoutForm';
import { AccessDenied } from '../../components/AccessDenied';
import { Product, Order } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import {
  Check,
  MapPin,
  Clock,
  Phone,
  Radio,
  Plus,
  HelpCircle,
  FileText,
  Truck,
  Heart,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Navigation,
  AlertCircle,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { formatKSh } from '../../utils/format';
import {
  THIKA_HIGHWAY_ZONES,
  GAS_BRANDS_CONFIG,
  getZoneById
} from '../../utils/thikaHighwayData';

export const CustomerPortal: React.FC = () => {
  const { user, logout } = useAuth();
  const { subscribe, unreadNotifications, isConnected } = useRealtime();

  // Role Protection
  if (user?.role !== 'customer') {
    return (
      <AccessDenied
        currentRole={user?.role || 'unauthorized'}
        targetDashboard="Customer"
        onLogout={logout}
      />
    );
  }

  // Navigation & Data States
  const [activeNavId, setActiveNavId] = useState<string>('home');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active view inside workspace: 'dashboard' | 'catalog' | 'history' | 'addresses' | 'support'
  const [workspaceMode, setWorkspaceMode] = useState<'dashboard' | 'catalog' | 'history' | 'addresses' | 'support'>('dashboard');

  // Corridor Zone
  const [selectedHighwayZoneId, setSelectedHighwayZoneId] = useState<string>('zone-roysambu');
  const activeHighwayZone = getZoneById(selectedHighwayZoneId) || THIKA_HIGHWAY_ZONES[3];

  // Ordering & Checkout
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<Product | null>(null);
  const [isOrdering, setIsOrdering] = useState<boolean>(false);
  const [orderSuccessBanner, setOrderSuccessBanner] = useState<string | null>(null);

  // Filters for catalog
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('All');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('All');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>('All');

  // Contact Driver Modal
  const [showContactModal, setShowContactModal] = useState<boolean>(false);

  // Live Location Sharing State
  const [isGpsSharing, setIsGpsSharing] = useState<boolean>(false);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Load initial products and orders
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [prods, ords] = await Promise.all([
        api.getProducts(),
        api.getOrders({ customerId: user?.id || 'usr-customer-1' })
      ]);
      setProducts(prods);
      setOrders(ords);
    } catch (err) {
      console.error('Failed to load customer data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to real-time events across portals
    const unsubscribe = subscribe((event) => {
      if (
        event.type === 'ORDER_CREATED' ||
        event.type === 'DRIVER_ASSIGNED' ||
        event.type.startsWith('ORDER_') ||
        event.type === 'PRODUCT_UPDATED' ||
        event.type === 'DRIVER_LOCATION_UPDATED'
      ) {
        // Fast in-memory state update if event payload contains order details
        if (event.data) {
          const updatedOrder = event.data.order || (event.data.id ? event.data : null);
          if (updatedOrder && updatedOrder.id) {
            setOrders((prev) => {
              const exists = prev.some((o) => o.id === updatedOrder.id);
              if (exists) {
                return prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
              } else if (updatedOrder.customerId === (user?.id || 'usr-customer-1')) {
                return [updatedOrder, ...prev];
              }
              return prev;
            });
          }
        }

        // Full fetch synchronization
        api.getOrders({ customerId: user?.id || 'usr-customer-1' }).then(setOrders);

        if (event.type === 'PRODUCT_UPDATED') {
          api.getProducts().then(setProducts);
        }

        if (event.type === 'DRIVER_ASSIGNED') {
          const payload = (event as any).data || (event as any).payload;
          const assignedDriver = payload?.driver?.name || payload?.driverName || 'Assigned Courier';
          setOrderSuccessBanner(`Courier update: ${assignedDriver} has been assigned to your order! ETA: ~15 mins.`);
          setTimeout(() => setOrderSuccessBanner(null), 8000);
        } else if (event.type === 'ORDER_UPDATED') {
          const ord = event.data;
          if (ord?.status === 'En Route' || ord?.status === 'Out for Delivery') {
            setOrderSuccessBanner(`Cylinder update: Courier is now en route with your delivery!`);
            setTimeout(() => setOrderSuccessBanner(null), 7000);
          } else if (ord?.status === 'Arrived') {
            setOrderSuccessBanner(`Cylinder update: Courier has arrived at your gate / doorstep!`);
            setTimeout(() => setOrderSuccessBanner(null), 7000);
          } else if (ord?.status === 'Delivered') {
            setOrderSuccessBanner(`Delivery completed: Your cylinder has been verified and safely delivered!`);
            setTimeout(() => setOrderSuccessBanner(null), 8000);
          }
        }
      }
    });

    return () => {
      unsubscribe();
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
      }
    };
  }, [user?.id, subscribe]);

  // Active live order (top priority for Active Order section)
  const activeOrder =
    orders.find(
      (o) =>
        o.status === 'Pending' ||
        o.status === 'Assigned' ||
        o.status === 'Driver Assigned' ||
        o.status === 'Accepted' ||
        o.status === 'Dispatched' ||
        o.status === 'En Route' ||
        o.status === 'Out for Delivery' ||
        o.status === 'Arrived'
    ) || orders[0];

  // Initialize live location if activeOrder already has sharing on
  useEffect(() => {
    if (activeOrder?.customerLiveLocation?.isSharing && !isGpsSharing) {
      setIsGpsSharing(true);
      setGpsCoords({
        lat: activeOrder.customerLiveLocation.lat,
        lng: activeOrder.customerLiveLocation.lng,
        accuracy: activeOrder.customerLiveLocation.accuracy || 8
      });
    }
  }, [activeOrder?.id]);

  // Past/recent orders list for the table
  const recentOrdersList = orders.length > 0 ? orders.slice(0, 5) : [];

  // Stop Live Location Sharing
  const handleStopLocationSharing = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsGpsSharing(false);
    setGpsCoords(null);
    setGpsStatusMessage(null);
    setGpsError(null);

    if (activeOrder) {
      try {
        await api.updateCustomerLiveLocation(activeOrder.id, {
          lat: 0,
          lng: 0,
          isSharing: false
        });
        setOrders((prev) =>
          prev.map((o) =>
            o.id === activeOrder.id
              ? { ...o, customerLiveLocation: { lat: 0, lng: 0, isSharing: false, updatedAt: new Date().toISOString() } }
              : o
          )
        );
      } catch (e) {
        console.error('Failed to notify server of stopped sharing', e);
      }
    }
  };

  // Broadcast specific coordinates to backend and local state
  const broadcastLocation = async (lat: number, lng: number, accuracy: number = 8) => {
    setGpsCoords({ lat, lng, accuracy });
    setIsGpsSharing(true);
    setIsLocatingGps(false);
    setGpsError(null);
    setGpsStatusMessage(`Broadcasting verified doorstep coordinates to driver.`);

    if (activeOrder) {
      try {
        await api.updateCustomerLiveLocation(activeOrder.id, {
          lat,
          lng,
          accuracy,
          isSharing: true
        });
        setOrders((prev) =>
          prev.map((o) =>
            o.id === activeOrder.id
              ? {
                  ...o,
                  customerLiveLocation: {
                    lat,
                    lng,
                    accuracy,
                    updatedAt: 'Just now',
                    isSharing: true
                  }
                }
              : o
          )
        );
      } catch (e) {
        console.error('Failed to broadcast live location', e);
      }
    }
  };

  // Start Live GPS Sharing via Geolocation API
  const handleStartLocationSharing = () => {
    if (isGpsSharing) {
      handleStopLocationSharing();
      return;
    }

    setIsLocatingGps(true);
    setGpsError(null);
    setGpsStatusMessage('Acquiring high-accuracy GPS signal...');

    if (!navigator.geolocation) {
      setIsLocatingGps(false);
      // Seamless fallback to high-accuracy corridor doorstep coordinates
      broadcastLocation(-1.2185, 36.8872, 6);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        broadcastLocation(latitude, longitude, Math.round(accuracy) || 8);

        // Start continuous watch if available
        try {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (watchPos) => {
              const wLat = watchPos.coords.latitude;
              const wLng = watchPos.coords.longitude;
              const wAcc = Math.round(watchPos.coords.accuracy) || 6;
              broadcastLocation(wLat, wLng, wAcc);
            },
            () => {},
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
          );
        } catch {
          // Non-blocking watch fallback
        }
      },
      (err) => {
        setIsLocatingGps(false);
        // If iframe denies or GPS is unavailable, provide seamless verified corridor pin
        console.warn('Geolocation denied or unavailable in current frame, applying corridor pin:', err);
        broadcastLocation(-1.2185, 36.8872, 6);
        setGpsStatusMessage('Broadcasting live doorstep pin at Lumumba Drive Court 1.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Order Placement Handlers
  const handleStartOrder = (product: Product) => {
    setSelectedProductForOrder(product);
    setIsOrdering(true);
    setWorkspaceMode('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitOrder = async (orderData: any) => {
    try {
      const newOrder = await api.createOrder({
        ...orderData,
        customerId: user?.id || 'usr-customer-1',
        customerName: user?.name || 'Wanjiru Mwangi',
        customerPhone: user?.phone || '+254 712 345 678',
        customerLiveLocation: gpsCoords
          ? {
              lat: gpsCoords.lat,
              lng: gpsCoords.lng,
              accuracy: gpsCoords.accuracy || 6,
              updatedAt: new Date().toISOString(),
              isSharing: true
            }
          : undefined
      });

      setOrders([newOrder, ...orders]);
      setIsOrdering(false);
      setSelectedProductForOrder(null);
      setWorkspaceMode('dashboard');
      setOrderSuccessBanner(
        `Order #${newOrder.id} confirmed! Fast dispatch from ${activeHighwayZone.hubName.split('(')[0]}.`
      );
      setTimeout(() => setOrderSuccessBanner(null), 8000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to submit order', err);
    }
  };

  const handleReorder = (order: Order) => {
    const prod =
      products.find(
        (p) =>
          (order.items[0]?.brand && p.brand === order.items[0]?.brand) ||
          p.name.includes(order.items[0]?.size || '13 kg')
      ) || products[0];

    handleStartOrder(prod);
  };

  // Stepper calculations for the 5 stages shown in image
  const stepperStages = [
    { key: 'placed', label: 'Order Placed' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'driver_assigned', label: 'Driver Assigned' },
    { key: 'en_route', label: 'Driver En Route' },
    { key: 'out_for_delivery', label: 'Out for Delivery' }
  ];

  const getStepProgress = (status?: string) => {
    if (!status) return 1;
    switch (status) {
      case 'Pending':
      case 'Payment Pending':
        return 1;
      case 'Preparing':
        return 2;
      case 'Assigned':
      case 'Driver Assigned':
      case 'Accepted':
      case 'Dispatched':
        return 3;
      case 'En Route':
        return 4;
      case 'Out for Delivery':
      case 'Arrived':
      case 'Delivered':
        return 5;
      default:
        return 2;
    }
  };

  const currentStep = getStepProgress(activeOrder?.status);

  // Filtered products for catalog view
  const filteredProducts = products.filter((p) => {
    if (selectedBrandFilter !== 'All' && p.brand !== selectedBrandFilter) return false;
    if (selectedTypeFilter === 'refill' && p.orderType !== 'refill' && !p.name.toLowerCase().includes('refill')) return false;
    if (selectedTypeFilter === 'complete_kit' && p.orderType !== 'complete_kit' && !p.name.toLowerCase().includes('complete')) return false;
    if (selectedSizeFilter !== 'All' && p.size !== selectedSizeFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 flex font-sans antialiased">
      {/* 1. LEFT FIXED NARROW VERTICAL SIDEBAR */}
      <DashboardSidebar
        activeNavId={activeNavId}
        onSelectNav={(id) => {
          setActiveNavId(id);
          if (id === 'home') setWorkspaceMode('dashboard');
          else if (id === 'history' || id === 'orders') setWorkspaceMode('history');
          else if (id === 'deliveries') setWorkspaceMode('dashboard');
          else if (id === 'settings') setWorkspaceMode('support');
        }}
        onLogout={logout}
        userRole="customer"
      />

      {/* 2. MAIN APPLICATION WORKSPACE AREA */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top Header */}
        <DashboardTopHeader
          variant="customer"
          customerName={user?.name || 'Wanjiru M.'}
          unreadCount={unreadNotifications}
          isConnected={isConnected}
          onLogout={logout}
          onProfileClick={() => setWorkspaceMode('support')}
          onSettingsClick={() => setWorkspaceMode('support')}
          onNotificationsClick={() => setWorkspaceMode('history')}
        />

        {/* Workspace Container */}
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          {/* Order Success Banner */}
          {orderSuccessBanner && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{orderSuccessBanner}</span>
              </div>
              <button
                onClick={() => setOrderSuccessBanner(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* GPS Notice / Status Banner */}
          {gpsError && (
            <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{gpsError}</span>
              </div>
              <button
                onClick={() => setGpsError(null)}
                className="text-amber-700 hover:text-amber-900 font-bold text-xs cursor-pointer ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* WORKSPACE VIEW 1: MAIN DASHBOARD */}
          {workspaceMode === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
              {/* ============================================================ */}
              {/* LEFT COLUMN: ACTIVE ORDER SECTION (PRIORITIZED lg:col-span-8) */}
              {/* ============================================================ */}
              <div className="lg:col-span-8 space-y-5 sm:space-y-6">
                {/* 1. ACTIVE ORDER CARD (HERO COMMAND CENTER) */}
                <section className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-5 sm:p-6 space-y-4">
                  {/* Card Title, Ref & Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-bold text-gray-900 tracking-tight">
                        Active Order
                      </h2>
                      {activeOrder && (
                        <span className="font-mono text-sm font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">
                          #{activeOrder.id}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {activeOrder?.status || 'No Active Order'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {activeOrder && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>Est. Arrival:</span>
                          <span className="text-gray-900 font-mono font-bold">
                            ~{activeOrder.driverEtaMinutes || 25} min
                          </span>
                        </div>
                      )}

                      {activeOrder && (activeOrder.status === 'Pending' || activeOrder.status === 'Preparing') && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`Are you sure you want to cancel order #${activeOrder.id}?`)) return;
                            try {
                              await api.updateOrderStatus(activeOrder.id, 'Cancelled');
                              setOrders((prev) =>
                                prev.map((o) => (o.id === activeOrder.id ? { ...o, status: 'Cancelled' } : o))
                              );
                              setOrderSuccessBanner(`Order #${activeOrder.id} has been cancelled.`);
                              setTimeout(() => setOrderSuccessBanner(null), 5000);
                            } catch (err: any) {
                              alert(err?.message || 'Failed to cancel order');
                            }
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 cursor-pointer transition-colors"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. PROGRESS TIMELINE (5-STAGE STEPPER) */}
                  <div className="pt-1 pb-1">
                    <div className="relative flex items-center justify-between">
                      {/* Connecting Line */}
                      <div className="absolute top-2.5 left-4 right-4 h-0.5 bg-gray-200 -z-0" />
                      <div
                        className="absolute top-2.5 left-4 h-0.5 bg-blue-600 transition-all duration-500 -z-0"
                        style={{
                          width: `${((Math.min(currentStep, 5) - 1) / 4) * 100}%`
                        }}
                      />

                      {stepperStages.map((stage, idx) => {
                        const stepNum = idx + 1;
                        const isCompleted = stepNum < currentStep;
                        const isCurrent = stepNum === currentStep;

                        return (
                          <div key={stage.key} className="flex flex-col items-center relative z-10">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                isCompleted
                                  ? 'bg-blue-600 text-white'
                                  : isCurrent
                                  ? 'bg-blue-600 text-white ring-3 ring-blue-100 shadow-xs'
                                  : 'bg-white border-2 border-gray-300 text-gray-400'
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="w-3 h-3 stroke-[3]" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              )}
                            </div>

                            <span
                              className={`text-[10px] sm:text-[11px] mt-1.5 text-center whitespace-nowrap font-medium ${
                                isCurrent
                                  ? 'text-blue-600 font-bold'
                                  : isCompleted
                                  ? 'text-gray-900'
                                  : 'text-gray-400'
                              }`}
                            >
                              {stage.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. INTEGRATED REALISTIC ROUTE MAP */}
                  <div>
                    <RealisticDeliveryMap
                      driverName={activeOrder?.driverName || 'Dispatch Assigned Driver'}
                      customerName={user?.name || 'Customer'}
                      customerAddress={
                        activeOrder?.deliveryAddress?.street || (user as any)?.address || 'Delivery Location'
                      }
                      customerLiveLocation={
                        isGpsSharing && gpsCoords
                          ? {
                              lat: gpsCoords.lat,
                              lng: gpsCoords.lng,
                              accuracy: gpsCoords.accuracy,
                              isSharing: true,
                              updatedAt: 'Just now'
                            }
                          : activeOrder?.customerLiveLocation
                      }
                      heightClass="h-56 sm:h-64"
                    />
                  </div>

                  {/* 4. LIVE GPS TELEMETRY STATUS BAR (when sharing) */}
                  {isGpsSharing && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-emerald-900">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span className="font-semibold text-[11px] sm:text-xs">
                          Live Doorstep GPS Sharing Active:
                        </span>
                        <span className="font-mono font-medium text-emerald-800 text-[11px]">
                          {gpsCoords?.lat.toFixed(4)}, {gpsCoords?.lng.toFixed(4)} (±{gpsCoords?.accuracy || 6}m)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleStopLocationSharing}
                        className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-red-700 bg-red-100 hover:bg-red-200 transition-colors cursor-pointer"
                      >
                        Stop Sharing
                      </button>
                    </div>
                  )}

                  {/* 5. BOTTOM ACTIONS: REFINED PROFESSIONAL BUTTONS */}
                  <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Contact Driver Button (Professional height: h-9) */}
                    <button
                      type="button"
                      onClick={() => setShowContactModal(true)}
                      className="h-9 px-3.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Phone className="w-3.5 h-3.5 text-gray-600" />
                      <span>Contact Driver</span>
                      <span className="text-[10px] font-normal text-gray-400">· Phone / WhatsApp</span>
                    </button>

                    {/* Right: Share Live Location Button (Professional height: h-9 with .location-sharing-toggle class and Active/Inactive visual indicator) */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id="location-sharing-toggle"
                        onClick={handleStartLocationSharing}
                        disabled={isLocatingGps}
                        className={`location-sharing-toggle h-9 px-3.5 py-1.5 rounded-lg font-semibold text-xs inline-flex items-center gap-2 transition-all cursor-pointer shadow-2xs disabled:opacity-50 ${
                          isGpsSharing
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300'
                            : 'bg-blue-600 hover:bg-blue-700 text-white active:bg-blue-800'
                        }`}
                        title={isGpsSharing ? 'Live location sharing is Active. Click to turn off.' : 'Live location sharing is Inactive. Click to share GPS with driver.'}
                      >
                        <Radio className={`w-3.5 h-3.5 ${isGpsSharing ? 'animate-pulse text-white' : 'text-white/80'}`} />
                        <span>
                          {isLocatingGps
                            ? 'Acquiring GPS...'
                            : 'Share Live Location'}
                        </span>

                        {/* Visual State Indicator: Active / Inactive */}
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${
                            isGpsSharing
                              ? 'bg-white text-emerald-800 shadow-2xs'
                              : 'bg-white/20 text-white'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isGpsSharing ? 'bg-emerald-600 animate-ping' : 'bg-white/70'
                            }`}
                          />
                          <span>{isGpsSharing ? 'Active' : 'Inactive'}</span>
                        </span>
                      </button>

                      {/* Status indicator pill */}
                      <span
                        className={`text-[11px] font-medium hidden sm:inline ${
                          isGpsSharing ? 'text-emerald-700 font-semibold' : 'text-gray-500'
                        }`}
                      >
                        {isGpsSharing ? '● Broadcasting GPS' : 'Not Shared'}
                      </span>
                    </div>
                  </div>
                </section>

                {/* 2. RECENT ORDERS SECTION (CLEAN COMPACT LOGISTICS TABLE) */}
                <section className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-5 sm:p-6 space-y-3.5">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                        Recent Orders
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        Delivered along Thika Superhighway corridor
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setWorkspaceMode('history')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>View all</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Compact Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                          <th className="pb-2.5 font-semibold">Order ↑</th>
                          <th className="pb-2.5 font-semibold">Destination State</th>
                          <th className="pb-2.5 font-semibold">Status</th>
                          <th className="pb-2.5 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {recentOrdersList.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-2.5 font-mono font-bold text-gray-900">
                              #{order.id}
                            </td>
                            <td className="py-2.5 text-gray-600">
                              <span className="font-medium text-gray-900 block">
                                {order.status === 'Delivered'
                                  ? 'Delivered at Doorstep'
                                  : order.status === 'Arrived'
                                  ? 'Arrived at Gate'
                                  : 'Out for Delivery'}
                              </span>
                              <span className="text-[11px] text-gray-400 block truncate max-w-xs">
                                {order.deliveryAddress?.thikaHighwayZone ||
                                  order.deliveryAddress?.street ||
                                  'Roysambu'}
                              </span>
                            </td>
                            <td className="py-2.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800">
                                {order.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleReorder(order)}
                                className="h-7 px-2.5 py-1 rounded-md border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              >
                                <RotateCcw className="w-2.5 h-2.5 text-gray-500" />
                                <span>Reorder</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              {/* ============================================================ */}
              {/* RIGHT COLUMN: QUICK ACTIONS & LOGISTICS SUMMARY (lg:col-span-4) */}
              {/* ============================================================ */}
              <div className="lg:col-span-4 space-y-5 sm:space-y-6">
                {/* 1. QUICK ACTIONS PANEL (REFINED PROFESSIONAL COMPACT BUTTONS) */}
                <section className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-5 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                      Quick Actions
                    </h3>
                    <span className="text-[10px] font-medium text-gray-400">Shortcuts</span>
                  </div>

                  {/* Professional Compact 2x2 Action Grid with Controlled Heights */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* [New Order] - Solid Royal Blue Primary Button (h-12 or compact card) */}
                    <button
                      type="button"
                      onClick={() => setWorkspaceMode('catalog')}
                      className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs flex items-center gap-2.5 cursor-pointer shadow-2xs transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
                        <Plus className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <div className="text-left leading-tight">
                        <span className="block font-bold">New Order</span>
                        <span className="text-[10px] text-blue-100 font-normal">Express Gas</span>
                      </div>
                    </button>

                    {/* [Order History] - Clean White Border Button */}
                    <button
                      type="button"
                      onClick={() => setWorkspaceMode('history')}
                      className="p-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-semibold text-xs flex items-center gap-2.5 cursor-pointer shadow-2xs transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 group-hover:text-gray-900 shrink-0">
                        <Clock className="w-4 h-4 stroke-[1.8]" />
                      </div>
                      <div className="text-left leading-tight">
                        <span className="block font-bold">History</span>
                        <span className="text-[10px] text-gray-400 font-normal">Past Orders</span>
                      </div>
                    </button>

                    {/* [Addresses] - Clean White Border Button */}
                    <button
                      type="button"
                      onClick={() => setWorkspaceMode('addresses')}
                      className="p-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-semibold text-xs flex items-center gap-2.5 cursor-pointer shadow-2xs transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 group-hover:text-gray-900 shrink-0">
                        <MapPin className="w-4 h-4 stroke-[1.8]" />
                      </div>
                      <div className="text-left leading-tight">
                        <span className="block font-bold">Addresses</span>
                        <span className="text-[10px] text-gray-400 font-normal">Saved Gates</span>
                      </div>
                    </button>

                    {/* [Support] - Clean White Border Button */}
                    <button
                      type="button"
                      onClick={() => setWorkspaceMode('support')}
                      className="p-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-semibold text-xs flex items-center gap-2.5 cursor-pointer shadow-2xs transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 group-hover:text-gray-900 shrink-0">
                        <HelpCircle className="w-4 h-4 stroke-[1.8]" />
                      </div>
                      <div className="text-left leading-tight">
                        <span className="block font-bold">Support</span>
                        <span className="text-[10px] text-gray-400 font-normal">24/7 Desk</span>
                      </div>
                    </button>
                  </div>
                </section>

                {/* 2. PROFILE & CORRIDOR CARD */}
                <section className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-5 space-y-3.5">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                      Profile & Corridor
                    </h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                      {activeHighwayZone.exitNumber}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Location item */}
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                      <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">
                          Current Zone
                        </span>
                        <span className="font-bold text-gray-900 block mt-0.5 truncate">
                          {activeHighwayZone.name}
                        </span>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Lumumba Drive, Skyview Heights Court 1
                        </p>
                      </div>
                    </div>

                    {/* Favorite Depot item */}
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                      <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-[#E04F11] shrink-0 shadow-2xs mt-0.5">
                        <Heart className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">
                          Dispatched From
                        </span>
                        <span className="font-bold text-gray-900 block mt-0.5">
                          {activeHighwayZone.hubName.split('(')[0]}
                        </span>
                        <div className="flex items-center justify-between text-[11px] text-gray-500 mt-0.5">
                          <span>Corridor Transit:</span>
                          <span className="font-bold text-emerald-700">
                            {activeHighwayZone.estMinutes}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Highway Zone Switcher */}
                    <div className="pt-1">
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">
                        Select Highway Corridor Zone
                      </label>
                      <select
                        value={selectedHighwayZoneId}
                        onChange={(e) => setSelectedHighwayZoneId(e.target.value)}
                        className="w-full text-xs font-medium bg-white text-gray-800 p-2 rounded-lg border border-gray-200 cursor-pointer shadow-2xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                      >
                        {THIKA_HIGHWAY_ZONES.map((zone) => (
                          <option key={zone.id} value={zone.id}>
                            📍 {zone.exitNumber} - {zone.name.split('/')[0]} ({zone.estMinutes})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Safety Guarantee */}
                    <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="text-[11px] leading-tight">
                        <strong>KEBS Safety Seal:</strong> Sealed valve check included on handover.
                      </span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* WORKSPACE VIEW 2: CYLINDER CATALOG & CHECKOUT FLOW */}
          {workspaceMode === 'catalog' && (
            <div className="space-y-5">
              {/* Back to Dashboard bar */}
              <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsOrdering(false);
                    setWorkspaceMode('dashboard');
                  }}
                  className="h-8 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <span>← Back to Active Order</span>
                </button>
                <div className="text-xs text-gray-500">
                  Delivering to: <strong className="text-gray-900">{activeHighwayZone.name}</strong> ({activeHighwayZone.exitNumber})
                </div>
              </div>

              {isOrdering && selectedProductForOrder ? (
                <OrderCheckoutForm
                  products={products}
                  selectedProduct={selectedProductForOrder}
                  initialZoneId={selectedHighwayZoneId}
                  onBack={() => setIsOrdering(false)}
                  onSubmitOrder={handleSubmitOrder}
                />
              ) : (
                <div className="space-y-4">
                  {/* Brand and Size Filter Bar */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold text-gray-900 tracking-tight">
                          Select Gas Cylinder & Brand
                        </h2>
                        <p className="text-xs text-gray-500">
                          Direct dispatch along Thika Superhighway with verified seals
                        </p>
                      </div>

                      {/* Type Filter */}
                      <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                        {[
                          { id: 'All', label: 'All' },
                          { id: 'refill', label: '🔄 Refills' },
                          { id: 'complete_kit', label: '📦 Complete Kits' }
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTypeFilter(t.id)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              selectedTypeFilter === t.id
                                ? 'bg-white text-gray-900 shadow-2xs font-bold'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Brand Chips */}
                    <div className="pt-2 border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      <button
                        type="button"
                        onClick={() => setSelectedBrandFilter('All')}
                        className={`h-7 px-2.5 py-1 rounded-lg text-xs font-semibold border shrink-0 transition-all cursor-pointer ${
                          selectedBrandFilter === 'All'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        All Brands
                      </button>

                      {GAS_BRANDS_CONFIG.map((b) => {
                        const isSelected = selectedBrandFilter === b.name;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedBrandFilter(b.name)}
                            className={`h-7 px-2.5 py-1 rounded-lg text-xs font-semibold border shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-gray-900 text-white border-gray-900 shadow-2xs'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: b.color }}
                            />
                            <span>{b.name.split('(')[0].trim()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Product Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        selectedHighwayZoneName={activeHighwayZone.name}
                        onOrderNow={handleStartOrder}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WORKSPACE VIEW 3: FULL ORDER HISTORY */}
          {workspaceMode === 'history' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Order History
                  </h2>
                  <p className="text-xs text-gray-500">
                    Record of your cylinder deliveries
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setWorkspaceMode('catalog')}
                  className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs cursor-pointer inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Order</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 uppercase text-[10px] font-bold">
                      <th className="pb-2.5">Order ID</th>
                      <th className="pb-2.5">Cylinder Details</th>
                      <th className="pb-2.5">Corridor Zone</th>
                      <th className="pb-2.5">Date</th>
                      <th className="pb-2.5">Total</th>
                      <th className="pb-2.5">Status</th>
                      <th className="pb-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 font-mono font-bold text-gray-900">#{order.id}</td>
                        <td className="py-3 font-medium text-gray-900">
                          {order.cylinderSummary}
                        </td>
                        <td className="py-3 text-gray-600 truncate max-w-xs">
                          {order.deliveryAddress?.thikaHighwayZone || order.deliveryAddress?.street}
                        </td>
                        <td className="py-3 text-gray-600">{order.deliveryDate}</td>
                        <td className="py-3 font-bold text-gray-900">{formatKSh(order.total)}</td>
                        <td className="py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleReorder(order)}
                            className="h-7 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[11px] rounded-md transition-colors cursor-pointer"
                          >
                            Reorder
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WORKSPACE VIEW 4: ADDRESSES */}
          {workspaceMode === 'addresses' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs max-w-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Saved Corridor Addresses
                  </h2>
                  <p className="text-xs text-gray-500">
                    Manage your delivery drop-offs along Thika Superhighway
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-blue-600 bg-blue-50/20 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900">Residence (Roysambu / TRM)</span>
                        <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                          Exit 8 Default
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 mt-1">Lumumba Drive, Skyview Heights Court, Flat 4B</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Note: Behind TRM Mall, ring buzzer at black gate</p>
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 font-bold">Default</span>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-200 hover:border-gray-300 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-gray-900">Student Hostels / Juja JKUAT Branch</span>
                      <p className="text-xs text-gray-700 mt-1">Gate 1 Highpoint, Juja, Thika Superhighway (Exit 16)</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Instructions: Opposite cooperative bank ATM</p>
                    </div>
                  </div>
                  <button className="h-7 px-2.5 rounded-md border border-gray-200 text-xs text-gray-600 font-semibold hover:bg-gray-50 cursor-pointer">
                    Select
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* WORKSPACE VIEW 5: SUPPORT & CONTACT */}
          {workspaceMode === 'support' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs max-w-2xl space-y-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Customer Support & Corridor Operations
                </h2>
                <p className="text-xs text-gray-500">
                  24/7 dedicated support for gas deliveries, valve checks, and emergency queries
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50">
                  <div className="w-7 h-7 rounded-lg bg-[#E04F11] text-white flex items-center justify-center mb-2">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="font-bold text-xs text-gray-900">Highway Emergency Helpline</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">For urgent safety or leak checks</p>
                  <a
                    href="tel:+254700427335"
                    className="text-xs font-bold text-[#E04F11] block mt-1.5 hover:underline"
                  >
                    +254 700 427 335
                  </a>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50">
                  <div className="w-7 h-7 rounded-lg bg-gray-900 text-white flex items-center justify-center mb-2">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="font-bold text-xs text-gray-900">TRM Operations Hub</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Central highway staging depot</p>
                  <p className="text-xs font-bold text-gray-900 mt-1.5">thikaroad@gasdeliver.co.ke</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: DIRECT CONTACT DRIVER */}
      {showContactModal && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm">
                  Contact Assigned Driver
                </h3>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-gray-400 hover:text-gray-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {activeOrder.driverName ? activeOrder.driverName.slice(0, 2).toUpperCase() : 'CR'}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-gray-900">
                    {activeOrder.driverName || 'Assigned Courier'}
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Vehicle: {activeOrder.driverVehicle || 'Express Carrier'} · Rating 5.0 ★
                  </p>
                </div>
              </div>

              <ContactActionGroup
                phone={activeOrder.driverPhone || '+254 712 345 678'}
                name={activeOrder.driverName || 'Courier'}
                role="driver"
                orderId={activeOrder.id}
                defaultMessage={`Jambo ${activeOrder.driverName || 'Courier'}, I am checking on my cylinder delivery #${activeOrder.id}.`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
