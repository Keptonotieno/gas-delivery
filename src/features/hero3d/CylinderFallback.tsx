import React from 'react';
import { GasDeliverLogo } from '../../components/GasDeliverLogo';

interface CylinderFallbackProps {
  className?: string;
}

export const CylinderFallback: React.FC<CylinderFallbackProps> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center p-6 ${className}`}>
      {/* Trio Cylinder Mockup with smooth CSS glow */}
      <div className="relative flex items-end justify-center gap-2 sm:gap-4 select-none">
        {/* Orbital Ring Glow */}
        <div className="absolute -bottom-4 w-72 sm:w-96 h-12 rounded-[100%] border border-amber-300/40 bg-amber-400/10 blur-xs -z-10" />

        {/* 6kg Blue Cylinder */}
        <div className="w-20 sm:w-24 h-36 sm:h-44 bg-gradient-to-br from-blue-500 to-blue-700 rounded-t-3xl rounded-b-2xl shadow-xl flex flex-col items-center justify-between p-2 text-white border-t border-blue-300/40 transform -rotate-3 translate-y-2">
          <div className="w-10 h-3 bg-blue-800 rounded-t-lg border-t border-white/20" />
          <div className="text-center">
            <span className="text-[9px] font-bold tracking-wider block">GasDeliver</span>
            <span className="text-xs font-black block mt-0.5">6KG</span>
          </div>
          <div className="w-14 h-2 bg-blue-900/60 rounded-full" />
        </div>

        {/* 13kg Orange Signature Cylinder (Front Hero) */}
        <div className="w-28 sm:w-36 h-48 sm:h-60 bg-gradient-to-br from-[#FF6B2B] via-[#E04F11] to-[#B33504] rounded-t-4xl rounded-b-3xl shadow-2xl flex flex-col items-center justify-between p-3 text-white border-t border-white/30 z-10 animate-pulse">
          {/* Top Collar Shroud */}
          <div className="w-14 sm:w-16 h-4 sm:h-5 bg-[#C9420A] rounded-t-xl border-t border-white/30 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-amber-300 shadow-xs" />
          </div>

          {/* Center Brand Badge */}
          <div className="text-center my-auto">
            <div className="w-8 h-8 rounded-full bg-white text-[#E04F11] mx-auto flex items-center justify-center shadow-md mb-1.5">
              <GasDeliverLogo variant="light" size="sm" showText={false} />
            </div>
            <span className="text-xs sm:text-sm font-extrabold tracking-tight block">GasDeliver</span>
            <span className="text-[10px] text-orange-100 font-medium block">Safe Gas. On Time.</span>
            <span className="text-base sm:text-xl font-black block mt-1">13KG</span>
          </div>

          {/* Base foot ring */}
          <div className="w-20 sm:w-24 h-3 bg-[#9A2D02] rounded-full border-t border-white/10" />
        </div>

        {/* 50kg Yellow Cylinder */}
        <div className="w-24 sm:w-28 h-44 sm:h-52 bg-gradient-to-br from-amber-400 to-amber-600 rounded-t-3xl rounded-b-2xl shadow-xl flex flex-col items-center justify-between p-2 text-white border-t border-amber-200/40 transform rotate-3 translate-y-1">
          <div className="w-12 h-3.5 bg-amber-700 rounded-t-lg border-t border-white/20" />
          <div className="text-center">
            <span className="text-[9px] font-bold tracking-wider block">GasDeliver</span>
            <span className="text-sm font-black block mt-0.5">50KG</span>
          </div>
          <div className="w-16 h-2 bg-amber-800/60 rounded-full" />
        </div>
      </div>
    </div>
  );
};
