import React from 'react';
import { TrendingUp, TrendingDown, Star, CheckCircle, Wallet, Award } from 'lucide-react';
import { Driver, DriverEarningsSummary } from '../../types';
import { formatKSh } from '../../utils/format';

interface DriverStatsSectionProps {
  driver: Driver | null;
  earnings: DriverEarningsSummary | null;
  completedOrdersCount: number;
  isLoading?: boolean;
}

export const DriverStatsSection: React.FC<DriverStatsSectionProps> = ({
  driver,
  earnings,
  completedOrdersCount,
  isLoading = false
}) => {
  // 1. Calculate Successful Deliveries & Yesterday comparison
  // Prefer real earnings.today.deliveriesCount, fallback to completedOrdersCount
  const successfulDeliveries = earnings?.today?.deliveriesCount ?? completedOrdersCount ?? 0;
  
  // Find yesterday's deliveries from weekly history (the day before the last/today entry)
  const history = earnings?.weekly?.dailyHistory || [];
  const yesterdayData = history.length >= 2 ? history[history.length - 2] : null;

  const deliveriesComparison = React.useMemo(() => {
    if (!yesterdayData || yesterdayData.deliveriesCount === 0) return null;
    const diff = successfulDeliveries - yesterdayData.deliveriesCount;
    const pct = Math.round((diff / yesterdayData.deliveriesCount) * 100);
    return {
      pct: Math.abs(pct),
      isUp: pct >= 0,
      diff
    };
  }, [successfulDeliveries, yesterdayData]);

  // 2. Today's Earnings & Yesterday comparison
  const todayEarningsKSh = earnings?.today?.totalKSh ?? 0;
  const earningsComparison = React.useMemo(() => {
    if (!yesterdayData || yesterdayData.totalIncome === 0) return null;
    const diff = todayEarningsKSh - yesterdayData.totalIncome;
    const pct = Math.round((diff / yesterdayData.totalIncome) * 100);
    return {
      pct: Math.abs(pct),
      isUp: pct >= 0,
      diff
    };
  }, [todayEarningsKSh, yesterdayData]);

  // 3. Current Rating & Performance Label
  const rating = driver?.rating ?? 0;
  const ratingLabel = React.useMemo(() => {
    if (!rating || rating === 0) return { label: 'New Driver', color: 'text-gray-500', bg: 'bg-gray-100' };
    if (rating >= 4.8) return { label: 'Excellent', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    if (rating >= 4.5) return { label: 'Very Good', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' };
    if (rating >= 4.0) return { label: 'Good', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
    return { label: 'Requires Review', color: 'text-red-700', bg: 'bg-red-50 border-red-200' };
  }, [rating]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs animate-pulse">
            <div className="h-3 w-28 bg-gray-200 rounded-sm mb-3" />
            <div className="h-8 w-20 bg-gray-200 rounded-md mb-2" />
            <div className="h-4 w-32 bg-gray-100 rounded-sm" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section aria-label="Driver Operational Statistics" className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* STAT 1: SUCCESSFUL DELIVERIES */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Successful Deliveries
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5">
            <span className="text-3xl font-extrabold font-mono text-gray-950 tracking-tight block">
              {successfulDeliveries}
            </span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
            {deliveriesComparison ? (
              <div className="flex items-center gap-1 font-semibold">
                {deliveriesComparison.isUp ? (
                  <span className="inline-flex items-center text-emerald-600">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                    ↑ {deliveriesComparison.pct}%
                  </span>
                ) : (
                  <span className="inline-flex items-center text-amber-600">
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                    ↓ {deliveriesComparison.pct}%
                  </span>
                )}
                <span className="text-gray-500 font-normal">vs yesterday</span>
              </div>
            ) : (
              <span className="text-gray-500">Today's completed deliveries</span>
            )}
            <span className="text-[11px] text-gray-400 font-mono">
              {earnings?.today?.cylindersCount ?? successfulDeliveries} cyl
            </span>
          </div>
        </div>

        {/* STAT 2: TODAY'S EARNINGS */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Today's Earnings
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5">
            <span className="text-3xl font-extrabold font-mono text-emerald-600 tracking-tight block">
              {formatKSh(todayEarningsKSh)}
            </span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
            {earningsComparison ? (
              <div className="flex items-center gap-1 font-semibold">
                {earningsComparison.isUp ? (
                  <span className="inline-flex items-center text-emerald-600">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                    ↑ {earningsComparison.pct}%
                  </span>
                ) : (
                  <span className="inline-flex items-center text-amber-600">
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                    ↓ {earningsComparison.pct}%
                  </span>
                )}
                <span className="text-gray-500 font-normal">vs yesterday</span>
              </div>
            ) : (
              <span className="text-gray-500">Calculated from completed runs</span>
            )}
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
              Base + Bonus
            </span>
          </div>
        </div>

        {/* STAT 3: CURRENT RATING */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Current Rating
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-gray-950 tracking-tight">
              {rating > 0 ? `${rating.toFixed(1)} ★` : '—'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${ratingLabel.bg} ${ratingLabel.color}`}>
              {ratingLabel.label}
            </span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {rating > 0 ? 'Customer satisfaction score' : 'No ratings recorded yet'}
            </span>
            {rating > 0 && (
              <span className="text-[11px] text-gray-500 font-medium">
                {Math.round((rating / 5) * 100)}% positive
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
