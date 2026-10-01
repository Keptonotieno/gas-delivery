import React from 'react';
import { Driver, DriverEarningsSummary } from '../../types';
import { formatKSh } from '../../utils/format';
import {
  User,
  ShieldCheck,
  Star,
  Truck,
  Phone,
  Mail,
  Wallet,
  CheckCircle2,
  X,
  CreditCard
} from 'lucide-react';

interface DriverProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver | null;
  earnings: DriverEarningsSummary | null;
  onOpenEarnings: () => void;
}

export const DriverProfileModal: React.FC<DriverProfileModalProps> = ({
  isOpen,
  onClose,
  driver,
  earnings,
  onOpenEarnings
}) => {
  if (!isOpen || !driver) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-700" />
            <h3 className="font-bold text-gray-900 text-base">Driver Profile</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-bold text-xl shadow-xs">
            {driver.initials || 'DK'}
          </div>
          <div>
            <h4 className="text-lg font-bold text-gray-950">{driver.name}</h4>
            <span className="text-xs text-gray-500 font-mono">ID: {driver.id}</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {driver.status}
              </span>
              <span className="text-xs font-bold text-amber-600 flex items-center gap-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {driver.rating?.toFixed(1) || '4.9'}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Details List */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-gray-400" /> Phone
            </span>
            <span className="font-mono font-bold text-gray-900">{driver.phone}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" /> Email
            </span>
            <span className="text-gray-900">{driver.email}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-gray-400" /> Assigned Vehicle
            </span>
            <span className="font-bold text-gray-900">
              {driver.licensePlate || 'KDG 482B'} ({driver.vehicle || 'Tuk-Tuk'})
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Account Status
            </span>
            <span className="font-bold text-emerald-700">Verified & Active</span>
          </div>
        </div>

        {/* Quick Earnings & M-Pesa Info */}
        <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-900 font-medium block">
              Available for Cashout
            </span>
            <span className="text-lg font-mono font-black text-emerald-700 block">
              {formatKSh(earnings?.wallet?.availableForCashoutKSh || 12500)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenEarnings();
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Open Wallet</span>
          </button>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
