import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  RefreshCw, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  ShoppingBag, 
  ShieldAlert, 
  CheckCircle2, 
  Ban, 
  UserCheck, 
  ArrowUpRight, 
  ExternalLink, 
  Clock, 
  DollarSign, 
  Eye, 
  X, 
  AlertCircle,
  Filter,
  Globe,
  ChevronRight
} from 'lucide-react';
import { CustomerRecord, Order } from '../../types';
import { api } from '../../services/api';
import { formatKSh } from '../../utils/format';
import { useRealtime } from '../../contexts/RealtimeContext';

interface CustomersViewProps {
  onRefresh?: () => void;
  onNavigateToOrders?: (orderId?: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ onRefresh, onNavigateToOrders }) => {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'orders' | 'spent' | 'name'>('recent');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);

  const { subscribe } = useRealtime();

  // Load customers
  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      setActionFeedback({
        message: err.message || 'Failed to load customer roster',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Real-time synchronization
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event.type === 'CUSTOMER_REGISTERED') {
        loadCustomers();
        setActionFeedback({
          message: 'A new customer just registered on the public website!',
          type: 'success'
        });
      } else if (event.type === 'USER_REGISTERED' || event.type === 'CUSTOMER_UPDATED') {
        loadCustomers();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe]);

  // Load customer orders when modal opens
  const handleOpenCustomerDetail = async (customer: CustomerRecord) => {
    setSelectedCustomer(customer);
    setShowSuspendConfirm(false);
    setSuspensionReason('');
    setIsLoadingOrders(true);
    try {
      const details = await api.getCustomerDetails(customer.id);
      setCustomerOrders(details.orders || []);
    } catch (err) {
      console.error('Failed to load customer orders:', err);
      setCustomerOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Suspend Customer
  const handleSuspend = async (customer: CustomerRecord) => {
    try {
      setIsProcessingAction(true);
      const res = await api.suspendCustomer(customer.id, suspensionReason || 'Suspended by operations admin');
      setActionFeedback({
        message: `Customer ${customer.name} has been suspended. Login and ordering access blocked.`,
        type: 'success'
      });
      setShowSuspendConfirm(false);
      setSuspensionReason('');
      setSelectedCustomer(res.customer);
      await loadCustomers();
      onRefresh?.();
    } catch (err: any) {
      setActionFeedback({
        message: err.message || 'Failed to suspend customer',
        type: 'error'
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Reactivate Customer
  const handleReactivate = async (customer: CustomerRecord) => {
    try {
      setIsProcessingAction(true);
      const res = await api.reactivateCustomer(customer.id);
      setActionFeedback({
        message: `Customer ${customer.name} has been reactivated. Full access restored.`,
        type: 'success'
      });
      setSelectedCustomer(res.customer);
      await loadCustomers();
      onRefresh?.();
    } catch (err: any) {
      setActionFeedback({
        message: err.message || 'Failed to reactivate customer',
        type: 'error'
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((c) => (c.status || 'active').toLowerCase() === statusFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.corridorZone && c.corridorZone.toLowerCase().includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortBy === 'orders') {
        return (b.ordersCount || 0) - (a.ordersCount || 0);
      }
      if (sortBy === 'spent') {
        return (b.totalSpent || 0) - (a.totalSpent || 0);
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return result;
  }, [customers, statusFilter, searchQuery, sortBy]);

  // Aggregated metrics
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => (c.status || 'active') === 'active').length;
  const suspendedCustomers = customers.filter((c) => c.status === 'suspended').length;
  const totalOrdersPlaced = customers.reduce((sum, c) => sum + (c.ordersCount || 0), 0);
  const totalCustomerSpend = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Banner */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP METRIC TILES */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Customers</span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#E04F11] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalCustomers}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Globe className="w-3 h-3 text-[#E04F11]" />
            <span>Public website accounts</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Active Accounts</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{activeCustomers}</div>
          <div className="text-[11px] text-slate-500 mt-1">Verified & eligible to order</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Suspended</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Ban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 mt-2">{suspendedCustomers}</div>
          <div className="text-[11px] text-slate-500 mt-1">Access & ordering blocked</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Orders</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalOrdersPlaced}</div>
          <div className="text-[11px] text-slate-500 mt-1">LPG refills & new cylinders</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{formatKSh(totalCustomerSpend)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Paid customer orders</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEARCH, FILTER & CONTROLS */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="admin-customer-search-input"
            type="text"
            placeholder="Search by name, email, phone, corridor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E04F11] focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills & Sorting */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            {(['all', 'active', 'suspended'] as const).map((tab) => (
              <button
                key={tab}
                id={`customer-filter-${tab}`}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer capitalize ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'all' ? 'All Customers' : tab}
              </button>
            ))}
          </div>

          {/* Sort selector */}
          <select
            id="customer-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E04F11] cursor-pointer"
          >
            <option value="recent">Recently Registered</option>
            <option value="orders">Most Orders Placed</option>
            <option value="spent">Highest Total Spend</option>
            <option value="name">Name (A-Z)</option>
          </select>

          {/* Refresh Button */}
          <button
            id="customer-refresh-btn"
            onClick={loadCustomers}
            title="Refresh customer list"
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#E04F11]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CUSTOMER TABLE */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Corridor / Location</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Orders</th>
                <th className="py-3 px-4 text-right">Total Spent</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#E04F11] mb-2" />
                    <span>Loading registered customers...</span>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No customers found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {searchQuery
                        ? 'Try adjusting your search or filter keywords'
                        : 'New customer sign-ups on the website will appear here automatically.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const isSuspended = cust.status === 'suspended';
                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => handleOpenCustomerDetail(cust)}
                    >
                      {/* Customer info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSuspended
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-orange-100 text-[#E04F11]'
                            }`}
                          >
                            {cust.avatar || cust.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-[#E04F11] transition-colors flex items-center gap-1.5">
                              <span>{cust.name}</span>
                              {isSuspended && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">
                                  Suspended
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">ID: {cust.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{cust.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{cust.phone || 'Phone not provided'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Corridor / Location */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {cust.corridorZone || cust.address || 'Nairobi Central'}
                          </span>
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(cust.createdAt)}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            isSuspended
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSuspended ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span className="capitalize">{cust.status || 'Active'}</span>
                        </span>
                      </td>

                      {/* Orders */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                          {cust.ordersCount || 0}
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatKSh(cust.totalSpent || 0)}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenCustomerDetail(cust)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-[#E04F11] hover:text-white text-slate-700 font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CUSTOMER DETAIL & MANAGEMENT MODAL */}
      {/* ========================================================================= */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-black ${
                    selectedCustomer.status === 'suspended'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-orange-100 text-[#E04F11]'
                  }`}
                >
                  {selectedCustomer.avatar || selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{selectedCustomer.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        selectedCustomer.status === 'suspended'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {selectedCustomer.status?.toUpperCase() || 'ACTIVE'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Customer ID: {selectedCustomer.id}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Email Address</div>
                  <div className="font-semibold text-slate-800 mt-0.5 break-all">{selectedCustomer.email}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Phone (M-Pesa)</div>
                  <div className="font-semibold text-slate-800 mt-0.5">{selectedCustomer.phone || 'None'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Registered Date</div>
                  <div className="font-semibold text-slate-800 mt-0.5">{formatDate(selectedCustomer.createdAt)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Corridor Zone</div>
                  <div className="font-semibold text-slate-800 mt-0.5">{selectedCustomer.corridorZone || 'Nairobi'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Total Orders</div>
                  <div className="font-semibold text-[#E04F11] mt-0.5">{customerOrders.length} orders</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Total Spent</div>
                  <div className="font-semibold text-emerald-700 mt-0.5">{formatKSh(selectedCustomer.totalSpent || 0)}</div>
                </div>
              </div>

              {/* Status Action Controls */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Account Access Control</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selectedCustomer.status === 'suspended'
                        ? 'This customer is currently suspended. Login and placing orders is blocked.'
                        : 'Account is in good standing. Customer can sign in and place delivery orders.'}
                    </p>
                  </div>

                  {selectedCustomer.status === 'suspended' ? (
                    <button
                      onClick={() => handleReactivate(selectedCustomer)}
                      disabled={isProcessingAction}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Reactivate Customer</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowSuspendConfirm(true)}
                      disabled={isProcessingAction}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Suspend Account</span>
                    </button>
                  )}
                </div>

                {/* Suspension Confirmation Box */}
                {showSuspendConfirm && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                    <div className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Reason for suspending {selectedCustomer.name}:</span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Fraudulent M-Pesa reversal, address fraud, harassment"
                      value={suspensionReason}
                      onChange={(e) => setSuspensionReason(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setShowSuspendConfirm(false)}
                        className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800 font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSuspend(selectedCustomer)}
                        disabled={isProcessingAction}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
                      >
                        Confirm Suspension
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Order History */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#E04F11]" />
                    <span>Order History ({customerOrders.length})</span>
                  </h4>
                </div>

                {isLoadingOrders ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto text-[#E04F11] mb-1" />
                    <span>Loading customer orders...</span>
                  </div>
                ) : customerOrders.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                    <ShoppingBag className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-slate-600">No orders placed yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      This customer has registered an account but hasn't completed an order.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {customerOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{ord.id}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                ord.status === 'Delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.status === 'Cancelled'
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-orange-100 text-[#E04F11]'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </div>
                          <p className="text-slate-600 font-medium mt-0.5 truncate">
                            {ord.cylinderSummary || (ord.items ? ord.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ') : 'LPG Refill')}
                          </p>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{formatDate(ord.createdAt)}</span>
                            <span>•</span>
                            <span className="capitalize">{ord.paymentMethod} ({ord.paymentStatus})</span>
                          </div>
                        </div>

                        <div className="text-right ml-3 shrink-0">
                          <div className="font-bold text-slate-900">{formatKSh(ord.total || 0)}</div>
                          {onNavigateToOrders && (
                            <button
                              onClick={() => {
                                setSelectedCustomer(null);
                                onNavigateToOrders(ord.id);
                              }}
                              className="text-[10px] text-[#E04F11] hover:underline font-bold mt-1 inline-flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>View Order</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
