import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, Driver, PickupLocation } from '../../types';
import { RealisticDeliveryMap } from '../../components/RealisticDeliveryMap';
import {
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  Navigation,
  Phone,
  MessageSquare,
  AlertTriangle,
  Building2,
  Search,
  Filter,
  Check,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Radio,
  ChevronRight,
  RefreshCw,
  Zap
} from 'lucide-react';

interface ActiveDeliveriesViewProps {
  orders: Order[];
  allCorridorOrders?: Order[];
  activeOrder: Order | null;
  driver: Driver | null;
  isUpdatingStatus: boolean;
  onSelectOrder: (orderId: string) => void;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  onClaimOrder?: (orderId: string) => Promise<void>;
  onOpenPodModal: (order: Order) => void;
  onOpenIssueModal: (order: Order) => void;
}

export const ActiveDeliveriesView: React.FC<ActiveDeliveriesViewProps> = ({
  orders,
  allCorridorOrders = [],
  activeOrder,
  driver,
  isUpdatingStatus,
  onSelectOrder,
  onUpdateStatus,
  onClaimOrder,
  onOpenPodModal,
  onOpenIssueModal
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'corridor' | 'pending_pickup' | 'in_transit' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusChangeLoadingId, setStatusChangeLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const baseOrders = useMemo(() => {
    if (filterTab === 'corridor') {
      return allCorridorOrders && allCorridorOrders.length > 0 ? allCorridorOrders : orders;
    }
    return orders;
  }, [filterTab, allCorridorOrders, orders]);

  // Filter and search computation
  const filteredOrders = useMemo(() => {
    return baseOrders.filter((order) => {
      // Tab filter
      const isPendingPickup = Boolean(
        order.pickupLocation && !order.pickupLocation.isPickedUp && order.status !== 'Delivered' && order.status !== 'Cancelled'
      );
      const isInTransit = Boolean(
        (order.status === 'Dispatched' || order.status === 'En Route' || order.status === 'Out for Delivery' || order.status === 'Arrived') &&
        (!order.pickupLocation || order.pickupLocation.isPickedUp)
      );
      const isCompleted = order.status === 'Delivered';

      if (filterTab === 'pending_pickup' && !isPendingPickup) return false;
      if (filterTab === 'in_transit' && !isInTransit) return false;
      if (filterTab === 'completed' && !isCompleted) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        order.id.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.deliveryAddress?.street?.toLowerCase().includes(q) ||
        order.deliveryAddress?.thikaHighwayZone?.toLowerCase().includes(q) ||
        order.pickupLocation?.name?.toLowerCase().includes(q) ||
        order.pickupLocation?.stationBrand?.toLowerCase().includes(q) ||
        order.cylinderSummary?.toLowerCase().includes(q)
      );
    });
  }, [orders, filterTab, searchQuery]);

  // Metric counts
  const pendingPickupCount = useMemo(() => {
    return orders.filter(
      (o) => o.pickupLocation && !o.pickupLocation.isPickedUp && o.status !== 'Delivered' && o.status !== 'Cancelled'
    ).length;
  }, [orders]);

  const inTransitCount = useMemo(() => {
    return orders.filter(
      (o) =>
        (o.status === 'Dispatched' || o.status === 'En Route' || o.status === 'Out for Delivery' || o.status === 'Arrived') &&
        (!o.pickupLocation || o.pickupLocation.isPickedUp)
    ).length;
  }, [orders]);

  const completedTodayCount = useMemo(() => {
    return orders.filter((o) => o.status === 'Delivered').length;
  }, [orders]);

  // Selected order for detailed map & route inspection
  const currentInspectOrder = activeOrder || filteredOrders[0] || null;

  // Handle direct status change
  const handleStatusChange = async (orderId: string, targetStatus: OrderStatus) => {
    try {
      setStatusChangeLoadingId(orderId);
      await onUpdateStatus(orderId, targetStatus);
      setActionMessage(`Order #${orderId} updated to ${targetStatus}`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      console.error('Status change error', err);
      setActionMessage(err?.message || 'Failed to update order status');
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setStatusChangeLoadingId(null);
    }
  };

  // Google Maps navigation url
  const getMapsUrl = (order: Order) => {
    if (order.pickupLocation && !order.pickupLocation.isPickedUp && order.pickupLocation.coordinates) {
      return `https://www.google.com/maps/dir/?api=1&destination=${order.pickupLocation.coordinates.lat},${order.pickupLocation.coordinates.lng}`;
    }
    if (order.deliveryAddress?.coordinates) {
      return `https://www.google.com/maps/dir/?api=1&destination=${order.deliveryAddress.coordinates.lat},${order.deliveryAddress.coordinates.lng}`;
    }
    const street = order.deliveryAddress?.street || 'Thika Road';
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${street}, Nairobi, Kenya`)}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP OPERATIONAL STATS BAR */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Active Deliveries & Pickup Queue
              </h1>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Real-time route management with depot pickup highlights and instant stage transitions.
            </p>
          </div>

          {/* Quick Stats Strip */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Pending Pickup Pill - Prominently highlighted */}
            <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-300 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block leading-tight">
                  Pending Pickup
                </span>
                <span className="text-base font-black text-amber-900 leading-tight">
                  {pendingPickupCount} {pendingPickupCount === 1 ? 'Station' : 'Stations'}
                </span>
              </div>
            </div>

            {/* In Transit Pill */}
            <div className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block leading-tight">
                  In Transit
                </span>
                <span className="text-base font-black text-blue-900 leading-tight">
                  {inTransitCount} Active
                </span>
              </div>
            </div>

            {/* Completed Today */}
            <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block leading-tight">
                  Delivered
                </span>
                <span className="text-base font-black text-emerald-900 leading-tight">
                  {completedTodayCount} Today
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action feedback toast */}
        {actionMessage && (
          <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex items-center justify-between">
            <span>{actionMessage}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-blue-600 hover:text-blue-800 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2. FILTER TABS & SEARCH BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-4">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              My Assigned ({orders.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('corridor')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                filterTab === 'corridor'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Corridor Orders Pool ({allCorridorOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('pending_pickup')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                filterTab === 'pending_pickup'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Pending Pickup ({pendingPickupCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('in_transit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                filterTab === 'in_transit'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
              }`}
            >
              In Transit ({inTransitCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                filterTab === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Completed ({completedTodayCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order, customer, depot..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. MAIN SPLIT SECTION: INTERACTIVE LIST (Left) & LIVE ROUTE MAP (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: INTERACTIVE ACTIVE DELIVERIES LIST (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center space-y-3">
              <Package className="w-10 h-10 text-gray-300 mx-auto" />
              <h3 className="text-base font-bold text-gray-800">No orders match this filter</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Try switching filter tabs or clearing your search query to see all active orders.
              </p>
              <button
                onClick={() => {
                  setFilterTab('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isSelected = order.id === currentInspectOrder?.id;
              const hasPendingPickup = Boolean(order.pickupLocation && !order.pickupLocation.isPickedUp);
              const isLoadingThisOrder = statusChangeLoadingId === order.id;

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                    hasPendingPickup
                      ? 'border-amber-400/90 ring-1 ring-amber-300/60'
                      : isSelected
                      ? 'border-blue-500 ring-1 ring-blue-400'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* PENDING PICKUP LOCATION HIGHLIGHT CALLOUT BANNER */}
                  {hasPendingPickup && (
                    <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 rounded bg-white/20 shrink-0">
                          <Building2 className="w-4 h-4 text-white animate-pulse" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider">
                          PENDING PICKUP LOCATION:
                        </span>
                        <span className="text-xs font-bold truncate">
                          {order.pickupLocation?.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold bg-white text-amber-900 px-2 py-0.5 rounded-full shadow-2xs shrink-0">
                        {order.pickupLocation?.bayNumber || 'Pickup Rack'}
                      </span>
                    </div>
                  )}

                  {/* Picked-up status strip (if already collected) */}
                  {!hasPendingPickup && order.pickupLocation && order.status !== 'Delivered' && (
                    <div className="bg-emerald-50 text-emerald-800 border-b border-emerald-100 px-4 py-1.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Cylinder Picked Up from {order.pickupLocation.name}</span>
                        {order.pickupLocation.pickedUpAt && (
                          <span className="text-emerald-600 font-normal">at {order.pickupLocation.pickedUpAt}</span>
                        )}
                      </div>
                      <span className="text-[11px] text-emerald-700 font-bold">In Transit to Customer</span>
                    </div>
                  )}

                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Header: Order ID, Status, Priority & View On Map */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-500">
                          #{order.id}
                        </span>

                        {/* Order Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            order.status === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : order.status === 'Arrived'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : order.status === 'En Route' || order.status === 'Out for Delivery'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : order.status === 'Dispatched'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {order.status}
                        </span>

                        {/* Real-time Driver Assignment Indicator */}
                        {(() => {
                          const isMyOrder = Boolean(
                            (driver?.id && order.driverId === driver.id) ||
                            (driver?.name && order.driverName?.toLowerCase() === driver.name.toLowerCase())
                          );
                          const isUnassigned = !order.driverId && order.status !== 'Delivered' && order.status !== 'Cancelled';

                          if (isMyOrder) {
                            return (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Assigned to You</span>
                              </span>
                            );
                          }
                          if (isUnassigned) {
                            return (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 animate-pulse">
                                <Zap className="w-3 h-3 text-amber-600 fill-amber-600" />
                                <span>Open for Assignment</span>
                              </span>
                            );
                          }
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              Courier: {order.driverName || 'Assigned'}
                            </span>
                          );
                        })()}

                        {/* Priority Badge */}
                        {order.priority && order.priority !== 'Normal' && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {order.priority}
                          </span>
                        )}

                        {/* SLA Countdown */}
                        {order.slaRemainingMinutes !== undefined && order.status !== 'Delivered' && (
                          <span className="text-[11px] text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span>SLA: {order.slaRemainingMinutes} min</span>
                          </span>
                        )}
                      </div>

                      {/* Select / Focus Map Button */}
                      <button
                        type="button"
                        onClick={() => onSelectOrder(order.id)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {isSelected ? '✓ Active on Map' : 'Focus Map'}
                      </button>
                    </div>

                    {/* DETAILS: PENDING PICKUP LOCATION CARD (If pending pickup) */}
                    {hasPendingPickup && order.pickupLocation && (
                      <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2.5 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-bold text-amber-950">
                              <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                              <span className="text-sm font-black">{order.pickupLocation.name}</span>
                            </div>
                            <p className="text-amber-800 text-xs">
                              {order.pickupLocation.address}
                              {order.pickupLocation.thikaHighwayZone && ` (${order.pickupLocation.thikaHighwayZone})`}
                            </p>
                          </div>

                          {/* Quick Navigation to Station */}
                          <a
                            href={getMapsUrl(order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 shadow-2xs"
                            title="Navigate to station"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Station Nav</span>
                          </a>
                        </div>

                        {/* Station metadata strip */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-amber-200/70 text-[11px] text-amber-900">
                          <div>
                            <span className="font-bold">Contact: </span>
                            <span>{order.pickupLocation.contactPerson || 'Station Lead'} </span>
                            <span className="font-mono">{order.pickupLocation.contactPhone}</span>
                          </div>
                          <div>
                            <span className="font-bold">Bay / Rack: </span>
                            <span>{order.pickupLocation.bayNumber || 'Standard LPG Rack'}</span>
                          </div>
                          {order.pickupLocation.notes && (
                            <div className="sm:col-span-2 text-amber-800 text-xs bg-amber-100/60 p-2 rounded-lg font-medium">
                              Note: {order.pickupLocation.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CUSTOMER & CYLINDER SPECS STRIP */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Customer & Address */}
                      <div className="space-y-1.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                            Customer & Destination
                          </span>
                          {order.customerLiveLocation && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Live GPS Pin
                            </span>
                          )}
                        </div>

                        <div className="font-bold text-gray-900 text-sm">
                          {order.customerName}
                        </div>

                        <div className="text-gray-600 text-xs flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <span>
                            {order.deliveryAddress?.street}
                            {order.deliveryAddress?.thikaHighwayZone && ` · ${order.deliveryAddress.thikaHighwayZone}`}
                          </span>
                        </div>

                        {order.deliveryAddress?.landmark && (
                          <p className="text-[11px] text-gray-500 italic">
                            Landmark: {order.deliveryAddress.landmark}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="inline-flex items-center gap-1 text-xs font-mono font-bold text-blue-700 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100"
                          >
                            <Phone className="w-3 h-3 text-blue-600" />
                            <span>{order.customerPhone}</span>
                          </a>

                          {order.customerLiveLocation && (
                            <span className="text-[10px] font-mono text-gray-500">
                              {order.customerLiveLocation.lat.toFixed(4)}, {order.customerLiveLocation.lng.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Product & Payment */}
                      <div className="space-y-1.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                          Cylinder & Order Specs
                        </span>
                        
                        <div className="font-bold text-gray-900 text-sm">
                          {order.cylinderSummary || `${order.cylinderBrand || 'LPG'} ${order.cylinderSize || '13 kg'}`}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-gray-800 border border-gray-200">
                            Brand: {order.cylinderBrand || order.items?.[0]?.brand || 'TotalEnergies'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-gray-800 border border-gray-200">
                            Size: {order.cylinderSize || order.items?.[0]?.size || '13 kg'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              order.cylinderOrderType === 'complete_kit'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {order.cylinderOrderType === 'complete_kit' ? 'Kit' : 'Refill (Exchange)'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1.5 border-t border-gray-200/60">
                          <span className="font-bold text-gray-900">
                            Total: KES {order.total?.toLocaleString() || '2,950'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              order.paymentStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {order.paymentStatus === 'Paid' ? 'Paid (M-Pesa)' : 'Cash on Delivery'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 4. DIRECT INTERACTIVE ORDER STATUS CONTROLS */}
                    <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Instant Stage Progression Button */}
                      <div className="flex flex-wrap items-center gap-2">
                        {(() => {
                          const isMyOrder = Boolean(
                            (driver?.id && order.driverId === driver.id) ||
                            (driver?.name && order.driverName?.toLowerCase() === driver.name.toLowerCase())
                          );
                          const isUnassigned = !order.driverId && order.status !== 'Delivered' && order.status !== 'Cancelled';

                          return (
                            <>
                              {/* 0. If Unassigned in Corridor: Prominent Claim Button */}
                              {isUnassigned && onClaimOrder && (
                                <button
                                  type="button"
                                  disabled={isLoadingThisOrder}
                                  onClick={async () => {
                                    try {
                                      setStatusChangeLoadingId(order.id);
                                      await onClaimOrder(order.id);
                                      setActionMessage(`Successfully claimed Order #${order.id}! Added to your active delivery queue.`);
                                      setTimeout(() => setActionMessage(null), 5000);
                                    } catch (err: any) {
                                      setActionMessage(err?.message || 'Failed to claim delivery');
                                      setTimeout(() => setActionMessage(null), 5000);
                                    } finally {
                                      setStatusChangeLoadingId(null);
                                    }
                                  }}
                                  className="min-h-[42px] px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-colors disabled:opacity-60"
                                >
                                  {isLoadingThisOrder ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                                  )}
                                  <span>Claim & Accept Delivery</span>
                                </button>
                              )}

                              {/* 0b. If Assigned to another courier */}
                              {!isMyOrder && !isUnassigned && (
                                <div className="px-3 py-2 rounded-xl bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700 flex items-center gap-2">
                                  <Package className="w-3.5 h-3.5 text-gray-500" />
                                  <span>Assigned to: <strong className="text-gray-900">{order.driverName || 'Other Courier'}</strong></span>
                                </div>
                              )}

                              {/* Driver-specific workflow actions (when assigned to me or claimed) */}
                              {(isMyOrder || !order.driverId) && (
                                <>
                                  {/* If Assigned: Driver Accepts */}
                                  {(order.status === 'Assigned' || order.status === 'Driver Assigned') && (
                                    <button
                                      type="button"
                                      disabled={isLoadingThisOrder}
                                      onClick={() => handleStatusChange(order.id, 'Accepted')}
                                      className="min-h-[42px] px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-colors disabled:opacity-60"
                                    >
                                      {isLoadingThisOrder ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Check className="w-4 h-4 text-white" />
                                      )}
                                      <span>Accept Order</span>
                                    </button>
                                  )}

                                  {/* 1. If Pending Pickup: "Confirm Pickup from Depot" */}
                                  {hasPendingPickup && (
                                    <button
                                      type="button"
                                      disabled={isLoadingThisOrder}
                                      onClick={() => handleStatusChange(order.id, 'Dispatched')}
                                      className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-colors disabled:opacity-60"
                                    >
                                      {isLoadingThisOrder ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Check className="w-4 h-4 text-white" />
                                      )}
                                      <span>Confirm Depot Pickup</span>
                                    </button>
                                  )}

                                  {/* 1b. If Accepted with no pending pickup depot: Start Trip */}
                                  {order.status === 'Accepted' && !hasPendingPickup && (
                                    <button
                                      type="button"
                                      disabled={isLoadingThisOrder}
                                      onClick={() => handleStatusChange(order.id, 'En Route')}
                                      className="min-h-[42px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-colors disabled:opacity-60"
                                    >
                                      {isLoadingThisOrder ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Navigation className="w-4 h-4" />
                                      )}
                                      <span>Start Trip (En Route)</span>
                                    </button>
                                  )}

                                  {/* 2. If Dispatched: "Start Trip (En Route)" */}
                                  {order.status === 'Dispatched' && (
                                    <button
                                      type="button"
                                      disabled={isLoadingThisOrder}
                                      onClick={() => handleStatusChange(order.id, 'En Route')}
                                      className="min-h-[42px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-colors disabled:opacity-60"
                                    >
                                      {isLoadingThisOrder ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Navigation className="w-4 h-4" />
                                      )}
                                      <span>Start Trip (En Route)</span>
                                    </button>
                                  )}

                                  {/* 3. If En Route / Out for Delivery: "Mark Arrived at Gate" */}
                                  {(order.status === 'En Route' || order.status === 'Out for Delivery') && (
                                    <button
                                      type="button"
                                      disabled={isLoadingThisOrder}
                                      onClick={() => handleStatusChange(order.id, 'Arrived')}
                                      className="min-h-[42px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-colors disabled:opacity-60"
                                    >
                                      {isLoadingThisOrder ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <MapPin className="w-4 h-4" />
                                      )}
                                      <span>Mark Arrived at Gate</span>
                                    </button>
                                  )}

                                  {/* 4. If Arrived: "Complete Delivery (POD)" */}
                                  {order.status === 'Arrived' && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenPodModal(order)}
                                      className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                                    >
                                      <CheckCircle2 className="w-4 h-4 text-white" />
                                      <span>Complete Delivery (POD)</span>
                                    </button>
                                  )}
                                </>
                              )}
                            </>
                          );
                        })()}

                        {/* Delivered Badge */}
                        {order.status === 'Delivered' && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Successfully Delivered</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Direct Status Dropdown Selector & Quick Communication */}
                      <div className="flex items-center gap-2">
                        {/* Interactive Status Changer Dropdown */}
                        {order.status !== 'Delivered' && (
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-[11px] text-gray-500 font-bold hidden sm:inline">Set Status:</span>
                            <select
                              value={order.status}
                              disabled={isLoadingThisOrder}
                              onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                              className="px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-800 focus:outline-hidden focus:border-blue-500 cursor-pointer shadow-2xs"
                            >
                              <option value="Assigned">Assigned</option>
                              <option value="Accepted">Accepted</option>
                              <option value="Dispatched">Dispatched (Picked Up)</option>
                              <option value="En Route">En Route</option>
                              <option value="Out for Delivery">Out for Delivery</option>
                              <option value="Arrived">Arrived</option>
                            </select>
                          </div>
                        )}

                        {/* Call Customer */}
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 cursor-pointer transition-colors"
                          title="Call customer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>

                        {/* WhatsApp Customer */}
                        <a
                          href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Jambo ${order.customerName}, this is Dennis your GasDeliver driver regarding order #${order.id}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 cursor-pointer transition-colors"
                          title="WhatsApp customer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>

                        {/* Open in Google Maps */}
                        <a
                          href={getMapsUrl(order)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 cursor-pointer transition-colors"
                          title="Turn-by-turn Google Maps"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN: INSPECT / LIVE ROUTE MAP PANEL (5 cols) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">
                  Live Corridor Route Visualizer
                </h3>
              </div>
              {currentInspectOrder && (
                <span className="font-mono text-xs font-bold text-gray-500">
                  #{currentInspectOrder.id}
                </span>
              )}
            </div>

            {currentInspectOrder ? (
              <>
                {/* Visualizer Map */}
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-2xs">
                  <RealisticDeliveryMap
                    driverName={driver?.name || 'Courier'}
                    customerName={currentInspectOrder.customerName}
                    customerAddress={
                      currentInspectOrder.deliveryAddress?.street || 'Thika Superhighway'
                    }
                    pickupLocation={currentInspectOrder.pickupLocation}
                    customerLiveLocation={currentInspectOrder.customerLiveLocation}
                    heightClass="h-64 sm:h-72"
                  />
                </div>

                {/* Selected Order Summary Card */}
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">
                      {currentInspectOrder.customerName}
                    </span>
                    <span className="font-bold font-mono text-emerald-700">
                      {typeof currentInspectOrder.driverEtaMinutes === 'number' ? `ETA: ~${currentInspectOrder.driverEtaMinutes} mins` : 'Live Delivery'}
                    </span>
                  </div>

                  {currentInspectOrder.pickupLocation && (
                    <div className="flex items-start gap-1.5 text-gray-700">
                      <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-gray-900">Pickup Station: </span>
                        <span>{currentInspectOrder.pickupLocation.name}</span>
                        <span className="text-[11px] text-gray-500 block">
                          {currentInspectOrder.pickupLocation.isPickedUp
                            ? '✓ Cylinder already picked up'
                            : '⚠️ Pending collection at bay'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-1.5 text-gray-700">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-900">Dropoff: </span>
                      <span>{currentInspectOrder.deliveryAddress?.street}</span>
                      <span className="text-[11px] text-gray-500 block">
                        Zone: {currentInspectOrder.deliveryAddress?.thikaHighwayZone || 'Nairobi'}
                      </span>
                    </div>
                  </div>

                  {/* Open Turn-by-Turn Navigation Button */}
                  <a
                    href={getMapsUrl(currentInspectOrder)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[44px] mt-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Launch Google Maps Turn-by-Turn</span>
                  </a>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-gray-500">
                Select an order from the list on the left to inspect its live route and pickup station.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
