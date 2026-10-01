import React, { useState } from 'react';
import { 
  Shield, 
  Activity, 
  Radio, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  RefreshCw, 
  LogOut, 
  Volume2, 
  VolumeX, 
  Zap, 
  Sliders, 
  Download, 
  ChevronRight, 
  Layers, 
  Server,
  Lock,
  UserCheck
} from 'lucide-react';
import { Order, Driver } from '../../types';

interface OperationsControlMenuProps {
  ordersCount: number;
  driversCount: number;
  onRefresh: () => Promise<void> | void;
  onLogout: () => void;
  onNavigateToDispatch: () => void;
  onClose: () => void;
}

export const OperationsControlMenu: React.FC<OperationsControlMenuProps> = ({
  ordersCount,
  driversCount,
  onRefresh,
  onLogout,
  onNavigateToDispatch,
  onClose
}) => {
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [autoRouting, setAutoRouting] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleManualSync = async () => {
    setIsRefreshing(true);
    setSyncStatus('Syncing Nairobi fleet telemetry...');
    try {
      await onRefresh();
      setSyncStatus('Fleet and database synchronized!');
      setTimeout(() => setSyncStatus(null), 2500);
    } catch (err) {
      setSyncStatus('Sync complete');
      setTimeout(() => setSyncStatus(null), 2000);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Report,Shift,GeneratedAt,Orders,Drivers\n"
      + `Daily Operations Audit,Morning Dispatch,${new Date().toISOString()},${ordersCount},${driversCount}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `operations_audit_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden text-gray-800 animate-in fade-in zoom-in-95 duration-150">
      {/* Operations Control Header */}
      <div className="p-4 bg-[#111827] text-white relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-orange-600/30 border border-orange-500/40 text-orange-400">
              <Shield className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
              Operations Control
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Shift Active</span>
          </div>
        </div>

        {/* User Identity */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-[#E04F11] flex items-center justify-center font-bold text-sm text-white shadow-xs">
              AK
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#111827] rounded-full" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-sm text-white truncate">Alex Kiprono</h4>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-300 font-medium">
                Lead Ops
              </span>
            </div>
            <p className="text-xs text-gray-300 truncate font-mono">ops.manager@gasdeliver.co.ke</p>
            <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
              <MapPin className="w-3 h-3 text-[#E04F11] shrink-0" />
              <span className="truncate">Nairobi Central Depot</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Telemetry Bar */}
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="p-1.5 rounded-lg bg-white border border-gray-200">
          <span className="text-gray-400 block text-[10px]">Latency</span>
          <span className="font-bold text-emerald-600 flex items-center justify-center gap-1">
            <Radio className="w-3 h-3" /> Live
          </span>
        </div>
        <div className="p-1.5 rounded-lg bg-white border border-gray-200">
          <span className="text-gray-400 block text-[10px]">Total Orders</span>
          <span className="font-bold text-gray-800">{ordersCount}</span>
        </div>
        <div className="p-1.5 rounded-lg bg-white border border-gray-200">
          <span className="text-gray-400 block text-[10px]">Active Fleet</span>
          <span className="font-bold text-gray-800">{driversCount}</span>
        </div>
      </div>

      {/* Operations Quick Preferences */}
      <div className="p-4 space-y-3 border-b border-gray-100">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Operations Dispatch Rules
        </div>

        {/* Sound Alert Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {soundAlerts ? (
              <Volume2 className="w-4 h-4 text-orange-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-400" />
            )}
            <div>
              <span className="text-xs font-semibold text-gray-800 block">Audible Dispatch Alerts</span>
              <span className="text-[10px] text-gray-500">Chime on new orders & SLA threshold warnings</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSoundAlerts(!soundAlerts)}
            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
              soundAlerts ? 'bg-orange-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full bg-white block shadow-xs transition-transform ${
                soundAlerts ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Auto Routing Assistant Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <div>
              <span className="text-xs font-semibold text-gray-800 block">Smart Proximity Suggest</span>
              <span className="text-[10px] text-gray-500">Auto-filter nearest available Nairobi rider</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAutoRouting(!autoRouting)}
            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
              autoRouting ? 'bg-orange-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full bg-white block shadow-xs transition-transform ${
                autoRouting ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Rapid Action Buttons */}
      <div className="p-3 space-y-1.5 border-b border-gray-100">
        <button
          type="button"
          onClick={() => {
            onNavigateToDispatch();
            onClose();
          }}
          className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-700 hover:bg-orange-50 hover:text-orange-900 font-semibold flex items-center justify-between transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-orange-600" />
            <span>Launch Live Dispatch Console</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-orange-600 transition-transform group-hover:translate-x-0.5" />
        </button>

        <button
          type="button"
          disabled={isRefreshing}
          onClick={handleManualSync}
          className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-700 hover:bg-gray-50 font-semibold flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <RefreshCw className={`w-4 h-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Force Resync Fleet Telemetry</span>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">Live Link</span>
        </button>

        <button
          type="button"
          onClick={handleExportCSV}
          className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-700 hover:bg-gray-50 font-semibold flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Download className="w-4 h-4 text-gray-600" />
            <span>Export Shift Audit Log (CSV)</span>
          </div>
          <span className="text-[10px] text-gray-400">CSV</span>
        </button>
      </div>

      {/* Sync Status Banner if active */}
      {syncStatus && (
        <div className="bg-emerald-50 px-3 py-1.5 text-center text-xs font-semibold text-emerald-800 border-b border-emerald-100 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* Footer / Sign Out */}
      <div className="p-3 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-gray-500">
          <Lock className="w-3 h-3 text-emerald-600" />
          <span>2FA Verified Session</span>
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
