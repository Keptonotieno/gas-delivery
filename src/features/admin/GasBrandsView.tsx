import React, { useState, useEffect, useMemo } from 'react';
import { 
  Flame, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  RotateCcw, 
  Edit3, 
  Building2, 
  Tag, 
  Sliders, 
  ShieldCheck, 
  Info,
  Layers,
  ChevronRight,
  X
} from 'lucide-react';
import { GasBrandItem } from '../../types';
import { api } from '../../services/api';

const COLOR_PRESETS = [
  { name: 'Total Red', value: '#E01E2B' },
  { name: 'K-Gas Green', value: '#008542' },
  { name: 'ProGas Orange', value: '#F97316' },
  { name: 'Afrigas Gold', value: '#EAB308' },
  { name: 'Mpishi Emerald', value: '#059669' },
  { name: 'Hashi Sky', value: '#0284C7' },
  { name: 'Supagas Forest', value: '#16A34A' },
  { name: 'Ola Royal Blue', value: '#2563EB' },
  { name: 'Lake Indigo', value: '#4F46E5' },
  { name: 'Menengai Purple', value: '#9333EA' },
  { name: 'Safe Gas Cyan', value: '#0891B2' },
  { name: 'Charcoal Dark', value: '#1E293B' }
];

const STANDARD_SIZES = ['6 kg', '13 kg', '22.5 kg', '35 kg', '50 kg'];

const REASON_PRESETS = [
  'Brand ended / exited retail operations in Kenya',
  'EPRA / KEBS distribution license expired or suspended',
  'Supply permanently discontinued by oil marketer',
  'Company merged into another energy brand',
  'Counterfeit or substandard valve safety compliance warning'
];

interface GasBrandsViewProps {
  onRefresh?: () => void;
}

