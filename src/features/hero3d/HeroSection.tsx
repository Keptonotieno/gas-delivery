import React from 'react';
import { 
  ShieldCheck, 
  Clock, 
  CreditCard, 
  CheckCircle2 
} from 'lucide-react';
import { RealisticCylinderShowcase } from './RealisticCylinderShowcase';

interface HeroSectionProps {
  onSelectRoleInfo?: {
    title: string;
    subtitle: string;
    bullets: string[];
  };
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSelectRoleInfo }) => {
  const featureBullets = onSelectRoleInfo?.bullets || [
    'Browse 6kg to 50kg cylinder refills & kits',
    'Real-time driver tracking with accurate ETA',
    'Instant M-Pesa STK push payment',
    'Free safety inspection with every delivery'
  ];

  const headline = onSelectRoleInfo?.title || 'Gas cylinders at your door in under 2 hours.';
  const subheadline = onSelectRoleInfo?.subtitle || 'Order LPG or CNG cylinders across Nairobi. Track delivery in real-time.';

  return (
    <div className="w-full h-full bg-gradient-to-br from-[#E65100] via-[#E04F11] to-[#D4380D] text-white p-6 sm:p-10 lg:p-14 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Subtle glowing spherical ambient layers in the background */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-radial from-white/15 to-transparent blur-2xl pointer-events-none" />
      <div className="absolute top-1/3 -left-32 w-[480px] h-[480px] rounded-full bg-radial from-amber-400/20 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full border border-white/10 pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-80 h-80 rounded-full border border-white/15 pointer-events-none" />
      <div className="absolute top-1/4 right-10 w-80 h-80 rounded-full border border-white/5 pointer-events-none" />

      {/* Top Header / Brand Logo */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo mark matching original design: white rounded square with orange flame */}
          <div className="w-11 h-11 rounded-xl bg-white text-[#E04F11] flex items-center justify-center shadow-md">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
            >
              <path
                d="M12 2C10.5 4.5 9 6.8 9 9.5C9 11.2 9.7 12.7 10.8 13.8C10.3 12.9 10 11.7 10 10.5C10 8.5 11 6.8 12 5.5C13 6.8 14 8.5 14 10.5C14 11.7 13.7 12.9 13.2 13.8C14.3 12.7 15 11.2 15 9.5C15 6.8 13.5 4.5 12 2Z"
                fill="currentColor"
              />
              <path
                d="M12 11C11.1716 11 10.5 11.6716 10.5 12.5C10.5 14.1569 11.1716 15.5 12 16.5C12.8284 15.5 13.5 14.1569 13.5 12.5C13.5 11.6716 12.8284 11 12 11Z"
                fill="#E04F11"
              />
              <path
                d="M6 14.5C6 11.8 7.3 9.4 9 8C7.5 9.8 6.8 12 6.8 14.5C6.8 17.5 9.1 20 12 20C14.9 20 17.2 17.5 17.2 14.5C17.2 12 16.5 9.8 15 8C16.7 9.4 18 11.8 18 14.5C18 18.1 15.3 21 12 21C8.7 21 6 18.1 6 14.5Z"
                fill="currentColor"
                opacity="0.9"
              />
            </svg>
          </div>

          <div>
            <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-white block leading-none">
              GasDeliver
            </span>
            <span className="text-xs text-white/80 font-medium tracking-wide block mt-1">
              Safe Gas. On Time.
            </span>
          </div>
        </div>
      </div>

      {/* Main Hero Body: Side-by-Side Content + Realistic Gas Cylinders Image */}
      <div className="my-auto py-6 grid grid-cols-1 xl:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Column: Headlines & Bullet Points */}
        <div className="xl:col-span-6 space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl xl:text-[40px] font-black leading-[1.14] tracking-tight text-white">
              {headline}
            </h1>
            <p className="text-white/90 text-sm sm:text-base leading-relaxed max-w-md font-normal">
              {subheadline}
            </p>
          </div>

          {/* 4 Feature Highlights */}
          <div className="space-y-3.5 pt-1">
            {featureBullets.map((bullet, idx) => {
              const icons = [ShieldCheck, Clock, CreditCard, CheckCircle2];
              const IconComponent = icons[idx % icons.length];

              return (
                <div key={idx} className="flex items-center gap-3 text-white/95 text-xs sm:text-sm font-medium">
                  <div className="w-7 h-7 rounded-full bg-white/20 border border-white/25 flex items-center justify-center shrink-0 shadow-xs backdrop-blur-2xs">
                    <IconComponent className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="leading-tight">{bullet}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Clean Realistic Gas Cylinders Image */}
        <div className="flex xl:col-span-6 flex-col items-center justify-center relative min-h-[240px] sm:min-h-[300px] xl:min-h-[380px]">
          <RealisticCylinderShowcase className="w-full" />
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-white/75 relative z-10 pt-4 flex items-center justify-between border-t border-white/15">
        <span>© 2024 GasDeliver Inc.</span>
        <div className="space-x-3 font-medium">
          <span className="hover:underline cursor-pointer">Terms</span>
          <span>·</span>
          <span className="hover:underline cursor-pointer">Privacy</span>
        </div>
      </div>
    </div>
  );
};
