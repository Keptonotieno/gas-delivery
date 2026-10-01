import React, { useState } from 'react';
import { Order } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { DeliveryMap } from '../../components/DeliveryMap';
import { ContactActionGroup } from '../../components/ContactActionGroup';
import { LiveLocationShare } from './LiveLocationShare';
import { formatKSh } from '../../utils/format';
import {
  Check,
  Star,
  ShieldCheck,
  Clock,
  MapPin,
  Truck,
  Package,
  CreditCard,
  PhoneCall,
  CheckCircle2
} from 'lucide-react';

interface LiveTrackingBannerProps {
  order: Order;
  onCallDriver?: () => void;
  onMessageDriver?: () => void;
  onOrderUpdated?: (order: Order) => void;
}

export const LiveTrackingBanner: React.FC<LiveTrackingBannerProps> = ({
  order,
  onOrderUpdated
}) => {
  const [liveLocation, setLiveLocation] = useState(order.customerLiveLocation);

  // Map order status to progress stepper stages
  const statusStages = [
    { key: 'Pending', label: 'Order Placed', time: order.createdAt || '1:45 PM' },
    { key: 'Dispatched', label: 'Driver Dispatched', time: '1:52 PM' },
    { key: 'En Route', label: 'En Route to Gate', time: '2:15 PM' },
    { key: 'Arrived', label: 'Arrived at Doorstep', time: '2:38 PM' },
    { key: 'Delivered', label: 'Handover & POD', time: 'Est. 2:45 PM' }
  ];

  const getStageState = (stageKey: string, idx: number) => {
    const statusOrder = ['Pending', 'Dispatched', 'Accepted', 'En Route', 'Out for Delivery', 'Arrived', 'Delivered'];
    const currentOrderIndex = statusOrder.indexOf(order.status);
    const stageOrderIndex = statusOrder.indexOf(stageKey);

    if (order.status === 'Delivered') return { completed: true, current: false };

    if (stageKey === 'Pending') {
      return { completed: currentOrderIndex >= 0, current: currentOrderIndex === 0 };
    }
    if (stageKey === 'Dispatched') {
      const isCurrent = order.status === 'Dispatched' || order.status === 'Assigned' || order.status === 'Accepted';
      const isDone = currentOrderIndex > statusOrder.indexOf('Accepted');
      return { completed: isDone, current: isCurrent };
    }
    if (stageKey === 'En Route') {
      const isCurrent = order.status === 'En Route' || order.status === 'Out for Delivery';
      const isDone = currentOrderIndex > statusOrder.indexOf('Out for Delivery');
      return { completed: isDone, current: isCurrent };
    }
    if (stageKey === 'Arrived') {
      return { completed: currentOrderIndex > statusOrder.indexOf('Arrived'), current: order.status === 'Arrived' };
    }
    if (stageKey === 'Delivered') {
      const isDelivered = (order.status as string) === 'Delivered';
      return { completed: isDelivered, current: isDelivered };
    }
    return { completed: false, current: false };
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden mb-6">
      {/* Top Banner: Order Reference, Status & Arrival Countdown */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/10">
            <Truck className="w-5 h-5 text-[#E04F11]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono tracking-wide text-gray-300">
                DISPATCH REF:
              </span>
              <h2 className="text-base font-mono font-bold text-white tracking-tight">
                #{order.id}
              </h2>
              <StatusBadge status={order.status} size="sm" />
            </div>
            <p className="text-xs text-gray-300 mt-0.5">
              {order.cylinderSummary} · Thika Superhighway Corridor Express
            </p>
          </div>
        </div>

        {/* Big ETA Badge */}
        <div className="flex items-center gap-3 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10">
          <Clock className="w-4 h-4 text-[#E04F11]" />
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider leading-none">
              Estimated Arrival
            </span>
            <span className="text-base sm:text-lg font-mono font-extrabold text-white">
              ~{order.driverEtaMinutes || 18} mins
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (Map & Progress) | Right Column (Order & Driver Details) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
        {/* LEFT COLUMN: Map & Linear Stage Stepper (lg:col-span-7) */}
        <div className="lg:col-span-7 p-5 sm:p-6 space-y-5">
          {/* Section: Live Route Tracking Map */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#E04F11]" />
                Live Corridor Telemetry
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                Route: Central Depot → {order.deliveryAddress?.street || 'Destination'}
              </span>
            </div>
            <DeliveryMap
              driverName={order.driverName}
              vehicle={order.driverVehicle}
              etaMinutes={order.driverEtaMinutes}
              customerAddress={order.deliveryAddress?.street}
              customerLiveLocation={liveLocation}
            />
          </div>

          {/* Section: Live Doorstep GPS Sharing */}
          <LiveLocationShare
            orderId={order.id}
            driverName={order.driverName || 'Assigned Courier'}
            initialIsSharing={order.customerLiveLocation?.isSharing || false}
            onLocationUpdate={(loc) => {
              setLiveLocation({
                lat: loc.lat,
                lng: loc.lng,
                accuracy: loc.accuracy,
                isSharing: loc.isSharing,
                updatedAt: new Date().toISOString()
              });
              if (onOrderUpdated) {
                onOrderUpdated({
                  ...order,
                  customerLiveLocation: {
                    lat: loc.lat,
                    lng: loc.lng,
                    accuracy: loc.accuracy,
                    isSharing: loc.isSharing,
                    updatedAt: new Date().toISOString()
                  }
                });
              }
            }}
          />

          {/* Section: Delivery Milestones Stepper */}
          <div className="pt-2">
            <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block mb-3">
              Delivery Progress Milestones
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {statusStages.map((stage, idx) => {
                const { completed, current } = getStageState(stage.key, idx);
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      current
                        ? 'bg-orange-50/70 border-[#E04F11] ring-1 ring-[#E04F11]'
                        : completed
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-gray-50/70 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold text-gray-400">
                        0{idx + 1}
                      </span>
                      {completed && !current && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      )}
                      {current && (
                        <span className="w-2 h-2 rounded-full bg-[#E04F11] animate-pulse" />
                      )}
                    </div>
                    <p
                      className={`text-xs font-bold leading-tight line-clamp-1 ${
                        current
                          ? 'text-[#E04F11]'
                          : completed
                          ? 'text-gray-900'
                          : 'text-gray-500'
                      }`}
                    >
                      {stage.label}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      {stage.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Order Specifics, Driver Contact Hub & Safety (lg:col-span-5) */}
        <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between space-y-5 bg-gray-50/40">
          {/* Driver Profile Card */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Assigned Delivery Specialist
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>{order.driverRating || 4.9}</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                {order.driverName
                  ? order.driverName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                  : 'CR'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-900 text-sm truncate">
                  {order.driverName || 'Assigned Courier'}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span className="font-mono font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                    {order.driverVehicle || 'Express Carrier'}
                  </span>
                  <span>·</span>
                  <span>Dispatched Courier</span>
                </div>
              </div>
            </div>

            {/* Direct Phone & WhatsApp Communication Hub */}
            <div className="mt-3.5 pt-3 border-t border-gray-100">
              <ContactActionGroup
                phone={order.driverPhone || '+254 712 345 678'}
                name={order.driverName || 'Courier'}
                role="driver"
                orderId={order.id}
                defaultMessage={`Jambo ${order.driverName || 'Courier'}, I am checking on my gas order #${order.id} along Thika Superhighway.`}
              />
            </div>
          </div>

          {/* Order Details & Summary: What did I order? */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs space-y-2.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Order Specs & Payment
            </span>

            <div className="flex items-start justify-between text-xs">
              <div className="flex items-start gap-2">
                <Package className="w-4 h-4 text-[#E04F11] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-gray-900 block">
                    {order.cylinderSummary}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    KEBS Verified Safety Seal · Soap Leak Tested
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold text-gray-900">
                {formatKSh(order.total)}
              </span>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                <span>Payment: <strong className="text-gray-800">{order.paymentMethod || 'M-Pesa'}</strong></span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  order.paymentStatus === 'Paid'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {order.paymentStatus === 'Paid' ? 'Paid Online' : 'Pay on Delivery'}
              </span>
            </div>

            <div className="pt-2 border-t border-gray-100 text-xs text-gray-600">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#E04F11] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-gray-800">Drop-off: </span>
                  <span>{order.deliveryAddress?.street || 'Roysambu near TRM'}, {order.deliveryAddress?.city || 'Nairobi'}</span>
                  {order.deliveryAddress?.landmark && (
                    <p className="text-[11px] text-gray-500 mt-0.5 italic">
                      Note: {order.deliveryAddress.landmark}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Safety & Corridor Guarantee */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/70 flex items-center gap-2.5 text-xs text-emerald-900">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <p className="text-[11px] leading-relaxed">
              <strong>Free Valve Inspection Guarantee:</strong> Rider performs a certified soapy-water leak check on your regulator upon arrival before handover.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
