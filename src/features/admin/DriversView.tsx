import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Truck, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Navigation, 
  X, 
  ChevronRight, 
  Layers, 
  ShieldCheck,
  Package,
  Award,
  Plus,
  Send,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  UserPlus
} from 'lucide-react';
import { Driver, Order, DriverStatus } from '../../types';
import { api } from '../../services/api';

interface DriversViewProps {
  drivers: Driver[];
  orders: Order[];
  onRefresh?: () => void;
}

export const DriversView: React.FC<DriversViewProps> = ({ drivers, orders, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | DriverStatus>('All');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Add Driver Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    message: string;
    driver: Driver;
    activationUrl: string;
    emailStatus: { success: boolean; recipient: string; provider: string };
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+254 7');
  const [vehicleType, setVehicleType] = useState('Motorcycle (Boda Boda)');
  const [licensePlate, setLicensePlate] = useState('');
  const [capacity, setCapacity] = useState<number>(20);
  const [corridorZone, setCorridorZone] = useState('Thika Road / Roysambu / Lumumba Drive');
  const [assignedHub, setAssignedHub] = useState('Roysambu Depot Exit 8');
  const [nationalId, setNationalId] = useState('');
  const [drivingLicenseNo, setDrivingLicenseNo] = useState('');

  // Resend Activation State
  const [resendingDriverId, setResendingDriverId] = useState<string | null>(null);
  const [resendStatusMsg, setResendStatusMsg] = useState<{ driverId: string; text: string; isError?: boolean } | null>(null);

  const filteredDrivers = drivers.filter((driver) => {
    const query = (searchQuery || '').toLowerCase();
    const matchesSearch = 
      (driver.name?.toLowerCase() || '').includes(query) ||
      (driver.vehicle?.toLowerCase() || '').includes(query) ||
      (driver.licensePlate?.toLowerCase() || '').includes(query) ||
      Boolean(driver.phone && driver.phone.includes(searchQuery));

    const isDriverPending = driver.status === 'Pending' || driver.status === ('pending' as any) || driver.accountActivated === false;

    const matchesStatus = statusFilter === 'All' 
      ? true 
      : statusFilter === 'Pending' 
        ? isDriverPending
        : driver.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: DriverStatus | string, accountActivated?: boolean) => {
    if (status === 'Pending' || status === 'pending' || accountActivated === false) {
      return 'bg-amber-50 text-amber-800 border-amber-300';
    }
    switch (status) {
      case 'Available':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'On Route':
        return 'bg-orange-50 text-[#E04F11] border-orange-200';
      case 'Break':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Offline':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getDisplayStatus = (driver: Driver): string => {
    if (driver.accountActivated === false || driver.status === 'Pending' || driver.status === ('pending' as any)) {
      return 'Pending Activation';
    }
    return driver.status;
  };

  const getActiveOrder = (activeOrderId?: string) => {
    if (!activeOrderId) return null;
    return orders.find(o => o.id === activeOrderId);
  };

  const handleResetForm = () => {
    setName('');
    setEmail('');
    setPhone('+254 7');
    setVehicleType('Motorcycle (Boda Boda)');
    setLicensePlate('');
    setCapacity(20);
    setCorridorZone('Thika Road / Roysambu / Lumumba Drive');
    setAssignedHub('Roysambu Depot Exit 8');
    setNationalId('');
    setDrivingLicenseNo('');
    setFormError(null);
    setCreatedResult(null);
    setCopiedLink(false);
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Driver legal full name is required.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('A valid email address is required for driver activation.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 9) {
      setFormError('Valid driver phone number is required.');
      return;
    }
    if (!licensePlate.trim()) {
      setFormError('Vehicle registration license plate is required.');
      return;
    }

    try {
      setIsRegistering(true);
      const res = await api.registerDriver({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        vehicleType,
        licensePlate: licensePlate.trim().toUpperCase(),
        capacity: Number(capacity) || 20,
        corridorZone,
        assignedHub,
        nationalId: nationalId.trim(),
        drivingLicenseNo: drivingLicenseNo.trim().toUpperCase()
      });

      setCreatedResult(res);
      onRefresh?.();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create driver account.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleResendActivation = async (driverId: string) => {
    setResendingDriverId(driverId);
    setResendStatusMsg(null);
    try {
      const res = await api.resendDriverActivation(driverId);
      setResendStatusMsg({
        driverId,
        text: `Activation invitation sent to ${res.emailStatus.recipient}.`
      });
    } catch (err: any) {
      setResendStatusMsg({
        driverId,
        text: err.message || 'Failed to resend invitation email.',
        isError: true
      });
    } finally {
      setResendingDriverId(null);
    }
  };

  const handleCopyActivationUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Fleet Drivers Management</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                {drivers.length} registered
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Live cylinder load, telemetry timestamps, and field assignments across Nairobi
            </p>
          </div>

          {/* Search, Filters & Add Driver CTA */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search driver, vehicle, plate..."
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#E04F11] focus:bg-white transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
              {(['All', 'Available', 'On Route', 'Pending', 'Break', 'Offline'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white text-gray-900 shadow-xs font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Add Driver Button */}
            <button
              id="admin-add-driver-btn"
              type="button"
              onClick={() => {
                handleResetForm();
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#E04F11] hover:bg-[#c8430b] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Driver</span>
            </button>
          </div>
        </div>
      </div>

      {/* Driver Cards Grid or Empty State */}
      {filteredDrivers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center max-w-xl mx-auto shadow-xs my-6">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#E04F11] mx-auto mb-4">
            <Truck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">
            {drivers.length === 0 ? 'No Fleet Drivers Registered' : 'No drivers match the selected filter'}
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mb-5 leading-relaxed">
            {drivers.length === 0
              ? 'There are currently no courier drivers in the fleet roster. Click the button below to onboard and register drivers with vehicle assignments and automated activation links.'
              : 'Try clearing your search query or selecting a different status filter above.'}
          </p>
          {drivers.length === 0 && (
            <button
              type="button"
              onClick={() => {
                handleResetForm();
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E04F11] hover:bg-[#c8430b] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register First Fleet Driver</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDrivers.map((driver) => {
          const capacity = driver.capacity && driver.capacity > 0 ? driver.capacity : 20;
          const load = typeof driver.load === 'number' && !isNaN(driver.load) ? driver.load : 0;
          const loadPercentage = Math.min(100, Math.max(0, Math.round((load / capacity) * 100)));
          const activeOrder = getActiveOrder(driver.activeOrderId);
          const isPending = driver.status === 'Pending' || driver.status === ('pending' as any) || driver.accountActivated === false;

          return (
            <div
              key={driver.id}
              onClick={() => setSelectedDriver(driver)}
              className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all p-4 cursor-pointer flex flex-col justify-between group relative"
            >
              <div>
                {/* Top Row: Name, Vehicle, Status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {driver.initials || driver.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 leading-tight group-hover:text-[#E04F11] transition-colors">
                        {driver.name}
                      </h4>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{driver.phone}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                      driver.status,
                      driver.accountActivated
                    )}`}
                  >
                    {getDisplayStatus(driver)}
                  </span>
                </div>

                {/* Vehicle & Plate */}
                <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 mb-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-gray-400" />
                      Vehicle
                    </span>
                    <span className="font-semibold text-gray-800 truncate max-w-[160px]">{driver.vehicle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Plate Number</span>
                    <span className="font-mono font-bold text-gray-800">{driver.licensePlate}</span>
                  </div>
                </div>

                {/* Cylinder Load Gauge */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between text-xs font-semibold text-gray-700">
                    <span className="text-gray-500">Cylinder Capacity</span>
                    <span className="font-mono text-gray-900">
                      {load} / {capacity} cylinders ({loadPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        loadPercentage > 85 ? 'bg-red-500' : 'bg-[#E04F11]'
                      }`}
                      style={{ width: `${loadPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Current Assignment / Stop or Pending Notice */}
                {isPending ? (
                  <div className="p-2 bg-amber-50/70 rounded-lg border border-amber-200 text-xs text-amber-800 mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" /> Awaiting Activation
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResendActivation(driver.id);
                      }}
                      disabled={resendingDriverId === driver.id}
                      className="text-[11px] font-bold text-[#E04F11] hover:underline"
                    >
                      {resendingDriverId === driver.id ? 'Sending...' : 'Resend Link'}
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-gray-600 mb-3 flex items-start gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-gray-500">Stop: </span>
                      <strong className="text-gray-800 truncate block">
                        {driver.currentStop || 'Standby at Hub'}
                      </strong>
                      {activeOrder && (
                        <span className="text-[11px] text-[#E04F11] font-semibold block mt-0.5">
                          Active Order: #{activeOrder.id} ({activeOrder.deliveryAddress.city})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer: Rating, Location Update */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-600 flex items-center gap-0.5">
                    ★ {driver.rating}
                  </span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500">{driver.deliveredCountToday ?? 0} delivered</span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{driver.lastLocationUpdate || 'Active now'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Driver Details Drawer */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/30 backdrop-blur-2xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-base">
                  {selectedDriver.initials || selectedDriver.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-gray-900">{selectedDriver.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                        selectedDriver.status,
                        selectedDriver.accountActivated
                      )}`}
                    >
                      {getDisplayStatus(selectedDriver)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{selectedDriver.phone}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm">
              {/* If driver is pending activation */}
              {(selectedDriver.accountActivated === false || selectedDriver.status === 'Pending' || selectedDriver.status === ('pending' as any)) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Account Pending Activation
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    This driver account was registered by an administrator. The driver must click the activation link sent to their email to set a secure password before logging in.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleResendActivation(selectedDriver.id)}
                    disabled={resendingDriverId === selectedDriver.id}
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {resendingDriverId === selectedDriver.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Resending Invitation...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Resend Activation Email</span>
                      </>
                    )}
                  </button>
                  {resendStatusMsg && resendStatusMsg.driverId === selectedDriver.id && (
                    <div className={`p-2 rounded-lg text-xs ${resendStatusMsg.isError ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
                      {resendStatusMsg.text}
                    </div>
                  )}
                </div>
              )}

              {/* Telemetry & Performance */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 block text-[10px]">Rating</span>
                  <span className="font-bold text-amber-600 text-base">★ {selectedDriver.rating}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 block text-[10px]">Completed Today</span>
                  <span className="font-bold text-gray-900 text-base">{selectedDriver.deliveredCountToday ?? 0}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 block text-[10px]">Utilization</span>
                  <span className="font-bold text-gray-900 text-base">{selectedDriver.utilizationPercentage || 74}%</span>
                </div>
              </div>

              {/* Vehicle & Equipment */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Assigned Vehicle & Hardware
                </h4>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vehicle Description</span>
                    <span className="font-semibold text-gray-800">{selectedDriver.vehicle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Registration Plate</span>
                    <span className="font-mono font-bold text-gray-800">{selectedDriver.licensePlate}</span>
                  </div>
                  {selectedDriver.assignedHub && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Assigned Depot</span>
                      <span className="font-semibold text-gray-800">{selectedDriver.assignedHub}</span>
                    </div>
                  )}
                  {selectedDriver.corridorZone && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Corridor Zone</span>
                      <span className="font-semibold text-gray-800">{selectedDriver.corridorZone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Safety Compliance</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> EPRA Certified
                    </span>
                  </div>
                </div>
              </div>

              {/* Cylinder Load Capacity */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Cylinder Payload
                </h4>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-600">Current Cylinder Load</span>
                    <span className="font-mono text-gray-900">
                      {(selectedDriver.load ?? 0)} / {(selectedDriver.capacity ?? 20)} cylinders
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E04F11] rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.round(((selectedDriver.load ?? 0) / (selectedDriver.capacity ?? 20)) * 100))}%`
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Remaining capacity: {(selectedDriver.capacity ?? 20) - (selectedDriver.load ?? 0)} slots available for dispatch.
                  </p>
                </div>
              </div>

              {/* Live Location & Stop */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Location & Current Route
                </h4>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#E04F11] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-gray-900">
                        {selectedDriver.location?.addressText || selectedDriver.currentStop || 'Westlands Depot'}
                      </p>
                      <span className="text-[11px] text-gray-400">
                        Updated {selectedDriver.lastLocationUpdate || '1 min ago'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Order Details if assigned */}
              {selectedDriver.activeOrderId && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Active Order in Transit
                  </h4>
                  {(() => {
                    const ord = getActiveOrder(selectedDriver.activeOrderId);
                    if (!ord) return <p className="text-xs text-gray-400">Order #{selectedDriver.activeOrderId} assigned</p>;
                    return (
                      <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200 text-xs space-y-1.5">
                        <div className="flex justify-between font-bold text-gray-900">
                          <span>Order #{ord.id}</span>
                          <span className="text-[#E04F11]">{ord.status}</span>
                        </div>
                        <p className="text-gray-700">Customer: <strong>{ord.customerName}</strong> ({ord.customerPhone})</p>
                        <p className="text-gray-600">Address: {ord.deliveryAddress.street}, {ord.deliveryAddress.city}</p>
                        <p className="text-gray-600">Items: {ord.cylinderSummary}</p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Drawer Actions */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center gap-3">
              <a
                href={`tel:${selectedDriver.phone}`}
                className="flex-1 py-2.5 bg-[#E04F11] hover:bg-[#C9420A] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>Call Driver</span>
              </a>

              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
                className="px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-lg text-xs border border-gray-300 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD DRIVER MODAL (Admin Only) */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-gray-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-orange-100 text-[#E04F11] rounded-xl flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 leading-tight">Register Fleet Driver</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Admin-controlled driver onboarding & credential activation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {createdResult ? (
                /* Success State */
                <div className="space-y-5">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm text-emerald-900">Driver Account Created Successfully</h4>
                      <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                        The account for <strong>{createdResult.driver.name}</strong> was set to role <code>driver</code> with status <code>pending</code>.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">Registered Email:</span>
                      <span className="font-bold text-slate-800 font-mono">{createdResult.driver.email}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">Email Dispatch:</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Sent via {createdResult.emailStatus.provider}
                      </span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-slate-600 font-semibold">Secure Activation Link</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={createdResult.activationUrl}
                          className="flex-1 p-2 bg-white border border-slate-300 rounded-lg text-[11px] font-mono text-slate-700 select-all"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyActivationUrl(createdResult.activationUrl)}
                          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        The driver can use this link to set their password. The link will expire after 48 hours or upon activation.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleResetForm();
                        setShowAddModal(false);
                      }}
                      className="px-5 py-2.5 bg-[#E04F11] hover:bg-[#c8430b] text-white font-bold rounded-xl text-xs transition-colors"
                    >
                      Done & Close
                    </button>
                  </div>
                </div>
              ) : (
                /* Add Driver Form */
                <form onSubmit={handleCreateDriver} className="space-y-4">
                  {/* Security Notice Banner */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Security Policy Enforced:</span> Account role is locked server-side to <code>driver</code>. Initial status will be <code>pending</code>. No permanent password is set by admin—the driver will receive a single-use email invitation to configure their password.
                    </div>
                  </div>

                  {formError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Driver Identification */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Full Legal Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="add-driver-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Samuel Otieno"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#E04F11] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Driver Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="add-driver-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. samuel.otieno@gasdeliver.co.ke"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#E04F11] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Phone Number (Kenyan) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="add-driver-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+254 722 000 111"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#E04F11] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Assigned Operating Hub
                      </label>
                      <select
                        value={assignedHub}
                        onChange={(e) => setAssignedHub(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#E04F11] focus:bg-white cursor-pointer"
                      >
                        <option value="Roysambu Depot Exit 8">Roysambu Depot Exit 8</option>
                        <option value="Kahawa West Hub">Kahawa West Hub</option>
                        <option value="Westlands Distribution Depot">Westlands Distribution Depot</option>
                        <option value="Kasarani Sports Hub">Kasarani Sports Hub</option>
                        <option value="Kilimani / Lavington Station">Kilimani / Lavington Station</option>
                        <option value="Mombasa Road Industrial Station">Mombasa Road Industrial Station</option>
                      </select>
                    </div>
                  </div>

                  {/* Vehicle Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Vehicle Type
                      </label>
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#E04F11] focus:bg-white cursor-pointer"
                      >
                        <option value="Motorcycle (Boda Boda)">Motorcycle (Boda Boda)</option>
                        <option value="Tuk-Tuk Gas Carrier">Tuk-Tuk Gas Carrier</option>
                        <option value="Pickup Van">Pickup Van</option>
                        <option value="Light Delivery Truck">Light Delivery Truck</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Plate Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="add-driver-plate"
                        type="text"
                        required
                        value={licensePlate}
                        onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                        placeholder="e.g. KDK 789M"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#E04F11] focus:bg-white uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Cylinder Capacity
                      </label>
                      <input
                        id="add-driver-capacity"
                        type="number"
                        min={1}
                        max={100}
                        value={capacity}
                        onChange={(e) => setCapacity(Number(e.target.value))}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#E04F11] focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Official Credentials (Optional) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        National ID / Alien ID
                      </label>
                      <input
                        id="add-driver-national-id"
                        type="text"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        placeholder="e.g. 33490122"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#E04F11] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Driving License Number
                      </label>
                      <input
                        id="add-driver-dl-no"
                        type="text"
                        value={drivingLicenseNo}
                        onChange={(e) => setDrivingLicenseNo(e.target.value.toUpperCase())}
                        placeholder="e.g. DL-44910-KE"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#E04F11] focus:bg-white uppercase"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl text-xs border border-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      id="submit-create-driver-btn"
                      type="submit"
                      disabled={isRegistering}
                      className="px-5 py-2.5 bg-[#E04F11] hover:bg-[#c8430b] disabled:bg-gray-400 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      {isRegistering ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating Account & Dispatching Email...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Register Driver & Send Invite</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
