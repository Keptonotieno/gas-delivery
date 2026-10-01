import React, { useState, useMemo } from 'react';
import { Product } from '../../types';
import { api } from '../../services/api';
import { 
  Search, 
  ArrowUpDown, 
  Edit2, 
  Save, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Package, 
  Archive,
  RotateCcw,
  Trash2,
  Flame,
  Plus
} from 'lucide-react';
import { formatKSh } from '../../utils/format';

interface InventoryViewProps {
  products: Product[];
  onRefresh: () => void;
}

type SortField = 'name' | 'stock' | 'price' | 'size';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'available' | 'low_stock' | 'out_of_stock' | 'LPG' | 'CNG' | 'archived';

export const InventoryView: React.FC<InventoryViewProps> = ({ products, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('stock');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [stockInput, setStockInput] = useState<number>(0);
  const [priceInput, setPriceInput] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<Product | null>(null);

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setStockInput(product.stock);
    setPriceInput(product.price);
  };

  const handleSave = async (id: string) => {
    const validatedStock = Math.max(0, Math.floor(Number(stockInput) || 0));
    const validatedPrice = Math.max(1, Number(priceInput) || 0);

    setSaving(true);
    try {
      await api.updateProduct(id, {
        stock: validatedStock,
        price: validatedPrice,
        isAvailable: validatedStock > 0
      });
      setEditingId(null);
      setMessage({ type: 'success', text: 'Inventory stock and pricing updated successfully!' });
      setTimeout(() => setMessage(null), 3500);
      onRefresh();
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to update product: ' + (err.message || 'Unknown error') });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickRestock = async (product: Product, addUnits: number) => {
    const newStock = Math.max(0, product.stock + addUnits);
    try {
      await api.updateProduct(product.id, {
        stock: newStock,
        isAvailable: newStock > 0
      });
      setMessage({ type: 'success', text: `Restocked +${addUnits} units for ${product.name}` });
      setTimeout(() => setMessage(null), 3000);
      onRefresh();
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to restock: ' + (err.message || 'Unknown error') });
    }
  };

  const handleSoftDelete = async (product: Product) => {
    try {
      await api.deleteProduct(product.id, 'Discontinued / Soft-deleted via Inventory Catalog');
      setConfirmDeleteProduct(null);
      setMessage({ type: 'success', text: `"${product.name}" soft-deleted and archived.` });
      setTimeout(() => setMessage(null), 3500);
      onRefresh();
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to soft delete: ' + (err.message || 'Unknown error') });
    }
  };

  const handleRestore = async (product: Product) => {
    try {
      await api.restoreProduct(product.id);
      setMessage({ type: 'success', text: `"${product.name}" restored to active inventory catalog.` });
      setTimeout(() => setMessage(null), 3500);
      onRefresh();
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to restore product: ' + (err.message || 'Unknown error') });
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Status filter
        const isArchived = Boolean((p as any).isArchived || (p as any).isDeleted);
        if (statusFilter === 'archived') {
          if (!isArchived) return false;
        } else {
          // If not looking at archived tab, exclude archived products
          if (isArchived) return false;

          if (statusFilter === 'available' && p.stock <= 10) return false;
          if (statusFilter === 'low_stock' && (p.stock > 10 || p.stock === 0)) return false;
          if (statusFilter === 'out_of_stock' && p.stock > 0) return false;
          if (statusFilter === 'LPG' && p.gasType !== 'LPG') return false;
          if (statusFilter === 'CNG' && p.gasType !== 'CNG') return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.name.toLowerCase().includes(q);
          const matchType = p.gasType.toLowerCase().includes(q);
          const matchSize = p.size.toLowerCase().includes(q);
          return matchName || matchType || matchSize;
        }

        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortField === 'name') {
          comp = a.name.localeCompare(b.name);
        } else if (sortField === 'stock') {
          comp = a.stock - b.stock;
        } else if (sortField === 'price') {
          comp = a.price - b.price;
        } else if (sortField === 'size') {
          comp = a.size.localeCompare(b.size, undefined, { numeric: true });
        }
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [products, searchQuery, statusFilter, sortField, sortOrder]);

  const stockSummary = useMemo(() => {
    const active = products.filter((p) => !(p as any).isArchived && !(p as any).isDeleted);
    const totalCylinders = active.reduce((acc, curr) => acc + curr.stock, 0);
    const lowStockCount = active.filter((p) => p.stock > 0 && p.stock <= 10).length;
    const outOfStockCount = active.filter((p) => p.stock === 0).length;
    const archivedCount = products.filter((p) => Boolean((p as any).isArchived || (p as any).isDeleted)).length;
    return { totalCylinders, lowStockCount, outOfStockCount, archivedCount };
  }, [products]);

  return (
    <div className="space-y-5">
      {/* Header Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Depot Cylinder Inventory</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                {products.length} SKUs
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Industrial Area Central Depot · {stockSummary.totalCylinders} units on hand · {stockSummary.lowStockCount} low stock alerts
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Physical Stock</span>
              <span className="font-bold text-gray-900 text-sm">{stockSummary.totalCylinders} cylinders</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
              <span className="text-amber-700 block text-[10px] uppercase font-bold">Low Stock Alerts</span>
              <span className="font-bold text-amber-900 text-sm">{stockSummary.lowStockCount} SKUs</span>
            </div>
            {stockSummary.archivedCount > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200">
                <span className="text-rose-700 block text-[10px] uppercase font-bold">Archived / Discontinued</span>
                <span className="font-bold text-rose-900 text-sm">{stockSummary.archivedCount} SKUs</span>
              </div>
            )}
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cylinder, size, gas type..."
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#E04F11] focus:bg-white transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-gray-900 text-white font-bold'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('available')}
              className={`px-3 py-1 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                statusFilter === 'available'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Available &gt; 10
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('low_stock')}
              className={`px-3 py-1 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                statusFilter === 'low_stock'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Low Stock (≤ 10)
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('out_of_stock')}
              className={`px-3 py-1 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                statusFilter === 'out_of_stock'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Out of Stock
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('archived')}
              className={`px-3 py-1 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                statusFilter === 'archived'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Archived ({stockSummary.archivedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Message Toast */}
      {message && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MOBILE RESPONSIVE CARDS (< 640px) */}
      {/* ========================================================================= */}
      <div className="block sm:hidden space-y-3">
        {filteredAndSortedProducts.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-xs bg-white rounded-xl border border-gray-200">
            No cylinders matching filter criteria.
          </div>
        ) : (
          filteredAndSortedProducts.map((p) => {
            const isEditing = editingId === p.id;
            const isLow = p.stock > 0 && p.stock <= 10;
            const isOut = p.stock === 0;
            const isArchived = Boolean((p as any).isArchived || (p as any).isDeleted);

            return (
              <div
                key={p.id}
                className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{p.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">{p.gasType}</span>
                      <span>·</span>
                      <span className="font-mono font-bold">{p.size}</span>
                    </div>
                  </div>
                  {isArchived ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      Archived
                    </span>
                  ) : isOut ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      Out of Stock
                    </span>
                  ) : isLow ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Low (≤10)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Available
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 p-2.5 bg-gray-50 rounded-lg text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">Stock</span>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={stockInput}
                        onChange={(e) => setStockInput(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full mt-1 px-2 py-1 border border-gray-300 rounded font-mono font-bold text-xs"
                      />
                    ) : (
                      <span className="font-mono font-bold text-sm text-gray-900">{p.stock} units</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">Price</span>
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        value={priceInput}
                        onChange={(e) => setPriceInput(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full mt-1 px-2 py-1 border border-gray-300 rounded font-mono font-bold text-xs"
                      />
                    ) : (
                      <span className="font-bold text-sm text-[#E04F11]">{formatKSh(p.price)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  {isEditing ? (
                    <div className="flex items-center gap-2 w-full justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSave(p.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        {!isArchived && (isLow || isOut) && (
                          <button
                            type="button"
                            onClick={() => handleQuickRestock(p, 25)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold"
                          >
                            +25 Units
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isArchived ? (
                          <button
                            type="button"
                            onClick={() => handleRestore(p)}
                            className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-xs hover:bg-emerald-100 flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(p)}
                              className="p-1.5 text-gray-600 hover:text-[#E04F11] hover:bg-orange-50 rounded-lg"
                              title="Edit Stock & Price"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteProduct(p)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Soft Delete Product"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP & TABLET TABLE (>= 640px) */}
      {/* ========================================================================= */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase text-[11px] font-bold">
                <th 
                  onClick={() => toggleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-gray-900 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Cylinder SKU</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Gas Type</th>
                <th 
                  onClick={() => toggleSort('size')}
                  className="py-3 px-4 cursor-pointer hover:text-gray-900 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Size</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('stock')}
                  className="py-3 px-4 cursor-pointer hover:text-gray-900 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Physical Stock</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('price')}
                  className="py-3 px-4 cursor-pointer hover:text-gray-900 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Unit Price</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Stock Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAndSortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No cylinders matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAndSortedProducts.map((p) => {
                  const isEditing = editingId === p.id;
                  const isLow = p.stock > 0 && p.stock <= 10;
                  const isOut = p.stock === 0;
                  const isArchived = Boolean((p as any).isArchived || (p as any).isDeleted);

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{p.name}</div>
                        {p.tag && (
                          <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded inline-block mt-0.5">
                            {p.tag}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-700">{p.gasType}</td>
                      <td className="py-3.5 px-4 font-mono text-gray-800 font-semibold">{p.size}</td>
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={stockInput}
                              onChange={(e) => setStockInput(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-[#E04F11] font-mono"
                            />
                            <span className="text-gray-400 text-xs">units</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold text-sm ${
                              isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-900'
                            }`}>
                              {p.stock}
                            </span>
                            <span className="text-gray-400 text-xs">units</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900 font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            step="50"
                            value={priceInput}
                            onChange={(e) => setPriceInput(Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-[#E04F11]"
                          />
                        ) : (
                          formatKSh(p.price)
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isArchived ? (
                          <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                            <Archive className="w-3 h-3 text-slate-500" />
                            Archived
                          </span>
                        ) : isOut ? (
                          <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Low Stock (≤10)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Available
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleSave(p.id)}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-md text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold hover:bg-gray-200 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {isArchived ? (
                              <button
                                type="button"
                                onClick={() => handleRestore(p)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer"
                                title="Restore to Active Inventory"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restore</span>
                              </button>
                            ) : (
                              <>
                                {(isLow || isOut) && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickRestock(p, 25)}
                                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md text-[11px] font-bold cursor-pointer transition-colors"
                                  >
                                    +25 Units
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => startEdit(p)}
                                  className="p-1.5 text-gray-500 hover:text-[#E04F11] hover:bg-orange-50 rounded-md transition-colors cursor-pointer"
                                  title="Edit Stock & Price"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteProduct(p)}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                  title="Soft Delete / Discontinue SKU"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Soft Delete Product Modal */}
      {confirmDeleteProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-gray-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Discontinue Product SKU</h3>
                  <p className="text-[11px] text-gray-500">{confirmDeleteProduct.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDeleteProduct(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              Are you sure you want to soft delete <strong>{confirmDeleteProduct.name}</strong>? It will be hidden from customer storefront ordering, but past order records will be preserved and you can restore it at any time.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteProduct(null)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSoftDelete(confirmDeleteProduct)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Confirm Discontinue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
