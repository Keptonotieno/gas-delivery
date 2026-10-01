import React, { useState } from 'react';
import { X, Search, CheckCircle2, AlertCircle, Clock, Shield, RefreshCw } from 'lucide-react';
import { IntegrationLog } from '../../../types';

interface IntegrationLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: IntegrationLog[];
  onRefresh: () => void;
}

export const IntegrationLogsModal: React.FC<IntegrationLogsModalProps> = ({
  isOpen,
  onClose,
  logs,
  onRefresh
}) => {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterResult, setFilterResult] = useState<'all' | 'success' | 'failed'>('all');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.integrationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.administrator.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesResult = 
      filterResult === 'all' || log.result === filterResult;

    return matchesSearch && matchesResult;
  });

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Integration Audit & Activity Logs</h2>
              <p className="text-xs text-slate-500">Comprehensive chronological audit trail for API handshakes, callbacks, and configuration modifications.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Refresh logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search integration, action, or admin..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {(['all', 'success', 'failed'] as const).map(res => (
              <button
                key={res}
                type="button"
                onClick={() => setFilterResult(res)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  filterResult === res
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {res}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table / List */}
        <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No audit logs matching your current filter.
            </div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {log.result === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{log.integrationName}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-medium text-slate-700">{log.action}</span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{log.message}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span>Admin: <strong className="text-slate-600 font-medium">{log.administrator}</strong></span>
                      <span>·</span>
                      <span className="font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    log.result === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {log.result}
                  </span>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    {log.timeAgo || 'Recent'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredLogs.length} of {logs.length} total logged events</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
