import React from 'react';
import { Driver } from '../../types';
import { Truck, ShieldCheck, Wrench, AlertTriangle, BatteryCharging, Gauge } from 'lucide-react';

interface VehicleStatusCardProps {
  driver: Driver | null;
  onOpenVehicleModal?: () => void;
}

export const VehicleStatusCard: React.FC<VehicleStatusCardProps> = ({
  driver,
  onOpenVehicleModal
}) => {
  const plate = driver?.licensePlate || 'Unassigned';
  const vehicleName = driver?.vehicle || 'Delivery Vehicle';
  const capacity = driver?.capacity || 20;
  const load = driver?.load ?? 0;
  const loadPercent = capacity > 0 ? Math.min(100, Math.round((load / capacity) * 100)) : 0;

  return (
    <section
      aria-label="Vehicle Operational Status"
      className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-gray-700" />
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">
            Vehicle Status
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Operational
        </span>
      </div>

      {/* Vehicle Info Strip */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono font-black text-lg text-gray-900 block leading-tight">
            {plate}
          </span>
          <span className="text-xs text-gray-500 block mt-0.5">
            {vehicleName}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
            Fleet Safety Tier
          </span>
          <span className="text-xs font-bold text-gray-800 flex items-center justify-end gap-1 mt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Class A Commercial
          </span>
        </div>
      </div>

      {/* Cargo Capacity Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 font-medium">Cylinder Cargo Load:</span>
          <span className="font-mono font-bold text-gray-900">
            {load} / {capacity} Cylinders ({loadPercent}%)
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#E04F11] rounded-full transition-all duration-500"
            style={{ width: `${loadPercent}%` }}
          />
        </div>
      </div>

      {/* Maintenance & Readiness Check */}
      <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-xl bg-gray-50 border border-gray-200/80">
          <span className="text-[10px] text-gray-500 font-medium block">
            Maintenance:
          </span>
          <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            ✓ Up to date
          </span>
        </div>

        <div className="p-2 rounded-xl bg-gray-50 border border-gray-200/80">
          <span className="text-[10px] text-gray-500 font-medium block">
            Next Service:
          </span>
          <span className="font-bold text-gray-800 flex items-center gap-1 mt-0.5">
            <Wrench className="w-3.5 h-3.5 text-gray-500" />
            in 1,450 km
          </span>
        </div>
      </div>
    </section>
  );
};
