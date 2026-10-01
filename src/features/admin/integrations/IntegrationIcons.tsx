import React from 'react';
import { 
  CreditCard, 
  Smartphone, 
  Store, 
  Receipt, 
  Mail, 
  MapPin, 
  Flame, 
  Briefcase, 
  Scale, 
  MessageSquare, 
  Truck, 
  Globe, 
  Layers, 
  ShieldCheck 
} from 'lucide-react';

interface IntegrationIconProps {
  iconKey: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const IntegrationIcon: React.FC<IntegrationIconProps> = ({ 
  iconKey, 
  className = '', 
  size = 'md' 
}) => {
  const containerClasses = {
    sm: 'w-8 h-8 rounded-lg text-xs',
    md: 'w-11 h-11 rounded-xl text-sm',
    lg: 'w-14 h-14 rounded-2xl text-base'
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7'
  }[size];

  switch (iconKey) {
    case 'mpesa':
      return (
        <div className={`${containerClasses} bg-white border border-emerald-200 shadow-2xs flex flex-col items-center justify-center p-1 font-black text-[#00A859] shrink-0 ${className}`}>
          <div className="w-full flex items-center justify-center">
            <span className="text-[10px] leading-none tracking-tighter font-extrabold text-emerald-600">M-PESA</span>
          </div>
          <div className="w-4 h-1 bg-[#00A859] rounded-full mt-0.5" />
        </div>
      );

    case 'daraja':
      return (
        <div className={`${containerClasses} bg-white border border-red-200 shadow-2xs flex flex-col items-center justify-center p-1 text-[#E02626] shrink-0 ${className}`}>
          <div className="flex items-center gap-0.5">
            <span className="text-[9px] font-black text-emerald-600">S</span>
            <span className="text-[9px] font-bold text-red-600 tracking-tighter">Daraja</span>
          </div>
          <div className="w-5 h-0.5 bg-red-500 rounded-full mt-0.5" />
        </div>
      );

    case 'pesa':
      return (
        <div className={`${containerClasses} bg-[#0284C7] text-white flex items-center justify-center shadow-2xs shrink-0 ${className}`}>
          <span className="font-extrabold tracking-tighter text-xs">Pesa</span>
        </div>
      );

    case 'till':
      return (
        <div className={`${containerClasses} bg-[#1E293B] text-white flex items-center justify-center shadow-2xs shrink-0 ${className}`}>
          <Receipt className={iconSizes} />
        </div>
      );

    case 'paybill':
      return (
        <div className={`${containerClasses} bg-slate-900 text-amber-400 flex items-center justify-center shadow-2xs shrink-0 ${className}`}>
          <Store className={iconSizes} />
        </div>
      );

    case 'sms':
      return (
        <div className={`${containerClasses} bg-blue-500 text-white flex items-center justify-center shadow-2xs shrink-0 ${className}`}>
          <Mail className={iconSizes} />
        </div>
      );

    case 'maps':
      return (
        <div className={`${containerClasses} bg-white border border-slate-200 text-red-500 flex items-center justify-center shadow-2xs shrink-0 ${className}`}>
          <div className="relative">
            <MapPin className={`${iconSizes} text-red-500 fill-red-500`} />
            <div className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        </div>
      );

    case 'firebase':
      return (
        <div className={`${containerClasses} bg-amber-500 text-white flex items-center justify-center shadow-2xs shrink-0 ${className}`}>
          <Flame className={`${iconSizes} fill-white`} />
        </div>
      );

    case 'workspace':
      return (
        <div className={`${containerClasses} bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-2xs shrink-0 ${className}`}>
          <Briefcase className={iconSizes} />
        </div>
      );

    case 'judiciary':
      return (
        <div className={`${containerClasses} bg-emerald-800 text-amber-300 flex items-center justify-center shadow-2xs shrink-0 ${className}`}>
          <Scale className={iconSizes} />
        </div>
      );

    case 'whatsapp':
      return (
        <div className={`${containerClasses} bg-[#25D366] text-white flex items-center justify-center shadow-2xs shrink-0 ${className}`}>
          <MessageSquare className={`${iconSizes} fill-white`} />
        </div>
      );

    case 'truck':
      return (
        <div className={`${containerClasses} bg-indigo-600 text-white flex items-center justify-center shadow-2xs shrink-0 ${className}`}>
          <Truck className={iconSizes} />
        </div>
      );

    default:
      return (
        <div className={`${containerClasses} bg-slate-700 text-white flex items-center justify-center shadow-2xs shrink-0 ${className}`}>
          <Globe className={iconSizes} />
        </div>
      );
  }
};
