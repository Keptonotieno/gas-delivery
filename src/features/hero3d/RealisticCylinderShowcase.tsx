import React from 'react';
import heroImage from '../../assets/images/gas_cylinders_hero_banner_1789336751681.jpg';

interface RealisticCylinderShowcaseProps {
  className?: string;
}

export const RealisticCylinderShowcase: React.FC<RealisticCylinderShowcaseProps> = ({
  className = ''
}) => {
  return (
    <div
      id="realistic-gas-cylinder-showcase"
      className={`relative w-full flex items-center justify-center select-none ${className}`}
    >
      {/* Visual Container with realistic image */}
      <div className="relative w-full max-w-[560px] aspect-[4/3] flex items-center justify-center">
        {/* Soft Golden Ambient Glow behind cylinders */}
        <div className="absolute inset-4 rounded-full bg-radial from-amber-400/20 via-orange-500/10 to-transparent blur-2xl pointer-events-none" />

        {/* Photorealistic Gas Cylinder Image matching design reference */}
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={heroImage}
            alt="Realistic 3D GasDeliver LPG gas cylinders: 13kg orange cylinder, 6kg blue cylinder, and 50kg yellow cylinder"
            referrerPolicy="no-referrer"
            loading="eager"
            className="w-full h-full object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.35)] rounded-2xl"
          />
        </div>
      </div>
    </div>
  );
};
