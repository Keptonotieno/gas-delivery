import React from 'react';
import { Product } from '../../types';
import { Clock, Zap, ShieldCheck } from 'lucide-react';
import { formatKSh } from '../../utils/format';
import { getBrandConfig } from '../../utils/thikaHighwayData';

interface ProductCardProps {
  product: Product;
  onOrderNow: (product: Product) => void;
  selectedHighwayZoneName?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onOrderNow,
  selectedHighwayZoneName
}) => {
  const getTagStyle = (tag?: string) => {
    switch (tag) {
      case 'Popular':
      case 'Household Choice':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'New Kit':
      case 'Full Setup':
        return 'bg-orange-50 text-[#E04F11] border-orange-200';
      case 'Commercial':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Clean Flame':
      case 'High Performance':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const brandInfo = getBrandConfig(product.brand);
  const isAvailable = product.isAvailable && product.stock > 0;
  const isRefill = product.orderType === 'refill' || product.name.toLowerCase().includes('refill');

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] hover:border-gray-300 p-5 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between">
      {/* Top Details */}
      <div>
        {/* Header Icons & Badges */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {/* Cylinder Vector Graphic Icon with Brand Tint */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: `${brandInfo.color}15`,
                borderColor: `${brandInfo.color}40`,
                color: brandInfo.color
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 stroke-current stroke-2">
                <rect x="7" y="6" width="10" height="15" rx="3" stroke="currentColor" fill="none" />
                <path d="M9 3H15" stroke="currentColor" strokeLinecap="round" />
                <path d="M12 3V6" stroke="currentColor" />
                <path d="M9 11H15" stroke="currentColor" strokeDasharray="1 1" opacity="0.6" />
                <path d="M7 19H17" stroke="currentColor" opacity="0.5" />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Brand Badge */}
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: `${brandInfo.color}10`,
                    borderColor: `${brandInfo.color}35`,
                    color: brandInfo.color
                  }}
                >
                  {product.brand || 'LPG Brand'}
                </span>

                {/* Refill vs Complete Kit */}
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                    isRefill
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {isRefill ? 'Refill Swap' : 'Complete Kit'}
                </span>

                {product.tag && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getTagStyle(
                      product.tag
                    )}`}
                  >
                    {product.tag}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-base text-gray-900 tracking-tight mb-1">
          {product.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-gray-500 leading-relaxed min-h-[32px] mb-3 line-clamp-2">
          {product.description}
        </p>

        {/* Thika Highway Delivery Guarantee Pill */}
        <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-[#FFF8F5] border border-[#FEECE2] text-[11px] text-[#E04F11] flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold">
            <Zap className="w-3 h-3 text-[#E04F11]" />
            <span>Thika Highway Express</span>
          </span>
          <span className="text-gray-600 text-[10px] truncate max-w-[130px]">
            {selectedHighwayZoneName ? `To ${selectedHighwayZoneName.split('/')[0]}` : 'Corridor Direct'}
          </span>
        </div>

        {/* Metadata row (ETA & Stock) */}
        <div className="flex items-center justify-between text-xs py-2 border-t border-gray-100 mb-4 text-gray-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">{product.deliveryTimeEstimate}</span>
          </div>

          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            {isAvailable ? (
              <span className="text-emerald-700 font-semibold">{product.stock} in stock</span>
            ) : (
              <span className="text-red-500 font-semibold">Unavailable</span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Price & Order CTA */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 block">
            {isRefill ? 'Refill Price' : 'Complete Setup'}
          </span>
          <span className="text-base sm:text-lg font-extrabold text-gray-900">
            {formatKSh(product?.price)}
          </span>
        </div>

        <button
          type="button"
          disabled={!isAvailable}
          onClick={() => onOrderNow(product)}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-2xs cursor-pointer ${
            isAvailable
              ? 'bg-[#E04F11] hover:bg-[#C9420A] text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          }`}
        >
          {isAvailable ? 'Order Now' : 'Unavailable'}
        </button>
      </div>
    </div>
  );
};