export const GasBrandsView: React.FC<GasBrandsViewProps> = ({ onRefresh }) => {
  const [brands, setBrands] = useState<GasBrandItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deleted'>('all');
  
  // Feedback notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [selectedBrand, setSelectedBrand] = useState<GasBrandItem | null>(null);
  const [deleteReason, setDeleteReason] = useState(REASON_PRESETS[0]);
  const [customDeleteReason, setCustomDeleteReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<GasBrandItem>>({
    name: '',
    distributor: '',
    tagline: '',
    badge: 'Household Choice',
    color: '#008542',
    valveType: 'Standard Universal Compact',
    cylinderSizes: ['6 kg', '13 kg'],
    isPopular: false,
    isAvailable: true
  });

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadBrands = async () => {
    try {
      setIsLoading(true);
      const data = await api.getBrands(true); // Include soft-deleted
      setBrands(data);
    } catch (err: any) {
      console.error('Failed to load brands:', err);
      showNotice('error', err.message || 'Failed to load gas brands');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      distributor: '',
      tagline: 'KEBS certified safety seal & calibrated weight',
      badge: 'Household Choice',
      color: '#008542',
      valveType: 'Standard Universal Compact',
      cylinderSizes: ['6 kg', '13 kg'],
      isPopular: false,
      isAvailable: true
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (brand: GasBrandItem) => {
    setSelectedBrand(brand);
    setFormData({
      name: brand.name,
      distributor: brand.distributor || '',
      tagline: brand.tagline || '',
      badge: brand.badge || 'Household Choice',
      color: brand.color || '#008542',
      valveType: brand.valveType || 'Standard Universal Compact',
      cylinderSizes: brand.cylinderSizes || ['6 kg', '13 kg'],
      isPopular: brand.isPopular || false,
      isAvailable: brand.isAvailable !== false
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (brand: GasBrandItem) => {
    setSelectedBrand(brand);
    setDeleteReason(REASON_PRESETS[0]);
    setCustomDeleteReason('');
    setIsDeleteModalOpen(true);
  };

  const handleSaveAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      showNotice('error', 'Brand name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.addBrand({
        name: formData.name.trim(),
        distributor: formData.distributor?.trim() || 'Kenyan LPG Distributor',
        tagline: formData.tagline?.trim() || 'KEBS certified safety seal',
        badge: formData.badge || 'Household Choice',
        color: formData.color || '#008542',
        valveType: formData.valveType || 'Standard Universal Compact',
        cylinderSizes: formData.cylinderSizes && formData.cylinderSizes.length > 0 ? formData.cylinderSizes : ['6 kg', '13 kg'],
        isPopular: Boolean(formData.isPopular),
        isAvailable: true
      });

      setIsAddModalOpen(false);
      showNotice('success', `Gas brand "${formData.name}" added successfully to Kenyan registry.`);
      loadBrands();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to add gas brand');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrand) return;

    try {
      setIsSubmitting(true);
      await api.updateBrand(selectedBrand.id, {
        name: formData.name?.trim(),
        distributor: formData.distributor?.trim(),
        tagline: formData.tagline?.trim(),
        badge: formData.badge,
        color: formData.color,
        valveType: formData.valveType,
        cylinderSizes: formData.cylinderSizes,
        isPopular: formData.isPopular
      });

      setIsEditModalOpen(false);
      showNotice('success', `Brand "${formData.name}" updated successfully.`);
      loadBrands();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to update brand');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSoftDelete = async () => {
    if (!selectedBrand) return;
    const finalReason = deleteReason === 'Custom' ? customDeleteReason : deleteReason;

    try {
      setIsSubmitting(true);
      await api.softDeleteBrand(selectedBrand.id, finalReason || 'Brand ended in Kenyan market');
      setIsDeleteModalOpen(false);
      showNotice('success', `Brand "${selectedBrand.name}" soft-deleted (marked as ended in market). Historical records preserved.`);
      loadBrands();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to soft delete brand');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreBrand = async (brand: GasBrandItem) => {
    try {
      setIsSubmitting(true);
      await api.restoreBrand(brand.id);
      showNotice('success', `Brand "${brand.name}" restored to active market registry.`);
      loadBrands();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to restore brand');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSize = (size: string) => {
    const current = formData.cylinderSizes || [];
    if (current.includes(size)) {
      setFormData({ ...formData, cylinderSizes: current.filter(s => s !== size) });
    } else {
      setFormData({ ...formData, cylinderSizes: [...current, size] });
    }
  };

  // Filtered list
  const filteredBrands = useMemo(() => {
    return brands.filter(b => {
      // Status filter
      if (statusFilter === 'active' && b.isDeleted) return false;
      if (statusFilter === 'deleted' && !b.isDeleted) return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = b.name.toLowerCase().includes(q);
        const matchDistributor = b.distributor?.toLowerCase().includes(q);
        const matchValve = b.valveType?.toLowerCase().includes(q);
        if (!matchName && !matchDistributor && !matchValve) return false;
      }

      return true;
    });
  }, [brands, statusFilter, searchQuery]);

  const totalCount = brands.length;
  const activeCount = brands.filter(b => !b.isDeleted).length;
  const deletedCount = brands.filter(b => b.isDeleted).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in-50 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total LPG Brands
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#E04F11] flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalCount}</span>
            <span className="text-xs font-semibold text-slate-500">Kenyan Registry</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active in Market
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{activeCount}</span>
            <span className="text-xs font-semibold text-slate-500">Available for Order</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Discontinued / Ended
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600">{deletedCount}</span>
            <span className="text-xs font-semibold text-slate-500">Soft-Deleted</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Corridor Focus
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">Exits 1–20</span>
            <span className="text-xs font-semibold text-slate-500">Thika Superhighway</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters, and "Add New Brand" CTA */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#E04F11]" />
              <span>Gas Brand Management & Market Registry</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Add new gas cylinder brands or safely soft-delete brands that have ended in the market.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadBrands}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Refresh Registry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 rounded-xl bg-[#E04F11] hover:bg-[#C9420A] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Gas Brand</span>
            </button>
          </div>
        </div>

        {/* Filter Pills and Search */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Brands ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active in Market ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('deleted')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'deleted'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ended in Market ({deletedCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by brand name, distributor, valve..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E04F11] focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Brands Grid */}
      {filteredBrands.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Flame className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No gas brands found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery 
              ? `No brands matching "${searchQuery}". Try clearing search filters.`
              : 'There are no gas brands currently matching the selected status.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBrands.map((brand) => (
            <div
              key={brand.id}
              className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs ${
                brand.isDeleted
                  ? 'border-rose-200 bg-slate-50/50 opacity-80'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              {/* Card Header */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs shrink-0 text-sm"
                      style={{ backgroundColor: brand.color || '#E04F11' }}
                    >
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <span>{brand.name}</span>
                        {brand.isPopular && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-md">
                            Popular
                          </span>
                        )}
                      </h3>
                      <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[200px]">{brand.distributor || 'Kenyan Marketer'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {brand.isDeleted ? (
                    <span className="px-2 py-1 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px] rounded-full shrink-0 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                      Ended in Market
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px] rounded-full shrink-0 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  )}
                </div>

                {/* Tagline / Certified safety notes */}
                <p className="text-xs text-slate-600 line-clamp-2 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {brand.tagline || 'Standard certified domestic and commercial LPG cylinder.'}
                </p>

                {/* Meta details */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-medium text-slate-400">Valve Type:</span>
                    <span className="font-semibold text-slate-800">{brand.valveType || 'Standard 20mm Compact'}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-medium text-slate-400">Market Badge:</span>
                    <span className="font-semibold text-slate-800">{brand.badge || 'Domestic Refill'}</span>
                  </div>

                  <div>
                    <span className="font-medium text-slate-400 block mb-1">Cylinder Sizes:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {brand.cylinderSizes && brand.cylinderSizes.length > 0 ? (
                        brand.cylinderSizes.map((sz) => (
                          <span
                            key={sz}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono font-bold border border-slate-200"
                          >
                            {sz}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400">6 kg, 13 kg</span>
                      )}
                    </div>
                  </div>

                  {/* Soft-Delete Info Banner */}
                  {brand.isDeleted && (
                    <div className="mt-3 p-2.5 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-900 text-xs">
                      <div className="font-bold flex items-center gap-1 text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Discontinued Reason:</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-rose-800">
                        {brand.deletedReason || 'Brand ended operations in Kenya'}
                      </p>
                      {brand.deletedAt && (
                        <span className="text-[10px] text-rose-500 block mt-1">
                          Ended: {new Date(brand.deletedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenEditModal(brand)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit</span>
                </button>

                {brand.isDeleted ? (
                  <button
                    onClick={() => handleRestoreBrand(brand)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore to Market</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenDeleteModal(brand)}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Soft delete brand if ended in market"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Ended in Market (Delete)</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: ADD NEW GAS BRAND */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E04F11] text-white flex items-center justify-center font-bold">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Add New Gas Brand</h3>
                  <span className="text-xs text-slate-500">Add newly certified LPG brand to Kenyan registry</span>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAddBrand} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Brand Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. AfriGas, Mpishi Gas, K-Gas, Menengai Gas..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#E04F11] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Distributor / Parent Oil Marketer
                </label>
                <input
                  type="text"
                  value={formData.distributor || ''}
                  onChange={(e) => setFormData({ ...formData, distributor: e.target.value })}
                  placeholder="e.g. Rubis Energy Kenya, Proto Energy Ltd..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#E04F11] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tagline & Safety Notes
                </label>
                <input
                  type="text"
                  value={formData.tagline || ''}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="e.g. KEBS certified tamper-proof seal with low odor pure flame"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#E04F11] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valve Type
                  </label>
                  <select
                    value={formData.valveType || 'Standard Universal Compact'}
                    onChange={(e) => setFormData({ ...formData, valveType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#E04F11] focus:outline-none bg-white"
                  >
                    <option value="Standard Universal Compact">Standard Universal Compact (20mm)</option>
                    <option value="Screw & Pin Valve">Screw & Pin Valve (27mm)</option>
                    <option value="Universal Quick-Click">Universal Quick-Click Snap-On</option>
                    <option value="Standard Industrial Valve">Standard Industrial Valve</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Market Badge
                  </label>
                  <input
                    type="text"
                    value={formData.badge || 'Household Choice'}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="e.g. Top Value, Household Choice"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#E04F11] focus:outline-none"
                  />
                </div>
              </div>

              {/* Theme Color Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Brand Color Identifier
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c.value })}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                        formData.color === c.value ? 'scale-110 border-slate-900 shadow-xs' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    >
                      {formData.color === c.value && (
                        <CheckCircle2 className="w-4 h-4 text-white drop-shadow-sm" />
                      )}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={formData.color || '#008542'}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-7 h-7 rounded-lg border border-slate-200 p-0 cursor-pointer"
                    title="Custom Color Picker"
                  />
                </div>
              </div>

              {/* Supported Cylinder Sizes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Supported Cylinder Sizes in Kenya
                </label>
                <div className="flex flex-wrap gap-2">
                  {STANDARD_SIZES.map((sz) => {
                    const isChecked = formData.cylinderSizes?.includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => toggleSize(sz)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isChecked ? '✓ ' : '+ '}{sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Popular Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="add-popular"
                  checked={formData.isPopular || false}
                  onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                  className="rounded text-[#E04F11] focus:ring-[#E04F11] cursor-pointer"
                />
                <label htmlFor="add-popular" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Feature as <strong>Popular Brand</strong> in customer quick checkout
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#E04F11] hover:bg-[#C9420A] text-white font-bold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Save & Register Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT GAS BRAND */}
      {isEditModalOpen && selectedBrand && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold"
                  style={{ backgroundColor: formData.color || '#E04F11' }}
                >
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Edit {selectedBrand.name}</h3>
                  <span className="text-xs text-slate-500">Update brand specifications & sizes</span>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditBrand} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Brand Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#E04F11] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Distributor / Parent Marketer
                </label>
                <input
                  type="text"
                  value={formData.distributor || ''}
                  onChange={(e) => setFormData({ ...formData, distributor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#E04F11] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tagline & Safety Notes
                </label>
                <input
                  type="text"
                  value={formData.tagline || ''}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#E04F11] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valve Type
                  </label>
                  <select
                    value={formData.valveType || 'Standard Universal Compact'}
                    onChange={(e) => setFormData({ ...formData, valveType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#E04F11] focus:outline-none bg-white"
                  >
                    <option value="Standard Universal Compact">Standard Universal Compact (20mm)</option>
                    <option value="Screw & Pin Valve">Screw & Pin Valve (27mm)</option>
                    <option value="Universal Quick-Click">Universal Quick-Click Snap-On</option>
                    <option value="Standard Industrial Valve">Standard Industrial Valve</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Market Badge
                  </label>
                  <input
                    type="text"
                    value={formData.badge || 'Household Choice'}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#E04F11] focus:outline-none"
                  />
                </div>
              </div>

              {/* Theme Color Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Brand Color Identifier
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c.value })}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                        formData.color === c.value ? 'scale-110 border-slate-900 shadow-xs' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    >
                      {formData.color === c.value && (
                        <CheckCircle2 className="w-4 h-4 text-white drop-shadow-sm" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Supported Sizes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Supported Cylinder Sizes in Kenya
                </label>
                <div className="flex flex-wrap gap-2">
                  {STANDARD_SIZES.map((sz) => {
                    const isChecked = formData.cylinderSizes?.includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => toggleSize(sz)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isChecked ? '✓ ' : '+ '}{sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DISCONTINUE / SOFT-DELETE GAS BRAND */}
      {isDeleteModalOpen && selectedBrand && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center">
              Discontinue / Remove Brand (Soft Delete)
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Mark <strong>{selectedBrand.name}</strong> as ended in the market.
            </p>

            <div className="my-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Soft Delete Assurance:</strong>
                This brand will be marked as discontinued and hidden from customer ordering, but past delivery logs, revenue statistics, and customer receipts will remain 100% intact.
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Reason for Brand Removal:
              </label>
              <div className="space-y-2">
                {REASON_PRESETS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      deleteReason === reason
                        ? 'border-rose-300 bg-rose-50/50 text-rose-900 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="soft-delete-reason"
                      checked={deleteReason === reason}
                      onChange={() => setDeleteReason(reason)}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}

                <label
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                    deleteReason === 'Custom'
                      ? 'border-rose-300 bg-rose-50/50 text-rose-900 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="soft-delete-reason"
                    checked={deleteReason === 'Custom'}
                    onChange={() => setDeleteReason('Custom')}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <span>Other custom reason</span>
                </label>
              </div>

              {deleteReason === 'Custom' && (
                <input
                  type="text"
                  value={customDeleteReason}
                  onChange={(e) => setCustomDeleteReason(e.target.value)}
                  placeholder="Type specific discontinuation reason..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleConfirmSoftDelete}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Discontinuing...' : 'Discontinue Brand (Soft Delete)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
