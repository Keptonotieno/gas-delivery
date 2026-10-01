import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  ExternalLink, 
  Shield, 
  Lock, 
  RefreshCw, 
  Send,
  HelpCircle,
  Clock,
  Radio,
  FileText
} from 'lucide-react';
import { IntegrationItem, IntegrationField } from '../../../types';
import { IntegrationIcon } from './IntegrationIcons';

interface IntegrationConfigModalProps {
  integration: IntegrationItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: { config: Record<string, string>; environment: string; authMethod: string; isEnabled: boolean }) => Promise<void>;
  onTest: (integration: IntegrationItem) => Promise<{ success: boolean; message: string; responseTimeMs: number; details?: any }>;
}

export const IntegrationConfigModal: React.FC<IntegrationConfigModalProps> = ({
  integration,
  isOpen,
  onClose,
  onSave,
  onTest
}) => {
  if (!isOpen || !integration) return null;

  const [activeTab, setActiveTab] = useState<'credentials' | 'webhook' | 'health'>('credentials');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [environment, setEnvironment] = useState<string>(integration.environment || 'production');
  const [authMethod, setAuthMethod] = useState<string>(integration.authMethod || 'API Key');
  const [isEnabled, setIsEnabled] = useState<boolean>(integration.isEnabled);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; responseTimeMs?: number; details?: any } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Sync state when integration changes
  useEffect(() => {
    if (integration) {
      setFormData({ ...(integration.config || {}) });
      setEnvironment(integration.environment || 'production');
      setAuthMethod(integration.authMethod || 'API Key');
      setIsEnabled(integration.isEnabled);
      setTestResult(
        integration.lastTestedAt
          ? {
              success: integration.lastTestStatus === 'success',
              message: integration.lastTestMessage || 'Service verified',
              responseTimeMs: integration.responseTimeMs
            }
          : null
      );
      setValidationErrors({});
    }
  }, [integration]);

  const handleFieldChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (validationErrors[key]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const toggleSecretVisibility = (key: string) => {
    setVisibleSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyWebhook = () => {
    if (!integration.webhookUrl) return;
    navigator.clipboard.writeText(integration.webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    integration.fields.forEach(field => {
      if (field.required) {
        const val = formData[field.key];
        if (!val || String(val).trim().length === 0) {
          errors[field.key] = `${field.label} is required`;
        }
      }
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setActiveTab('credentials');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(integration.id, {
        config: formData,
        environment,
        authMethod,
        isEnabled
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Include current form inputs in test
      const tempItem: IntegrationItem = {
        ...integration,
        config: { ...formData },
        environment: environment as any,
        authMethod: authMethod as any,
        isEnabled
      };
      const result = await onTest(tempItem);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed to complete'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendTestWebhook = async () => {
    try {
      const res = await fetch(`/api/webhooks/${integration.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'TEST_WEBHOOK_PING',
          integrationId: integration.id,
          simulatedTimestamp: new Date().toISOString()
        })
      });
      if (res.ok) {
        alert('Test webhook ping sent! Ingested and acknowledged by server.');
      }
    } catch {
      alert('Failed to send test webhook.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3.5">
            <IntegrationIcon iconKey={integration.icon} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 leading-none">
                  {integration.name}
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 capitalize">
                  {integration.category.replace('_', ' ')}
                </span>
                {integration.isOfficial && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                    Official
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configure credentials, security policies, and real-time synchronization.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Service Toggle switch */}
            <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
              <label className="text-xs font-medium text-slate-600 cursor-pointer select-none" htmlFor="toggle-service">
                {isEnabled ? 'Enabled' : 'Disabled'}
              </label>
              <button
                type="button"
                id="toggle-service"
                onClick={() => setIsEnabled(!isEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  isEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 flex gap-6 text-xs font-semibold bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'credentials'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Connection & Credentials
          </button>

          {integration.webhookSupported && (
            <button
              type="button"
              onClick={() => setActiveTab('webhook')}
              className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'webhook'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Webhook & Callbacks
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'health'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Diagnostics & Health
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: CREDENTIALS */}
          {activeTab === 'credentials' && (
            <div className="space-y-5">
              {/* Environment Selector & Auth Method Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Target Environment
                  </label>
                  <div className="flex gap-2">
                    {['sandbox', 'production'].map(env => (
                      <button
                        key={env}
                        type="button"
                        onClick={() => setEnvironment(env)}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold capitalize border transition-all ${
                          environment === env
                            ? env === 'production'
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {env}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {environment === 'production' 
                      ? 'Live real-money & real operational traffic' 
                      : 'Developer test sandbox and simulated callbacks'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Authentication Protocol
                  </label>
                  <select
                    value={authMethod}
                    onChange={e => setAuthMethod(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {integration.supportedAuthMethods?.map(m => (
                      <option key={m} value={m}>{m}</option>
                    )) || <option value="API Key">API Key</option>}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Secured through server-side environment storage
                  </p>
                </div>
              </div>

              {/* Security Banner */}
              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
                <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Protected Secret Storage:</span> Sensitive API keys, passkeys, and certificates are encrypted at rest and never transmitted unmasked to client browsers. Existing secrets are preserved if untouched.
                </div>
              </div>

              {/* Dynamic Provider Input Fields */}
              <div className="space-y-4">
                {integration.fields.map((field: IntegrationField) => {
                  const isSecret = field.isSecret;
                  const showSecret = visibleSecrets[field.key];
                  const hasError = validationErrors[field.key];
                  const val = formData[field.key] ?? '';

                  return (
                    <div key={field.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          {field.label}
                          {field.required && (
                            <span className="text-red-500 font-bold">*</span>
                          )}
                        </label>
                        {field.placeholder && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {field.key}
                          </span>
                        )}
                      </div>

                      {field.type === 'select' ? (
                        <select
                          value={val}
                          onChange={e => handleFieldChange(field.key, e.target.value)}
                          className={`w-full bg-white border rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 ${
                            hasError ? 'border-red-500' : 'border-slate-300 focus:border-blue-500'
                          }`}
                        >
                          <option value="">Select option...</option>
                          {field.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          value={val}
                          placeholder={field.placeholder}
                          onChange={e => handleFieldChange(field.key, e.target.value)}
                          className={`w-full bg-white border rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 ${
                            hasError ? 'border-red-500' : 'border-slate-300 focus:border-blue-500'
                          }`}
                        />
                      ) : (
                        <div className="relative">
                          <input
                            type={isSecret && !showSecret ? 'password' : 'text'}
                            value={val}
                            placeholder={field.placeholder}
                            onChange={e => handleFieldChange(field.key, e.target.value)}
                            className={`w-full bg-white border rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 ${
                              isSecret ? 'pr-10' : ''
                            } ${hasError ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-blue-500'}`}
                          />
                          {isSecret && (
                            <button
                              type="button"
                              onClick={() => toggleSecretVisibility(field.key)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                              title={showSecret ? 'Hide secret' : 'Reveal secret'}
                            >
                              {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      )}

                      {field.helpText && (
                        <p className="text-[11px] text-slate-500 leading-tight">
                          {field.helpText}
                        </p>
                      )}

                      {hasError && (
                        <p className="text-[11px] text-red-600 font-medium">
                          {hasError}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {integration.docsUrl && (
                <div className="pt-2 text-xs">
                  <a
                    href={integration.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <span>Read developer integration documentation</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WEBHOOK */}
          {activeTab === 'webhook' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-800">
                      Standard Inbound Webhook URL
                    </label>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active Listener
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg p-2 font-mono text-xs text-slate-800">
                    <span className="truncate flex-1">{integration.webhookUrl || `/api/webhooks/${integration.id}`}</span>
                    <button
                      type="button"
                      onClick={handleCopyWebhook}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans text-xs font-semibold flex items-center gap-1 shrink-0"
                    >
                      {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedWebhook ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Register this URL in your provider dashboard (e.g. Safaricom Daraja Portal or Africa's Talking) to receive real-time STK status callbacks and receipts.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Last Webhook Received:</span>
                    <span className="font-semibold text-slate-700">
                      {integration.lastWebhookReceived 
                        ? new Date(integration.lastWebhookReceived).toLocaleString() 
                        : 'Never received'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Last Response Code:</span>
                    <span className="font-semibold text-emerald-600">
                      {integration.lastWebhookResponse || '200 OK'}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSendTestWebhook}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-slate-500" />
                    Send Test Webhook Ping
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HEALTH & DIAGNOSTICS */}
          {activeTab === 'health' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 block mb-1">API Health</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {integration.apiHealthPercent ?? 100}%
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 block mb-1">Latency</span>
                  <span className="text-lg font-bold text-slate-800">
                    {integration.responseTimeMs ? `${integration.responseTimeMs}ms` : '—'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 block mb-1">Status</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mt-1">
                    {integration.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {integration.lastTestedAt && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Last Full Connection Verification:</span>
                    <span className="font-mono text-slate-700">
                      {new Date(integration.lastTestedAt).toLocaleString()}
                    </span>
                  </div>
                  {integration.lastTestMessage && (
                    <div className="p-2.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[11px]">
                      {integration.lastTestMessage}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Live Test Results Alert */}
          {testResult && (
            <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-bold flex items-center justify-between">
                  <span>{testResult.success ? 'Connection Successful' : 'Connection Failed'}</span>
                  {testResult.responseTimeMs && (
                    <span className="font-mono text-[11px]">{testResult.responseTimeMs}ms</span>
                  )}
                </div>
                <p className="mt-0.5 leading-relaxed">{testResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleRunTest}
            disabled={isTesting || !isEnabled}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 shadow-2xs transition-colors"
          >
            <Activity className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            {isTesting ? 'Testing Connection...' : 'Test Connection'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
