import React from 'react';
import { Order } from '../../types';
import {
  Calendar,
  ChevronRight,
  Clock,
  CheckCircle2,
  MapPin,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface TodaysWorkPanelProps {
  orders: Order[];
  activeOrder: Order | null;
  onSelectOrder: (orderId: string) => void;
  onOpenFullQueue: () => void;
}

export const TodaysWorkPanel: React.FC<TodaysWorkPanelProps> = ({
  orders,
  activeOrder,
  onSelectOrder,
  onOpenFullQueue
}) => {
  // Pending deliveries (not delivered & not cancelled)
  const pendingOrders = orders.filter(
    (o) => o.status !== 'Delivered' && o.status !== 'Cancelled'
  );
  // Completed deliveries
  const completedOrders = orders.filter((o) => o.status === 'Delivered');

  // Next queued delivery (first pending that isn't the active one)
  const nextOrder = pendingOrders.find((o) => o.id !== activeOrder?.id);

  return (
    <section
      aria-label="Today's Work Summary"
      className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h3 className="text-base font-bold text-gray-900 tracking-tight">
            Today's Work
          </h3>
        </div>
        <button
          type="button"
          onClick={onOpenFullQueue}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>View Queue</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3 Quick Pill Metrics (Pending, Completed, Active) */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={onOpenFullQueue}
          className="p-3 rounded-xl bg-orange-50/70 hover:bg-orange-50 border border-orange-200/80 text-left transition-colors cursor-pointer"
        >
          <span className="text-2xl font-mono font-black text-[#E04F11] block leading-none">
            {pendingOrders.length}
          </span>
          <span className="text-[11px] font-bold text-orange-900 block mt-1">
            Pending
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenFullQueue}
          className="p-3 rounded-xl bg-emerald-50/70 hover:bg-emerald-50 border border-emerald-200/80 text-left transition-colors cursor-pointer"
        >
          <span className="text-2xl font-mono font-black text-emerald-700 block leading-none">
            {completedOrders.length}
          </span>
          <span className="text-[11px] font-bold text-emerald-900 block mt-1">
            Completed
          </span>
        </button>

        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-left">
          <span className="text-2xl font-mono font-black text-blue-700 block leading-none">
            {activeOrder ? 1 : 0}
          </span>
          <span className="text-[11px] font-bold text-blue-900 block mt-1">
            Active
          </span>
        </div>
      </div>

      {/* Active & Next Stop Schedule Preview */}
      <div className="space-y-2.5 pt-1 border-t border-gray-100">
        {/* Active Delivery Highlight */}
        {activeOrder ? (
          <div className="p-3 rounded-xl bg-blue-50/40 border border-blue-200 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                Current Stop
              </span>
              <span className="font-mono text-[11px] font-bold text-gray-500">
                #{activeOrder.id}
              </span>
            </div>
            <p className="font-bold text-gray-900 truncate">
              {activeOrder.customerName}
            </p>
            <p className="text-[11px] text-gray-600 truncate mt-0.5">
              {activeOrder.deliveryAddress?.street || 'Thika Superhighway corridor'}
              {activeOrder.deliveryAddress?.thikaHighwayZone && ` · ${activeOrder.deliveryAddress.thikaHighwayZone}`}
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-center text-gray-500">
            No active stop assigned right now.
          </div>
        )}

        {/* Next Queued Delivery */}
        {nextOrder && (
          <div
            onClick={() => onSelectOrder(nextOrder.id)}
            className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100/80 border border-gray-200 text-xs transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                Next in Queue
              </span>
              <span className="text-[10px] text-blue-600 font-bold group-hover:underline flex items-center gap-0.5">
                Switch <ArrowRight className="w-3 h-3" />
              </span>
            </div>
            <p className="font-semibold text-gray-900 truncate">
              {nextOrder.customerName}
            </p>
            <p className="text-[11px] text-gray-500 truncate mt-0.5">
              {nextOrder.cylinderSummary || 'LPG Refill'} · {nextOrder.deliveryAddress?.thikaHighwayZone || 'Nairobi'}
            </p>
          </div>
        )}
      </div>

      {/* Interactive Bottom Action */}
      <button
        type="button"
        onClick={onOpenFullQueue}
        className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
      >
        <span>Manage All {orders.length} Shifts & Stops</span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
      </button>
    </section>
  );
};
