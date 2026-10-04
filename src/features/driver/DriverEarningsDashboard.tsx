import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Wallet,
  Calendar,
  Clock,
  Award,
  Target,
  Zap,
  CheckCircle2,
  ChevronRight,
  Flame,
  RefreshCw,
  X,
  AlertCircle,
  Package,
  ArrowUpRight,
  Check
} from 'lucide-react';
import { DriverEarningsSummary, DriverIncentiveChallenge, DriverRecentPayout } from '../../types';
import { api } from '../../services/api';
import { formatKSh } from '../../utils/format';

interface DriverEarningsDashboardProps {
  driverId: string;
  driverName?: string;
  onRefreshNeeded?: () => void;
}

export const DriverEarningsDashboard: React.FC<DriverEarningsDashboardProps> = ({
  driverId,
  driverName,
  onRefreshNeeded
}) => {
  const [data, setData] = useState<DriverEarningsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // View mode toggle: weekly vs daily
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');

  // Cashout Modal State
  const [showCashoutModal, setShowCashoutModal] = useState<boolean>(false);
  const [cashoutAmount, setCashoutAmount] = useState<string>('');
  const [isProcessingCashout, setIsProcessingCashout] = useState<boolean>(false);
  const [cashoutSuccessMessage, setCashoutSuccessMessage] = useState<string | null>(null);
  const [cashoutError, setCashoutError] = useState<string | null>(null);

  // Load earnings data
  const loadEarnings = useCallback(async () => {
    try {
      setError(null);
      const earnings = await api.getDriverEarnings(driverId);
      setData(earnings);
    } catch (err: any) {
      setError(err.message || 'Failed to load earnings dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driverId]);

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadEarnings();
    if (onRefreshNeeded) onRefreshNeeded();
  };

  const handleOpenCashout = () => {
    if (!data) return;
    setCashoutAmount(String(data.wallet.availableForCashoutKSh));
    setCashoutError(null);
    setShowCashoutModal(true);
  };

  const handleExecuteCashout = async () => {
    if (!data) return;
    const amountNum = Number(cashoutAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setCashoutError('Please enter a valid cashout amount.');
      return;
    }
    if (amountNum > data.wallet.availableForCashoutKSh) {
      setCashoutError(`Amount exceeds available balance of ${formatKSh(data.wallet.availableForCashoutKSh)}.`);
      return;
    }
    if (amountNum < 500) {
      setCashoutError('Minimum M-Pesa withdrawal is KSh 500.');
      return;
    }

    setIsProcessingCashout(true);
    setCashoutError(null);
    try {
      const res = await api.requestDriverCashout(driverId, amountNum);
      setCashoutSuccessMessage(res.message);
      // Reload updated wallet
      await loadEarnings();
      setTimeout(() => {
        setCashoutSuccessMessage(null);
        setShowCashoutModal(false);
      }, 3500);
    } catch (err: any) {
      setCashoutError(err.message || 'Cashout processing failed. Please retry.');
    } finally {
      setIsProcessingCashout(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-xs flex flex-col items-center justify-center min-h-[360px]">
        <div className="w-10 h-10 border-3 border-gray-200 border-t-[#E04F11] rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-gray-700">Loading Earnings & Incentives...</p>
        <p className="text-xs text-gray-400 mt-1">Reconciling delivery payouts and bonuses</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-6 text-center shadow-xs">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-gray-900">Failed to Load Earnings</h3>
        <p className="text-xs text-gray-500 mt-1 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const earnings = data!;

  // Custom Tooltip for Weekly Recharts
  const CustomWeeklyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dayData = payload[0].payload;
      return (
        <div className="bg-gray-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[160px] border border-gray-800">
          <div className="flex items-center justify-between border-b border-gray-800 pb-1 font-bold">
            <span>{label} ({dayData.date})</span>
            {dayData.isToday && (
              <span className="text-[10px] bg-[#E04F11] text-white px-1.5 py-0.2 rounded">Today</span>
            )}
          </div>
          <div className="space-y-1 text-[11px] text-gray-300">
            <div className="flex justify-between">
              <span>Base Fare:</span>
              <span className="font-mono text-white">{formatKSh(dayData.baseFare)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-400">Cylinders Commission:</span>
              <span className="font-mono text-orange-400">{formatKSh(dayData.cylinderCommission)}</span>
            </div>
            {dayData.bonus > 0 && (
              <div className="flex justify-between">
                <span className="text-emerald-400">Streak Bonus:</span>
                <span className="font-mono text-emerald-400">{formatKSh(dayData.bonus)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-emerald-300">Tips:</span>
              <span className="font-mono text-emerald-300">{formatKSh(dayData.tips)}</span>
            </div>
            <div className="border-t border-gray-800 pt-1 flex justify-between font-bold text-white text-xs">
              <span>Total:</span>
              <span className="font-mono text-[#E04F11]">{formatKSh(dayData.totalIncome)}</span>
            </div>
            <div className="text-[10px] text-gray-400 pt-0.5 flex justify-between">
              <span>Volume:</span>
              <span>{dayData.deliveriesCount} trips · {dayData.cylindersCount} cylinders</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Daily Recharts
  const CustomDailyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-gray-900 text-white p-2.5 rounded-xl shadow-xl text-xs space-y-1 border border-gray-800 min-w-[140px]">
          <p className="font-bold text-gray-200">{label}</p>
          <div className="flex justify-between text-xs font-bold text-[#E04F11]">
            <span>Earned:</span>
            <span className="font-mono">{formatKSh(item.amount)}</span>
          </div>
          <p className="text-[10px] text-gray-400">
            {item.deliveries} delivery{item.deliveries !== 1 ? 's' : ''} ({item.cylinders} cylinder{item.cylinders !== 1 ? 's' : ''})
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 text-left">
      {/* Top Header Card with Quick Stats & Instant Cashout */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-800 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-[#E04F11]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-3 relative z-10 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#E04F11]/20 text-orange-400 border border-[#E04F11]/30 rounded text-[11px] font-bold tracking-wide uppercase">
                Driver Payouts
              </span>
              <span className="text-xs text-gray-400 font-medium">
                {earnings.driverName || driverName || 'Courier'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
              Earnings & Incentives
            </h1>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
            title="Refresh earnings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-400' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>

        {/* 3 Core Primary KPI Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
          {/* Today's Income */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span className="font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                Today's Payout
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />
                Live
              </span>
            </div>
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {formatKSh(earnings.today.totalKSh)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1 pt-1.5 border-t border-white/5">
              <span>{earnings.today.deliveriesCount} deliveries · {earnings.today.cylindersCount} cyl</span>
              <span className="text-emerald-400 font-medium">
                ~{formatKSh(earnings.today.avgPerDeliveryKSh)}/trip
              </span>
            </div>
          </div>

          {/* Weekly Total */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span className="font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-orange-400" />
                This Week Total
              </span>
              <span className="text-[11px] text-gray-400 font-mono">
                {earnings.weekly.deliveriesCount} trips
              </span>
            </div>
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {formatKSh(earnings.weekly.totalKSh)}
            </div>
            {/* Weekly Target Progress bar */}
            <div className="mt-1.5 pt-1 border-t border-white/5 space-y-1">
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>Goal: {earnings.weekly.targetDeliveries} trips</span>
                <span className="text-orange-400 font-bold">{earnings.weekly.targetProgressPercent}%</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${earnings.weekly.targetProgressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* M-Pesa Wallet Balance & Instant Cashout */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span className="font-medium flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  Available Wallet
                </span>
                <span className="text-[10px] text-gray-400">M-Pesa B2C</span>
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                {formatKSh(earnings.wallet.availableForCashoutKSh)}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleOpenCashout}
                className="w-full py-2 px-3 bg-[#E04F11] hover:bg-[#c2410c] active:bg-[#a53609] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Instant M-Pesa Cashout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Segmented Controls (Weekly Income vs Today's Rhythm) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#E04F11]" />
              Income Visualizer (Recharts)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {viewMode === 'weekly'
                ? 'Daily income breakdown across the 7-day work week'
                : "Today's hourly delivery rhythm & cumulative payouts"}
            </p>
          </div>

          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'weekly'
                  ? 'bg-white text-gray-900 shadow-xs font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Weekly Overview
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-white text-gray-900 shadow-xs font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Today's Rhythm
            </button>
          </div>
        </div>

        {/* Visualizer Chart Container */}
        <div className="w-full h-64 sm:h-72">
          {viewMode === 'weekly' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={earnings.weekly.dailyHistory}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border, #E5E7EB)" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border, #E5E7EB)' }}
                  tick={{ fill: 'var(--text-muted, #6B7280)', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border, #E5E7EB)' }}
                  tick={{ fill: 'var(--text-muted, #6B7280)', fontSize: 10 }}
                  tickFormatter={(val) => `KSh ${val}`}
                />
                <Tooltip content={<CustomWeeklyTooltip />} cursor={{ fill: 'var(--chart-cursor, rgba(0, 0, 0, 0.04))' }} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                />
                <Bar
                  dataKey="baseFare"
                  name="Base Pay"
                  stackId="income"
                  fill="#64748B"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="cylinderCommission"
                  name="Cylinder Commission"
                  stackId="income"
                  fill="#E04F11"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="bonus"
                  name="Streak Bonus"
                  stackId="income"
                  fill="#F59E0B"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="tips"
                  name="Customer Tips"
                  stackId="income"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={earnings.today.hourlyTimeline}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E04F11" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#E04F11" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border, #E5E7EB)" />
                <XAxis
                  dataKey="hour"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border, #E5E7EB)' }}
                  tick={{ fill: 'var(--text-muted, #6B7280)', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border, #E5E7EB)' }}
                  tick={{ fill: 'var(--text-muted, #6B7280)', fontSize: 10 }}
                  tickFormatter={(val) => `KSh ${val}`}
                />
                <Tooltip content={<CustomDailyTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  name="Earned"
                  stroke="#E04F11"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorEarnings)"
                  activeDot={{ r: 6, fill: '#E04F11', stroke: 'var(--card-bg, #FFFFFF)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Weekly & Daily Summary Breakdown Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-gray-100">
          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
              Base Delivery Fees
            </span>
            <span className="text-sm font-black text-gray-900 font-mono mt-0.5 block">
              {formatKSh(viewMode === 'weekly' ? earnings.weekly.baseFare : earnings.today.baseFare)}
            </span>
          </div>

          <div className="p-2.5 bg-orange-50/60 rounded-xl border border-orange-100">
            <span className="text-[10px] text-orange-700 font-bold uppercase tracking-wider block">
              Cylinder Commissions
            </span>
            <span className="text-sm font-black text-[#E04F11] font-mono mt-0.5 block">
              {formatKSh(viewMode === 'weekly' ? earnings.weekly.cylinderCommission : earnings.today.cylinderCommission)}
            </span>
          </div>

          <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
            <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">
              Streak Bonuses
            </span>
            <span className="text-sm font-black text-amber-700 font-mono mt-0.5 block">
              {formatKSh(viewMode === 'weekly' ? earnings.weekly.bonus : earnings.today.bonus)}
            </span>
          </div>

          <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
              Customer Tips
            </span>
            <span className="text-sm font-black text-emerald-700 font-mono mt-0.5 block">
              {formatKSh(viewMode === 'weekly' ? earnings.weekly.tips : earnings.today.tips)}
            </span>
          </div>
        </div>
      </div>

      {/* Gamified Retention & Motivation Challenges (Driver Engagement) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              Retention Quests & Tier Bonuses
            </h2>
            <p className="text-xs text-gray-500">
              Complete active challenges to boost your weekly income by up to KSh 5,000+
            </p>
          </div>
          <span className="text-xs font-bold text-[#E04F11] flex items-center gap-1 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
            <Flame className="w-3.5 h-3.5 text-[#E04F11]" />
            Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {earnings.incentives.map((challenge: DriverIncentiveChallenge) => {
            const progressPercent = Math.min(100, Math.round((challenge.current / challenge.target) * 100));
            return (
              <div
                key={challenge.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  challenge.isCompleted
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        challenge.isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-700'
                      }`}
                    >
                      {challenge.isCompleted ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : challenge.type === 'rush_hour' ? (
                        <Zap className="w-4 h-4 text-orange-500 fill-current" />
                      ) : (
                        <Target className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 leading-tight">
                        {challenge.title}
                      </h3>
                      <span className="text-[11px] text-gray-500 block leading-tight mt-0.5">
                        {challenge.deadlineText}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md shrink-0 ${
                      challenge.isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    +{formatKSh(challenge.rewardKSh)}
                  </span>
                </div>

                <p className="text-[11px] text-gray-600 mt-1">
                  {challenge.description}
                </p>

                {/* Progress bar */}
                <div className="mt-2.5 space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-500 font-semibold">
                    <span>
                      Progress: {challenge.current} / {challenge.target} {challenge.unit}
                    </span>
                    <span className={challenge.isCompleted ? 'text-emerald-700 font-bold' : 'text-gray-700'}>
                      {challenge.isCompleted ? 'Unlocked!' : `${progressPercent}%`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        challenge.isCompleted
                          ? 'bg-emerald-500'
                          : 'bg-[#E04F11]'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Delivery Payouts Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-gray-700" />
              Recent Delivered Orders & Settlement
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Transparent itemized breakdown per completed customer drop-off
            </p>
          </div>
          <span className="text-[11px] font-mono text-gray-400">
            {earnings.recentPayoutDeliveries.length} trips listed
          </span>
        </div>

        <div className="space-y-2">
          {earnings.recentPayoutDeliveries.map((payout: DriverRecentPayout) => (
            <div
              key={payout.id}
              className="p-3 rounded-xl border border-gray-200 hover:border-gray-300 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-gray-900">#{payout.id}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs font-semibold text-gray-800">{payout.customerArea}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-gray-500 mt-0.5">
                    <span>{payout.cylinderType} (x{payout.quantity})</span>
                    <span>·</span>
                    <span className="text-gray-400">{payout.time}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Payout breakdown */}
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:border-l sm:border-gray-200 sm:pl-4">
                <div className="text-left sm:text-right text-[11px] text-gray-500">
                  <span className="block">
                    Base {formatKSh(payout.baseFare)} + Comm {formatKSh(payout.cylinderBonus)}
                    {payout.tip > 0 ? ` + Tip ${formatKSh(payout.tip)}` : ''}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center sm:justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {payout.status} to Wallet
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-gray-900 font-mono block">
                    {formatKSh(payout.totalKSh)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* M-Pesa Instant Cashout Modal */}
      {showCashoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Instant M-Pesa B2C Cashout</h3>
                  <p className="text-[11px] text-gray-500">Zero transaction fees for GasDeliver fleet</p>
                </div>
              </div>
              <button
                onClick={() => setShowCashoutModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cashoutSuccessMessage ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-emerald-900 text-sm">Withdrawal Successful!</h4>
                <p className="text-xs text-emerald-800">{cashoutSuccessMessage}</p>
                <p className="text-[11px] text-emerald-600">Funds reflected on your Safaricom M-Pesa line.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Available Balance Box */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-gray-500 block">Available Balance</span>
                    <span className="text-lg font-black text-gray-900 font-mono">
                      {formatKSh(earnings.wallet.availableForCashoutKSh)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCashoutAmount(String(earnings.wallet.availableForCashoutKSh))}
                    className="px-2.5 py-1 text-xs font-bold text-[#E04F11] bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 cursor-pointer"
                  >
                    Cash Out All
                  </button>
                </div>

                {/* Amount input */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Withdrawal Amount (KSh)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-gray-400 text-sm">KSh</span>
                    <input
                      type="number"
                      value={cashoutAmount}
                      onChange={(e) => setCashoutAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      min={500}
                      max={earnings.wallet.availableForCashoutKSh}
                      className="w-full pl-12 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-base font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E04F11]"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Minimum withdrawal: KSh 500 · Recipient: {earnings.wallet.mpesaPhoneNumber}
                  </span>
                </div>

                {cashoutError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{cashoutError}</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCashoutModal(false)}
                    disabled={isProcessingCashout}
                    className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteCashout}
                    disabled={isProcessingCashout || earnings.wallet.availableForCashoutKSh <= 0}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isProcessingCashout ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending to M-Pesa...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Confirm Transfer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
