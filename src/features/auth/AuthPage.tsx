import React, { useState } from 'react';
import { GasDeliverLogo } from '../../components/GasDeliverLogo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { HeroSection } from '../hero3d/HeroSection';
import { DriverOnboardingFunnel } from './DriverOnboardingFunnel';
import {
  User as UserIcon,
  ShieldCheck,
  Truck,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Phone,
  MapPin,
  Lock,
  Mail,
  Clock,
  Car,
  ChevronRight,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

interface AuthPageProps {
  onSuccess?: () => void;
  initialMode?: 'signin' | 'customer-signup' | 'driver-signup';
  initialEmail?: string;
  initialRole?: UserRole;
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

export const AuthPage: React.FC<AuthPageProps> = ({
  onSuccess,
  initialMode = 'signin',
  initialEmail,
  initialRole
}) => {
  const { login, register } = useAuth();

  // Mode: 'signin' | 'customer-signup' | 'driver-signup'
  const [authMode, setAuthMode] = useState<'signin' | 'customer-signup' | 'driver-signup'>(() => {
    if (initialMode) return initialMode;
    return 'signin';
  });

  // Sign In credentials
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Customer Sign Up fields (Frictionless single-page essential details)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerConfirmPassword, setCustomerConfirmPassword] = useState('');
  const [customerDeliveryZone, setCustomerDeliveryZone] = useState(NAIROBI_CORRIDORS[0]);

  // Status & error handling
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; actionableHint?: string; isPendingDriver?: boolean } | null>(null);

  // If driver registration funnel is selected
  if (authMode === 'driver-signup') {
    return (
      <DriverOnboardingFunnel
        onBackToSignIn={() => {
          setAuthMode('signin');
          setError(null);
        }}
        onNavigateToCustomerSignUp={() => {
          setAuthMode('customer-signup');
          setError(null);
        }}
      />
    );
  }

  // Handle Unified Sign-In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError({
        message: 'Please enter your email address.',
        actionableHint: 'Use your registered customer, driver, or admin email address.'
      });
      return;
    }

    if (!password) {
      setError({
        message: 'Please enter your password.'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Unified login automatically identifies role server-side
      const authenticatedUser = await login(cleanEmail, password);
      onSuccess?.();
    } catch (err: any) {
      const errMsg = err.message || 'Authentication failed.';
      
      // Parse actionable messages
      if (errMsg.toLowerCase().includes('driver account pending admin approval') || errMsg.toLowerCase().includes('pending_activation') || errMsg.toLowerCase().includes('pending')) {
        setError({
          message: 'Driver account pending admin approval.',
          actionableHint: 'Your vehicle details, National ID, and NTSA driver license documents are currently under review by our operations compliance team. You will be notified via SMS/email upon approval.',
          isPendingDriver: true
        });
      } else if (errMsg.toLowerCase().includes('invalid password')) {
        setError({
          message: 'Invalid password.',
          actionableHint: 'The password you entered is incorrect. Please check for caps lock and try again.'
        });
      } else if (errMsg.toLowerCase().includes('no account found') || errMsg.toLowerCase().includes('unknown')) {
        setError({
          message: 'No account found with this email.',
          actionableHint: 'Please check your spelling, or choose "Create Customer Account" or "Become a Driver" below to register.'
        });
      } else if (errMsg.toLowerCase().includes('suspended')) {
        setError({
          message: 'Account suspended.',
          actionableHint: 'This account has been administratively suspended. Please contact operations management at support@gasdeliver.co.ke.'
        });
      } else {
        setError({
          message: errMsg,
          actionableHint: 'Please verify your credentials and try again.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Frictionless Customer Sign-Up
  const handleCustomerSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || customerName.trim().length < 2) {
      setError({
        message: 'Full legal name is required.',
        actionableHint: 'Please enter at least 2 characters.'
      });
      return;
    }

    if (!customerPhone.trim() || customerPhone.trim().length < 9) {
      setError({
        message: 'Valid Kenya phone number is required.',
        actionableHint: 'e.g. +254 712 345 678 for doorstep delivery dispatch and M-Pesa push.'
      });
      return;
    }

    const cleanEmail = customerEmail.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError({
        message: 'Valid email address is required.',
        actionableHint: 'e.g. name@example.com'
      });
      return;
    }

    if (!customerPassword || customerPassword.length < 8) {
      setError({
        message: 'Password must be at least 8 characters long.',
        actionableHint: 'Create a secure password with at least 8 characters.'
      });
      return;
    }

    if (customerPassword !== customerConfirmPassword) {
      setError({
        message: 'Passwords do not match.',
        actionableHint: 'Please re-enter your confirmation password carefully.'
      });
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name: customerName.trim(),
        email: cleanEmail.toLowerCase(),
        phone: customerPhone.trim(),
        password: customerPassword,
        confirmPassword: customerConfirmPassword,
        corridorZone: customerDeliveryZone,
        address: customerDeliveryZone
      });
      onSuccess?.();
    } catch (err: any) {
      setError({
        message: err.message || 'Customer registration failed.',
        actionableHint: 'Please verify that this email is not already registered.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0B0F17] flex flex-col lg:flex-row font-sans antialiased text-gray-900 dark:text-slate-100">
      {/* Mobile Top Navbar (shown only on mobile/tablet) */}
      <header className="lg:hidden h-14 border-b border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#131B2A] px-4 flex items-center justify-between shadow-2xs z-20">
        <GasDeliverLogo className="h-6 w-auto" />
        <ThemeToggle variant="segmented" />
      </header>

      {/* Left Side: Restored Original Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 min-h-screen relative shadow-xl z-10">
        <HeroSection />
      </div>

      {/* Right Side: Auth Forms & Portal Navigation */}
      <div className="flex-1 flex flex-col justify-between p-4 sm:p-8 lg:p-12 min-h-screen overflow-y-auto relative bg-[#F8F9FA] dark:bg-[#0B0F17]">
        {/* Top Right Desktop Controls */}
        <div className="hidden lg:flex items-center justify-end w-full pb-2">
          <ThemeToggle variant="segmented" />
        </div>

        {/* Mobile Hero Banner Preview (retaining the previous design on mobile) */}
        <div className="lg:hidden mb-6 rounded-2xl bg-gradient-to-br from-[#E65100] via-[#E04F11] to-[#D4380D] p-5 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80 block">
              GasDeliver Kenya
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
              Gas cylinders at your door in under 2 hours.
            </h2>
            <p className="text-xs text-white/90 leading-relaxed">
              Order LPG refills & complete kits across Nairobi with live GPS telemetry.
            </p>
          </div>
          <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
        </div>

        {/* Center Container for Auth Form */}
        <div className="w-full max-w-md mx-auto my-auto space-y-6">
          {/* Form Header */}
          <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {authMode === 'signin' ? 'Sign in to your account' : 'Create customer account'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
                {authMode === 'signin'
                  ? 'Unified login for customers, drivers, and operations personnel.'
                  : 'Frictionless customer signup to start ordering gas cylinders immediately.'}
              </p>
            </div>

            {/* Error & Actionable Banner */}
            {error && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed animate-in fade-in duration-200 ${
                  error.isPendingDriver
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300'
                }`}
              >
                {error.isPendingDriver ? (
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold text-sm tracking-tight">{error.message}</div>
                  {error.actionableHint && (
                    <div className="text-[11px] opacity-90">{error.actionableHint}</div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 1. UNIFIED SIGN-IN FORM */}
            {/* ========================================================================= */}
            {authMode === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#131B2A] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                      Password
                    </label>
                    <span className="text-[11px] text-[#E04F11] font-semibold hover:underline cursor-pointer">
                      Forgot password?
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#131B2A] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded text-[#E04F11] focus:ring-[#E04F11] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-gray-600 dark:text-slate-400">Remember on this device</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-[#E04F11] hover:bg-[#C9420A] text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Distinct Sign-Up Pathways Callouts */}
                <div className="pt-4 border-t border-gray-100 dark:border-[#202D42] space-y-2">
                  <div className="text-center text-xs text-gray-500 dark:text-slate-400">
                    New to GasDeliver? Choose a pathway:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('customer-signup');
                        setError(null);
                      }}
                      className="p-3 rounded-xl border border-gray-200 dark:border-[#202D42] hover:border-[#E04F11] hover:bg-orange-50/40 dark:hover:bg-orange-950/20 text-left transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-[#E04F11] flex items-center justify-between">
                        <span>Order Gas (Customer)</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                        Create an account to start ordering
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('driver-signup');
                        setError(null);
                      }}
                      className="p-3 rounded-xl border border-gray-200 dark:border-[#202D42] hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 text-left transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-blue-600 flex items-center justify-between">
                        <span>Become a Courier Driver</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                        Multi-step courier onboarding
                      </div>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* ========================================================================= */
              /* 2. FRICTIONLESS CUSTOMER SIGN-UP FORM */
              /* ========================================================================= */
              <form onSubmit={handleCustomerSignUp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Sarah Mwangi"
                      className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#131B2A] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Phone Number (M-Pesa) *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+254 712 345 678"
                        className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#131B2A] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="sarah@example.com"
                        className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#131B2A] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Delivery Zone / Estate *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={customerDeliveryZone}
                      onChange={(e) => setCustomerDeliveryZone(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#131B2A] text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-[#E04F11] cursor-pointer"
                    >
                      {NAIROBI_CORRIDORS.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      placeholder="min. 8 characters"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#131B2A] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={customerConfirmPassword}
                      onChange={(e) => setCustomerConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#202D42] bg-white dark:bg-[#131B2A] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#E04F11]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-[#E04F11] hover:bg-[#C9420A] text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account & Start Ordering</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-3 border-t border-gray-100 dark:border-[#202D42] flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setError(null);
                    }}
                    className="font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                  >
                    Already have an account? <strong>Sign In</strong>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('driver-signup');
                      setError(null);
                    }}
                    className="font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Drive with us →
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>
  );
};
