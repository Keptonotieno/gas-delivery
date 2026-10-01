import React, { useState, useEffect, useMemo } from 'react';
import { 
  Archive, 
  RotateCcw, 
  Trash2, 
  Search, 
  Users, 
  ShoppingCart, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Filter, 
  Eye, 
  X, 
  Check, 
  Truck, 
  Calendar, 
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { Employee, Order, ArchiveStats } from '../../types';
import { api } from '../../services/api';
import { formatKSh } from '../../utils/format';

interface ArchiveManagerViewProps {
  onRefresh?: () => void;
  onNavigateToEmployees?: () => void;
  onNavigateToOrders?: () => void;
}

export const ArchiveManagerView: React.FC<ArchiveManagerViewProps> = ({
  onRefresh,
  onNavigateToEmployees,
  onNavigateToOrders
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search
  const [activeTab, setActiveTab] = useState<'all' | 'employees' | 'orders'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'driver' | 'worker'>('all');

  // Selection for bulk restore
  const [selectedItems, setSelectedItems] = useState<Array<{ type: 'employee' | 'order'; id: string }>>([]);

  // Detail Modal & Action State
  const [detailItem, setDetailItem] = useState<{ type: 'employee'; data: Employee } | { type: 'order'; data: Order } | null>(null);
  const [confirmRestoreItem, setConfirmRestoreItem] = useState<{ type: 'employee' | 'order'; id: string; name: string } | null>(null);
  const [confirmPurgeItem, setConfirmPurgeItem] = useState<{ type: 'employee' | 'order'; id: string; name: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const loadArchiveData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getArchive();
      setEmployees(data.employees || []);
      setOrders(data.orders || []);
      setStats(data.stats || null);
    } catch (err: any) {
      console.error('Failed to load archive data', err);
      showToast('error', err.message || 'Failed to load archive records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArchiveData();
  }, []);

  // Handle single restore
  const handleRestore = async (type: 'employee' | 'order', id: string, name: string) => {
    setIsProcessing(true);
    try {
      const res = await api.restoreArchiveItem(type, id);
      showToast('success', res.message || `${name} successfully restored to active records.`);
      setConfirmRestoreItem(null);
      setSelectedItems(prev => prev.filter(item => !(item.type === type && item.id === id)));
      await loadArchiveData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to restore record');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle batch restore
  const handleBatchRestore = async () => {
    if (selectedItems.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await api.restoreArchiveBatch(selectedItems);
      showToast('success', res.message || `Successfully restored ${selectedItems.length} records.`);
      setSelectedItems([]);
      await loadArchiveData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to restore batch');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle permanent purge
  const handlePermanentPurge = async (type: 'employee' | 'order', id: string, name: string) => {
    setIsProcessing(true);
    try {
      const res = await api.permanentlyDeleteArchiveItem(type, id);
      showToast('success', res.message || `Permanently purged ${name} from archive.`);
      setConfirmPurgeItem(null);
      setSelectedItems(prev => prev.filter(item => !(item.type === type && item.id === id)));
      await loadArchiveData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to purge record');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered lists
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (selectedTypeFilter === 'driver' && emp.role !== 'Driver') return false;
      if (selectedTypeFilter === 'worker' && emp.role === 'Driver') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.id.toLowerCase().includes(q) ||
          emp.phone.toLowerCase().includes(q) ||
          (emp.archivedReason && emp.archivedReason.toLowerCase().includes(q)) ||
          (emp.archivedBy && emp.archivedBy.toLowerCase().includes(q)) ||
          (emp.vehicle && emp.vehicle.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [employees, selectedTypeFilter, searchQuery]);

  const filteredOrders = useMemo(() => {
    return orders.filter(ord => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          ord.id.toLowerCase().includes(q) ||
          ord.customerName.toLowerCase().includes(q) ||
          ord.customerPhone.toLowerCase().includes(q) ||
          (ord.deliveryAddress?.street && ord.deliveryAddress.street.toLowerCase().includes(q)) ||
          (ord.cylinderSummary && ord.cylinderSummary.toLowerCase().includes(q)) ||
          (ord.archivedReason && ord.archivedReason.toLowerCase().includes(q)) ||
          (ord.archivedBy && ord.archivedBy.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [orders, searchQuery]);

  const toggleSelectAllEmployees = () => {
    const allSelected = filteredEmployees.every(emp => 
      selectedItems.some(i => i.type === 'employee' && i.id === emp.id)
    );
    if (allSelected) {
      setSelectedItems(prev => prev.filter(i => i.type !== 'employee' || !filteredEmployees.some(e => e.id === i.id)));
    } else {
      const toAdd = filteredEmployees
        .filter(emp => !selectedItems.some(i => i.type === 'employee' && i.id === emp.id))
        .map(emp => ({ type: 'employee' as const, id: emp.id }));
      setSelectedItems(prev => [...prev, ...toAdd]);
    }
  };

  const toggleSelectAllOrders = () => {
    const allSelected = filteredOrders.every(ord => 
      selectedItems.some(i => i.type === 'order' && i.id === ord.id)
    );
    if (allSelected) {
      setSelectedItems(prev => prev.filter(i => i.type !== 'order' || !filteredOrders.some(o => o.id === i.id)));
    } else {
      const toAdd = filteredOrders
        .filter(ord => !selectedItems.some(i => i.type === 'order' && i.id === ord.id))
        .map(ord => ({ type: 'order' as const, id: ord.id }));
      setSelectedItems(prev => [...prev, ...toAdd]);
    }
  };

  const isItemSelected = (type: 'employee' | 'order', id: string) => {
    return selectedItems.some(item => item.type === type && item.id === id);
  };

  const toggleSelectItem = (type: 'employee' | 'order', id: string) => {
    if (isItemSelected(type, id)) {
      setSelectedItems(prev => prev.filter(item => !(item.type === type && item.id === id)));
    } else {
      setSelectedItems(prev => [...prev, { type, id }]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div 
          id="archive-toast-alert"
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all animate-in slide-in-from-top-3 ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)} 
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Policy Explainer Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 lg:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Archive Manager
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  Audit & Recovery
                </span>
              </div>
              <p className="text-slate-500 text-sm mt-1 max-w-2xl leading-relaxed">
                Records soft-deleted from the workforce directory or orders register are marked as <strong>Archived</strong>. 
                Their full audit trails, reasons, and prior states remain preserved here and can be restored back to live operations at any time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              id="archive-refresh-button"
              type="button"
              onClick={loadArchiveData}
              disabled={isLoading}
              className="px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
              title="Refresh Archive Records"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            {selectedItems.length > 0 && (
              <button
                id="archive-batch-restore-button"
                type="button"
                onClick={handleBatchRestore}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restore Selected ({selectedItems.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Audit Stats Bento */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Archived Records
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{stats?.totalArchived ?? 0}</span>
              <span className="text-xs text-slate-500">records</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Archived Staff
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{stats?.archivedEmployeesCount ?? 0}</span>
              <span className="text-xs text-slate-500">
                ({stats?.archivedDriversCount ?? 0} drivers / {stats?.archivedWorkersCount ?? 0} workers)
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Archived Orders
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{stats?.archivedOrdersCount ?? 0}</span>
              <span className="text-xs text-slate-500">orders</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Compliance Retention
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-emerald-700 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Full Audit Trail</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs and Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit">
            <button
              id="tab-archive-all"
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>All Records</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {(employees.length + orders.length)}
              </span>
            </button>

            <button
              id="tab-archive-employees"
              type="button"
              onClick={() => setActiveTab('employees')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'employees'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Archived Employees</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800">
                {employees.length}
              </span>
            </button>

            <button
              id="tab-archive-orders"
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'orders'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Archived Orders</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800">
                {orders.length}
              </span>
            </button>
          </div>

          {/* Search and Secondary Filter */}
          <div className="flex items-center gap-2.5 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="archive-search-input"
                type="text"
                placeholder="Search by name, ID, phone, destination, or reason..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E04F11]/20 focus:border-[#E04F11]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {(activeTab === 'all' || activeTab === 'employees') && (
              <select
                id="archive-role-filter"
                value={selectedTypeFilter}
                onChange={e => setSelectedTypeFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E04F11]/20 focus:border-[#E04F11]"
              >
                <option value="all">All Roles</option>
                <option value="driver">Drivers Only</option>
                <option value="worker">Workers Only</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 1: ARCHIVED EMPLOYEES TABLE */}
      {(activeTab === 'all' || activeTab === 'employees') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:px-6 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-amber-700" />
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Archived Workforce Records ({filteredEmployees.length})
              </h3>
            </div>
            {onNavigateToEmployees && (
              <button
                type="button"
                onClick={onNavigateToEmployees}
                className="text-xs font-bold text-[#E04F11] hover:text-[#C53F0A] flex items-center gap-1 cursor-pointer"
              >
                <span>View Active Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={filteredEmployees.length > 0 && filteredEmployees.every(emp => isItemSelected('employee', emp.id))}
                      onChange={toggleSelectAllEmployees}
                      className="rounded border-slate-300 text-[#E04F11] focus:ring-[#E04F11] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Employee / Role</th>
                  <th className="py-3 px-4">Contact & Vehicle</th>
                  <th className="py-3 px-4">Previous State</th>
                  <th className="py-3 px-4">Archived Reason & Audit</th>
                  <th className="py-3 px-4 text-right">Recovery Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                      <p className="font-semibold text-slate-600">No archived employee records found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {searchQuery ? 'Try adjusting your search criteria' : 'Any soft-deleted staff will appear in this audit register'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => {
                    const selected = isItemSelected('employee', emp.id);
                    return (
                      <tr 
                        key={emp.id} 
                        className={`hover:bg-amber-50/30 transition-colors ${selected ? 'bg-amber-50/40' : ''}`}
                      >
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelectItem('employee', emp.id)}
                            className="rounded border-slate-300 text-[#E04F11] focus:ring-[#E04F11] cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 font-extrabold flex items-center justify-center shrink-0 border border-amber-200">
                              {emp.avatar ? (
                                <img 
                                  src={emp.avatar} 
                                  alt={emp.name} 
                                  className="w-full h-full object-cover rounded-xl"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                emp.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span>{emp.name}</span>
                                <span className="font-mono text-[11px] text-slate-400">({emp.id})</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                  emp.role === 'Driver' 
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {emp.role}
                                </span>
                                <span className="text-[11px] text-slate-400">Joined {emp.joinedDate}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-xs text-slate-700 space-y-0.5">
                            <div>{emp.phone}</div>
                            <div className="text-slate-400 text-[11px]">{emp.email}</div>
                            {emp.vehicle && emp.vehicle !== 'N/A' && (
                              <div className="text-slate-500 font-mono text-[10px] flex items-center gap-1 mt-0.5">
                                <Truck className="w-3 h-3 text-slate-400" />
                                <span>{emp.vehicle}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 block w-fit">
                              Prior: {emp.previousStatus || 'Active'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 block w-fit">
                              Current: Archived
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="space-y-1">
                            <p className="text-xs text-slate-800 font-medium line-clamp-2" title={emp.archivedReason || emp.terminationReason || 'Soft-deleted'}>
                              {emp.archivedReason || emp.terminationReason || 'Soft-deleted from active roster'}
                            </p>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{emp.archivedAt ? new Date(emp.archivedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Jan 2025'}</span>
                              {emp.archivedBy && (
                                <span className="font-semibold text-slate-500">· By {emp.archivedBy}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailItem({ type: 'employee', data: emp })}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="View Complete Audit Trail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRestoreItem({ type: 'employee', id: emp.id, name: emp.name })}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-emerald-200"
                              title="Restore Employee to Active Directory"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Restore</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmPurgeItem({ type: 'employee', id: emp.id, name: emp.name })}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Permanently Purge Record (Irreversible)"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </div>
      )}

      {/* SECTION 2: ARCHIVED ORDERS TABLE */}
      {(activeTab === 'all' || activeTab === 'orders') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:px-6 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="w-4 h-4 text-blue-700" />
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Archived Orders Register ({filteredOrders.length})
              </h3>
            </div>
            {onNavigateToOrders && (
              <button
                type="button"
                onClick={onNavigateToOrders}
                className="text-xs font-bold text-[#E04F11] hover:text-[#C53F0A] flex items-center gap-1 cursor-pointer"
              >
                <span>View Live Orders</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={filteredOrders.length > 0 && filteredOrders.every(ord => isItemSelected('order', ord.id))}
                      onChange={toggleSelectAllOrders}
                      className="rounded border-slate-300 text-[#E04F11] focus:ring-[#E04F11] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Order ID / Cylinders</th>
                  <th className="py-3 px-4">Customer & Location</th>
                  <th className="py-3 px-4">Financials & Prior Status</th>
                  <th className="py-3 px-4">Archived Reason & Audit</th>
                  <th className="py-3 px-4 text-right">Recovery Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                      <p className="font-semibold text-slate-600">No archived order records found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {searchQuery ? 'Try adjusting your search criteria' : 'Any soft-deleted orders will be preserved in this recovery archive'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(ord => {
                    const selected = isItemSelected('order', ord.id);
                    return (
                      <tr 
                        key={ord.id} 
                        className={`hover:bg-blue-50/30 transition-colors ${selected ? 'bg-blue-50/40' : ''}`}
                      >
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelectItem('order', ord.id)}
                            className="rounded border-slate-300 text-[#E04F11] focus:ring-[#E04F11] cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-extrabold text-slate-900 text-xs sm:text-sm">
                            #{ord.id}
                          </div>
                          <div className="text-xs text-slate-600 font-semibold mt-0.5">
                            {ord.cylinderSummary}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Placed {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : 'Recent'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-xs">
                            {ord.customerName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {ord.customerPhone}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 max-w-xs truncate" title={ord.deliveryAddress?.street}>
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{ord.deliveryAddress?.street}, {ord.deliveryAddress?.city}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900">
                            {formatKSh(ord.total)}
                          </div>
                          <div className="space-y-1 mt-1">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 block w-fit">
                              Prior: {ord.previousStatus || 'Delivered'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 block w-fit">
                              Archived
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="space-y-1">
                            <p className="text-xs text-slate-800 font-medium line-clamp-2" title={ord.archivedReason || 'Soft-deleted order'}>
                              {ord.archivedReason || 'Soft-deleted by administrator'}
                            </p>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{ord.archivedAt ? new Date(ord.archivedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Jan 2025'}</span>
                              {ord.archivedBy && (
                                <span className="font-semibold text-slate-500">· By {ord.archivedBy}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailItem({ type: 'order', data: ord })}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="View Order Audit Trail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRestoreItem({ type: 'order', id: ord.id, name: `Order #${ord.id}` })}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-emerald-200"
                              title="Restore Order"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Restore</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmPurgeItem({ type: 'order', id: ord.id, name: `Order #${ord.id}` })}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Permanently Purge Order (Irreversible)"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </div>
      )}

      {/* CONFIRM RESTORE MODAL */}
      {confirmRestoreItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-emerald-700 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-200">
                <RotateCcw className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Confirm Record Restoration</h3>
                <span className="text-xs text-slate-500">Return to active operational database</span>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to restore <strong>{confirmRestoreItem.name}</strong>?
            </p>
            <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {confirmRestoreItem.type === 'employee' 
                ? 'The employee will reappear in the Staff Directory, be returned to their previous status, and their vehicle or driver availability will be restored.'
                : 'The order will be restored to its prior state (or Pending) and will reappear in the live Orders & Dispatch boards.'}
            </p>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmRestoreItem(null)}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRestore(confirmRestoreItem.type, confirmRestoreItem.id, confirmRestoreItem.name)}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Restore</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM PERMANENT PURGE MODAL */}
      {confirmPurgeItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-700 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-200">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Permanent Purge</h3>
                <span className="text-xs text-rose-600 font-semibold">Irreversible Administrative Action</span>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              Are you sure you want to permanently delete <strong>{confirmPurgeItem.name}</strong> from the archive?
            </p>
            <p className="text-xs text-rose-700 mt-2 bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">
              Warning: This completely purges this record from the database. It cannot be recovered or restored after this operation.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmPurgeItem(null)}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePermanentPurge(confirmPurgeItem.type, confirmPurgeItem.id, confirmPurgeItem.name)}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purge Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL AUDIT MODAL */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Archive Audit Record
                  </h3>
                  <span className="text-xs text-slate-400">
                    {detailItem.type === 'employee' ? `Staff ID: ${detailItem.data.id}` : `Order: #${detailItem.data.id}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailItem.type === 'employee' ? (
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Name</span>
                    <span className="font-bold text-slate-900">{detailItem.data.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Role</span>
                    <span className="font-bold text-slate-900">{detailItem.data.role}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Phone</span>
                    <span className="font-mono text-slate-800">{detailItem.data.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Vehicle</span>
                    <span className="text-slate-800">{detailItem.data.vehicle || 'N/A'}</span>
                  </div>
                </div>

                <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 space-y-2 text-amber-900">
                  <div className="font-bold text-xs uppercase tracking-wider text-amber-800">
                    Audit & Soft-Delete Metadata
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px]">Archived Reason</span>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {detailItem.data.archivedReason || detailItem.data.terminationReason || 'Administrative archive'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 text-xs">
                    <span className="text-slate-600">Archived Date:</span>
                    <span className="font-mono font-semibold">
                      {detailItem.data.archivedAt ? new Date(detailItem.data.archivedAt).toLocaleString() : 'Recent'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Archived By:</span>
                    <span className="font-semibold">{detailItem.data.archivedBy || 'Alex Kiprono'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Prior Roster Status:</span>
                    <span className="font-bold text-emerald-700">{detailItem.data.previousStatus || 'Active'}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmRestoreItem({ type: 'employee', id: detailItem.data.id, name: detailItem.data.name });
                      setDetailItem(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore to Active Directory</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Order ID</span>
                    <span className="font-mono font-bold text-slate-900">#{detailItem.data.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Customer</span>
                    <span className="font-bold text-slate-900">{detailItem.data.customerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Address</span>
                    <span className="text-slate-800 text-right">{detailItem.data.deliveryAddress?.street}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Cylinders</span>
                    <span className="font-semibold text-slate-900">{detailItem.data.cylinderSummary}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Total Amount</span>
                    <span className="font-extrabold text-[#E04F11]">{formatKSh(detailItem.data.total)}</span>
                  </div>
                </div>

                <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 space-y-2 text-amber-900">
                  <div className="font-bold text-xs uppercase tracking-wider text-amber-800">
                    Audit & Soft-Delete Metadata
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px]">Archived Reason</span>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {detailItem.data.archivedReason || 'Administrative soft-delete archive'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 text-xs">
                    <span className="text-slate-600">Archived Date:</span>
                    <span className="font-mono font-semibold">
                      {detailItem.data.archivedAt ? new Date(detailItem.data.archivedAt).toLocaleString() : 'Recent'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Archived By:</span>
                    <span className="font-semibold">{detailItem.data.archivedBy || 'Alex Kiprono'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Prior Order Status:</span>
                    <span className="font-bold text-blue-700">{detailItem.data.previousStatus || 'Delivered'}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmRestoreItem({ type: 'order', id: detailItem.data.id, name: `Order #${detailItem.data.id}` });
                      setDetailItem(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Order</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
