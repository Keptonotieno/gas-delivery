import React, { useState } from 'react';
import { GasDeliverLogo } from '../../components/GasDeliverLogo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import {
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Upload,
  FileText,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Phone,
  Mail,
  MapPin,
  Car,
  FileCheck,
  BadgeAlert,
  HelpCircle,
  X
} from 'lucide-react';

interface DriverOnboardingFunnelProps {
  onBackToSignIn: () => void;
  onNavigateToCustomerSignUp: () => void;
}

const NAIROBI_CORRIDORS = [
  'Thika Road / Roysambu / Lumumba Drive',
  'Kahawa Sukari / Kahawa Wendani / KU',
  'Mirema Drive / USIU / Safari Park',
  'Kasarani / Sports View / Sunton',
  'Westlands / Rhapta Road / Parklands',
  'Kilimani / Kileleshwa / Lavington',
  'South B / South C / Mombasa Road',
  'CBD / Ngara / Pangani',
  'Ruaraka / Baba Dogo / Outer Ring',
  'Ruaka / Rosslyn / Two Rivers'
];

const VEHICLE_TYPES = [
  'Pickup / Van',
  'Motorcycle / Boda',
  'Light Truck',
  'Tuk Tuk'
];

export const DriverOnboardingFunnel: React.FC<DriverOnboardingFunnelProps> = ({
  onBackToSignIn,
  onNavigateToCustomerSignUp
}) => {
  const { registerDriver } = useAuth();

  // Wizard Step: 1 = Personal Info, 2 = Vehicle Details, 3 = Compliance & Documents, 4 = Application Under Review
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Personal Info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [corridorZone, setCorridorZone] = useState(NAIROBI_CORRIDORS[0]);
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Vehicle Details
  const [vehicleMake, setVehicleMake] = useState('Toyota');
  const [vehicleModel, setVehicleModel] = useState('Hiace Van');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('Pickup / Van');
  const [experienceYears, setExperienceYears] = useState(3);

  // Step 3: Compliance & Documents
  const [nationalIdNumber, setNationalIdNumber] = useState('');
  const [driverLicenseNumber, setDriverLicenseNumber] = useState('');
  const [nationalIdFileName, setNationalIdFileName] = useState('national_id_front_scan.pdf');
  const [driverLicenseFileName, setDriverLicenseFileName] = useState('driver_license_front.pdf');
  const [safetyDeclaration, setSafetyDeclaration] = useState(false);

  // Submission Status & Result
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicationRef, setApplicationRef] = useState<string>('');

  // Step 1 validation
  const validateStep1 = (): boolean => {
    setError(null);
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please provide your full legal name as it appears on your National ID.');
      return false;
    }
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address (e.g. driver@example.com).');
      return false;
    }
    if (!phone.trim() || phone.trim().length < 9) {
      setError('Please enter a valid Kenya phone number (e.g. +254 712 345 678) for dispatch coordination.');
      return false;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long for courier portal security.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your confirmation password.');
      return false;
    }
    return true;
  };

  // Step 2 validation
  const validateStep2 = (): boolean => {
    setError(null);
    if (!vehicleMake.trim()) {
      setError('Please enter the vehicle manufacturer / make (e.g. Toyota, Isuzu, Bajaj).');
      return false;
    }
    if (!vehicleModel.trim()) {
      setError('Please enter the vehicle model (e.g. Hiace, D-Max, Boxer 150).');
      return false;
    }
    const cleanPlate = licensePlate.trim().toUpperCase();
    if (!cleanPlate || cleanPlate.length < 5) {
      setError('Please provide a valid Kenya registration plate (e.g. KDB 123A or KMD 456X).');
      return false;
    }
    return true;
  };

  // Step 3 submission
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nationalIdNumber.trim() || nationalIdNumber.trim().length < 6) {
      setError('Please provide your valid 7-8 digit Kenyan National ID number.');
      return;
    }

    if (!driverLicenseNumber.trim() || driverLicenseNumber.trim().length < 5) {
      setError('Please enter your NTSA Driver\'s License serial number (e.g. DL-KEN-2023-4412).');
      return;
    }

    if (!safetyDeclaration) {
      setError('Please check the safety compliance declaration box to proceed.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerDriver({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        confirmPassword,
        corridorZone,
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        licensePlate: licensePlate.trim().toUpperCase(),
        vehicleType,
        experienceYears,
        nationalIdNumber: nationalIdNumber.trim(),
        nationalIdDocumentUrl: nationalIdFileName,
        driverLicenseNumber: driverLicenseNumber.trim().toUpperCase(),
        driverLicenseDocumentUrl: driverLicenseFileName
      });

      const refId = res?.application?.id || `APP-DRV-${Date.now().toString().slice(-6)}`;
      setApplicationRef(refId);
      setCurrentStep(4); // Move to Under Review screen
    } catch (err: any) {
      setError(err.message || 'Driver registration failed. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextFromStep1 = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleNextFromStep2 = () => {
    if (validateStep2()) {
      setCurrentStep(3);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0B0F17] flex flex-col font-sans antialiased text-gray-900 dark:text-slate-100">
      {/* Top Bar */}
      <header className="h-16 border-b border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#131B2A] px-4 sm:px-8 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <GasDeliverLogo className="h-7 w-auto" />
          <div className="h-4 w-px bg-gray-200 dark:bg-[#202D42] hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/40 text-[11px] font-bold text-[#E04F11]">
            <Truck className="w-3.5 h-3.5" />
            <span>Driver Partner Onboarding</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle variant="segmented" />
          <button
            onClick={onBackToSignIn}
            className="text-xs font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#202D42] transition-colors cursor-pointer"
          >
            Back to Sign In
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-2xl bg-white dark:bg-[#131B2A] rounded-2xl border border-gray-200 dark:border-[#202D42] shadow-sm p-6 sm:p-8">
          
          {/* Stepper Header (hidden on review step 4) */}
          {currentStep < 4 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    Join the GasDeliver Fleet
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
                    Deliver LPG & CNG cylinders across Nairobi corridors. Earn reliable weekly payouts.
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#E04F11]/10 text-[#E04F11]">
                  Step {currentStep} of 3
                </span>
              </div>

              {/* Progress Steps Indicator */}
              <div className="grid grid-cols-3 gap-2">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentStep >= 1 ? 'bg-[#E04F11]' : 'bg-gray-200 dark:bg-[#202D42]'
                  }`}
                />
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentStep >= 2 ? 'bg-[#E04F11]' : 'bg-gray-200 dark:bg-[#202D42]'
                  }`}
                />
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentStep >= 3 ? 'bg-[#E04F11]' : 'bg-gray-200 dark:bg-[#202D42]'
                  }`}
                />
              </div>

              <div className="flex justify-between text-[11px] font-semibold text-gray-500 dark:text-slate-400 mt-2">
                <span className={currentStep === 1 ? 'text-[#E04F11] font-bold' : ''}>
                  1. Personal Details
                </span>
                <span className={currentStep === 2 ? 'text-[#E04F11] font-bold' : ''}>
                  2. Vehicle Specs
                </span>
                <span className={currentStep === 3 ? 'text-[#E04F11] font-bold' : ''}>
                  3. Compliance & ID
                </span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 flex items-start gap-3 text-xs leading-relaxed animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: PERSONAL INFO */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="border-b border-gray-100 dark:border-[#202D42] pb-3 mb-2">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-[#E04F11]" />
                  <span>Applicant Personal Information</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Enter your legal name and contact details for official onboarding.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                  Full Legal Name (as on ID) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Brian Omondi"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#0B0F17] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="driver.pending@gasdeliver.co.ke"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#0B0F17] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                    M-Pesa Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+254 723 456 789"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#0B0F17] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                  Primary Delivery Zone / Corridor *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={corridorZone}
                    onChange={(e) => setCorridorZone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#0B0F17] text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-[#E04F11] cursor-pointer"
                  >
                    {NAIROBI_CORRIDORS.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                    Create Password (min. 8 chars) *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#0B0F17] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#0B0F17] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-[#202D42]">
                <button
                  type="button"
                  onClick={onBackToSignIn}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Already registered? Sign In
                </button>
                <button
                  type="button"
                  onClick={handleNextFromStep1}
                  className="px-6 py-2.5 rounded-xl bg-[#E04F11] hover:bg-[#C9420A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>Next: Vehicle Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: VEHICLE DETAILS */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="border-b border-gray-100 dark:border-[#202D42] pb-3 mb-2">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Car className="w-4 h-4 text-[#E04F11]" />
                  <span>Vehicle Specifications & Capacity</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Specify the delivery vehicle you will use for gas cylinder distribution.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                  Vehicle Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {VEHICLE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setVehicleType(type)}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        vehicleType === type
                          ? 'border-[#E04F11] bg-orange-50/80 dark:bg-orange-950/30 text-[#E04F11]'
                          : 'border-gray-200 dark:border-[#202D42] text-gray-700 dark:text-slate-300 hover:border-gray-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                    Vehicle Make / Brand *
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    placeholder="e.g. Toyota, Isuzu, Bajaj"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#0B0F17] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                    Vehicle Model *
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="e.g. Hiace, D-Max 2.5L, Boxer 150"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#0B0F17] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                    Registration Plate Number *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                      placeholder="e.g. KDB 123A or KDC 789B"
                      className="w-full uppercase font-mono tracking-wider px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#0B0F17] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Must match logbook and NTSA certificate.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                    Commercial Driving Experience (Years)
                  </label>
                  <select
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#0B0F17] text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-[#E04F11] cursor-pointer"
                  >
                    <option value={1}>1 Year Experience</option>
                    <option value={2}>2 Years Experience</option>
                    <option value={3}>3-5 Years Experience</option>
                    <option value={6}>6+ Years Experience</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-300 text-xs flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  Vehicles carrying LPG cylinders must have secure tie-down straps, upright cylinder cages, and an accessible fire extinguisher.
                </span>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-[#202D42]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Personal</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextFromStep2}
                  className="px-6 py-2.5 rounded-xl bg-[#E04F11] hover:bg-[#C9420A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>Next: Compliance & Documents</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: COMPLIANCE & DOCUMENT UPLOAD */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmitApplication} className="space-y-4">
              <div className="border-b border-gray-100 dark:border-[#202D42] pb-3 mb-2">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-[#E04F11]" />
                  <span>Compliance & Government Document Verification</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Required by Kenyan transport and EPRA safety regulations for LPG transport.
                </p>
              </div>

              {/* National ID Section */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-[#202D42] bg-gray-50/60 dark:bg-[#0B0F17]/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#E04F11]" />
                    <span>1. Kenyan National ID</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 font-bold">
                    Required
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    National ID Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={nationalIdNumber}
                    onChange={(e) => setNationalIdNumber(e.target.value)}
                    placeholder="e.g. 29874512"
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#131B2A] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    National ID Document Upload (Front & Back)
                  </label>
                  <div className="p-3 rounded-lg border border-dashed border-gray-300 dark:border-[#2A3B54] bg-white dark:bg-[#131B2A] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-[#E04F11]" />
                      <div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-white">
                          {nationalIdFileName}
                        </div>
                        <div className="text-[10px] text-gray-400">PDF, JPG, or PNG (Max 5MB)</div>
                      </div>
                    </div>
                    <label className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#202D42] text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-200 cursor-pointer">
                      <span>Replace</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setNationalIdFileName(e.target.files[0].name);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Driver's License Section */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-[#202D42] bg-gray-50/60 dark:bg-[#0B0F17]/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Car className="w-4 h-4 text-[#E04F11]" />
                    <span>2. NTSA Driver's License</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 font-bold">
                    Required
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Driving License Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={driverLicenseNumber}
                    onChange={(e) => setDriverLicenseNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. DL-KEN-2023-4412"
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#131B2A] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Driver's License Document Upload
                  </label>
                  <div className="p-3 rounded-lg border border-dashed border-gray-300 dark:border-[#2A3B54] bg-white dark:bg-[#131B2A] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-[#E04F11]" />
                      <div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-white">
                          {driverLicenseFileName}
                        </div>
                        <div className="text-[10px] text-gray-400">NTSA Smart Driving License Front & Back</div>
                      </div>
                    </div>
                    <label className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#202D42] text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-200 cursor-pointer">
                      <span>Replace</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setDriverLicenseFileName(e.target.files[0].name);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Safety Declaration Checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-[#202D42] hover:bg-gray-50/50 dark:hover:bg-[#162032] cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={safetyDeclaration}
                  onChange={(e) => setSafetyDeclaration(e.target.checked)}
                  className="mt-0.5 rounded text-[#E04F11] focus:ring-[#E04F11] w-4 h-4 cursor-pointer"
                />
                <span className="text-gray-600 dark:text-slate-300">
                  I certify that all documents submitted are authentic, that my vehicle is fully insured and roadworthy, and that I agree to abide by EPRA regulations for LPG cylinder delivery in Nairobi.
                </span>
              </label>

              <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-[#202D42]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Vehicle</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#E04F11] hover:bg-[#C9420A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application for Review</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: APPLICATION UNDER REVIEW SCREEN */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="text-center py-4 space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs font-black tracking-wider uppercase mb-3">
                  <BadgeAlert className="w-3.5 h-3.5" />
                  <span>Application Under Review</span>
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  We're Reviewing Your Credentials
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 max-w-md mx-auto mt-2 leading-relaxed">
                  Thank you, <strong>{fullName}</strong>! Your application to become a GasDeliver courier partner has been securely received by our operations compliance team.
                </p>
              </div>

              {/* Reference Card */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-[#202D42] bg-gray-50/70 dark:bg-[#0B0F17]/60 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-[#202D42]">
                  <span className="text-gray-500 dark:text-slate-400">Application Reference:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {applicationRef || 'APP-DRV-78942'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Operating Vehicle:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {vehicleMake} {vehicleModel} ({licensePlate})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Preferred Corridor:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{corridorZone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Review Timeline:</span>
                  <span className="font-bold text-[#E04F11]">Estimated 2–4 Business Hours</span>
                </div>
              </div>

              {/* What happens next banner */}
              <div className="p-4 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 text-left text-xs max-w-md mx-auto space-y-2">
                <div className="font-bold text-[#E04F11] flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  <span>What happens next?</span>
                </div>
                <ul className="space-y-1.5 text-gray-600 dark:text-slate-300 pl-4 list-disc text-[11px]">
                  <li>Our hub compliance officer verifies your National ID & NTSA license records.</li>
                  <li>Once approved by the Operations Manager, your driver portal unlocks automatically.</li>
                  <li>You will receive an activation SMS and email notification to start accepting delivery manifests.</li>
                </ul>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={onBackToSignIn}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#E04F11] hover:bg-[#C9420A] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Return to Sign In
                </button>
                <button
                  type="button"
                  onClick={onNavigateToCustomerSignUp}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#202D42] text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
                >
                  Order Gas as Customer
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};
