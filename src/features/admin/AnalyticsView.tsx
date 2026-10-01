import React from 'react';
import { DashboardMetrics, Order } from '../../types';
import { TrendingUp, CheckCircle2, DollarSign, Users, Award, Target, Truck } from 'lucide-react';
import { formatKSh } from '../../utils/format';
import { HourlyOrderDistributionChart } from './HourlyOrderDistributionChart';

interface AnalyticsViewProps {
  metrics: DashboardMetrics;
  orders?: Order[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  metrics,
  orders = [],
  isLoading = false,
  onRefresh
}) => {
  const revenue = metrics?.totalRevenueToday ?? metrics?.revenueToday ?? 0;
  const delivered = metrics?.deliveredToday ?? metrics?.statusDistribution?.delivered ?? 0;
  const slaRate = metrics?.slaComplianceRate ?? metrics?.onTimeRatePercent ?? 100;
  const activeDrivers = metrics?.activeDrivers ?? metrics?.activeDriversCount ?? 0;
  const totalDrivers = metrics?.totalDrivers ?? metrics?.totalDriversCount ?? 0;
  const coveragePercent = totalDrivers > 0 ? Math.round((activeDrivers / totalDrivers) * 100) : 0;

  const numericSla = typeof slaRate === 'number' && !isNaN(slaRate) ? slaRate : 100;
  const slaTarget = 95.0;
  const slaDiff = Number((numericSla - slaTarget).toFixed(1));

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards Matching Reference Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/60">
              <DollarSign className="w-5 h-5" />
            </div>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-2">
            Today's Revenue
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {formatKSh(revenue)}
          </p>
          <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">
            {metrics?.revenueTodayDeltaPercent ? `↑ +${metrics.revenueTodayDeltaPercent}% vs prior day` : 'Real-time billing'}
          </span>
        </div>

        {/* Card 2: Completed Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/60">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-2">
            Completed Orders
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {delivered}
          </p>
          <span className="text-xs text-slate-500 font-medium mt-1 inline-block">
            Across all Nairobi hubs
          </span>
        </div>

        {/* Card 3: SLA Met Ratio */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100/60">
              <Award className="w-5 h-5" />
            </div>
            <Target className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-2">
            SLA Met Ratio
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {numericSla.toFixed(1)}%
          </p>
          {slaDiff > 0 ? (
            <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">
              +{slaDiff.toFixed(1)} pp exceeds 95% target
            </span>
          ) : slaDiff === 0 ? (
            <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">
              Meets 95.0% target
            </span>
          ) : (
            <span className="text-xs text-amber-600 font-semibold mt-1 inline-block">
              ↓ {Math.abs(slaDiff).toFixed(1)} pp below target
            </span>
          )}
        </div>

        {/* Card 4: Fleet Utilization */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/60">
              <Truck className="w-5 h-5" />
            </div>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-2">
            Fleet Utilization
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {activeDrivers} / {totalDrivers} Online
          </p>
          <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">
            ↑ {coveragePercent}% shift coverage
          </span>
        </div>
      </div>

      {/* Redesigned Modern Enterprise Analytics Chart */}
      <HourlyOrderDistributionChart
        metrics={metrics}
        orders={orders}
        isLoading={isLoading}
        onRefresh={onRefresh}
      />
    </div>
  );
};

