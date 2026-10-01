import React, { useState } from 'react';
import { Order } from '../../types';
import { AlertTriangle, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api';

interface DeliveryIssueModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onIssueReported: (issueType: string, notes: string) => void;
}

export const DeliveryIssueModal: React.FC<DeliveryIssueModalProps> = ({
  order,
  isOpen,
  onClose,
  onIssueReported
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('Customer Unreachable');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const presets = [
    {
      id: 'Customer Unreachable',
      label: 'Customer Unreachable',
      desc: 'Phone is ringing with no answer or switched off'
    },
    {
      id: 'Gate Access Restricted',
      label: 'Gate Access Restricted',
      desc: 'Security guard denying entry / waiting for gate clearance'
    },
    {
      id: 'Wrong Address / Landmark',
      label: 'Address Landmark Incorrect',
      desc: 'Location landmark does not match actual road pin'
    },
    {
      id: 'Cylinder Defect / Valve Leak',
      label: 'Cylinder Valve Leak Detected',
      desc: 'Soapy water test showed bubbling on seal or valve'
    },
    {
      id: 'Traffic Corridor Gridlock',
      label: 'Severe Highway Traffic Jam',
      desc: 'Highway exit blockage causing major SLA delay'
    },
    {
      id: 'Customer Requested Reschedule',
      label: 'Customer Postponed Delivery',
      desc: 'Customer requested delivery at a later time'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await api.reportDeliveryIssue(order.id, {
        issueType: selectedPreset,
        notes: notes.trim()
      });
      onIssueReported(selectedPreset, notes.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to report delivery issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200 animate-in fade-in-50 zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">
                Report Delivery Issue
              </h3>
              <p className="text-xs text-amber-900">
                Order #{order.id} · {order.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Select Issue Category
            </label>
            <div className="space-y-2">
              {presets.map((preset) => (
                <label
                  key={preset.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedPreset === preset.id
                      ? 'bg-amber-50/70 border-amber-400 ring-1 ring-amber-400'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="issuePreset"
                    value={preset.id}
                    checked={selectedPreset === preset.id}
                    onChange={() => setSelectedPreset(preset.id)}
                    className="mt-1 text-[#E04F11] focus:ring-[#E04F11]"
                  />
                  <div>
                    <span className="font-bold text-xs text-gray-900 block">
                      {preset.label}
                    </span>
                    <span className="text-[11px] text-gray-500 block mt-0.5">
                      {preset.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Additional Dispatch Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide specific details for Central Dispatch controller..."
              className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#E04F11] focus:border-transparent outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{isSubmitting ? 'Logging Alert...' : 'Notify Central Dispatch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
