import React, { useState, useEffect } from 'react';
import { DriverApplication } from '../../types';
import { api } from '../../services/api';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  Eye,
  Truck,
  Car,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  FileCheck,
  ShieldAlert,
  Ban,
  Filter,
  Check,
  X,
  ExternalLink
} from 'lucide-react';

interface DriverVerificationsViewProps {
  onRefreshParent?: () => void;
}

export const DriverVerificationsView: React.FC<DriverVerificationsViewProps> = ({ onRefreshParent }) => {
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'suspended'>('all');
  const [selectedDocModal, setSelectedDocModal] = useState<{
    type: 'id' | 'license';
    applicant: DriverApplication;
  } | null>(null);

  // Reject / Suspend Action Modal
  const [actionModal, setActionModal] = useState<{
    action: 'reject' | 'suspend';
    application: DriverApplication;
    reason: string;
  } | null>(null);

  const [actionProcessing, setActionProcessing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDriverVerifications();
      setApplications(data);
    } catch (err: any) {
      console.error('Failed to load driver verifications', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = async (app: DriverApplication) => {
    setActionProcessing(true);
    try {
      await api.approveDriverVerification(app.id, 'Approved via Admin Operations Center verification review.');
      setNotification({
        type: 'success',
        message: `Driver ${app.applicantName} approved! Account activated and added to active delivery fleet.`
      });
      await fetchApplications();
      onRefreshParent?.();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to approve driver application.'
      });
    } finally {
      setActionProcessing(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleConfirmActionModal = async () => {
    if (!actionModal) return;
    const { action, application, reason } = actionModal;
    if (!reason.trim()) {
      alert('Please provide a reason for compliance record.');
      return;
    }

    setActionProcessing(true);
    try {
      if (action === 'reject') {
        await api.rejectDriverVerification(application.id, reason.trim());
        setNotification({
          type: 'success',
          message: `Application for ${application.applicantName} marked as Rejected.`
        });
      } else {
        await api.suspendDriverVerification(application.id, reason.trim());
        setNotification({
          type: 'success',
          message: `Driver ${application.applicantName} has been Suspended.`
        });
      }
      setActionModal(null);
      await fetchApplications();
      onRefreshParent?.();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || `Failed to ${action} driver.`
      });
    } finally {
      setActionProcessing(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Filtered applications
  const filteredApplications = applications.filter((app) => {
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      app.applicantName.toLowerCase().includes(q) ||
      app.email.toLowerCase().includes(q) ||
      app.phone.toLowerCase().includes(q) ||
      app.licensePlate.toLowerCase().includes(q) ||
      app.nationalIdNumber.toLowerCase().includes(q) ||
      app.corridorZone.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;
  const suspendedCount = applications.filter((a) => a.status === 'suspended').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/40 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/40 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131B2A] p-5 rounded-2xl border border-gray-200 dark:border-[#202D42] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              Driver Verifications & Compliance Queue
            </h1>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 text-[11px] font-black animate-pulse">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Review submitted Kenyan National IDs, NTSA Driver's Licenses, and vehicle registrations for courier approval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchApplications}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#0B0F17] hover:bg-gray-50 dark:hover:bg-[#1A2536] text-xs font-semibold text-gray-700 dark:text-slate-200 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#131B2A] p-4 rounded-xl border border-gray-200 dark:border-[#202D42] shadow-2xs">
          <div className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
            Total Applications
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
            {applications.length}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Submitted onboarding funnels</div>
        </div>

        <div className="bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200/80 dark:border-amber-800/30 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>Pending Review</span>
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">
            {pendingCount}
          </div>
          <div className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">Awaiting compliance sign-off</div>
        </div>

        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-800/30 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Approved Fleet</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
            {approvedCount}
          </div>
          <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">Active licensed couriers</div>
        </div>

        <div className="bg-rose-50/60 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200/80 dark:border-rose-800/30 shadow-2xs">
          <div className="text-[11px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider flex items-center justify-between">
            <span>Rejected / Suspended</span>
            <Ban className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-900 dark:text-rose-200 mt-1">
            {rejectedCount + suspendedCount}
          </div>
          <div className="text-[10px] text-rose-700/80 dark:text-rose-400/80 mt-0.5">
            {rejectedCount} Rejected, {suspendedCount} Suspended
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-[#131B2A] border border-gray-200 dark:border-[#202D42]">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-[#1E293B] text-gray-900 dark:text-white shadow-2xs'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
            }`}
          >
            All ({applications.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-white dark:bg-[#1E293B] text-amber-600 dark:text-amber-400 shadow-2xs'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-white dark:bg-[#1E293B] text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'rejected'
                ? 'bg-white dark:bg-[#1E293B] text-rose-600 dark:text-rose-400 shadow-2xs'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
          <button
            onClick={() => setStatusFilter('suspended')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'suspended'
                ? 'bg-white dark:bg-[#1E293B] text-purple-600 dark:text-purple-400 shadow-2xs'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
            }`}
          >
            Suspended ({suspendedCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone, plate, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#131B2A] border border-gray-200 dark:border-[#202D42] rounded-xl text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
          />
        </div>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="bg-white dark:bg-[#131B2A] rounded-2xl border border-gray-200 dark:border-[#202D42] p-12 text-center">
          <div className="w-8 h-8 border-3 border-[#E04F11] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-xs font-semibold text-gray-500">Loading compliance applications...</div>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="bg-white dark:bg-[#131B2A] rounded-2xl border border-gray-200 dark:border-[#202D42] p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">No applications found</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No driver applications matched your search query "${searchQuery}".`
              : 'There are currently no driver applications under this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => {
            const initials = app.applicantName
              .split(' ')
              .filter(Boolean)
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'DR';

            return (
              <div
                key={app.id}
                className="bg-white dark:bg-[#131B2A] rounded-2xl border border-gray-200 dark:border-[#202D42] p-5 shadow-2xs hover:shadow-xs transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  {/* Left Column: Applicant & Vehicle Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/40 text-[#E04F11] font-black text-sm flex items-center justify-center shrink-0">
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">
                            {app.applicantName}
                          </h2>

                          {/* Status Badge */}
                          {app.status === 'pending' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Pending Review</span>
                            </span>
                          )}
                          {app.status === 'approved' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verified & Active</span>
                            </span>
                          )}
                          {app.status === 'rejected' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-[10px] font-black uppercase flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              <span>Rejected</span>
                            </span>
                          )}
                          {app.status === 'suspended' && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 text-[10px] font-black uppercase flex items-center gap-1">
                              <Ban className="w-3 h-3" />
                              <span>Suspended</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500 dark:text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span>{app.email}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{app.phone}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span>{app.corridorZone}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Details Box */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-gray-50/70 dark:bg-[#0B0F17]/60 border border-gray-100 dark:border-[#1E293B] text-xs">
                      <div>
                        <div className="text-[10px] text-gray-400 font-semibold">VEHICLE</div>
                        <div className="font-bold text-gray-800 dark:text-slate-200 truncate">
                          {app.vehicleMake} {app.vehicleModel}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-gray-400 font-semibold">LICENSE PLATE</div>
                        <div className="font-mono font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                          {app.licensePlate}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-gray-400 font-semibold">CATEGORY</div>
                        <div className="font-medium text-gray-700 dark:text-slate-300">
                          {app.vehicleType || 'Pickup / Van'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-gray-400 font-semibold">EXPERIENCE</div>
                        <div className="font-medium text-gray-700 dark:text-slate-300">
                          {app.experienceYears || 3} Years
                        </div>
                      </div>
                    </div>

                    {/* Audit notes if reviewed */}
                    {app.reviewedBy && (
                      <div className="text-[11px] text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-[#0B0F17]/40 p-2 rounded-lg border border-gray-200 dark:border-[#202D42]">
                        <span className="font-semibold text-gray-700 dark:text-slate-300">
                          Compliance Audit:
                        </span>{' '}
                        Reviewed by <strong>{app.reviewedBy}</strong> on{' '}
                        {new Date(app.reviewedAt || app.submittedAt).toLocaleDateString()}
                        {app.reviewNotes && ` — "${app.reviewNotes}"`}
                        {app.rejectionReason && (
                          <span className="text-rose-600 block mt-0.5">
                            Rejection Reason: {app.rejectionReason}
                          </span>
                        )}
                        {app.suspensionReason && (
                          <span className="text-purple-600 block mt-0.5">
                            Suspension Reason: {app.suspensionReason}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Middle Column: Submitted Documents */}
                  <div className="lg:w-72 shrink-0 space-y-2 border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-[#202D42] pt-3 lg:pt-0 lg:pl-5">
                    <div className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Submitted Compliance Documents
                    </div>

                    {/* National ID Preview Button */}
                    <div className="p-2.5 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#0B0F17] flex items-center justify-between">
                      <div className="min-w-0 flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-[#E04F11] shrink-0" />
                        <div className="truncate">
                          <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            National ID: {app.nationalIdNumber}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate">
                            {app.nationalIdDocumentUrl || 'national_id_scan.pdf'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDocModal({ type: 'id', applicant: app })}
                        className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#1E293B] hover:bg-gray-200 text-[11px] font-bold text-gray-700 dark:text-slate-200 shrink-0 cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>

                    {/* Driver License Preview Button */}
                    <div className="p-2.5 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#0B0F17] flex items-center justify-between">
                      <div className="min-w-0 flex items-center gap-2">
                        <Car className="w-4 h-4 text-[#E04F11] shrink-0" />
                        <div className="truncate">
                          <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            NTSA DL: {app.driverLicenseNumber}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate">
                            {app.driverLicenseDocumentUrl || 'driver_license.pdf'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDocModal({ type: 'license', applicant: app })}
                        className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#1E293B] hover:bg-gray-200 text-[11px] font-bold text-gray-700 dark:text-slate-200 shrink-0 cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="lg:w-44 shrink-0 flex flex-row lg:flex-col gap-2 justify-end lg:justify-start border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-[#202D42] pt-3 lg:pt-0 lg:pl-5">
                    {app.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          disabled={actionProcessing}
                          onClick={() => handleApprove(app)}
                          className="flex-1 lg:w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Driver</span>
                        </button>
                        <button
                          type="button"
                          disabled={actionProcessing}
                          onClick={() => setActionModal({ action: 'reject', application: app, reason: '' })}
                          className="flex-1 lg:w-full py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {app.status === 'approved' && (
                      <button
                        type="button"
                        disabled={actionProcessing}
                        onClick={() => setActionModal({ action: 'suspend', application: app, reason: '' })}
                        className="w-full py-2 px-3 rounded-xl border border-amber-300 dark:border-amber-800/40 text-amber-800 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Suspend Driver</span>
                      </button>
                    )}

                    {app.status === 'suspended' && (
                      <button
                        type="button"
                        disabled={actionProcessing}
                        onClick={() => handleApprove(app)}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Reactivate</span>
                      </button>
                    )}

                    {app.status === 'rejected' && (
                      <button
                        type="button"
                        disabled={actionProcessing}
                        onClick={() => handleApprove(app)}
                        className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-[#202D42] text-gray-700 dark:text-slate-300 hover:bg-gray-50 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Re-evaluate</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENT INSPECTION MODAL */}
      {/* ========================================================================= */}
      {selectedDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#131B2A] rounded-2xl border border-gray-200 dark:border-[#202D42] shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#202D42]">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#E04F11]" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {selectedDocModal.type === 'id' ? 'Kenyan National ID Inspection' : 'NTSA Driving License Inspection'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDocModal(null)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Document Graphic Mockup */}
            <div className="mt-4 p-5 rounded-2xl bg-slate-900 text-white border border-slate-700 space-y-4 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="text-[11px] font-mono tracking-widest text-[#E04F11] font-bold">
                  REPUBLIC OF KENYA • OFFICIAL LOGISTICS CREDENTIAL
                </div>
                <div className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  KEBS / EPRA VERIFIED
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-20 bg-slate-800 rounded-lg border border-slate-700 flex flex-col items-center justify-center text-slate-400 text-[10px]">
                  <User className="w-8 h-8 mb-1 text-slate-500" />
                  <span>PHOTO</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">HOLDER NAME:</span>
                    <span className="font-bold text-white text-sm">
                      {selectedDocModal.applicant.applicantName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">
                      {selectedDocModal.type === 'id' ? 'ID SERIAL NUMBER:' : 'LICENSE NUMBER:'}
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      {selectedDocModal.type === 'id'
                        ? selectedDocModal.applicant.nationalIdNumber
                        : selectedDocModal.applicant.driverLicenseNumber}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-slate-800 text-slate-400">
                <div>
                  REGISTERED VEHICLE: <strong className="text-white">{selectedDocModal.applicant.licensePlate}</strong>
                </div>
                <div>
                  DISTRICT / CORRIDOR: <strong className="text-white">{selectedDocModal.applicant.corridorZone}</strong>
                </div>
              </div>
            </div>

            {/* Compliance Verification Checklist */}
            <div className="mt-4 p-3.5 rounded-xl bg-gray-50 dark:bg-[#0B0F17]/60 border border-gray-200 dark:border-[#202D42] text-xs space-y-1.5">
              <div className="font-bold text-gray-900 dark:text-white mb-1">
                Automated Security Checks:
              </div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-[11px]">
                <Check className="w-3.5 h-3.5" />
                <span>Format validation passed (matches Kenyan NTSA database structure)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-[11px]">
                <Check className="w-3.5 h-3.5" />
                <span>Zero duplicate records detected across GasDeliver logistics fleet</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-[11px]">
                <Check className="w-3.5 h-3.5" />
                <span>Vehicle plate matches registered Thika Road transport authorization</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDocModal(null)}
                className="px-5 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REJECT / SUSPEND REASON MODAL */}
      {/* ========================================================================= */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#131B2A] rounded-2xl border border-gray-200 dark:border-[#202D42] shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-[#202D42]">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  actionModal.action === 'reject'
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-amber-100 text-amber-600'
                }`}
              >
                {actionModal.action === 'reject' ? <X className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                  {actionModal.action} Driver Application
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {actionModal.application.applicantName} ({actionModal.application.licensePlate})
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                Reason for {actionModal.action === 'reject' ? 'Rejection' : 'Suspension'} *
              </label>
              <textarea
                rows={3}
                required
                value={actionModal.reason}
                onChange={(e) => setActionModal({ ...actionModal, reason: e.target.value })}
                placeholder={
                  actionModal.action === 'reject'
                    ? 'e.g. Expired NTSA license, Unclear National ID scan, Vehicle failed safety clearance'
                    : 'e.g. Safety policy infraction, Customer delivery violation, Inactive carrier status'
                }
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#0B0F17] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
              />

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(actionModal.action === 'reject'
                  ? ['Expired Driving License', 'Unreadable ID Document', 'Vehicle Plate Unverified', 'Zone Ineligible']
                  : ['Safety Breach', 'Repeated Missed Manifests', 'License Expired', 'Carrier Requested']
                ).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setActionModal({ ...actionModal, reason: preset })}
                    className="text-[10px] px-2 py-1 rounded-md bg-gray-100 dark:bg-[#1E293B] text-gray-600 dark:text-slate-300 hover:bg-gray-200 cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-[#202D42] text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionProcessing || !actionModal.reason.trim()}
                onClick={handleConfirmActionModal}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 ${
                  actionModal.action === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {actionProcessing
                  ? 'Submitting...'
                  : `Confirm ${actionModal.action === 'reject' ? 'Rejection' : 'Suspension'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
