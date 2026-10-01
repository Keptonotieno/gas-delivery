import React from 'react';
import { Smartphone, Banknote, ShieldCheck, Check, Info } from 'lucide-react';
import { PaymentMethod } from '../../types';
import { formatKSh } from '../../utils/format';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  mpesaPhone: string;
  onMpesaPhoneChange: (phone: string) => void;
  phoneError?: string | null;
  totalAmount: number;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onSelectMethod,
  mpesaPhone,
  onMpesaPhoneChange,
  phoneError,
  totalAmount
}) => {
  return (
    <div className="space-y-4" id="payment-selection-section">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[#E04F11] text-white text-xs flex items-center justify-center font-bold">
            4
          </span>
          <span>Payment Selection</span>
        </h3>
        <span className="text-xs text-gray-500 font-medium">
          Select preferred method
        </span>
      </div>

      {/* Only Two Options: M-Pesa and Cash on Delivery */}
      <div
        role="radiogroup"
        aria-label="Payment Method Selection"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {/* Option 1: M-Pesa */}
        <div
          id="payment-option-mpesa"
          role="radio"
          aria-checked={selectedMethod === 'M-Pesa'}
          tabIndex={0}
          onClick={() => onSelectMethod('M-Pesa')}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              onSelectMethod('M-Pesa');
            }
          }}
          className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer select-none outline-none ${
            selectedMethod === 'M-Pesa'
              ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedMethod === 'M-Pesa'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-gray-900">M-Pesa</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    STK Push
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lipa na M-Pesa Express
                </p>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                selectedMethod === 'M-Pesa'
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {selectedMethod === 'M-Pesa' && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-semibold">Zero transaction fee</span>
            <span className="text-gray-400 font-medium">Instant confirmation</span>
          </div>
        </div>

        {/* Option 2: Cash on Delivery */}
        <div
          id="payment-option-cod"
          role="radio"
          aria-checked={selectedMethod === 'Cash on Delivery'}
          tabIndex={0}
          onClick={() => onSelectMethod('Cash on Delivery')}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              onSelectMethod('Cash on Delivery');
            }
          }}
          className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer select-none outline-none ${
            selectedMethod === 'Cash on Delivery'
              ? 'border-[#E04F11] bg-[#FFF5EE]/60 ring-2 ring-[#E04F11]/20 shadow-xs'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedMethod === 'Cash on Delivery'
                    ? 'bg-[#E04F11] text-white shadow-xs'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-gray-900">Cash on Delivery</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    Pay on Arrival
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pay upon cylinder connection
                </p>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                selectedMethod === 'Cash on Delivery'
                  ? 'border-[#E04F11] bg-[#E04F11] text-white'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {selectedMethod === 'Cash on Delivery' && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <span className="text-amber-700 font-semibold">Inspect before paying</span>
            <span className="text-gray-400 font-medium">Cash or Driver Till</span>
          </div>
        </div>
      </div>

      {/* Dynamic Details / Instructions based on selected method */}
      {selectedMethod === 'M-Pesa' && (
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in-50 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-950">
                Safaricom M-Pesa STK Prompt Details
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
              Till No: 542890
            </span>
          </div>

          <p className="text-xs text-emerald-800 leading-relaxed">
            Please enter your active Safaricom mobile number. When you tap <strong>Confirm Order</strong>, a pop-up prompt will appear on your phone requesting your M-Pesa PIN for <strong>{formatKSh(totalAmount)}</strong>.
          </p>

          <div>
            <label className="block text-xs font-bold text-emerald-950 mb-1.5" htmlFor="mpesa-phone-input">
              M-Pesa Mobile Number:
            </label>
            <div className="relative max-w-sm">
              <input
                id="mpesa-phone-input"
                type="tel"
                value={mpesaPhone}
                onChange={(e) => onMpesaPhoneChange(e.target.value)}
                placeholder="+254 712 345 678"
                className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 transition-all ${
                  phoneError
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-emerald-300 focus:ring-emerald-500'
                }`}
              />
              <span className="absolute right-3 top-2.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Safaricom
              </span>
            </div>
            {phoneError ? (
              <p className="text-[11px] font-medium text-red-600 mt-1 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {phoneError}
              </p>
            ) : (
              <p className="text-[11px] text-emerald-700/80 mt-1">
                Accepted formats: +254 7XX XXX XXX or 07XX XXX XXX
              </p>
            )}
          </div>
        </div>
      )}

      {selectedMethod === 'Cash on Delivery' && (
        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2 animate-in fade-in-50 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-bold text-amber-950">
              Cash on Delivery Guarantee
            </span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            No upfront payment required. You will inspect the safety valve seal, check tare weight on our calibrated mobile scale, and confirm cylinder connection before handing over <strong>{formatKSh(totalAmount)}</strong> in cash or sending directly to the driver's verified merchant till.
          </p>
        </div>
      )}

      {/* Security Assurance Notice */}
      <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          Secured with 256-bit SSL encryption. Only authorized payment channels are supported.
        </span>
      </div>
    </div>
  );
};
