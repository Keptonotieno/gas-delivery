import React, { useState } from 'react';
import { Driver } from '../../types';
import { Truck, Phone, Navigation, Shield, CheckCircle2 } from 'lucide-react';

interface FleetStatusPanelProps {
  drivers: Driver[];
  onSelectDriver?: (driver: Driver) => void;
}

export const FleetStatusPanel: React.FC<FleetStatusPanelProps> = ({ drivers, onSelectDriver }) => {
  const [callingDriver, setCallingDriver] = useState<Driver | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'On Delivery':
        return 'bg-[#FFF5EE] text-[#E04F11] border-[#FEECE2]';
      case 'Available':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Loading Depot':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Break':
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
        <div>
          <h3 className="font-bold text-gray-900 text-base">Active Fleet Status</h3>
          <p className="text-xs text-gray-400">Real-time driver location and load</p>
        </div>
      </div>

      {/* Driver Cards */}
      <div className="space-y-3">
        {drivers.length === 0 ? (
          <div className="py-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            <Truck className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-gray-400" />
            <p className="text-xs font-medium text-gray-600">No active drivers on duty</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Fleet couriers will appear here once registered</p>
          </div>
        ) : (
          drivers.map((driver) => {
            const capacity = driver.capacity && driver.capacity > 0 ? driver.capacity : 20;
          const load = typeof driver.load === 'number' && !isNaN(driver.load) ? driver.load : 0;
          const loadPercentage = Math.min(100, Math.max(0, Math.round((load / capacity) * 100)));

          return (
            <div
              key={driver.id}
              className="p-3.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-all bg-gray-50/40"
            >
              {/* Top Row: Name, Vehicle, Status */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs">
                    {driver.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 leading-tight">
                      {driver.name}
                    </h4>
                    <span className="text-[11px] text-gray-500">{driver.vehicle}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(
                    driver.status
                  )}`}
                >
                  {driver.status}
                </span>
              </div>

              {/* Current Stop */}
              <div className="text-xs text-gray-600 mb-2.5 flex items-start gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                <span className="truncate">
                  Stop: <strong className="text-gray-800">{driver.currentStop || 'Standby at Hub'}</strong>
                </span>
              </div>

              {/* Capacity Progress Bar */}
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                  <span>Cylinder Load</span>
                  <span>
                    {load} / {capacity} cylinders ({loadPercentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      loadPercentage > 85 ? 'bg-red-500' : 'bg-[#E04F11]'
                    }`}
                    style={{ width: `${loadPercentage}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1 text-[11px] text-amber-600 font-bold">
                  <span>★ {driver.rating}</span>
                  <span className="text-gray-400 font-normal">({driver.deliveredCountToday ?? 0} today)</span>
                </div>

                <button
                  type="button"
                  onClick={() => setCallingDriver(driver)}
                  className="text-xs font-bold text-[#E04F11] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Phone className="w-3 h-3" />
                  <span>Contact</span>
                </button>
              </div>
            </div>
          );
        })
        )}
      </div>

      {/* Calling Modal */}
      {callingDriver && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-[#FFF5EE] text-[#E04F11] flex items-center justify-center mx-auto mb-3">
              <Phone className="w-6 h-6 animate-bounce" />
            </div>
            <h4 className="text-base font-bold text-gray-900">Calling Dispatch Channel</h4>
            <p className="text-xs text-gray-500 mt-1">
              Dialing {callingDriver.name} ({callingDriver.phone})
            </p>
            <button
              onClick={() => setCallingDriver(null)}
              className="mt-5 w-full py-2 bg-red-600 text-white font-semibold rounded-xl text-xs hover:bg-red-700 transition-colors cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
