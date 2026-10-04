import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Layers, 
  CreditCard, 
  MessageSquare, 
  MapPin, 
  Briefcase, 
  Zap, 
  FileText, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  ArrowUpRight,
  Shield,
  ShieldCheck,
  Power,
  ChevronDown,
  Globe,
  Truck
} from 'lucide-react';
import { 
  IntegrationItem, 
  IntegrationLog, 
  IntegrationsOverview, 
  IntegrationCategory, 
  IntegrationStatus 
} from '../../types';
import { api } from '../../services/api';
import { IntegrationCard } from './integrations/IntegrationCard';
import { IntegrationConfigModal } from './integrations/IntegrationConfigModal';
import { IntegrationLogsModal } from './integrations/IntegrationLogsModal';
import { IntegrationIcon } from './integrations/IntegrationIcons';

interface IntegrationsViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({ onNavigateTab }) => {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [overview, setOverview] = useState<IntegrationsOverview | null>(null);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<IntegrationStatus | 'all'>('all');

  // Modals & Active State
  const [activeIntegration, setActiveIntegration] = useState<IntegrationItem | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load data from backend
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [intData, logsData] = await Promise.all([
        api.getIntegrations(),
        api.getIntegrationLogs(15)
      ]);
      setIntegrations(intData.integrations);
      setOverview(intData.overview);
      setLogs(logsData);
    } catch (err: any) {
      console.error('Failed to load integrations:', err);
      setError(err.message || 'Failed to load integrations data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Listen to real-time server-sent events
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (
          payload.type === 'INTEGRATION_UPDATED' || 
          payload.type === 'INTEGRATION_TESTED' || 
          payload.type === 'INTEGRATION_TOGGLED' || 
          payload.type === 'WEBHOOK_RECEIVED'
        ) {
          loadData();
        }
      } catch {
        // Non-JSON or heartbeat
      }
    };

    return () => {
      eventSource.close();
    };
  }, [loadData]);

  // Categories list matching specification
  const categories: Array<{ id: IntegrationCategory | 'all'; label: string; icon: any }> = [
    { id: 'all', label: 'All Integrations', icon: Layers },
    { id: 'payments', label: 'Payments (M-Pesa)', icon: CreditCard },
    { id: 'maps', label: 'Maps (Google)', icon: MapPin },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'logistics', label: 'Logistics', icon: Truck },
    { id: 'workspace', label: 'Productivity', icon: Briefcase },
    { id: 'judiciary', label: 'Compliance', icon: Shield }
  ];

  // Filtered integrations
  const filteredIntegrations = useMemo(() => {
    return integrations.filter(item => {
      // Category filter
      if (selectedCategory !== 'all') {
        const cat = item.category;
        if (selectedCategory === 'payments' || selectedCategory === 'payment') {
          if (cat !== 'payments' && cat !== 'payment') return false;
        } else if (selectedCategory === 'maps' || selectedCategory === 'maps_logistics') {
          if (cat !== 'maps' && cat !== 'maps_logistics') return false;
        } else if (selectedCategory === 'communication') {
          if (cat !== 'communication') return false;
        } else if (selectedCategory === 'logistics' || selectedCategory === 'government_fleet') {
          if (cat !== 'logistics' && cat !== 'government_fleet') return false;
        } else if (selectedCategory === 'workspace' || selectedCategory === 'productivity') {
          if (cat !== 'workspace' && cat !== 'productivity') return false;
        } else if (selectedCategory === 'judiciary') {
          if (cat !== 'judiciary') return false;
        } else if (cat !== selectedCategory) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'disabled' && item.isEnabled) return false;
        if (selectedStatus !== 'disabled' && item.status !== selectedStatus) return false;
      }

      // Search term
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesTags = item.tags?.some(t => t.toLowerCase().includes(query));
        if (!matchesName && !matchesDesc && !matchesTags) return false;
      }

      return true;
    });
  }, [integrations, selectedCategory, selectedStatus, searchQuery]);

  // Handlers
  const handleOpenConfig = (item: IntegrationItem) => {
    setActiveIntegration(item);
    setIsConfigModalOpen(true);
  };

  const handleSaveConfig = async (
    id: string, 
    data: { config: Record<string, string>; environment: string; authMethod: string; isEnabled: boolean }
  ) => {
    try {
      const res = await api.updateIntegration(id, data);
      showToast(res.message || 'Configuration saved successfully.', 'success');
      // Update local state immediately
      setIntegrations(prev => prev.map(item => item.id === id ? res.integration : item));
      setOverview(res.overview);
      // Reload logs
      const updatedLogs = await api.getIntegrationLogs(15);
      setLogs(updatedLogs);
    } catch (err: any) {
      showToast(err.message || 'Failed to save configuration.', 'error');
      throw err;
    }
  };

  const handleTestConnection = async (item: IntegrationItem) => {
    setTestingId(item.id);
    try {
      const res = await api.testIntegration(item.id);
      if (res.success) {
        showToast(`✓ ${res.message} (${res.responseTimeMs}ms)`, 'success');
      } else {
        showToast(`✕ ${res.message}`, 'error');
      }
      // Update local state with latest test results
      setIntegrations(prev => prev.map(i => i.id === item.id ? res.integration : i));
      const updatedLogs = await api.getIntegrationLogs(15);
      setLogs(updatedLogs);
      return res;
    } catch (err: any) {
      showToast(err.message || 'Connection test failed', 'error');
      throw err;
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleIntegration = async (item: IntegrationItem, isEnabled: boolean) => {
    try {
      const res = await api.toggleIntegration(item.id, isEnabled);
      showToast(res.message || `Service ${isEnabled ? 'enabled' : 'disabled'}.`, 'info');
      setIntegrations(prev => prev.map(i => i.id === item.id ? res.integration : i));
      setOverview(res.overview);
      const updatedLogs = await api.getIntegrationLogs(15);
      setLogs(updatedLogs);
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle service state.', 'error');
    }
  };

  // Status indicator
  const hasIssues = overview ? overview.needsAttention > 0 || overview.errorCount > 0 : false;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
          toast.type === 'success' ? 'bg-emerald-900 text-emerald-100 border-emerald-700' :
          toast.type === 'error' ? 'bg-rose-900 text-rose-100 border-rose-700' :
          'bg-slate-900 text-slate-100 border-slate-700'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Breadcrumbs Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <button 
          onClick={() => onNavigateTab ? onNavigateTab('settings') : null}
          className="hover:text-slate-800 transition-colors"
        >
          Settings
        </button>
        <span>&gt;</span>
        <span className="text-slate-800 font-semibold">Integrations</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Integrations
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Configure and manage third-party integrations to automate your operations and improve efficiency.
          </p>
        </div>

        {/* Global Operational Status */}
        <div className="flex items-center gap-3">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            hasIssues 
              ? 'bg-amber-50 text-amber-800 border-amber-200' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${hasIssues ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {hasIssues ? `${overview?.needsAttention} integration requires attention` : 'All systems operational'}
          </div>

          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs transition-colors"
            title="Refresh Integrations"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Category Navigation Tabs (matching reference image) */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto no-scrollbar" aria-label="Tabs">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                  isSelected
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search integrations..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Status:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'connected', label: 'Configured' },
            { id: 'needs_attention', label: 'Needs Attention' },
            { id: 'not_configured', label: 'Not Configured' }
          ].map(status => (
            <button
              key={status.id}
              type="button"
              onClick={() => setSelectedStatus(status.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                selectedStatus === status.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Integration Cards (approx. 70% width = col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          {isLoading && integrations.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
              Loading enterprise integrations...
            </div>
          ) : filteredIntegrations.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-xl border border-slate-200 p-6">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No integrations found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No services matched your current category, search term, or status filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredIntegrations.map(integration => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConfigure={handleOpenConfig}
                  onTest={handleTestConnection}
                  onToggle={handleToggleIntegration}
                  isTesting={testingId === integration.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Overview, Quick Actions, and Activity Logs (approx. 30% width = col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* WIDGET 1: Integration Overview */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
              <span>Integration Overview</span>
              <ShieldCheck className="w-4 h-4 text-slate-400" />
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">Total Integrations</span>
                <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                  {overview ? overview.total : integrations.length}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <span className="text-[11px] text-emerald-700 font-medium block">Configured</span>
                <span className="text-2xl font-black text-emerald-600 mt-0.5 block">
                  {overview ? overview.configured : 0}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-100">
                <span className="text-[11px] text-amber-700 font-medium block">Needs Attention</span>
                <span className="text-2xl font-black text-amber-600 mt-0.5 block">
                  {overview ? overview.needsAttention : 0}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">Not Configured</span>
                <span className="text-2xl font-black text-slate-600 mt-0.5 block">
                  {overview ? overview.notConfigured : 0}
                </span>
              </div>
            </div>
          </div>

          {/* WIDGET 2: Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>Quick Actions</span>
            </h3>

            <div className="divide-y divide-slate-100">
              {integrations.slice(0, 6).map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOpenConfig(item)}
                  className="w-full py-2.5 flex items-center justify-between text-left hover:bg-slate-50 px-2 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <IntegrationIcon iconKey={item.icon} size="sm" />
                    <div>
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors block">
                        Configure {item.name}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {item.category.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>

          {/* WIDGET 3: Integration Logs (Real Chronological Feed) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Integration Logs</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsLogsModalOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {logs.slice(0, 5).map(log => (
                <div key={log.id} className="text-xs p-2.5 rounded-lg bg-slate-50/70 border border-slate-100 flex items-start gap-2.5">
                  <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                    log.result === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 truncate">{log.integrationName}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{log.timeAgo}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                      {log.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Modal */}
      <IntegrationConfigModal
        integration={activeIntegration}
        isOpen={isConfigModalOpen}
        onClose={() => {
          setIsConfigModalOpen(false);
          setActiveIntegration(null);
        }}
        onSave={handleSaveConfig}
        onTest={handleTestConnection}
      />

      {/* Audit Logs Viewer Modal */}
      <IntegrationLogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        logs={logs}
        onRefresh={async () => {
          const fresh = await api.getIntegrationLogs(100);
          setLogs(fresh);
        }}
      />
    </div>
  );
};
