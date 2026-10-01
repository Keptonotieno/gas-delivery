import React, { useState } from 'react';
import { 
  Truck, 
  MapPin, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Phone, 
  Search, 
  RefreshCw, 
  ArrowRight,
  Flame,
  RotateCcw,
  X,
  Navigation,
  Check
} from 'lucide-react';
import { Order, Driver, OrderStatus } from '../../types';
import { LiveDispatchMap } from './LiveDispatchMap';

interface DispatchCenterViewProps {
  orders: Order[];
  drivers: Driver[];
  onAssignDriver: (orderId: string, driverId: string) => Promise<void>;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const DispatchCenterView: React.FC<DispatchCenterViewProps> = ({
  orders,
  drivers,
  onAssignDriver,
  onRefresh,
  isLoading = false
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'unassigned' | 'en_route' | 'delayed'>('all');
  const [driverTab, setDriverTab] = useState<'available' | 'active' | 'all'>('available');
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [callModal, setCallModal] = useState<{ name: string; phone: string; role: string } | null>(null);
  const [reassignModalOrder, setReassignModalOrder] = useState<Order | null>(null);

  // Active / relevant orders (excluding completed or cancelled by default unless specifically searched)
  const activeOrdersList = orders.filter((o) => {
    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSearch = 
        (o.id?.toLowerCase() || '').includes(q) ||
        (o.customerName?.toLowerCase() || '').includes(q) ||
        (o.deliveryAddress?.street?.toLowerCase() || '').includes(q) ||
        (o.cylinderSummary?.toLowerCase() || '').includes(q) ||
        Boolean(o.customerPhone && o.customerPhone.includes(q));
      if (!matchSearch) return false;
    }

    // Status filter
    const isUnassigned = o.status === 'Pending' || !o.driverId;
    const isEnRoute = o.status === 'Dispatched' || o.status === 'Out for Delivery';
    const isDelayed = Boolean(o.isOverdue || (typeof o.slaRemainingMinutes === 'number' && o.slaRemainingMinutes < 0));

    if (orderStatusFilter === 'unassigned') return isUnassigned;
    if (orderStatusFilter === 'en_route') return isEnRoute;
    if (orderStatusFilter === 'delayed') return isDelayed;

    // 'all': display active orders (Pending, Dispatched, Out for Delivery, or unassigned)
    return isUnassigned || isEnRoute || o.status === 'Pending';
  });

  // Count unassigned orders
  const unassignedCount = orders.filter(o => o.status === 'Pending' || !o.driverId).length;
  const enRouteCount = orders.filter(o => o.status === 'Dispatched' || o.status === 'Out for Delivery').length;
  const delayedCount = orders.filter(o => o.isOverdue || (typeof o.slaRemainingMinutes === 'number' && o.slaRemainingMinutes < 0)).length;
  const availableDriversCount = drivers.filter(d => d.status === 'Available').length;

  // Filtered drivers according to active tab
  const filteredDrivers = drivers.filter(d => {
    if (driverTab === 'available') return d.status === 'Available';
    if (driverTab === 'active') return d.status === 'On Route';
    return true; // 'all'
  });

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  // Handle assign or reassign action
  const handleAssign = async (orderId: string, driverId: string) => {
    try {
      setAssigningId(orderId);
      await onAssignDriver(orderId, driverId);
      setSelectedOrderId(null);
      setReassignModalOrder(null);
    } catch (err) {
      console.error('Failed to assign driver', err);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="flex flex-col lg:h-[calc(100vh-145px)] lg:min-h-[720px] h-auto min-h-0 w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Top Dispatch Control Header */}
      <div className="px-5 py-4 bg-white border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E04F11] flex items-center justify-center text-white shadow-2xs shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">Central Dispatch Console</h1>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Connected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Nairobi Metropolitan Fast-Fulfillment Operations · 3-Column Logistics Center
            </p>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <div className="bg-amber-50/80 px-3 py-1.5 rounded-lg border border-amber-200/80 flex items-center gap-1.5">
            <span className="text-amber-800 font-medium">Unassigned:</span>{' '}
            <strong className="text-amber-950 text-sm font-bold font-mono">
              {unassignedCount}
            </strong>
          </div>
          <div className="bg-orange-50/80 px-3 py-1.5 rounded-lg border border-orange-200/80 flex items-center gap-1.5">
            <span className="text-orange-800 font-medium">Active En Route:</span>{' '}
            <strong className="text-orange-950 text-sm font-bold font-mono">
              {enRouteCount}
            </strong>
          </div>
          <div className="bg-emerald-50/80 px-3 py-1.5 rounded-lg border border-emerald-200/80 flex items-center gap-1.5">
            <span className="text-emerald-800 font-medium">Available Riders:</span>{' '}
            <strong className="text-emerald-950 text-sm font-bold font-mono">
              {availableDriversCount}
            </strong>
          </div>
          <div className="bg-rose-50/80 px-3 py-1.5 rounded-lg border border-rose-200/80 flex items-center gap-1.5">
            <span className="text-rose-800 font-medium">Delayed SLA:</span>{' '}
            <strong className="text-rose-950 text-sm font-bold font-mono">
              {delayedCount}
            </strong>
          </div>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            title="Refresh Operations"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#E04F11]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3-Column Main Dispatch Layout */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-visible lg:overflow-hidden bg-slate-50">
        
        {/* ========================================================================= */}
        {/* COLUMN 1: ACTIVE ORDERS LIST (search, status filter, order selection) */}
        {/* ========================================================================= */}
        <div className="col-span-12 lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200/90 bg-white flex flex-col h-[480px] lg:h-full overflow-hidden">
          {/* Column Header */}
          <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Active Orders</h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-xs font-mono">
                  {activeOrdersList.length}
                </span>
              </div>
              {selectedOrder && (
                <button
                  onClick={() => setSelectedOrderId(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Deselect (#{selectedOrder.id})
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order #, customer, address..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#E04F11] transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setOrderStatusFilter('all')}
                className={`flex-1 py-1 px-2 rounded-md font-medium text-center transition-colors cursor-pointer ${
                  orderStatusFilter === 'all'
                    ? 'bg-gray-800 text-white font-semibold'
                    : 'text-gray-600 hover:text-gray-900 bg-gray-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setOrderStatusFilter('unassigned')}
                className={`flex-1 py-1 px-2 rounded-md font-medium text-center transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  orderStatusFilter === 'unassigned'
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'text-amber-800 hover:text-amber-900 bg-amber-50 border border-amber-200'
                }`}
              >
                <span>Unassigned</span>
                {unassignedCount > 0 && (
                  <span className={`px-1 rounded-full text-[10px] font-bold ${
                    orderStatusFilter === 'unassigned' ? 'bg-amber-800 text-white' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {unassignedCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setOrderStatusFilter('en_route')}
                className={`flex-1 py-1 px-2 rounded-md font-medium text-center transition-colors cursor-pointer ${
                  orderStatusFilter === 'en_route'
                    ? 'bg-orange-600 text-white font-semibold'
                    : 'text-gray-600 hover:text-gray-900 bg-gray-100'
                }`}
              >
                En Route
              </button>
              <button
                onClick={() => setOrderStatusFilter('delayed')}
                className={`py-1 px-2 rounded-md font-medium text-center transition-colors cursor-pointer ${
                  orderStatusFilter === 'delayed'
                    ? 'bg-rose-600 text-white font-semibold'
                    : 'text-gray-600 hover:text-gray-900 bg-gray-100'
                }`}
              >
                Delayed
              </button>
            </div>
          </div>

          {/* Orders Scrollable List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {activeOrdersList.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                No orders match the selected filter.
              </div>
            ) : (
              activeOrdersList.map((order) => {
                const isSelected = selectedOrderId === order.id;
                const isUnassigned = order.status === 'Pending' || !order.driverId;
                const isDelayed = order.isOverdue || (typeof order.slaRemainingMinutes === 'number' && order.slaRemainingMinutes < 0);

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderId(isSelected ? null : order.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                      isSelected
                        ? 'border-[#E04F11] bg-orange-50/50 shadow-xs ring-1 ring-[#E04F11]'
                        : isUnassigned
                        ? 'border-amber-300 bg-amber-50/30 hover:border-amber-400 hover:bg-amber-50/60'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80'
                    }`}
                  >
                    {/* Header Row: ID, Badges */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900">{order.id}</span>
                        {isUnassigned ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-extrabold tracking-wide uppercase">
                            Unassigned
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-900 text-[10px] font-bold uppercase">
                            {order.status}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {isDelayed && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                            Delayed SLA
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          order.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                          order.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {order.priority}
                        </span>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="text-gray-800 font-semibold mb-1 flex items-center justify-between">
                      <span>{order.customerName}</span>
                      <span className="text-gray-500 font-normal text-[11px]">{order.customerPhone}</span>
                    </div>

                    {/* Destination */}
                    <div className="flex items-center gap-1 text-gray-600 text-[11px] mb-2 truncate">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{order.deliveryAddress?.street || 'Nairobi City'}</span>
                    </div>

                    {/* Cylinders & Price */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px]">
                      <span className="text-gray-700 font-medium">{order.cylinderSummary}</span>
                      <span className="text-[#E04F11] font-bold">KSh {(order.total ?? 0).toLocaleString()}</span>
                    </div>

                    {/* Driver Status or Assign Prompt */}
                    <div className="mt-2.5 flex items-center justify-between pt-1">
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {order.deliverySlot || 'Standard Delivery'}
                      </span>

                      {isUnassigned ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderId(order.id);
                          }}
                          className={`text-xs px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#E04F11] text-white'
                              : 'bg-amber-500 hover:bg-amber-600 text-white'
                          }`}
                        >
                          <span>{isSelected ? 'Selected' : 'Select to Assign'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-600 font-medium">
                          Driver: <strong className="text-gray-900">{order.driverName}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: MAP (Live driver locations, active routes, depot marker) */}
        {/* ========================================================================= */}
        <div className="col-span-12 lg:col-span-5 h-[480px] lg:h-full p-2.5 bg-slate-100 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200/90">
          <div className="w-full h-full flex-1 rounded-xl overflow-hidden shadow-2xs border border-slate-300/80">
            <LiveDispatchMap
              orders={orders}
              drivers={drivers}
              selectedOrderId={selectedOrderId}
              selectedDriverId={selectedDriverId}
              onSelectOrder={(order) => setSelectedOrderId(order.id)}
              onSelectDriver={(driver) => setSelectedDriverId(driver.id)}
              onAssignDriver={(orderId, driverId) => handleAssign(orderId, driverId)}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3: DRIVER LIST (name, vehicle, load/capacity e.g. 8/20, status, assign) */}
        {/* ========================================================================= */}
        <div className="col-span-12 lg:col-span-3 border-l-0 lg:border-l border-slate-200/90 bg-white flex flex-col h-[480px] lg:h-full overflow-hidden">
          {/* Active Assignment Header Notification if Order Selected */}
          {selectedOrder ? (
            <div className="p-3 bg-orange-50 border-b border-orange-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-[#E04F11] text-white">
                  <Flame className="w-3.5 h-3.5" />
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-900 font-mono">
                    Assigning #{selectedOrder.id}
                  </div>
                  <div className="text-[11px] text-[#E04F11] truncate max-w-[160px] font-semibold">
                    {selectedOrder.customerName}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderId(null)}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Fleet Drivers</h2>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-xs font-mono">
                    {drivers.length}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold font-mono">
                  {availableDriversCount} Available
                </span>
              </div>
            </div>
          )}

          {/* Driver Status Tabs */}
          <div className="px-3 pt-2.5 pb-2 border-b border-slate-200/80 bg-slate-50 flex items-center gap-1 text-xs">
            <button
              onClick={() => setDriverTab('available')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold text-center transition-colors cursor-pointer ${
                driverTab === 'available'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              Available ({availableDriversCount})
            </button>
            <button
              onClick={() => setDriverTab('active')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold text-center transition-colors cursor-pointer ${
                driverTab === 'active'
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              On Route ({drivers.filter(d => (d.status as string) === 'On Route' || (d.status as string) === 'On Delivery' || (d.status as string) === 'En Route').length})
            </button>
            <button
              onClick={() => setDriverTab('all')}
              className={`py-1.5 px-2.5 rounded-lg font-medium text-center transition-colors cursor-pointer ${
                driverTab === 'all'
                  ? 'bg-gray-800 text-white font-semibold'
                  : 'text-gray-600 hover:text-gray-900 bg-white border border-gray-200'
              }`}
            >
              All ({drivers.length})
            </button>
          </div>

          {/* Driver Cards Scrollable List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredDrivers.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Truck className="w-8 h-8 mx-auto mb-2 opacity-30 text-gray-400" />
                <p className="font-medium text-xs text-gray-600">No couriers available in this view</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {drivers.length === 0 ? 'No drivers registered in fleet roster' : 'Try switching status tabs'}
                </p>
              </div>
            ) : (
              filteredDrivers.map((driver) => {
              const isSelected = selectedDriverId === driver.id;
              const isAvailable = driver.status === 'Available';
              const isOnRoute = driver.status === 'On Route';
              const isOffline = driver.status === 'Offline';
              
              // Load & Capacity Calculation
              const capacity = driver.capacity && driver.capacity > 0 ? driver.capacity : 20;
              const load = typeof driver.load === 'number' && !isNaN(driver.load) ? driver.load : 0;
              const loadPercentage = Math.min(100, Math.max(0, Math.round((load / capacity) * 100)));

              const activeOrder = orders.find(o => o.id === driver.activeOrderId);

              return (
                <div
                  key={driver.id}
                  onClick={() => setSelectedDriverId(isSelected ? null : driver.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                    isSelected
                      ? 'border-[#E04F11] bg-orange-50/40 shadow-xs ring-1 ring-[#E04F11]'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80'
                  }`}
                >
                  {/* Top Row: Avatar, Name, Status Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs">
                        {driver.initials || driver.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900 text-xs">{driver.name}</span>
                          <span className="text-amber-500 text-[10px] font-semibold">★ {driver.rating}</span>
                        </div>
                        <span className="text-[11px] text-gray-500">{driver.phone}</span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                      isAvailable ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      isOnRoute ? 'bg-orange-50 text-orange-800 border border-orange-200' :
                      'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isAvailable ? 'bg-emerald-500 animate-pulse' :
                        isOnRoute ? 'bg-[#E04F11]' :
                        'bg-gray-400'
                      }`} />
                      {driver.status}
                    </span>
                  </div>

                  {/* Vehicle details */}
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-100 mb-2 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Vehicle</span>
                      <span className="font-semibold text-gray-800 truncate max-w-[140px]">{driver.vehicle}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Stop</span>
                      <span className="font-medium text-gray-700 truncate max-w-[140px]">
                        {driver.currentStop || 'Nairobi Central Hub'}
                      </span>
                    </div>
                  </div>

                  {/* Cylinder Capacity & Progress Bar */}
                  <div className="space-y-1 mb-2.5">
                    <div className="flex justify-between text-[11px] font-semibold text-gray-700">
                      <span className="text-gray-500 font-normal">Cylinder Load</span>
                      <span className="font-mono text-gray-900">
                        {load} / {capacity} cylinders ({loadPercentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          loadPercentage > 85 ? 'bg-red-500' : 'bg-[#E04F11]'
                        }`}
                        style={{ width: `${loadPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Active Order snippet if On Route */}
                  {isOnRoute && activeOrder && (
                    <div className="bg-orange-50 border border-orange-200 p-2 rounded-lg text-[11px] mb-2 flex items-center justify-between">
                      <div>
                        <span className="text-[#E04F11] font-bold block">Active: #{activeOrder.id}</span>
                        <span className="text-gray-700 truncate max-w-[150px] block">{activeOrder.customerName}</span>
                      </div>
                      <span className="text-emerald-700 font-bold text-xs">
                        {activeOrder.driverEtaMinutes || 18}m ETA
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCallModal({ name: driver.name, phone: driver.phone, role: 'Fleet Delivery Rider' });
                        }}
                        className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="Call Rider"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call</span>
                      </button>
                      <span className="text-[10px] text-gray-400">
                        {driver.deliveredCountToday ?? 0} done
                      </span>
                    </div>

                    {/* ASSIGN BUTTON */}
                    {selectedOrderId ? (
                      <button
                        type="button"
                        disabled={assigningId === selectedOrderId || isOffline}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssign(selectedOrderId, driver.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          isAvailable
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : isOnRoute
                            ? 'bg-[#E04F11] hover:bg-[#c2410c] text-white'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {assigningId === selectedOrderId ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isOnRoute ? 'Queue / Assign' : 'Assign to Rider'}
                        </span>
                      </button>
                    ) : (
                      isOnRoute && activeOrder && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReassignModalOrder(activeOrder);
                          }}
                          className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3 text-[#E04F11]" />
                          <span>Reassign</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })
            )}
          </div>
        </div>

      </div>

      {/* CALL RIDER MODAL */}
      {callModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-sm w-full shadow-xl text-center animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
              <Phone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Direct Dispatch Calling</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Connecting dispatcher to {callModal.name} ({callModal.role})
            </p>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-5">
              <span className="text-lg font-mono font-bold text-gray-900 tracking-wider">{callModal.phone}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCallModal(null)}
                className="flex-1 py-2 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <a
                href={`tel:${callModal.phone}`}
                className="flex-1 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Dial Now</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* REASSIGN ORDER MODAL */}
      {reassignModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full shadow-xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-[#E04F11]" />
                <h3 className="text-sm font-bold text-gray-900">Reassign Order #{reassignModalOrder.id}</h3>
              </div>
              <button
                onClick={() => setReassignModalOrder(null)}
                className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-3">
              Currently assigned to <strong className="text-gray-900">{reassignModalOrder.driverName || 'Current Driver'}</strong>. Select an available rider below:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
              {drivers.filter(d => d.id !== reassignModalOrder.driverId).map(driver => (
                <div 
                  key={driver.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200 hover:border-[#E04F11] transition-colors"
                >
                  <div>
                    <div className="font-semibold text-xs text-gray-900">{driver.name}</div>
                    <div className="text-[11px] text-gray-500">{driver.vehicle} · {driver.status}</div>
                  </div>
                  <button
                    onClick={() => handleAssign(reassignModalOrder.id, driver.id)}
                    className="px-3 py-1 bg-[#E04F11] hover:bg-[#c2410c] text-white font-semibold rounded-md text-xs transition-colors cursor-pointer"
                  >
                    Transfer
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setReassignModalOrder(null)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
