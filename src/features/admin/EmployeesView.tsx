import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  UserCheck,
  Search, 
  SlidersHorizontal,
  Truck, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MoreVertical, 
  Edit2, 
  Eye,
  UserX, 
  Key, 
  Upload, 
  Download,
  RefreshCw,
  Phone,
  Mail,
  Car,
  Star,
  Calendar,
  AlertCircle,
  BadgeCheck,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  RotateCcw,
  Trash2,
  Info,
  BarChart2,
  FileText
} from 'lucide-react';
import { Employee, EmployeeRole, EmployeeStatus, DriverAvailability, WorkforceMetrics, ActivityItem } from '../../types';
import { api } from '../../services/api';

interface EmployeesViewProps {
  onRefresh?: () => void;
  subFilter?: 'all' | 'drivers' | 'workers' | 'archived';
  onSubFilterChange?: (filter: 'all' | 'drivers' | 'workers' | 'archived') => void;
  onNavigateToSettings?: () => void;
  globalSearchQuery?: string;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({ 
  onRefresh, 
  subFilter = 'all', 
  onSubFilterChange,
  onNavigateToSettings,
  globalSearchQuery = ''
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [metrics, setMetrics] = useState<WorkforceMetrics | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Filter state
  const [localSearch, setLocalSearch] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedAvailability, setSelectedAvailability] = useState('All');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'drivers' | 'workers' | 'archived'>(subFilter);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Active employee for action dropdown & modals
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);
  const [isAssignVehicleModalOpen, setIsAssignVehicleModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [removalCategory, setRemovalCategory] = useState<'Resigned' | 'Fired' | 'Contract Ended' | 'Relocated' | 'Other'>('Resigned');
  const [removalNotes, setRemovalNotes] = useState('');
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [isActivityLogsModalOpen, setIsActivityLogsModalOpen] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    email: '',
    phone: '+254 7',
    role: 'Driver',
    status: 'Active',
    availability: 'Available',
    vehicleModel: 'Toyota Hiace',
    licensePlate: 'KDB 123A',
    nationalId: '',
    driverLicense: '',
    address: 'Nairobi, Kenya',
    notes: ''
  });

  const [assignDriverId, setAssignDriverId] = useState('');
  const [vehicleModelInput, setVehicleModelInput] = useState('');
  const [licensePlateInput, setLicensePlateInput] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [terminateReason, setTerminateReason] = useState('');
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync prop subFilter changes
  useEffect(() => {
    setActiveTabFilter(subFilter);
  }, [subFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [empList, mData, actList] = await Promise.all([
        api.getEmployees({
          role: selectedRole,
          status: selectedStatus,
          availability: selectedAvailability,
          includeArchived: true
        }),
        api.getWorkforceMetrics(),
        api.getActivity().catch(() => [])
      ]);
      setEmployees(empList);
      setMetrics(mData);
      setActivities(actList);
    } catch (err: any) {
      console.error('Failed to load employee directory', err);
      showNotification('error', err.message || 'Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedRole, selectedStatus, selectedAvailability]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleTabChange = (filter: 'all' | 'drivers' | 'workers' | 'archived') => {
    setActiveTabFilter(filter);
    setCurrentPage(1);
    if (onSubFilterChange) {
      onSubFilterChange(filter);
    }
  };

  // Filtered employees calculation
  const filteredEmployees = useMemo(() => {
    const query = (localSearch || globalSearchQuery).trim().toLowerCase();
    return employees.filter(emp => {
      // Sub-tab filter
      if (activeTabFilter === 'archived') {
        if (!emp.isArchived && emp.status !== 'Archived' && !emp.isDeleted) return false;
      } else {
        // Exclude soft-deleted / archived staff from active roster
        if (emp.isArchived || emp.status === 'Archived' || emp.isDeleted) return false;
        if (activeTabFilter === 'drivers' && emp.role !== 'Driver') return false;
        if (activeTabFilter === 'workers' && emp.role === 'Driver') return false;
      }

      // Text search
      if (query) {
        const matchName = emp.name.toLowerCase().includes(query);
        const matchId = emp.id.toLowerCase().includes(query);
        const matchPhone = emp.phone.toLowerCase().includes(query);
        const matchRole = emp.role.toLowerCase().includes(query);
        const matchPlate = emp.licensePlate?.toLowerCase().includes(query) || false;
        const matchEmail = emp.email.toLowerCase().includes(query);
        if (!matchName && !matchId && !matchPhone && !matchRole && !matchPlate && !matchEmail) {
          return false;
        }
      }

      return true;
    });
  }, [employees, activeTabFilter, localSearch, globalSearchQuery]);

  // Paginated records
  const totalEntries = filteredEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const currentRecords = filteredEmployees.slice(startIndex, startIndex + pageSize);

  // Real-time Workforce Counts derived directly from live database state
  const liveWorkforce = useMemo(() => {
    const activeStaff = employees.filter(e => !e.isDeleted && !e.isArchived && e.status !== 'Archived');
    const drivers = activeStaff.filter(e => e.role === 'Driver');
    const activeDrivers = drivers.filter(d => d.status === 'Active');
    const availableDrivers = drivers.filter(d => d.status === 'Active' && (d.availability === 'Available' || !d.currentAssignment));
    const driversOnDelivery = drivers.filter(d => d.status === 'Active' && d.availability === 'On Delivery');
    const dispatchers = activeStaff.filter(e => e.role === 'Dispatcher' || e.role === 'Depot Supervisor' || e.workerType === 'dispatcher' || e.workerType === 'warehouse');

    return {
      total: activeStaff.length,
      driverCount: drivers.length,
      activeDriversCount: activeDrivers.length,
      availableDriversCount: availableDrivers.length,
      onDeliveryCount: driversOnDelivery.length,
      dispatcherCount: dispatchers.length,
      avgEta: metrics?.averageEtaMinutes ?? 15,
      totalAssignments: driversOnDelivery.length
    };
  }, [employees, metrics]);

  // Modal open helpers
  const handleOpenRegister = (prefillRole: 'Driver' | 'Worker' | 'Dispatcher' = 'Driver') => {
    setFormData({
      name: '',
      email: '',
      phone: '+254 7',
      role: prefillRole,
      status: 'Active',
      availability: 'Available',
      vehicleModel: prefillRole === 'Driver' ? 'Toyota Hiace' : '',
      licensePlate: prefillRole === 'Driver' ? 'KDB ' : '',
      nationalId: '',
      driverLicense: prefillRole === 'Driver' ? 'DL-KEN-2024-' : '',
      address: 'Nairobi, Kenya',
      notes: ''
    });
    setIsRegisterModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setActiveEmployee(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      role: emp.role,
      status: emp.status,
      availability: emp.availability,
      vehicleModel: emp.vehicleModel || '',
      licensePlate: emp.licensePlate || '',
      nationalId: emp.nationalId || '',
      driverLicense: emp.driverLicense || '',
      address: emp.address || '',
      notes: emp.notes || ''
    });
    setOpenDropdownId(null);
    setIsEditModalOpen(true);
  };

  const handleOpenViewDetails = (emp: Employee) => {
    setActiveEmployee(emp);
    setOpenDropdownId(null);
    setIsViewDetailsModalOpen(true);
  };

  const handleOpenAssignVehicle = (emp?: Employee) => {
    if (emp) {
      setActiveEmployee(emp);
      setAssignDriverId(emp.id);
      setVehicleModelInput(emp.vehicleModel || 'Toyota Hiace');
      setLicensePlateInput(emp.licensePlate || 'KDB 123A');
    } else {
      const firstDriver = employees.find(e => e.role === 'Driver') || employees[0];
      if (firstDriver) {
        setActiveEmployee(firstDriver);
        setAssignDriverId(firstDriver.id);
        setVehicleModelInput(firstDriver.vehicleModel || 'Toyota Hiace');
        setLicensePlateInput(firstDriver.licensePlate || 'KDB 123A');
      }
    }
    setOpenDropdownId(null);
    setIsAssignVehicleModalOpen(true);
  };

  const handleOpenSuspend = (emp: Employee) => {
    setActiveEmployee(emp);
    setSuspendReason(emp.suspensionReason || '');
    setOpenDropdownId(null);
    setIsSuspendModalOpen(true);
  };

  const handleOpenTerminate = (emp: Employee) => {
    setActiveEmployee(emp);
    setTerminateReason('');
    setOpenDropdownId(null);
    setIsTerminateModalOpen(true);
  };

  // Submit handlers
  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Partial<Employee> = {
        ...formData,
        vehicle: formData.licensePlate && formData.vehicleModel 
          ? `${formData.licensePlate} (${formData.vehicleModel})`
          : formData.vehicleModel || 'N/A'
      };
      await api.createEmployee(payload);
      setIsRegisterModalOpen(false);
      showNotification('success', `Employee ${formData.name} successfully registered.`);
      loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to create employee');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmployee) return;
    try {
      const payload: Partial<Employee> = {
        ...formData,
        vehicle: formData.licensePlate && formData.vehicleModel 
          ? `${formData.licensePlate} (${formData.vehicleModel})`
          : formData.vehicleModel || 'N/A'
      };
      await api.updateEmployee(activeEmployee.id, payload);
      setIsEditModalOpen(false);
      showNotification('success', `Updated ${activeEmployee.name} records.`);
      loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update employee');
    }
  };

  const handleConfirmAssignVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetDriver = employees.find(e => e.id === assignDriverId) || activeEmployee;
    if (!targetDriver) return;
    try {
      await api.assignVehicle(targetDriver.id, vehicleModelInput, licensePlateInput);
      setIsAssignVehicleModalOpen(false);
      showNotification('success', `Vehicle ${licensePlateInput} assigned to ${targetDriver.name}.`);
      loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to assign vehicle');
    }
  };

  const handleConfirmSuspend = async () => {
    if (!activeEmployee) return;
    try {
      await api.updateEmployeeStatus(activeEmployee.id, 'Suspended', suspendReason || 'Operational administrative review');
      setIsSuspendModalOpen(false);
      showNotification('success', `${activeEmployee.name} has been suspended.`);
      loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to suspend employee');
    }
  };

  const handleConfirmTerminate = async () => {
    if (!activeEmployee) return;
    try {
      await api.terminateEmployee(activeEmployee.id, terminateReason || 'Employment agreement terminated');
      setIsTerminateModalOpen(false);
      showNotification('success', `${activeEmployee.name} terminated and access revoked.`);
      loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to terminate employee');
    }
  };

  const handleQuickStatus = async (emp: Employee, status: EmployeeStatus) => {
    setOpenDropdownId(null);
    if (status === 'Suspended') {
      handleOpenSuspend(emp);
      return;
    }
    if (status === 'Terminated') {
      handleOpenTerminate(emp);
      return;
    }
    try {
      await api.updateEmployeeStatus(emp.id, status);
      showNotification('success', `Status updated to ${status} for ${emp.name}.`);
      loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to change status');
    }
  };

  const handleOpenRemove = (emp: Employee) => {
    setActiveEmployee(emp);
    setRemovalCategory(emp.status === 'Terminated' ? 'Fired' : 'Resigned');
    setRemovalNotes('');
    setOpenDropdownId(null);
    setIsRemoveModalOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!activeEmployee) return;
    try {
      const fullReason = `${removalCategory}${removalNotes ? `: ${removalNotes.trim()}` : ''}`;
      const res = await api.deleteEmployee(activeEmployee.id, fullReason);
      setIsRemoveModalOpen(false);
      showNotification('success', `${activeEmployee.name} soft-deleted and moved to archive (${removalCategory}). Historical records preserved.`);
      loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to remove staff member');
    }
  };

  const handleRestoreEmployee = async (emp: Employee) => {
    setOpenDropdownId(null);
    try {
      await api.restoreEmployee(emp.id);
      showNotification('success', `${emp.name} restored to active workforce roster.`);
      loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to restore employee');
    }
  };

  const handleDeleteEmployee = (emp: Employee) => {
    handleOpenRemove(emp);
  };

  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const lines = bulkCsvText.trim().split('\n');
      const newEmployees: Partial<Employee>[] = [];
      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 3 && parts[0] && !parts[0].toLowerCase().includes('name')) {
          newEmployees.push({
            name: parts[0],
            role: (parts[1] as any) || 'Driver',
            phone: parts[2] || '+254 700 000 000',
            email: parts[3] || `${parts[0].toLowerCase().replace(/\s+/g, '.')}@gasdeliver.co.ke`,
            vehicleModel: parts[4] || 'Toyota Hiace',
            licensePlate: parts[5] || 'KDB 000X',
            status: 'Active',
            availability: 'Available'
          });
        }
      }
      if (newEmployees.length === 0) {
        showNotification('error', 'No valid employee rows detected. Please check CSV format.');
        return;
      }
      const res = await api.bulkImportEmployees(newEmployees);
      setIsBulkImportModalOpen(false);
      setBulkCsvText('');
      showNotification('success', `Successfully imported ${res.imported} employee records.`);
      loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to import employees');
    }
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Name', 'Role', 'Phone', 'Email', 'Status', 'Availability', 'Vehicle', 'Plate', 'Joined'];
    const rows = filteredEmployees.map(e => [
      e.id,
      `"${e.name}"`,
      e.role,
      e.phone,
      e.email,
      e.status,
      e.availability || 'Available',
      `"${e.vehicleModel || 'N/A'}"`,
      e.licensePlate || 'N/A',
      e.joinedDate || '2025-01-01'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gasdeliver-staff-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('success', 'Staff roster exported as CSV.');
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.length === currentRecords.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(currentRecords.map(e => e.id));
    }
  };

  const toggleSelectEmployee = (id: string) => {
    setSelectedEmployees(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const resetFilters = () => {
    setSelectedRole('All');
    setSelectedStatus('All');
    setSelectedAvailability('All');
    setLocalSearch('');
  };

  // Status badge helper
  const renderStatusBadge = (status: EmployeeStatus) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Active
          </span>
        );
      case 'On Leave':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            On Leave
          </span>
        );
      case 'Suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Suspended
          </span>
        );
      case 'Terminated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Terminated
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  // Role badge helper
  const renderRoleBadge = (role: string) => {
    switch (role) {
      case 'Driver':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
            Driver
          </span>
        );
      case 'Dispatcher':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/70">
            Dispatcher
          </span>
        );
      case 'Worker':
      case 'Delivery Worker':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
            Worker
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {statusMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 ${
          statusMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP HEADER: TITLE + IMPORT + ADD EMPLOYEE */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">
            Employees & Drivers
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Manage your team, drivers and staff members
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBulkImportModalOpen(true)}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import</span>
          </button>

          <button
            onClick={() => handleOpenRegister('Driver')}
            className="px-4 py-2 bg-[#E04F11] hover:bg-[#c2410c] text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 WORKFORCE KPI METRIC CARDS (REALISTIC & SYNCHRONIZED) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Total Employees */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700">Total</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ● Active
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
            {liveWorkforce.total}
          </div>
          <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500 font-medium">Total employees</span>
            <span className="text-slate-700 font-semibold flex items-center gap-0.5">
              {liveWorkforce.total} on duty roster
            </span>
          </div>
        </div>

        {/* 2. Driver */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700">Driver</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Fleet
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
            {liveWorkforce.driverCount}
          </div>
          <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500 font-medium">Total category</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              {liveWorkforce.availableDriversCount} ready · {liveWorkforce.onDeliveryCount} en route
            </span>
          </div>
        </div>

        {/* 3. Dispatcher */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700">Dispatcher</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              Depot
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
            {liveWorkforce.dispatcherCount}
          </div>
          <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500 font-medium">Total category</span>
            <span className="text-slate-700 font-semibold flex items-center gap-0.5">
              {liveWorkforce.dispatcherCount} station staff
            </span>
          </div>
        </div>

        {/* 4. ETA / Assignment */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700">ETA</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              On Schedule
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
            {liveWorkforce.avgEta}m
          </div>
          <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500 font-medium">Total assignment</span>
            <span className="text-blue-600 font-semibold flex items-center gap-0.5">
              {liveWorkforce.totalAssignments} active trips
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN TWO-COLUMN SECTION (TABLE ON LEFT, SIDEBAR ON RIGHT) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: EMPLOYEE MANAGEMENT TABLE (9 COLS ON XL) */}
        <div className="col-span-12 xl:col-span-9 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Header Row inside card: EMPLOYEE & Pagination Controls matching reference image */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 tracking-wider uppercase">
                EMPLOYEE
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span>
                  {totalEntries === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, totalEntries)} of {totalEntries}
                </span>
                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sub-tabs: All Staff, Drivers, Workers, Removed */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-1">
              <div className="inline-flex p-1 bg-slate-100 rounded-lg">
                <button
                  onClick={() => handleTabChange('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeTabFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Staff
                </button>
                <button
                  onClick={() => handleTabChange('drivers')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeTabFilter === 'drivers'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Drivers
                </button>
                <button
                  onClick={() => handleTabChange('workers')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeTabFilter === 'workers'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Workers
                </button>
                <button
                  onClick={() => handleTabChange('archived')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTabFilter === 'archived'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-rose-700'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Removed / Resigned / Fired ({employees.filter(e => e.isArchived || e.status === 'Archived' || e.isDeleted).length})</span>
                </button>
              </div>

              {/* Right: Search & Filters Toggle */}
              <div className="flex items-center gap-2.5">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name, ID or phone..."
                    value={localSearch}
                    onChange={(e) => {
                      setLocalSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600 transition-all"
                  />
                </div>

                <button
                  onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    showFiltersPanel || selectedRole !== 'All' || selectedStatus !== 'All'
                      ? 'bg-blue-50 border-blue-200 text-blue-600'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filters</span>
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Collapsible Filter Toolbar */}
          {showFiltersPanel && (
            <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Role:</span>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 py-1 px-2.5 rounded-lg font-semibold focus:outline-hidden focus:border-[#E04F11] cursor-pointer"
                >
                  <option value="All">All Roles</option>
                  <option value="Driver">Drivers</option>
                  <option value="Dispatcher">Dispatchers</option>
                  <option value="Worker">Workers</option>
                  <option value="Support">Support</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 py-1 px-2.5 rounded-lg font-semibold focus:outline-hidden focus:border-[#E04F11] cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Duty:</span>
                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 py-1 px-2.5 rounded-lg font-semibold focus:outline-hidden focus:border-[#E04F11] cursor-pointer"
                >
                  <option value="All">All Availability</option>
                  <option value="Available">Available</option>
                  <option value="On Delivery">On Delivery</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>

              <button
                onClick={resetFilters}
                className="text-[#E04F11] hover:underline font-semibold ml-auto cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Table Container matching reference columns */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-4 w-8">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.length === currentRecords.length && currentRecords.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">
                    <div className="flex items-center gap-1 cursor-pointer select-none">
                      <span>NAME</span>
                      <span className="text-slate-800 text-[10px]">▲</span>
                    </div>
                  </th>
                  <th className="py-3 px-4">ROLE</th>
                  <th className="py-3 px-4">PHONE</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">VEHICLE TYPE</th>
                  <th className="py-3 px-4">CURIENT ASSIGNMENT</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Loading employee directory...</span>
                      </div>
                    </td>
                  </tr>
                ) : currentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-slate-800 text-sm mb-1">
                        {employees.length === 0 ? 'No Staff Members Registered' : 'No employees match this filter'}
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 leading-relaxed">
                        {employees.length === 0
                          ? 'There are currently no staff members registered in the directory. Click below to onboard supervisors, dispatchers, technicians, and drivers.'
                          : 'Try adjusting the search query or role and status filters above.'}
                      </p>
                      {employees.length === 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenRegister('Dispatcher')}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Register First Staff Member</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  currentRecords.map((emp) => {
                    const isSelected = selectedEmployees.includes(emp.id);
                    const isDropdownOpen = openDropdownId === emp.id;

                    return (
                      <tr key={emp.id} className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}>
                        {/* Checkbox */}
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectEmployee(emp.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* Employee Avatar + Name + ID */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                              alt={emp.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span>{emp.name}</span>
                                {emp.driverLicense && (
                                  <span title="Verified Driver License" className="inline-flex items-center">
                                    <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {emp.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-3.5 px-4">
                          {renderRoleBadge(emp.role)}
                        </td>

                        {/* Phone */}
                        <td className="py-3.5 px-4 font-mono text-slate-700 text-[11px]">
                          {emp.phone}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          {emp.isArchived || emp.isDeleted || emp.status === 'Archived' ? (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Removed
                              </span>
                              {(emp.archivedReason || emp.terminationReason) && (
                                <div className="text-[10px] text-slate-500 mt-0.5 max-w-[130px] truncate" title={emp.archivedReason || emp.terminationReason}>
                                  {emp.archivedReason || emp.terminationReason}
                                </div>
                              )}
                            </div>
                          ) : (
                            renderStatusBadge(emp.status)
                          )}
                        </td>

                        {/* Vehicle Type */}
                        <td className="py-3.5 px-4">
                          {emp.role === 'Driver' && emp.licensePlate ? (
                            <div>
                              <div className="font-bold text-slate-900 font-mono text-xs">
                                {emp.licensePlate}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate max-w-[120px]">
                                {emp.vehicleModel || 'Isuzu Truck'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Current Assignment realistic and synchronized */}
                        <td className="py-3.5 px-4">
                          {emp.currentAssignment ? (
                            <div>
                              <div className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 font-semibold text-[10px] mb-0.5">
                                {typeof emp.currentAssignment === 'string'
                                  ? emp.currentAssignment
                                  : `#${emp.currentAssignment.orderId || 'ORD-ACTIVE'}`}
                              </div>
                              <div className="text-[11px] text-slate-700 font-medium max-w-[160px] truncate" title={typeof emp.currentAssignment === 'object' ? emp.currentAssignment.description : undefined}>
                                {typeof emp.currentAssignment === 'object' && emp.currentAssignment.description
                                  ? emp.currentAssignment.description
                                  : 'Nairobi Express Delivery'}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                                <span>{typeof emp.currentAssignment === 'object' && emp.currentAssignment.distanceText ? emp.currentAssignment.distanceText : '3.2 km'}</span>
                                <span>·</span>
                                <span className="text-emerald-600 font-semibold">
                                  {typeof emp.currentAssignment === 'object' && emp.currentAssignment.etaMinutes ? `${emp.currentAssignment.etaMinutes} min ETA` : '15 min ETA'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Actions (Dropdown matching reference) */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 relative">
                            {/* Quick Restore if soft-deleted/archived */}
                            {(emp.isArchived || emp.isDeleted || emp.status === 'Archived') && (
                              <button
                                onClick={() => handleRestoreEmployee(emp)}
                                title="Restore staff to active roster"
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Restore</span>
                              </button>
                            )}

                            {/* Options Button */}
                            <button
                              onClick={() => setOpenDropdownId(isDropdownOpen ? null : emp.id)}
                              title="Options"
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Action Menu */}
                            {isDropdownOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-20"
                                  onClick={() => setOpenDropdownId(null)}
                                />
                                <div className="absolute right-0 top-8 z-30 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 text-left text-xs font-medium animate-in fade-in zoom-in-95">
                                  {emp.isArchived || emp.isDeleted || emp.status === 'Archived' ? (
                                    <button
                                      onClick={() => handleRestoreEmployee(emp)}
                                      className="w-full px-3 py-1.5 hover:bg-emerald-50 flex items-center gap-2 text-emerald-700 font-semibold cursor-pointer"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Restore to Active</span>
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleOpenViewDetails(emp)}
                                        className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                                        <span>View Details</span>
                                      </button>

                                      <button
                                        onClick={() => handleOpenEdit(emp)}
                                        className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                                      >
                                        <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Edit Employee</span>
                                      </button>

                                      {emp.role === 'Driver' && (
                                        <button
                                          onClick={() => {
                                            setOpenDropdownId(null);
                                            handleOpenAssignVehicle(emp);
                                          }}
                                          className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                                        >
                                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                                          <span>Assign Vehicle</span>
                                        </button>
                                      )}

                                      <div className="border-t border-slate-100 my-1" />

                                      <button
                                        onClick={() => handleOpenSuspend(emp)}
                                        className="w-full px-3 py-1.5 hover:bg-amber-50 flex items-center gap-2 text-amber-700 cursor-pointer"
                                      >
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Suspend Employee</span>
                                      </button>

                                      <button
                                        onClick={() => handleOpenTerminate(emp)}
                                        className="w-full px-3 py-1.5 hover:bg-rose-50 flex items-center gap-2 text-rose-700 cursor-pointer"
                                      >
                                        <UserX className="w-3.5 h-3.5 text-rose-600" />
                                        <span>Terminate Contract</span>
                                      </button>

                                      <button
                                        onClick={() => handleOpenRemove(emp)}
                                        className="w-full px-3 py-1.5 hover:bg-rose-50 flex items-center gap-2 text-rose-600 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                        <span>Remove from System</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Entries Count & Pagination matching reference image */}
          <div className="p-4 sm:px-5 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-900">{totalEntries === 0 ? 0 : startIndex + 1}</span>-
              <span className="font-semibold text-slate-900">
                {Math.min(startIndex + pageSize, totalEntries)}
              </span> of <span className="font-semibold text-slate-900">{totalEntries}</span> entries
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 border border-slate-200 rounded text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 font-semibold text-xs"
              >
                <span>&lt; Previous</span>
              </button>

              {Array.from({ length: Math.min(6, Math.max(1, totalPages)) }).map((_, i) => {
                const pageNumber = i + 1;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`w-7 h-7 rounded text-xs font-bold transition-colors cursor-pointer ${
                      currentPage === pageNumber
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'border border-slate-200 text-slate-700 hover:bg-white'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 border border-slate-200 rounded text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 font-semibold text-xs"
              >
                <span>Next &gt;</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: QUICK ACTIONS + RECENT ACTIVITY + KEEP TEAM SAFE */}
        {/* ========================================================================= */}
        <div className="col-span-12 xl:col-span-3 space-y-6">
          {/* Card 1: Quick Actions matching reference image */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Quick Actions</h3>

            <div className="space-y-1.5">
              {/* 1. Assign new vehicle - Isuzu Forward Truck */}
              <button
                onClick={() => handleOpenAssignVehicle()}
                className="w-full p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-between cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Truck className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-xs text-slate-700 font-medium truncate">
                    Assign new vehicle - Isuzu Forward Truck
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
              </button>

              {/* 2. Add warehouse worker */}
              <button
                onClick={() => handleOpenRegister('Worker')}
                className="w-full p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-between cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserCheck className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-xs text-slate-700 font-medium truncate">
                    Add warehouse worker
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
              </button>

              {/* 3. Register new dispatcher */}
              <button
                onClick={() => handleOpenRegister('Dispatcher')}
                className="w-full p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-between cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Users className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-xs text-slate-700 font-medium truncate">
                    Register new dispatcher
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
              </button>

              {/* 4. Export team list */}
              <button
                onClick={handleExportCsv}
                className="w-full p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-between cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Upload className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-xs text-slate-700 font-medium truncate">
                    Export team list
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
              </button>

              {/* 5. View vehicle assignments */}
              <button
                onClick={() => handleOpenAssignVehicle()}
                className="w-full p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-between cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Eye className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-xs text-slate-700 font-medium truncate">
                    View vehicle assignments
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
              </button>

              {/* 6. Generate team report */}
              <button
                onClick={() => setIsActivityLogsModalOpen(true)}
                className="w-full p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-between cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <BarChart2 className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-xs text-slate-700 font-medium truncate">
                    Generate team report
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
              </button>

              {/* 7. Generate report */}
              <button
                onClick={() => setIsActivityLogsModalOpen(true)}
                className="w-full p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-between cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-xs text-slate-700 font-medium truncate">
                    Generate report
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
              </button>
            </div>
          </div>

          {/* Card 2: Recent Activity matching reference image */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Recent Activity</h3>
              <button
                onClick={() => setIsActivityLogsModalOpen(true)}
                className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
              >
                View all
              </button>
            </div>

            {/* Timeline with dotted nodes matching live system activity */}
            {activities.length > 0 ? (
              <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200/70">
                {activities.slice(0, 6).map((act, index) => {
                  const isActive = index === 0;
                  return (
                    <div key={act.id} className="flex items-start gap-3 relative">
                      <div className={`w-4 h-4 rounded-full border-2 ${isActive ? 'border-blue-600 bg-blue-600 shadow-xs' : 'border-slate-400 bg-white'} shrink-0 mt-0.5 z-10`} />
                      <div className="text-[11px] leading-snug">
                        <span className={isActive ? 'font-semibold text-slate-900' : 'text-slate-700'}>{act.title}: {act.description}</span>
                        <div className={`text-[10px] ${isActive ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>{act.timeAgo || act.timestamp}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                No recent activity events logged yet
              </div>
            )}
          </div>

          {/* Card 3: Keep your team safe matching reference image */}
          <div className="bg-[#FFF8F6] border border-orange-200/80 rounded-xl p-5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#E04F11] flex items-center justify-center mb-2.5">
              <Shield className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Keep your team safe</h4>
            <p className="text-xs text-slate-600 mt-0.5 font-normal">
              Manage roles and permissions
            </p>
            <div className="mt-3 pt-3 border-t border-orange-200/60 space-y-1.5 text-xs text-slate-600">
              <div className="hover:text-slate-900 cursor-pointer">Multi-factor authentication settings</div>
              <div className="hover:text-slate-900 cursor-pointer">Employee data access logs</div>
            </div>
            <button
              onClick={() => {
                if (onNavigateToSettings) onNavigateToSettings();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E04F11] hover:text-[#c2410c] mt-3 cursor-pointer group"
            >
              <span>Security audit dashboard</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW EMPLOYEE DETAILS */}
      {/* ========================================================================= */}
      {isViewDetailsModalOpen && activeEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <img
                  src={activeEmployee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={activeEmployee.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-orange-500/20"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{activeEmployee.name}</h3>
                    {renderRoleBadge(activeEmployee.role)}
                    {renderStatusBadge(activeEmployee.status)}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    ID: {activeEmployee.id} • Joined {activeEmployee.joinedDate || 'Jan 12, 2025'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsViewDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 font-medium block">Phone Number</span>
                  <span className="font-mono font-bold text-slate-900">{activeEmployee.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Email Address</span>
                  <span className="font-mono font-bold text-slate-900 truncate block">{activeEmployee.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">National ID</span>
                  <span className="font-mono font-bold text-slate-900">{activeEmployee.nationalId || 'Verified EPRA'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Driver License</span>
                  <span className="font-mono font-bold text-slate-900">{activeEmployee.driverLicense || 'DL-KEN-2021-984'}</span>
                </div>
              </div>

              {/* Vehicle & Assignment Info */}
              {activeEmployee.role === 'Driver' && (
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-blue-900">
                      <Truck className="w-4 h-4" />
                      <span>Assigned Fleet Vehicle</span>
                    </div>
                    <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-800">
                      {activeEmployee.licensePlate || 'KDB 123A'}
                    </span>
                  </div>
                  <div className="text-slate-600 mt-1">
                    Model: <strong className="text-slate-900">{activeEmployee.vehicleModel || 'Toyota Hiace'}</strong>
                  </div>
                </div>
              )}

              {/* Current Assignment */}
              {activeEmployee.currentAssignment && (
                <div className="p-3 bg-orange-50/70 rounded-xl border border-orange-200/80">
                  <span className="text-[11px] font-bold text-[#E04F11] uppercase tracking-wider block">
                    Active Delivery Assignment
                  </span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {typeof activeEmployee.currentAssignment === 'string'
                      ? activeEmployee.currentAssignment
                      : activeEmployee.currentAssignment.description || `Delivery #${activeEmployee.currentAssignment.orderId}`}
                  </div>
                  {typeof activeEmployee.currentAssignment !== 'string' && activeEmployee.currentAssignment.distanceText && (
                    <div className="text-xs text-slate-600 mt-0.5">
                      ETA & Telemetry: <strong>{activeEmployee.currentAssignment.distanceText}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Performance Metrics */}
              {activeEmployee.performance && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">Performance & Safety Rating</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                      <div className="flex items-center justify-center gap-1 text-amber-500 font-black text-sm">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{activeEmployee.performance.rating.toFixed(1)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Customer Rating</div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                      <div className="font-black text-slate-900 text-sm">
                        {activeEmployee.performance.completedDeliveries}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Completed Runs</div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                      <div className="font-black text-emerald-600 text-sm">
                        {activeEmployee.performance.onTimeRatePercent}%
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">On-Time Rate</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {activeEmployee.notes && (
                <div>
                  <span className="text-slate-400 font-medium block">Operational Notes</span>
                  <p className="text-slate-700 mt-0.5 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                    {activeEmployee.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setIsViewDetailsModalOpen(false);
                  handleOpenEdit(activeEmployee);
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>

              <button
                onClick={() => setIsViewDetailsModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REGISTER NEW EMPLOYEE */}
      {/* ========================================================================= */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Register Employee / Driver</h3>
                <p className="text-xs text-slate-500">Add a new personnel record to the active Nairobi directory.</p>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dennis Kiprono"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-[#E04F11]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as EmployeeRole })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#E04F11]"
                  >
                    <option value="Driver">Driver</option>
                    <option value="Worker">Worker</option>
                    <option value="Dispatcher">Dispatcher</option>
                    <option value="Support">Support</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+254 712 345 678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-hidden focus:border-[#E04F11]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="dennis@gasdeliver.co.ke"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-hidden focus:border-[#E04F11]"
                  />
                </div>
              </div>

              {formData.role === 'Driver' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-200/60">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Vehicle Model</label>
                    <input
                      type="text"
                      placeholder="e.g. Toyota Hiace"
                      value={formData.vehicleModel}
                      onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Plate Number</label>
                    <input
                      type="text"
                      placeholder="e.g. KDB 123A"
                      value={formData.licensePlate}
                      onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">EPRA / Driving License No.</label>
                    <input
                      type="text"
                      placeholder="DL-KEN-2024-998"
                      value={formData.driverLicense}
                      onChange={(e) => setFormData({ ...formData, driverLicense: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Physical Station / Area</label>
                <input
                  type="text"
                  placeholder="e.g. Westlands Depot, South C Hub"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-[#E04F11]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes & Certifications</label>
                <textarea
                  rows={2}
                  placeholder="e.g. EPRA Certified LPG Handler, First Aid trained"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-[#E04F11]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E04F11] hover:bg-[#c2410c] text-white rounded-lg font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  Save & Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT EMPLOYEE */}
      {/* ========================================================================= */}
      {isEditModalOpen && activeEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Edit Employee Profile</h3>
                <p className="text-xs text-slate-500">Update details for {activeEmployee.name} ({activeEmployee.id})</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-[#E04F11]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as EmployeeRole })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#E04F11]"
                  >
                    <option value="Driver">Driver</option>
                    <option value="Worker">Worker</option>
                    <option value="Dispatcher">Dispatcher</option>
                    <option value="Support">Support</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-hidden focus:border-[#E04F11]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-hidden focus:border-[#E04F11]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#E04F11]"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Duty Availability</label>
                  <select
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#E04F11]"
                  >
                    <option value="Available">Available</option>
                    <option value="On Delivery">On Delivery</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
              </div>

              {formData.role === 'Driver' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-200/60">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Vehicle Model</label>
                    <input
                      type="text"
                      value={formData.vehicleModel}
                      onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Plate Number</label>
                    <input
                      type="text"
                      value={formData.licensePlate}
                      onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Address / Station</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-[#E04F11]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-[#E04F11]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E04F11] hover:bg-[#c2410c] text-white rounded-lg font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ASSIGN VEHICLE */}
      {/* ========================================================================= */}
      {isAssignVehicleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-blue-600 mb-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Assign Fleet Vehicle</h3>
                <p className="text-xs text-slate-500">Pair driver with telemetry-tracked cylinder vehicle</p>
              </div>
            </div>

            <form onSubmit={handleConfirmAssignVehicle} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Driver *</label>
                <select
                  value={assignDriverId}
                  onChange={(e) => {
                    setAssignDriverId(e.target.value);
                    const selected = employees.find(emp => emp.id === e.target.value);
                    if (selected) {
                      setVehicleModelInput(selected.vehicleModel || 'Toyota Hiace');
                      setLicensePlateInput(selected.licensePlate || 'KDB 123A');
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500"
                >
                  {employees
                    .filter(e => e.role === 'Driver')
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.id}) {d.licensePlate ? `• ${d.licensePlate}` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Vehicle Model *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Toyota Hiace, Isuzu Truck"
                  value={vehicleModelInput}
                  onChange={(e) => setVehicleModelInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Vehicle Registration Plate *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KDB 123A"
                  value={licensePlateInput}
                  onChange={(e) => setLicensePlateInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAssignVehicleModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: SUSPEND EMPLOYEE */}
      {/* ========================================================================= */}
      {isSuspendModalOpen && activeEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Suspend Staff Member</h3>
                <p className="text-xs text-slate-500">Temporarily revoke delivery and dispatch access</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Suspending <strong>{activeEmployee.name}</strong> will temporarily prevent driver login and pause assignment dispatch.
            </p>

            <div className="mb-4">
              <label className="font-semibold text-slate-700 block mb-1 text-xs">
                Suspension Reason
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Safety review pending, unverified documents..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsSuspendModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors cursor-pointer"
              >
                Apply Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: TERMINATE EMPLOYEE */}
      {/* ========================================================================= */}
      {isTerminateModalOpen && activeEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Terminate Staff Member</h3>
                <p className="text-xs text-slate-500">Revoke permissions with soft-deletion audit safeguard</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Are you sure you want to terminate <strong>{activeEmployee.name}</strong> ({activeEmployee.id})?
            </p>

            <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-xl text-amber-900 text-xs mb-4">
              <strong>Soft-Deletion Safeguard:</strong> Historic order telemetry, past customer ratings, and EPRA cylinder logs will be safely preserved for audits.
            </div>

            <div className="mb-4">
              <label className="font-semibold text-slate-700 block mb-1 text-xs">
                Termination Reason (Mandatory Audit Requirement) *
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Contract expired, disciplinary violation, seasonal completion..."
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsTerminateModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTerminate}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors cursor-pointer"
              >
                Confirm Termination
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REMOVE / SOFT DELETE STAFF MEMBER (RESIGNED, FIRED, CONTRACT ENDED) */}
      {/* ========================================================================= */}
      {isRemoveModalOpen && activeEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Remove Staff Member</h3>
                <p className="text-xs text-slate-500">Soft-delete with audit trail & recovery guarantee</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-900 mb-1">
                <span>{activeEmployee.name}</span>
                <span className="font-mono text-slate-500">{activeEmployee.id}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Role: <span className="font-medium text-slate-700">{activeEmployee.role}</span> | Phone: <span className="font-mono text-slate-700">{activeEmployee.phone}</span>
              </div>
            </div>

            {/* Soft Delete Safeguard Notice */}
            <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl text-emerald-900 text-xs mb-4 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>Zero Data Loss (Soft-Delete):</strong> Removing this worker/driver archives their account and immediately unassigns them from live Thika Road dispatch. All historical order records, cylinder logs, and ratings remain safe and can be restored at any time.
              </div>
            </div>

            <div className="space-y-3.5 mb-5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Reason for Staff Removal *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Resigned', 'Fired', 'Contract Ended', 'Relocated', 'Other'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setRemovalCategory(cat)}
                      className={`p-2 rounded-lg border text-left font-medium transition-colors cursor-pointer ${
                        removalCategory === cat
                          ? 'border-[#E04F11] bg-orange-50/60 text-[#E04F11] font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      {cat === 'Resigned' && 'Resigned (Voluntary)'}
                      {cat === 'Fired' && 'Fired (Disciplinary)'}
                      {cat === 'Contract Ended' && 'Contract Concluded'}
                      {cat === 'Relocated' && 'Relocated'}
                      {cat === 'Other' && 'Other Reason'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Documentation & Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Exit handover completed, resignation letter on file, or incident summary..."
                  value={removalNotes}
                  onChange={(e) => setRemovalNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#E04F11]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRemoveModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Removal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: BULK CSV IMPORT */}
      {/* ========================================================================= */}
      {isBulkImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Bulk Import Staff Roster</h3>
                <p className="text-xs text-slate-500">Paste CSV formatted rows to batch register drivers & workers.</p>
              </div>
              <button
                onClick={() => setIsBulkImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkImportSubmit} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg text-slate-600 text-[11px] font-mono border border-slate-200">
                Format: Name, Role, Phone, Email, VehicleModel, LicensePlate
                <br />
                Example: Dennis Kiplagat, Driver, +254 712 111 222, dennis.k@gasdeliver.co.ke, Toyota Hiace, KDC 441B
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">CSV Data *</label>
                <textarea
                  rows={6}
                  required
                  placeholder={`Dennis Kiplagat, Driver, +254 712 111 222, dennis.k@gasdeliver.co.ke, Toyota Hiace, KDC 441B\nVictor Mutua, Delivery Worker, +254 722 333 444, victor.m@gasdeliver.co.ke, Depot Assistant, N/A`}
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-hidden focus:border-[#E04F11]"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBulkImportModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#E04F11] hover:bg-[#c2410c] text-white rounded-lg font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  Import Records
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: ALL ACTIVITY LOGS */}
      {/* ========================================================================= */}
      {isActivityLogsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Workforce Activity Feed</h3>
                <p className="text-xs text-slate-500">Live operational events across drivers & staff</p>
              </div>
              <button
                onClick={() => setIsActivityLogsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {activities.length > 0 ? (
                activities.map((act) => (
                  <div key={act.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900">{act.title}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{act.description}</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">{act.timeAgo}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">No logged activities found</div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsActivityLogsModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
