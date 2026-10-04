import React from 'react';
import { Product } from '../../types';
import { Clock, ShieldCheck, Check } from 'lucide-react';
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
  const brandInfo = getBrandConfig(product.brand);
  const isAvailable = product.isAvailable && product.stock > 0;
  const isRefill = product.orderType === 'refill' || product.name.toLowerCase().includes('refill');

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 p-5 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between group">
      {/* Top Details */}
      <div>
        {/* Unboxed Metadata Kicker */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: brandInfo.color }}
            />
            <span className="font-bold text-gray-900">{product.brand || 'LPG Brand'}</span>
            <span aria-hidden="true" className="text-gray-300">·</span>
            <span>{isRefill ? 'Refill Swap' : 'Complete Setup'}</span>
          </div>

          {product.tag && (
            <span className="text-[11px] font-semibold text-orange-700">
              {product.tag}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-base text-gray-900 tracking-tight mb-1 group-hover:text-blue-900 transition-colors">
          {product.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-gray-500 leading-relaxed min-h-[32px] mb-3 line-clamp-2">
          {product.description}
        </p>

        {/* Corridor Delivery Estimate */}
        <div className="flex items-center justify-between text-xs py-2.5 border-t border-gray-100 mb-3 text-gray-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">{product.deliveryTimeEstimate}</span>
            <span aria-hidden="true" className="text-gray-300">·</span>
            <span className="text-gray-500 truncate max-w-[130px]">
              {selectedHighwayZoneName ? selectedHighwayZoneName.split('/')[0] : 'Express Corridor'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            {isAvailable ? (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>{product.stock} in stock</span>
              </span>
            ) : (
              <span className="text-rose-600 font-medium">Out of stock</span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Price & Order CTA */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            {isRefill ? 'Refill Price' : 'Complete Kit'}
          </span>
          <span className="text-lg font-bold text-gray-900 tabular-nums">
            {formatKSh(product?.price)}
          </span>
        </div>

        <button
          type="button"
          disabled={!isAvailable}
          onClick={() => onOrderNow(product)}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-[0.98] ${
            isAvailable
              ? 'bg-[#E04F11] hover:bg-[#C9420A] text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          }`}
        >
          {isAvailable ? 'Order Refill' : 'Unavailable'}
        </button>
      </div>
    </div>
  );
};
