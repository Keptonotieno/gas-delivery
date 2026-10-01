import React, { useState } from 'react';
import { Order, Driver, OrderStatus } from '../../types';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import {
  Clock,
  UserCheck,
  AlertTriangle,
  ChevronRight,
  Phone,
  Check,
  Search,
  Filter,
  Archive,
  RotateCcw,
  Trash2,
  X,
  MapPin,
  Flame,
  AlertCircle
} from 'lucide-react';

interface DispatchBoardProps {
  orders: Order[];
  drivers: Driver[];
  onAssignDriver: (orderId: string, driverId: string) => Promise<void>;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onSelectOrder: (order: Order) => void;
  onDeleteOrder?: (orderId: string, reason?: string) => Promise<void>;
  onRestoreOrder?: (orderId: string) => Promise<void>;
}

const SOFT_DELETE_REASONS = [
  'Order cancelled by customer request',
  'Duplicate or test submission',
  'Address outside active delivery corridors',
  'Wrong cylinder specification ordered',
  'Payment verification issue / Stale order'
];

export const DispatchBoard: React.FC<DispatchBoardProps> = ({
  orders,
  drivers,
  onAssignDriver,
  onUpdateStatus,
  onSelectOrder,
  onDeleteOrder,
  onRestoreOrder
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [softDeletingOrder, setSoftDeletingOrder] = useState<Order | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(SOFT_DELETE_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const activeOrders = orders.filter((o) => !o.isArchived && o.status !== 'Archived');
  const archivedOrders = orders.filter((o) => o.isArchived || o.status === 'Archived');

  const filterTabs = [
    { label: 'All', count: activeOrders.length },
    { label: 'Pending', count: activeOrders.filter((o) => o.status === 'Pending').length },
    { label: 'Dispatched', count: activeOrders.filter((o) => o.status === 'Dispatched').length },
    { label: 'Out for Delivery', count: activeOrders.filter((o) => o.status === 'Out for Delivery').length },
    { label: 'Delivered', count: activeOrders.filter((o) => o.status === 'Delivered').length },
    { label: 'Archived', count: archivedOrders.length }
  ];

  const sourceList = filterStatus === 'Archived' ? archivedOrders : activeOrders;

  const filteredOrders = sourceList.filter((order) => {
    if (filterStatus !== 'All' && filterStatus !== 'Archived' && order.status !== filterStatus) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        (order.id && order.id.toLowerCase().includes(term)) ||
        (order.customerName && order.customerName.toLowerCase().includes(term)) ||
        (order.deliveryAddress?.street && order.deliveryAddress.street.toLowerCase().includes(term)) ||
        (order.cylinderSummary && order.cylinderSummary.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const selectedOrderForAssign = orders.find((o) => o.id === assigningOrderId);

  const handleAssign = async (driverId: string) => {
    if (!assigningOrderId) return;
    setIsProcessing(true);
    try {
      await onAssignDriver(assigningOrderId, driverId);
      setAssigningOrderId(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSoftDelete = async () => {
    if (!softDeletingOrder || !onDeleteOrder) return;
    setIsProcessing(true);
    try {
      const reason = customReason.trim() || selectedReason;
      await onDeleteOrder(softDeletingOrder.id, reason);
      setSoftDeletingOrder(null);
      setCustomReason('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async (orderId: string) => {
    if (!onRestoreOrder) return;
    setIsProcessing(true);
    try {
      await onRestoreOrder(orderId);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-6 shadow-xs">
      {/* Table Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-gray-100 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Dispatch Board</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 text-[#E04F11] border border-orange-200">
              Live Operations
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitor real-time cylinder orders, assign drivers, and manage soft-deleted records.
          </p>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search order, customer, area..."
              className="w-full sm:w-56 min-h-[40px] sm:min-h-[36px] pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 text-base sm:text-xs focus:ring-2 focus:ring-[#E04F11] focus:outline-none"
            />
          </div>

          {/* Status Pills */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 overflow-x-auto max-w-full">
            {filterTabs.map((tab) => (
              <button
                key={tab.label}
                type="button"
                onClick={() => setFilterStatus(tab.label)}
                className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  filterStatus === tab.label
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label} <span className="text-[10px] opacity-75">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MOBILE RESPONSIVE CARDS (Shown on screens < 640px) */}
      {/* ========================================================================= */}
      <div className="block sm:hidden space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
            No orders match the selected filters.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isOverdue = order.slaRemainingMinutes && order.slaRemainingMinutes < 0;
            const isArchived = order.isArchived || order.status === 'Archived';

            return (
              <div
                key={order.id}
                className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs hover:border-orange-200 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900 text-sm">#{order.id}</span>
                    <PriorityBadge priority={order.priority} />
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{order.customerName}</h4>
                  <p className="text-xs text-gray-500">{order.customerPhone}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-gray-800">
                    <Flame className="w-3.5 h-3.5 text-[#E04F11]" />
                    <span>{order.cylinderSummary}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{order.deliveryAddress?.street || 'Nairobi'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                  <div className="text-gray-500">
                    {order.status === 'Delivered' ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Delivered
                      </span>
                    ) : isOverdue ? (
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Overdue ({Math.abs(order.slaRemainingMinutes || 0)}m)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{order.slaRemainingMinutes || 35}m SLA</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isArchived ? (
                      <button
                        type="button"
                        onClick={() => handleRestore(order.id)}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-xs hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                        title="Restore Soft-Deleted Order"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                    ) : (
                      <>
                        {!order.driverName && (
                          <button
                            type="button"
                            onClick={() => setAssigningOrderId(order.id)}
                            className="px-2.5 py-1 bg-orange-50 text-[#E04F11] font-bold rounded-lg text-xs hover:bg-orange-100 flex items-center gap-1 cursor-pointer"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Assign</span>
                          </button>
                        )}
                        {onDeleteOrder && (
                          <button
                            type="button"
                            onClick={() => setSoftDeletingOrder(order)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Soft Delete Order"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectOrder(order)}
                      className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP & TABLET TABLE (Shown on screens >= 640px) */}
      {/* ========================================================================= */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-400 uppercase text-[11px] font-bold">
              <th className="pb-3">Order ID</th>
              <th className="pb-3">Customer</th>
              <th className="pb-3">Cylinder Item</th>
              <th className="pb-3">Delivery Area</th>
              <th className="pb-3">SLA Timer</th>
              <th className="pb-3">Priority</th>
              <th className="pb-3">Driver Assignment</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-gray-400 text-xs">
                  No orders match the selected filters.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const isOverdue = order.slaRemainingMinutes && order.slaRemainingMinutes < 0;
                const isArchived = order.isArchived || order.status === 'Archived';

                return (
                  <tr key={order.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Order ID */}
                    <td className="py-3.5 font-mono font-bold text-gray-900">
                      #{order.id}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5">
                      <p className="font-semibold text-gray-900">{order.customerName}</p>
                      <p className="text-gray-400 text-xs">{order.customerPhone}</p>
                    </td>

                    {/* Cylinder Summary */}
                    <td className="py-3.5 font-medium text-gray-800">
                      {order.cylinderSummary}
                    </td>

                    {/* Area */}
                    <td className="py-3.5 text-gray-600">
                      <span className="truncate max-w-[140px] block" title={order.deliveryAddress?.street || 'Nairobi'}>
                        {(order.deliveryAddress?.street || 'Nairobi').split(',')[0]}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {order.deliveryAddress?.city || 'Nairobi'} {order.deliveryAddress?.zipCode || ''}
                      </span>
                    </td>

                    {/* SLA Timer */}
                    <td className="py-3.5">
                      {order.status === 'Delivered' ? (
                        <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Met SLA
                        </span>
                      ) : isOverdue ? (
                        <span className="text-red-600 font-bold text-xs flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          <AlertTriangle className="w-3.5 h-3.5" /> Overdue ({Math.abs(order.slaRemainingMinutes || 0)}m)
                        </span>
                      ) : (
                        <span className="text-gray-700 font-semibold text-xs flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{order.slaRemainingMinutes || 35}m left</span>
                        </span>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="py-3.5">
                      <PriorityBadge priority={order.priority} />
                    </td>

                    {/* Driver Assignment */}
                    <td className="py-3.5">
                      {order.driverName ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-900 text-white font-bold text-[10px] flex items-center justify-center">
                            {order.driverName.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 block text-xs">
                              {order.driverName}
                            </span>
                            <span className="text-[10px] text-gray-400">{order.driverVehicle}</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAssigningOrderId(order.id)}
                          className="px-2.5 py-1 bg-[#FFF5EE] hover:bg-[#FEECE2] text-[#E04F11] border border-[#FEECE2] rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Assign Driver</span>
                        </button>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5">
                      <StatusBadge status={order.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isArchived ? (
                          <button
                            type="button"
                            onClick={() => handleRestore(order.id)}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md font-bold text-xs flex items-center gap-1 cursor-pointer"
                            title="Restore Soft-Deleted Order"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>
                        ) : (
                          onDeleteOrder && (
                            <button
                              type="button"
                              onClick={() => setSoftDeletingOrder(order)}
                              className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                              title="Soft Delete / Archive Order"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectOrder(order)}
                          className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                          title="View Order Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* 3. DRIVER ASSIGNMENT MODAL */}
      {/* ========================================================================= */}
      {assigningOrderId && selectedOrderForAssign && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Assign Driver</h3>
                <p className="text-xs text-gray-500">
                  Order #{selectedOrderForAssign.id} · {selectedOrderForAssign.cylinderSummary}
                </p>
              </div>
              <button
                onClick={() => setAssigningOrderId(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Available Drivers in Nairobi Hub
              </p>

              {drivers.length === 0 ? (
                <div className="py-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                  <p className="text-xs font-medium text-gray-600">No registered drivers in fleet roster</p>
                  <p className="text-[11px] text-gray-400 mt-1">Register drivers in Fleet Management to assign couriers</p>
                </div>
              ) : (
                drivers.map((driver) => {
                return (
                  <div
                    key={driver.id}
                    className="p-3.5 rounded-xl border border-gray-200 hover:border-[#E04F11] hover:bg-[#FFF5EE]/30 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs">
                        {driver.initials || (driver.name ? driver.name.split(' ').filter(Boolean).map((n) => n[0]).join('') : 'D')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-gray-900">{driver.name}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            driver.status === 'Available'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {driver.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {driver.vehicle} · {driver.load ?? 0} loaded · Rating ★ {driver.rating}
                        </p>
                      </div>
                    </div>

                    <button
                      disabled={isProcessing}
                      onClick={() => handleAssign(driver.id)}
                      className="px-3.5 py-1.5 bg-[#E04F11] hover:bg-[#C9420A] text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Assign
                    </button>
                  </div>
                );
              })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SOFT DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {softDeletingOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Soft Delete Order</h3>
                  <p className="text-xs text-gray-500 font-mono">#{softDeletingOrder.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSoftDeletingOrder(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                This order will be moved to the <strong>Archive</strong>. Customer records will be safely preserved, and the order can be restored at any time by administrators.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Reason for Soft Deletion
                </label>
                <div className="space-y-1.5">
                  {SOFT_DELETE_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        selectedReason === reason
                          ? 'border-[#E04F11] bg-orange-50/50 text-gray-900 font-semibold'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deleteReason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={() => setSelectedReason(reason)}
                        className="text-[#E04F11] focus:ring-[#E04F11]"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Additional Operator Notes (Optional)
                </label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="e.g. Customer called to change address to Westlands"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#E04F11]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSoftDeletingOrder(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmSoftDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Archiving...' : 'Confirm Soft Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
