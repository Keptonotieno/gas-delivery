import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ExternalLink, 
  Copy, 
  Check, 
  Activity, 
  Play, 
  Power, 
  Sparkles,
  ShieldCheck,
  Settings
} from 'lucide-react';
import { IntegrationItem } from '../../../types';
import { IntegrationIcon } from './IntegrationIcons';

interface IntegrationCardProps {
  integration: IntegrationItem;
  onConfigure: (integration: IntegrationItem) => void;
  onTest: (integration: IntegrationItem) => Promise<any> | void;
  onToggle: (integration: IntegrationItem, isEnabled: boolean) => Promise<void>;
  isTesting?: boolean;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  integration,
  onConfigure,
  onTest,
  onToggle,
  isTesting = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const handleCopyWebhook = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!integration.webhookUrl) return;
    navigator.clipboard.writeText(integration.webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const getStatusBadge = () => {
    if (!integration.isEnabled || integration.status === 'disabled') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Disabled
        </span>
      );
    }

    switch (integration.status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Configured
          </span>
        );
      case 'needs_attention':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Needs Attention
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Error
          </span>
        );
      case 'not_configured':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Not Configured
          </span>
        );
    }
  };

  const isConfigured = integration.status === 'connected';

  return (
    <div 
      id={`integration-card-${integration.id}`}
      className={`bg-white rounded-xl border transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
        integration.isEnabled ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 bg-slate-50/40 opacity-80'
      }`}
    >
      {/* Top Card Body */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <IntegrationIcon iconKey={integration.icon} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {integration.name}
                </h3>
                {integration.isOfficial && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    Official
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                {integration.description}
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {getStatusBadge()}
          </div>
        </div>

        {/* Feature Capability Tags */}
        {integration.tags && integration.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3.5">
            {integration.tags.slice(0, 3).map((tag, idx) => (
              <span 
                key={idx} 
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600"
              >
                {tag}
              </span>
            ))}
            {integration.environment && (
              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                integration.environment === 'production' 
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                {integration.environment.toUpperCase()}
              </span>
            )}
          </div>
        )}

        {/* Status notice or alert if needs attention */}
        {integration.status === 'needs_attention' && integration.lastError && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200/70 text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{integration.lastError}</span>
          </div>
        )}

        {/* Expanded Quick Details Drawer */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs space-y-2.5 bg-slate-50/60 -mx-5 -mb-5 p-5">
            {integration.webhookUrl && (
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Incoming Webhook Callback URL:
                </label>
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <code className="text-[11px] text-slate-700 truncate font-mono flex-1">
                    {integration.webhookUrl}
                  </code>
                  <button
                    onClick={handleCopyWebhook}
                    type="button"
                    className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                    title="Copy Webhook URL"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div>
                <span className="text-slate-400">Auth Method:</span>{' '}
                <span className="font-semibold text-slate-700">{integration.authMethod || 'API Key'}</span>
              </div>
              {integration.responseTimeMs !== undefined && (
                <div>
                  <span className="text-slate-400">Response Time:</span>{' '}
                  <span className="font-semibold text-emerald-600">{integration.responseTimeMs}ms</span>
                </div>
              )}
              {integration.lastTestedAt && (
                <div className="col-span-2 text-slate-500">
                  <span className="text-slate-400">Last Verified:</span>{' '}
                  {new Date(integration.lastTestedAt).toLocaleDateString()} at {new Date(integration.lastTestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            {/* In-Card Quick Test Connection */}
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-200/60">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggle(integration, !integration.isEnabled)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                    integration.isEnabled 
                      ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  {integration.isEnabled ? 'Disable' : 'Enable Service'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => onTest(integration)}
                disabled={isTesting || !integration.isEnabled}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                <Activity className={`w-3 h-3 ${isTesting ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer Bar */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{integration.lastUpdatedText || 'Configured'}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Accordion Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200/60 transition-colors"
            title={isExpanded ? 'Hide quick details' : 'Show quick details'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Manage / Configure Button */}
          {isConfigured ? (
            <button
              type="button"
              onClick={() => onConfigure(integration)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              Manage
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onConfigure(integration)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors"
            >
              Configure
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
