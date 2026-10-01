import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Mail, 
  Truck, 
  HelpCircle,
  Loader2
} from 'lucide-react';

interface DriverActivationPageProps {
  token?: string;
  onNavigateToLogin: (email?: string) => void;
}

export const DriverActivationPage: React.FC<DriverActivationPageProps> = ({
  token: initialToken,
  onNavigateToLogin
}) => {
  // Extract token from prop or URL search params
  const [token, setToken] = useState<string>(() => {
    if (initialToken) return initialToken;
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [driverInfo, setDriverInfo] = useState<{ driverName: string; email: string } | null>(null);

  // Form State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Verify token on mount
  useEffect(() => {
    let isMounted = true;
    if (!token) {
      setIsLoading(false);
      setVerificationError('No activation token was provided. Please check the link in your invitation email.');
      return;
    }

    const verify = async () => {
      setIsLoading(true);
      setVerificationError(null);
      try {
        const res = await api.verifyDriverActivationToken(token);
        if (isMounted) {
          setDriverInfo({ driverName: res.driverName, email: res.email });
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setVerificationError(err.message || 'The activation link is invalid, expired, or has already been used.');
          setIsLoading(false);
        }
      }
    };

    verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!password) {
      setFormError('Please enter a password.');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters in length.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.activateDriverAccount({
        token,
        password,
        confirmPassword
      });
      setIsSuccess(true);
    } catch (err: any) {
      setFormError(err.message || 'Failed to activate account. Please try again or contact dispatch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-6 h-6 text-[#E04F11] animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Verifying Driver Invitation</h2>
          <p className="text-sm text-slate-500">Connecting securely to GasDeliver operations hub...</p>
        </div>
      </div>
    );
  }

  // 2. Invalid or Expired Token View
  if (verificationError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-slate-200 shadow-sm text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Activation Link Expired or Invalid</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {verificationError}
          </p>

          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left border border-slate-100 text-xs text-slate-600 space-y-2">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" /> Need Assistance?
            </div>
            <p>
              If your link has expired, your operations manager or dispatcher can re-send a fresh activation link from the fleet roster.
            </p>
            <p className="pt-1 text-slate-700 font-medium">
              Support Desk: <a href="mailto:support@gasdeliver.co.ke" className="text-[#E04F11] underline">support@gasdeliver.co.ke</a>
            </p>
          </div>

          <div className="space-y-2">
            <button
              id="return-to-login-btn"
              onClick={() => onNavigateToLogin()}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              Go to Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Success View
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-slate-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Activated!</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Welcome to the GasDeliver fleet, <strong>{driverInfo?.driverName}</strong>. Your driver account is now active and ready for dispatch.
          </p>

          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left border border-slate-100">
            <div className="text-xs text-slate-500 mb-1">Your Login Email</div>
            <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              {driverInfo?.email}
            </div>
          </div>

          <button
            id="proceed-to-driver-login-btn"
            onClick={() => onNavigateToLogin(driverInfo?.email)}
            className="w-full py-3 px-6 bg-[#E04F11] hover:bg-[#c8430b] text-white rounded-xl font-bold text-sm tracking-wide transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            Proceed to Driver Login <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 4. Main Account Activation Form
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 border border-orange-200 rounded-full mb-3">
          <Truck className="w-4 h-4 text-[#E04F11]" />
          <span className="text-xs font-bold text-[#E04F11] uppercase tracking-wider">GasDeliver Fleet Onboarding</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Activate Your GasDeliver Driver Account
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Your account was provisioned by dispatch. Please set your secure password to complete activation.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-slate-200 shadow-sm">
          {formError && (
            <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Driver Name (Read-Only) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Driver Name
              </label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800">
                {driverInfo?.driverName}
              </div>
            </div>

            {/* Registered Email (Read-Only) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Registered Email
              </label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 flex items-center justify-between">
                <span className="font-mono text-xs text-slate-800">{driverInfo?.email}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  <Lock className="w-3 h-3" /> Read-only
                </span>
              </div>
            </div>

            {/* Create Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Create Password
              </label>
              <div className="relative">
                <input
                  id="driver-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full p-3 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04F11] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="driver-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  minLength={8}
                  className="w-full p-3 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04F11] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                Your password will be encrypted using scrypt hashing. This activation token is single-use and will be invalidated once activated.
              </span>
            </div>

            <button
              id="submit-activate-account-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 bg-[#E04F11] hover:bg-[#c8430b] disabled:bg-slate-300 text-white rounded-xl font-bold text-sm tracking-wide transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Activating Account...</span>
                </>
              ) : (
                <>
                  <span>Activate Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
            Already activated your driver account?{' '}
            <button
              onClick={() => onNavigateToLogin(driverInfo?.email)}
              className="text-[#E04F11] font-semibold hover:underline"
            >
              Sign in to Driver Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
