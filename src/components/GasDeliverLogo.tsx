import React from 'react';

interface GasDeliverLogoProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const GasDeliverLogo: React.FC<GasDeliverLogoProps> = ({
  variant = 'dark',
  size = 'md',
  showText = true,
  className = ''
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  const isLight = variant === 'light';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Mark Icon: Orange container with Gas/Flame & droplet motif */}
      <div
        className={`${iconSizes[size]} rounded-full flex items-center justify-center shadow-xs transition-transform ${
          isLight ? 'bg-white text-[#E04F11]' : 'bg-[#E04F11] text-white'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-4/5 h-4/5"
        >
          {/* Flame & inner gas teardrop */}
          <path
            d="M12 2C10.5 4.5 9 6.8 9 9.5C9 11.2 9.7 12.7 10.8 13.8C10.3 12.9 10 11.7 10 10.5C10 8.5 11 6.8 12 5.5C13 6.8 14 8.5 14 10.5C14 11.7 13.7 12.9 13.2 13.8C14.3 12.7 15 11.2 15 9.5C15 6.8 13.5 4.5 12 2Z"
            fill="currentColor"
          />
          <path
            d="M12 11C11.1716 11 10.5 11.6716 10.5 12.5C10.5 14.1569 11.1716 15.5 12 16.5C12.8284 15.5 13.5 14.1569 13.5 12.5C13.5 11.6716 12.8284 11 12 11Z"
            fill={isLight ? '#E04F11' : '#FFFFFF'}
          />
          <path
            d="M6 14.5C6 11.8 7.3 9.4 9 8C7.5 9.8 6.8 12 6.8 14.5C6.8 17.5 9.1 20 12 20C14.9 20 17.2 17.5 17.2 14.5C17.2 12 16.5 9.8 15 8C16.7 9.4 18 11.8 18 14.5C18 18.1 15.3 21 12 21C8.7 21 6 18.1 6 14.5Z"
            fill="currentColor"
            opacity="0.9"
          />
        </svg>
      </div>

      {showText && (
        <span
          className={`font-extrabold tracking-tight ${textSizes[size]} ${
            isLight ? 'text-white' : 'text-[#111827]'
          }`}
        >
          GasDeliver
        </span>
      )}
    </div>
  );
};
