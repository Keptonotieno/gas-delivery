import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  CreditCard, 
  Truck, 
  Package, 
  CheckCircle2, 
  UserX, 
  Phone, 
  ArrowRight, 
  RotateCcw, 
  ShieldAlert, 
  Flame, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Activity, 
  Check, 
  Plus, 
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
  Download,
  MapPin,
  Car,
  BadgeAlert,
  Send,
  Radio,
  Eye,
  ArrowUpRight
} from 'lucide-react';
import { Order, Driver, Product, DashboardMetrics, ActivityItem, OrderStatus } from '../../types';
import { api } from '../../services/api';

interface OperationsCenterViewProps {
  orders: Order[];
  drivers: Driver[];
  products: Product[];
  metrics: DashboardMetrics;
  onNavigateToDispatch: (orderId?: string) => void;
  onRefresh: () => void;
}

export const OperationsCenterView: React.FC<OperationsCenterViewProps> = ({
  orders,
  drivers,
  products,
  metrics,
  onNavigateToDispatch,
  onRefresh
}) => {
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(null);
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('All');
  const [activityLogs, setActivityLogs] = useState<ActivityItem[]>([]);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [viewingOrderDetail, setViewingOrderDetail] = useState<Order | null>(null);

  // New Order Form state
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('+254 7');
  const [newStreetAddress, setNewStreetAddress] = useState('');
  const [newCylinderChoice, setNewCylinderChoice] = useState('13kg Refill');
  const [newPaymentMethod, setNewPaymentMethod] = useState<'M-Pesa' | 'Cash on Delivery'>('M-Pesa');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Load activity logs
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const logs = await api.getActivity();
        setActivityLogs(logs);
      } catch (err) {
        console.error('Failed to load activity logs', err);
      }
    };
    fetchActivities();
  }, [orders]);

  // -------------------------------------------------------------
  // NEEDS ATTENTION QUERIES
  // -------------------------------------------------------------
  // 1. Orders awaiting driver
  const ordersAwaitingDriver = orders.filter(
    (o) => (o.status === 'Pending' || o.status === 'Preparing' || !o.driverId) && o.status !== 'Delivered' && o.status !== 'Cancelled'
  );

  // 2. Delayed deliveries
  const delayedDeliveries = orders.filter(
    (o) => (o.isOverdue || (typeof o.slaRemainingMinutes === 'number' && o.slaRemainingMinutes < 0)) &&
    o.status !== 'Delivered' && o.status !== 'Cancelled'
  );

  // 3. Payment confirmations
  const pendingPayments = orders.filter(
    (o) => (o.paymentStatus === 'Pending' || o.status === 'Payment Pending') && o.status !== 'Delivered'
  );

  // 4. Offline drivers with active deliveries
  const offlineDriversWithActive = drivers.filter(
    (d) => d.status === 'Offline' && d.activeOrderId
  );

  // 5. Low stock products (stock <= 25)
  const lowStockProducts = products.filter(
    (p) => (p.stock ?? 0) <= 25
  );

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------
  const showToast = (message: string) => {
    setActionSuccessMessage(message);
    setTimeout(() => setActionSuccessMessage(null), 3500);
  };

  const handleConfirmPayment = async (orderId: string) => {
    try {
      setConfirmingPaymentId(orderId);
      await api.confirmPayment(orderId, 'Paid');
      showToast(`Payment for #${orderId} confirmed and reconciled!`);
      onRefresh();
    } catch (err) {
      console.error('Failed to confirm payment', err);
    } finally {
      setConfirmingPaymentId(null);
    }
  };

  const handleRestockProduct = async (productId: string) => {
    try {
      setRestockingId(productId);
      await api.restockProduct(productId, 30);
      showToast(`Restocked 30 cylinder units to inventory!`);
      onRefresh();
    } catch (err) {
      console.error('Failed to restock product', err);
    } finally {
      setRestockingId(null);
    }
  };

  const handleQuickRestockAll = async () => {
    try {
      for (const prod of lowStockProducts) {
        await api.restockProduct(prod.id, 25);
      }
      showToast(`All low-stock cylinders restocked with 25 units each!`);
      onRefresh();
    } catch (err) {
      console.error('Failed batch restock', err);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Order ID', 'Customer', 'Phone', 'Address', 'Cylinder', 'Total (KSh)', 'Payment', 'Status', 'Driver'];
    const rows = orders.map(o => [
      o.id,
      `"${o.customerName}"`,
      o.customerPhone,
      `"${o.deliveryAddress.street}, ${o.deliveryAddress.city}"`,
      `"${o.cylinderSummary}"`,
      o.total,
      o.paymentStatus || 'Paid',
      o.status,
      `"${o.driverName || 'Unassigned'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gasdeliver-operations-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Daily operations summary exported as CSV.');
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingOrder(true);
    try {
      const price = newCylinderChoice.includes('22.5kg') ? 4800 : newCylinderChoice.includes('13kg') ? 2600 : 2450;
      await api.createOrder({
        customerName: newCustomerName,
        customerPhone: newCustomerPhone,
        deliveryAddress: {
          street: newStreetAddress,
          city: 'Nairobi',
          zipCode: '00100'
        },
        items: [
          {
            productId: 'prod-1',
            productName: `TotalEnergies ${newCylinderChoice}`,
            gasType: 'LPG',
            size: newCylinderChoice.split(' ')[0],
            quantity: 1,
            unitPrice: price
          }
        ],
        cylinderSummary: `${newCylinderChoice} × 1`,
        status: 'Pending',
        deliverySlot: 'Standard 45-min express',
        deliveryDate: 'Today',
        slaRemainingMinutes: 45,
        subtotal: price,
        deliveryFee: 0,
        total: price,
        paymentMethod: newPaymentMethod,
        paymentStatus: newPaymentMethod === 'M-Pesa' ? 'Paid' : 'Pending',
        priority: 'Normal'
      });
      setIsNewOrderModalOpen(false);
      setNewCustomerName('');
      setNewStreetAddress('');
      showToast('New customer cylinder order created successfully!');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create order');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Status Tab Filtering
  const filteredOrders = orders.filter((order) => {
    // Tab filter
    if (selectedStatusTab === 'Out for Delivery' && order.status !== 'Out for Delivery' && order.status !== 'En Route') {
      return false;
    }
    if (selectedStatusTab === 'Driver Assigned' && order.status !== 'Driver Assigned' && order.status !== 'Assigned') {
      return false;
    }
    if (selectedStatusTab === 'Preparing' && order.status !== 'Preparing' && order.status !== 'Dispatched') {
      return false;
    }
    if (selectedStatusTab === 'Payment Pending' && order.status !== 'Payment Pending' && order.paymentStatus !== 'Pending') {
      return false;
    }

    // Search query filter
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchCust = order.customerName.toLowerCase().includes(q);
      const matchDriver = (order.driverName || '').toLowerCase().includes(q);
      const matchCylinder = order.cylinderSummary.toLowerCase().includes(q);
      const matchStreet = order.deliveryAddress.street.toLowerCase().includes(q);
      return matchId || matchCust || matchDriver || matchCylinder || matchStreet;
    }

    return true;
  });

  // Calculate high-level numbers
  const totalStockCount = products.reduce((acc, p) => acc + (p.stock ?? 0), 0);
  const activeOrdersCount = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
  const outForDeliveryCount = orders.filter(o => o.status === 'Out for Delivery' || o.status === 'En Route').length;
  const driverAssignedCount = orders.filter(o => o.status === 'Driver Assigned' || o.status === 'Assigned').length;
  const preparingCount = orders.filter(o => o.status === 'Preparing' || (o.status === 'Dispatched' && !o.driverId)).length;
  const activeDriversCount = drivers.filter(d => d.status !== 'Offline').length;
  const idleDriversCount = drivers.filter(d => d.status === 'Available').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {actionSuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HEADER: OPERATIONS CENTER + ACTION BUTTONS */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 sm:p-6 rounded-xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Operations Center</h1>
            <span className="px-2.5 py-1 rounded-full bg-orange-50 text-[#E04F11] border border-orange-200/80 text-[11px] font-semibold tracking-tight">
              Live Fleet Control
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Real-time dispatch, fleet telemetry, and LPG inventory control across Nairobi hubs
          </p>
        </div>

        {/* Quick Action Buttons (horizontally scrollable on mobile, wrapping on desktop) */}
        <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap max-w-full no-scrollbar">
          <button
            onClick={() => setIsNewOrderModalOpen(true)}
            className="shrink-0 min-h-[40px] px-3.5 sm:px-4 py-2 bg-[#E04F11] hover:bg-[#c2410c] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Express Order</span>
          </button>
          <button
            onClick={() => onNavigateToDispatch()}
            className="shrink-0 min-h-[40px] px-3.5 sm:px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5 text-slate-500" />
            <span>Assign Drivers</span>
          </button>
          <button
            onClick={() => onNavigateToDispatch()}
            className="shrink-0 min-h-[40px] px-3.5 sm:px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-slate-500" />
            <span>Quick Dispatch</span>
          </button>
          <button
            onClick={handleQuickRestockAll}
            className="shrink-0 min-h-[40px] px-3.5 sm:px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-[#E04F11]" />
            <span>Restock Cylinders</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="shrink-0 min-h-[40px] px-3.5 sm:px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOP 6 KPI METRIC CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Active Orders */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase text-[11px] tracking-wider text-slate-500">Active Orders</span>
            <Package className="w-4 h-4 text-[#E04F11]" />
          </div>
          <div className="mt-3">
            <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              {activeOrdersCount}
            </span>
            <div className="text-xs text-slate-500 font-medium mt-1">
              {ordersAwaitingDriver.length > 0 ? `${ordersAwaitingDriver.length} awaiting dispatch` : 'All assigned'}
            </div>
          </div>
        </div>

        {/* Card 2: Out for Delivery */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase text-[11px] tracking-wider text-slate-500">Out for Delivery</span>
            <Truck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              {outForDeliveryCount}
            </span>
            <div className="text-xs text-slate-500 font-medium mt-1">
              {outForDeliveryCount > 0 ? `${outForDeliveryCount} couriers en route` : 'No couriers en route'}
            </div>
          </div>
        </div>

        {/* Card 3: Active Drivers */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase text-[11px] tracking-wider text-slate-500">Active Drivers</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl lg:text-3xl font-extrabold text-emerald-600 tracking-tight font-sans">
                {activeDriversCount}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ {drivers.length}</span>
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              {idleDriversCount} available standby
            </div>
          </div>
        </div>

        {/* Card 4: Cylinders in Stock */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase text-[11px] tracking-wider text-slate-500">Cylinders in Stock</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              {totalStockCount.toLocaleString()}
            </span>
            <div className={`text-xs font-semibold mt-1 ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {lowStockProducts.length > 0 ? `${lowStockProducts.length} low stock alerts` : 'All depots supplied'}
            </div>
          </div>
        </div>

        {/* Card 5: Today's Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase text-[11px] tracking-wider text-slate-500">Today's Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="text-xl lg:text-2xl font-bold font-mono text-slate-900 tracking-tight">
              KSh {(metrics.revenueToday ?? metrics.totalRevenueToday ?? orders.filter(o => o.paymentStatus === 'Paid' || o.status === 'Delivered').reduce((sum, o) => sum + (o.total || 0), 0)).toLocaleString()}
            </span>
            <div className="text-xs text-emerald-600 font-semibold mt-1">
              {orders.filter(o => o.status === 'Delivered').length} fulfilled orders today
            </div>
          </div>
        </div>

        {/* Card 6: SLA Compliance */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase text-[11px] tracking-wider text-slate-500">SLA Compliance</span>
            <Percent className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              {typeof metrics.slaComplianceRate === 'number' ? `${metrics.slaComplianceRate}%` : '96%'}
            </span>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Target: &gt;95% on-time
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN BODY GRID: LEFT (ORDERS & DISPATCH) + RIGHT (ALERTS, TELEMETRY, LOGS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: 7 OF 12 COLUMNS */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Operations & Fleet Status Panel */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Panel Header */}
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900 text-sm tracking-tight">Operations & Fleet Status</h2>
                <p className="text-xs text-slate-500 mt-0.5">Live order fulfillment stream across active Nairobi hubs</p>
              </div>

              {/* Status Tab Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { key: 'All', label: `All (${orders.length})` },
                  { key: 'Out for Delivery', label: `Out for Delivery (${outForDeliveryCount})` },
                  { key: 'Driver Assigned', label: `Assigned (${driverAssignedCount})` },
                  { key: 'Preparing', label: `Preparing (${preparingCount})` },
                  { key: 'Payment Pending', label: `Pending (${pendingPayments.length})` },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedStatusTab(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedStatusTab === tab.key
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Filter Bar */}
            <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by customer, ID, cylinder, address..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#E04F11] transition-all"
                />
              </div>
              <span className="text-xs text-slate-500 font-medium font-mono">
                Showing {filteredOrders.length} orders
              </span>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-500 uppercase tracking-wider font-semibold text-[11px] border-b border-slate-200/80">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Cylinder</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Driver</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200/60">
                            <Package className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-slate-800">
                            {orders.length === 0 ? 'No Active Orders' : 'No matching orders found'}
                          </p>
                          <p className="text-xs text-slate-500 mt-1 max-w-xs">
                            {orders.length === 0
                              ? 'Customer orders placed online or dispatched manually will appear here in real-time.'
                              : 'Try selecting a different status filter above to view existing orders.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.slice(0, 8).map((order) => {
                      const isPaid = order.paymentStatus === 'Paid' || order.status !== 'Payment Pending';
                      return (
                        <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Order ID */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs">
                            {order.id}
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{order.customerName}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[140px] mt-0.5">
                              {order.deliveryAddress.street.split(',')[0]}
                            </div>
                          </td>

                          {/* Cylinder */}
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-slate-800">{order.cylinderSummary}</span>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 font-bold font-mono text-slate-900">
                            KSh {(order.total ?? 0).toLocaleString()}
                          </td>

                          {/* Payment */}
                          <td className="py-3.5 px-4">
                            {isPaid ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono bg-amber-50 text-amber-700 border border-amber-200/80">
                                Pending
                              </span>
                            )}
                          </td>

                          {/* Status Pill */}
                          <td className="py-3.5 px-4">
                            {order.status === 'Out for Delivery' || order.status === 'En Route' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-orange-50 text-[#E04F11] border border-orange-200/80 whitespace-nowrap">
                                Out for Delivery
                              </span>
                            ) : order.status === 'Driver Assigned' || order.status === 'Assigned' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 whitespace-nowrap">
                                Driver Assigned
                              </span>
                            ) : order.status === 'Preparing' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 whitespace-nowrap">
                                Preparing
                              </span>
                            ) : order.status === 'Payment Pending' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200/80 whitespace-nowrap">
                                Payment Pending
                              </span>
                            ) : order.status === 'Delivered' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
                                Delivered
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 whitespace-nowrap">
                                {order.status}
                              </span>
                            )}
                          </td>

                          {/* Driver */}
                          <td className="py-3.5 px-4">
                            {order.driverName ? (
                              <span className="font-semibold text-slate-800 text-xs truncate max-w-[120px] block">
                                {order.driverName}
                              </span>
                            ) : (
                              <button
                                onClick={() => onNavigateToDispatch(order.id)}
                                className="px-3 py-1 bg-[#E04F11] text-white rounded-md text-[11px] font-semibold hover:bg-[#c2410c] transition-colors cursor-pointer"
                              >
                                Assign
                              </button>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewingOrderDetail(order)}
                                title="View order details"
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onNavigateToDispatch(order.id)}
                                title="Track / Reassign in Dispatch"
                                className="p-1.5 text-[#E04F11] hover:bg-orange-50 rounded-md transition-colors cursor-pointer"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
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

            {/* Table Footer */}
            <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Updated live via Nairobi WebSocket telemetry hub</span>
              <button
                onClick={() => onNavigateToDispatch()}
                className="text-[#E04F11] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Open Full Dispatch Grid</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: 5 OF 12 COLUMNS */}
        <div className="lg:col-span-5 space-y-6">

          {/* ========================================================================= */}
          {/* 1. NEEDS ATTENTION PANEL */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-sm text-slate-900 tracking-tight">Needs Attention</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold font-mono">
                {ordersAwaitingDriver.length + delayedDeliveries.length + pendingPayments.length + offlineDriversWithActive.length + lowStockProducts.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Alert item 1: Orders awaiting driver */}
              <div className="p-3 rounded-lg border border-amber-200/80 bg-amber-50/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-100"></span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">Orders awaiting driver</span>
                      <span className="text-amber-800 font-bold font-mono text-[11px]">({ordersAwaitingDriver.length})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Unassigned cylinder requests queued at depot</p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateToDispatch()}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Assign
                </button>
              </div>

              {/* Alert item 2: Delayed deliveries */}
              <div className="p-3 rounded-lg border border-rose-200/80 bg-rose-50/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-100"></span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">Delayed deliveries</span>
                      <span className="text-rose-800 font-bold font-mono text-[11px]">({delayedDeliveries.length})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">SLA breached or overdue route timers</p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateToDispatch()}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Expedite
                </button>
              </div>

              {/* Alert item 3: Payment confirmations */}
              <div className="p-3 rounded-lg border border-blue-200/80 bg-blue-50/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">Payment confirmations</span>
                      <span className="text-blue-800 font-bold font-mono text-[11px]">({pendingPayments.length})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Manual Cash/M-Pesa receipts pending signoff</p>
                  </div>
                </div>
                {pendingPayments.length > 0 && (
                  <button
                    onClick={() => handleConfirmPayment(pendingPayments[0].id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Confirm
                  </button>
                )}
              </div>

              {/* Alert item 4: Offline drivers */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <UserX className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">Offline drivers (Active orders)</span>
                      <span className="text-slate-700 font-bold font-mono text-[11px]">({offlineDriversWithActive.length})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Riders marked offline during an ongoing delivery</p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateToDispatch()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-black text-white rounded-md text-[11px] font-semibold cursor-pointer"
                >
                  Inspect
                </button>
              </div>

              {/* Alert item 5: Low-stock products */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <Flame className="w-4 h-4 text-[#E04F11] shrink-0" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">Low-stock cylinders</span>
                      <span className="text-orange-700 font-bold font-mono text-[11px]">({lowStockProducts.length})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Depot cylinder inventory below safety threshold</p>
                  </div>
                </div>
                <button
                  onClick={handleQuickRestockAll}
                  className="px-3 py-1.5 bg-[#E04F11] hover:bg-[#c2410c] text-white rounded-md text-[11px] font-semibold cursor-pointer"
                >
                  Restock
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. FLEET TELEMETRY / DRIVER STATUS CARD (CONNECTED TO REAL DATABASE) */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900 tracking-tight">Fleet Telemetry & Status</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium font-mono">{drivers.length} Vehicles In Database</span>
            </div>

            <div className="space-y-2.5">
              {drivers.slice(0, 4).map((driver) => {
                const isOnline = driver.status === 'Available' || driver.status === 'On Delivery' || driver.status === 'En Route';
                const statusBg =
                  driver.status === 'On Delivery' || driver.status === 'En Route'
                    ? 'bg-orange-50 text-[#E04F11] border-orange-200/80'
                    : driver.status === 'Available'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                    : driver.status === 'Assigned'
                    ? 'bg-blue-50 text-blue-700 border-blue-200/80'
                    : 'bg-slate-100 text-slate-600 border-slate-200/80';

                return (
                  <div key={driver.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      {driver.avatar ? (
                        <img
                          src={driver.avatar}
                          alt={driver.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center font-mono">
                          {driver.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{driver.name}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-mono font-semibold">
                            {driver.licensePlate || 'KDA 000'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {driver.currentStop || driver.vehicle || 'Nairobi Central Corridor'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${statusBg}`}>
                        {driver.status}
                      </span>
                      {driver.etaMinutes ? (
                        <div className="text-[11px] text-emerald-700 font-bold font-mono mt-0.5">{driver.etaMinutes}m ETA</div>
                      ) : (
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">Idle Standby</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. LIVE OPERATIONS ACTIVITY FEED */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-sm text-slate-900 tracking-tight">Live Operations Activity</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Real-time Nairobi events</span>
            </div>

            <div className="space-y-3">
              {activityLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-xs">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-[#E04F11] shrink-0 ring-2 ring-orange-100" />
                  <div className="flex-1">
                    <p className="text-slate-800 font-medium leading-snug">{log.title}</p>
                    <span className="text-[11px] text-slate-400 font-mono">{log.timeAgo || log.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW ORDER */}
      {/* ========================================================================= */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Create Express Order</h3>
                <p className="text-xs text-gray-500">Insert custom cylinder delivery into Nairobi dispatch stream.</p>
              </div>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Wanjiku"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-hidden focus:border-[#E04F11]"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">M-Pesa Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="+254 712 345 678"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-hidden focus:border-[#E04F11]"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Delivery Destination *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 14 Riverside Drive, Westlands, Nairobi"
                  value={newStreetAddress}
                  onChange={(e) => setNewStreetAddress(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-hidden focus:border-[#E04F11]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Cylinder Size & Type</label>
                  <select
                    value={newCylinderChoice}
                    onChange={(e) => setNewCylinderChoice(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-hidden focus:border-[#E04F11]"
                  >
                    <option value="13kg Refill">13kg Refill (KSh 2,600)</option>
                    <option value="6kg Refill">6kg Refill (KSh 2,350)</option>
                    <option value="6kg Complete Kit">6kg Complete Kit (KSh 2,450)</option>
                    <option value="22.5kg Commercial">22.5kg Commercial (KSh 4,800)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Payment Method</label>
                  <select
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value as any)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-hidden focus:border-[#E04F11]"
                  >
                    <option value="M-Pesa">M-Pesa (Instant)</option>
                    <option value="Cash on Delivery">Cash on Delivery</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="px-4 py-2 bg-[#E04F11] hover:bg-[#c2410c] text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmittingOrder ? 'Dispatching...' : 'Submit & Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW ORDER DETAIL */}
      {/* ========================================================================= */}
      {viewingOrderDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Order #{viewingOrderDetail.id}</h3>
                <span className="text-[11px] text-gray-500">{viewingOrderDetail.deliveryDate}</span>
              </div>
              <button
                onClick={() => setViewingOrderDetail(null)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Customer</span>
                <span className="font-bold text-gray-900 text-sm">{viewingOrderDetail.customerName}</span>
                <span className="text-gray-500 block">{viewingOrderDetail.customerPhone}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Delivery Address</span>
                <span className="text-gray-800">{viewingOrderDetail.deliveryAddress.street}, {viewingOrderDetail.deliveryAddress.city}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Cylinder & Pricing</span>
                <span className="font-semibold text-gray-900">{viewingOrderDetail.cylinderSummary}</span>
                <span className="font-extrabold text-[#E04F11] text-base block mt-0.5">
                  KSh {(viewingOrderDetail.total ?? 0).toLocaleString()} ({viewingOrderDetail.paymentMethod})
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Current Status & Driver</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full bg-orange-50 text-[#E04F11] font-bold border border-orange-200">
                    {viewingOrderDetail.status}
                  </span>
                  <span className="text-gray-700 font-medium">
                    Driver: {viewingOrderDetail.driverName || 'None assigned yet'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToDispatch(viewingOrderDetail.id);
                    setViewingOrderDetail(null);
                  }}
                  className="px-4 py-2 bg-[#E04F11] hover:bg-[#c2410c] text-white rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Manage in Dispatch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
