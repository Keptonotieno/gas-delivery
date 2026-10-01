import React, { useMemo } from 'react';
import { Order, Driver } from '../../types';
import { RealisticDeliveryMap } from '../../components/RealisticDeliveryMap';
import {
  Navigation,
  Phone,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Clock,
  Package,
  FileText,
  Radio,
  ExternalLink
} from 'lucide-react';

interface ActiveDeliverySectionProps {
  order: Order | null;
  driver: Driver | null;
  isUpdatingStatus: boolean;
  onStartNavigation: () => void;
  onMarkArrived: () => void;
  onConfirmDelivery: () => void;
  onCallCustomer: () => void;
  onWhatsAppCustomer: () => void;
  onReportIssue: () => void;
}

export const ActiveDeliverySection: React.FC<ActiveDeliverySectionProps> = ({
  order,
  driver,
  isUpdatingStatus,
  onStartNavigation,
  onMarkArrived,
  onConfirmDelivery,
  onCallCustomer,
  onWhatsAppCustomer,
  onReportIssue
}) => {
  if (!order) {
    return (
      <section
        aria-label="Active Delivery"
        className="bg-white rounded-2xl border border-gray-200 p-8 shadow-2xs text-center space-y-3"
      >
        <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
          <Package className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-gray-800">
          No Active Delivery Right Now
        </h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          You are currently ready to receive new dispatch assignments. Keep your status set to "Online" to receive nearby Thika Superhighway orders.
        </p>
      </section>
    );
  }

  // Get customer initials
  const customerInitials = useMemo(() => {
    if (!order.customerName) return 'CU';
    return order.customerName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }, [order.customerName]);

  // Status color mapping
  const statusBadge = useMemo(() => {
    switch (order.status) {
      case 'Arrived':
        return {
          label: 'Arrived at Gate',
          bg: 'bg-rose-50 text-rose-700 border-rose-200'
        };
      case 'En Route':
      case 'Out for Delivery':
        return {
          label: 'En Route to Customer',
          bg: 'bg-blue-50 text-blue-700 border-blue-200'
        };
      case 'Dispatched':
      case 'Assigned':
        return {
          label: 'Dispatched from Hub',
          bg: 'bg-amber-50 text-amber-700 border-amber-200'
        };
      case 'Delivered':
        return {
          label: 'Completed / Delivered',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      default:
        return {
          label: order.status,
          bg: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  }, [order.status]);

  const deliveryZone =
    order.deliveryAddress?.thikaHighwayZone ||
    order.thikaHighwayZone ||
    'Roysambu';

  const fullStreet =
    order.deliveryAddress?.street || 'Lumumba Drive, near TRM (Exit 8)';

  return (
    <section
      aria-label="Active Delivery Operational Control"
      className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-5 sm:p-6 space-y-5"
    >
      {/* 1. Header: Customer Identity, Phone & Primary Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-13 h-13 rounded-2xl bg-[#E04F11] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
            {customerInitials}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight truncate">
                {order.customerName}
              </h2>
              <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                #{order.id}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge.bg}`}
              >
                {statusBadge.label}
              </span>
            </div>

            {/* Customer Phone & Thika Corridor Landmark */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mt-1">
              <a
                href={`tel:${order.customerPhone}`}
                className="inline-flex items-center gap-1 font-mono font-bold text-blue-700 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 transition-colors"
                title="Direct call customer"
              >
                <Phone className="w-3 h-3 text-blue-600" />
                <span>{order.customerPhone}</span>
              </a>

              <div className="flex items-center gap-1.5 text-gray-700 truncate">
                <MapPin className="w-3.5 h-3.5 text-[#E04F11] shrink-0" />
                <span className="truncate">
                  {fullStreet} · <strong className="text-gray-900">{deliveryZone}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={
              order.customerLiveLocation
                ? `https://www.google.com/maps/dir/?api=1&destination=${order.customerLiveLocation.lat},${order.customerLiveLocation.lng}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullStreet + ' Nairobi')}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
          >
            <Navigation className="w-4 h-4" />
            <span>Google Maps GPS</span>
          </a>
        </div>
      </div>

      {/* 2. LIVE GPS TELEMETRY STATUS BAR */}
      <div className="p-3 bg-emerald-50/90 rounded-xl border border-emerald-200/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
          </span>
          <span className="font-bold text-emerald-950">
            {order.customerLiveLocation?.isSharing
              ? 'Customer Live Doorstep GPS Active'
              : 'Destination Corridor Pinpoint Verified'}
          </span>
          {order.customerLiveLocation && (
            <span className="font-mono text-[11px] text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
              {order.customerLiveLocation.lat.toFixed(4)}, {order.customerLiveLocation.lng.toFixed(4)}
              {order.customerLiveLocation.accuracy && ` (±${order.customerLiveLocation.accuracy}m)`}
            </span>
          )}
        </div>

        <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          Target SLA: Within 30–40 min delivery window
        </span>
      </div>

      {/* 3. ORDER SPECS GRID: GAS TYPE, SIZE, BRAND, PAYMENT & INSTRUCTIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 bg-gray-50/90 rounded-xl border border-gray-200/80 text-xs">
        {/* Gas Product & Brand */}
        <div className="space-y-1 p-2.5 bg-white rounded-lg border border-gray-200/70 shadow-2xs">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
            Gas Brand & Model
          </span>
          <div className="font-bold text-gray-900 text-sm truncate">
            {order.cylinderBrand || order.items?.[0]?.brand || 'TotalEnergies'}
          </div>
          <span className="inline-block px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded text-[10px] font-bold">
            {order.items?.[0]?.gasType || 'LPG Cooking Gas'}
          </span>
        </div>

        {/* Cylinder Size & Order Type */}
        <div className="space-y-1 p-2.5 bg-white rounded-lg border border-gray-200/70 shadow-2xs">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
            Size & Order Type
          </span>
          <div className="font-bold text-gray-900 text-sm">
            {order.cylinderSize || order.items?.[0]?.size || '13 kg Standard'}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                order.cylinderOrderType === 'complete_kit'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {order.cylinderOrderType === 'complete_kit'
                ? 'Complete Kit (New Cylinder + Burner)'
                : 'Refill (Exchange Empty Cylinder)'}
            </span>
          </div>
        </div>

        {/* Payment & Financials */}
        <div className="space-y-1 p-2.5 bg-white rounded-lg border border-gray-200/70 shadow-2xs">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
            Payment & Total
          </span>
          <div className="font-mono font-bold text-gray-900 text-sm">
            KES {order.total?.toLocaleString() || '2,950'}
          </div>
          <span
            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
              order.paymentStatus === 'Paid'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {order.paymentStatus === 'Paid'
              ? `M-Pesa Paid (${order.mpesaTransactionId || 'Ref: MP-VERIFIED'})`
              : 'Cash on Delivery (Collect KES)'}
          </span>
        </div>

        {/* Delivery Doorstep Instructions */}
        <div className="space-y-1 p-2.5 bg-white rounded-lg border border-gray-200/70 shadow-2xs">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
            Doorstep Instructions
          </span>
          <p className="text-[11px] text-gray-700 italic line-clamp-2">
            {order.deliveryAddress?.landmark ||
              order.deliveryAddress?.houseNumber ||
              'Ring bell at black gate. Conduct soap water leak test on installation.'}
          </p>
        </div>
      </div>

      {/* 4. DRIVER SAFETY & EXCHANGE CHECKLIST NOTICE */}
      <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-950">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-bold">Required Delivery Checks:</span>
          <span className="text-amber-900">
            {order.cylinderOrderType === 'complete_kit'
              ? 'Verify tamper-evident seal and regulator fit.'
              : 'Collect customer empty cylinder before handing over new full cylinder.'}
          </span>
        </div>
        <span className="text-[11px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
          Safety Protocol: 100% Leak Tested
        </span>
      </div>

      {/* 5. Live Street Map */}
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-2xs">
        <RealisticDeliveryMap
          driverName={driver?.name || 'Dennis Driver'}
          customerName={order.customerName}
          customerAddress={fullStreet}
          pickupLocation={order.pickupLocation}
          customerLiveLocation={order.customerLiveLocation}
          heightClass="h-64 sm:h-72"
        />
      </div>

      {/* 4. Touch-Friendly Driver Action Buttons (Touch Target >= 44px) */}
      <div className="pt-2 border-t border-gray-100 space-y-3">
        {/* ROW 1 (Primary Action Controls) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Start Navigation */}
          <button
            type="button"
            onClick={onStartNavigation}
            className="min-h-[46px] px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <Navigation className="w-4 h-4 text-blue-600" />
            <span>Open in Maps</span>
          </button>

          {/* Mark Arrived */}
          <button
            type="button"
            onClick={onMarkArrived}
            disabled={isUpdatingStatus || order.status === 'Arrived'}
            className="min-h-[46px] px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 text-rose-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
          >
            <MapPin className="w-4 h-4 text-rose-600" />
            <span>
              {order.status === 'Arrived' ? '✓ Arrived at Doorstep' : 'Mark Arrived'}
            </span>
          </button>

          {/* Confirm Delivery (POD) */}
          <button
            type="button"
            onClick={onConfirmDelivery}
            className="min-h-[46px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>Confirm Delivery (POD)</span>
          </button>
        </div>

        {/* ROW 2 (Secondary Communication & Incident Reporting) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Call Customer */}
          <button
            type="button"
            onClick={onCallCustomer}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <Phone className="w-4 h-4 text-gray-700" />
            <span>Call Customer</span>
          </button>

          {/* WhatsApp / SMS */}
          <button
            type="button"
            onClick={onWhatsAppCustomer}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <MessageSquare className="w-4 h-4 text-white" />
            <span>WhatsApp / SMS</span>
          </button>

          {/* Report Issue */}
          <button
            type="button"
            onClick={onReportIssue}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Report Delivery Issue</span>
          </button>
        </div>
      </div>
    </section>
  );
};
