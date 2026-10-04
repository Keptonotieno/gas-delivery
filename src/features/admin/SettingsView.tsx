import React, { useState } from 'react';
import { 
  Shield, 
  Settings as SettingsIcon, 
  Bell, 
  MapPin, 
  Lock, 
  Save, 
  CheckCircle2, 
  RefreshCw, 
  Download,
  AlertTriangle,
  Sliders,
  Radio,
  Layers,
  FileText,
  Mail,
  Smartphone,
  Server,
  UserCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { IntegrationsView } from './IntegrationsView';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface SettingsViewProps {
  onRefresh?: () => void;
  defaultSubTab?: 'general' | 'notifications' | 'security' | 'integrations' | 'audit_logs';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  onRefresh, 
  defaultSubTab = 'general' 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'notifications' | 'security' | 'integrations' | 'audit_logs'>(defaultSubTab);
  const { theme, setTheme } = useTheme();

  // General Settings State
  const [hubName, setHubName] = useState('Nairobi Industrial Area Central Depot');
  const [slaWarningMin, setSlaWarningMin] = useState(25);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [autoRouting, setAutoRouting] = useState(true);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Notification Settings State
  const [notifySmsCustomer, setNotifySmsCustomer] = useState(true);
  const [notifyWhatsappOrder, setNotifyWhatsappOrder] = useState(true);
  const [notifyEmailReceipt, setNotifyEmailReceipt] = useState(true);
  const [notifyDriverPush, setNotifyDriverPush] = useState(true);

  // Security Settings State
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [sessionTimeoutMin, setSessionTimeoutMin] = useState(60);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage('Settings successfully updated and applied.');
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const handleResync = async () => {
    setSyncing(true);
    try {
      if (onRefresh) await onRefresh();
      setSavedMessage('Fleet status resynced successfully!');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err) {
      // ignore
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Tabs matching specifications */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="border-b border-slate-200 px-4">
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'general', label: 'General', icon: Sliders },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'security', label: 'Security', icon: Lock },
              { id: 'integrations', label: 'Integrations', icon: Layers, badge: 'New' },
              { id: 'audit_logs', label: 'Audit Logs', icon: FileText }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* RENDER: INTEGRATIONS TAB */}
      {activeSubTab === 'integrations' && (
        <IntegrationsView onNavigateTab={(tab) => setActiveSubTab(tab as any)} />
      )}

      {/* RENDER: GENERAL SETTINGS */}
      {activeSubTab === 'general' && (
        <div className="max-w-4xl space-y-6">
          {savedMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{savedMessage}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Hub Configuration */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <MapPin className="w-4 h-4 text-[#E04F11]" />
                <h3 className="font-bold text-sm text-slate-900">Hub & Regional Parameters</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Central Depot Station</label>
                  <input
                    type="text"
                    value={hubName}
                    onChange={(e) => setHubName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#E04F11] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Timezone & Shift Policy</label>
                  <input
                    type="text"
                    disabled
                    value="East Africa Time (EAT, UTC+3) · 06:00 - 18:00"
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Dispatch Rules & SLA Alerts */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Sliders className="w-4 h-4 text-[#E04F11]" />
                <h3 className="font-bold text-sm text-slate-900">Dispatch & SLA Thresholds</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    SLA Warning Buffer (Minutes before breach)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={slaWarningMin}
                      onChange={(e) => setSlaWarningMin(Math.max(5, parseInt(e.target.value) || 20))}
                      className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#E04F11] font-mono"
                    />
                    <span className="text-slate-500">minutes</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Orders with remaining SLA below this value trigger priority alerts.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Low Cylinder Stock Alert Level
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(Math.max(1, parseInt(e.target.value) || 10))}
                      className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#E04F11] font-mono"
                    />
                    <span className="text-slate-500">cylinders</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    SKUs falling at or below this count will appear in the Needs Attention triage.
                  </span>
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Audible Dispatch Sound Chimes</span>
                    <span className="text-[11px] text-slate-500">Play alert sound when customer creates new order</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoundAlerts(!soundAlerts)}
                    className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                      soundAlerts ? 'bg-[#E04F11]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white block shadow-xs transition-transform ${
                        soundAlerts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Proximity Auto-Suggest</span>
                    <span className="text-[11px] text-slate-500">Highlight nearest available driver during order dispatch</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoRouting(!autoRouting)}
                    className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                      autoRouting ? 'bg-[#E04F11]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white block shadow-xs transition-transform ${
                        autoRouting ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Appearance & Display Theme */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Sun className="w-4 h-4 text-[#E04F11]" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Interface Appearance & Theme</h3>
                  <p className="text-[11px] text-slate-500">Choose between crisp daylight contrast or low-light dark mode</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Light Option */}
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    theme === 'light'
                      ? 'border-[#E04F11] ring-2 ring-[#E04F11]/20 bg-orange-50/40'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Sun className="w-4 h-4" />
                    </div>
                    {theme === 'light' && (
                      <span className="w-2 h-2 rounded-full bg-[#E04F11]" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Light Mode</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">High clarity daylight theme</div>
                  </div>
                </button>

                {/* Dark Option */}
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    theme === 'dark'
                      ? 'border-[#E04F11] ring-2 ring-[#E04F11]/20 bg-slate-850 text-white'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-900 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-indigo-400 flex items-center justify-center">
                      <Moon className="w-4 h-4" />
                    </div>
                    {theme === 'dark' && (
                      <span className="w-2 h-2 rounded-full bg-[#FF6B2C]" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Dark Mode</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Executive eye-safe contrast</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save General Settings</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RENDER: NOTIFICATIONS TAB */}
      {activeSubTab === 'notifications' && (
        <div className="max-w-4xl space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Bell className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">Customer & Operational Notifications</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-slate-800 block">Customer SMS Delivery Updates</span>
                    <span className="text-[11px] text-slate-500">Trigger Africa's Talking SMS alerts on order dispatch, route departure, and arrival.</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifySmsCustomer(!notifySmsCustomer)}
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    notifySmsCustomer ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white block shadow-xs transition-transform ${notifySmsCustomer ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <Radio className="w-4 h-4 text-green-600" />
                  <div>
                    <span className="font-bold text-slate-800 block">WhatsApp Order Receipt & Live Tracking</span>
                    <span className="text-[11px] text-slate-500">Send WhatsApp Cloud API message with dynamic driver live ETA link.</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifyWhatsappOrder(!notifyWhatsappOrder)}
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    notifyWhatsappOrder ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white block shadow-xs transition-transform ${notifyWhatsappOrder ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="font-bold text-slate-800 block">Automated Email Tax Invoices</span>
                    <span className="text-[11px] text-slate-500">Email KRA ETR compliant PDF receipts to registered corporate customers.</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifyEmailReceipt(!notifyEmailReceipt)}
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    notifyEmailReceipt ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white block shadow-xs transition-transform ${notifyEmailReceipt ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER: SECURITY TAB */}
      {activeSubTab === 'security' && (
        <div className="max-w-4xl space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Lock className="w-4 h-4 text-[#E04F11]" />
              <h3 className="font-bold text-sm text-slate-900">Operator Account & Security</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Authenticated Operator</span>
                <span className="font-bold text-slate-900 text-sm">Alex Kiprono (Lead Ops Controller)</span>
                <span className="text-[11px] text-slate-400 block font-mono">ops.manager@gasdeliver.co.ke</span>
              </div>

              <div>
                <span className="text-slate-500 block">Authentication Protocol</span>
                <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  2FA Hardware Authenticated · Session ID: OPS-9842
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                disabled={syncing}
                onClick={handleResync}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${syncing ? 'animate-spin' : ''}`} />
                <span>Resync Fleet Feeds</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER: AUDIT LOGS */}
      {activeSubTab === 'audit_logs' && (
        <div className="max-w-5xl space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">System & Dispatch Audit Trail</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Auto-logging all configuration and API handshakes</span>
            </div>

            <div className="text-xs text-slate-500">
              To inspect complete third-party API and integration logs, open the{' '}
              <button
                type="button"
                onClick={() => setActiveSubTab('integrations')}
                className="text-blue-600 font-semibold underline hover:text-blue-800"
              >
                Integrations Management Section
              </button>{' '}
              and click "View All Logs".
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
