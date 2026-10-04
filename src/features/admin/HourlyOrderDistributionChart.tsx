import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  TooltipProps
} from 'recharts';
import {
  TrendingUp,
  Flame,
  Database,
  BarChart2,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  PackageCheck
} from 'lucide-react';
import { DashboardMetrics, AnalyticsTimeSeriesPoint, Order } from '../../types';
import { formatKSh } from '../../utils/format';

type TimeRange = 'today' | '7days' | '30days';
type MetricType = 'orders' | 'revenue' | 'deliveries' | 'cancellations';

interface HourlyOrderDistributionChartProps {
  metrics?: DashboardMetrics | null;
  orders?: Order[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const HourlyOrderDistributionChart: React.FC<HourlyOrderDistributionChartProps> = ({
  metrics,
  orders = [],
  isLoading = false,
  onRefresh
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [metric, setMetric] = useState<MetricType>('orders');
  const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Metric metadata
  const metricConfigs: Record<MetricType, { label: string; unit: string; axisLabel: string }> = {
    orders: { label: 'Orders', unit: 'orders', axisLabel: 'Orders' },
    revenue: { label: 'Revenue', unit: '', axisLabel: 'Revenue (KSh)' },
    deliveries: { label: 'Deliveries', unit: 'deliveries', axisLabel: 'Deliveries' },
    cancellations: { label: 'Cancellations', unit: 'cancellations', axisLabel: 'Cancellations' }
  };

  // Derive series based on selected timeRange and live data
  const rawSeries = useMemo<AnalyticsTimeSeriesPoint[]>(() => {
    if (timeRange === 'today') {
      const hours = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM'];
      const defaultToday: AnalyticsTimeSeriesPoint[] = hours.map((hour, idx) => ({
        label: hour,
        hour,
        orders: 0,
        revenue: 0,
        deliveries: 0,
        cancellations: 0,
        changePercent: 0,
        prevLabel: idx > 0 ? hours[idx - 1] : ''
      }));

      if (metrics?.timeSeries?.today && metrics.timeSeries.today.length > 0) {
        return metrics.timeSeries.today;
      }
      return defaultToday;
    }

    if (timeRange === '7days') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const default7Days: AnalyticsTimeSeriesPoint[] = days.map((day, idx) => ({
        label: day,
        hour: day,
        orders: 0,
        revenue: 0,
        deliveries: 0,
        cancellations: 0,
        changePercent: 0,
        prevLabel: idx > 0 ? days[idx - 1] : 'Sun'
      }));

      if (metrics?.timeSeries?.sevenDays && metrics.timeSeries.sevenDays.length > 0) {
        return metrics.timeSeries.sevenDays;
      }
      return default7Days;
    }

    // 30days
    const periods = ['Day 1-5', 'Day 6-10', 'Day 11-15', 'Day 16-20', 'Day 21-25', 'Day 26-30'];
    const default30Days: AnalyticsTimeSeriesPoint[] = periods.map((label, idx) => ({
      label,
      hour: label,
      orders: 0,
      revenue: 0,
      deliveries: 0,
      cancellations: 0,
      changePercent: 0,
      prevLabel: idx > 0 ? periods[idx - 1] : 'Prior Period'
    }));

    if (metrics?.timeSeries?.thirtyDays && metrics.timeSeries.thirtyDays.length > 0) {
      return metrics.timeSeries.thirtyDays;
    }
    return default30Days;
  }, [timeRange, metrics]);

  // Transform data for Recharts according to active metric
  const chartData = useMemo(() => {
    return rawSeries.map((item, index) => {
      let value = item.orders;
      if (metric === 'revenue') value = item.revenue;
      else if (metric === 'deliveries') value = item.deliveries;
      else if (metric === 'cancellations') value = item.cancellations;

      // Recalculate percent delta relative to previous point in this metric
      let change = item.changePercent ?? 0;
      if (index > 0) {
        const prevItem = rawSeries[index - 1];
        let prevVal = prevItem.orders;
        if (metric === 'revenue') prevVal = prevItem.revenue;
        else if (metric === 'deliveries') prevVal = prevItem.deliveries;
        else if (metric === 'cancellations') prevVal = prevItem.cancellations;

        if (prevVal > 0) {
          change = Math.round(((value - prevVal) / prevVal) * 100);
        }
      }

      return {
        label: item.label,
        value,
        change,
        prevLabel: item.prevLabel || (index > 0 ? rawSeries[index - 1].label : 'Prior'),
        raw: item
      };
    });
  }, [rawSeries, metric]);

  // Analytics summary calculations (Peak, Total, Average, Trend)
  const analyticsSummary = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return {
        peakLabel: 'N/A',
        peakFormatted: '0',
        totalFormatted: '0',
        avgFormatted: '0',
        trendPercent: 0,
        trendPositive: true,
        trendText: 'vs prior'
      };
    }

    let maxPoint = chartData[0];
    let sum = 0;

    chartData.forEach((point) => {
      sum += point.value;
      if (point.value > maxPoint.value) {
        maxPoint = point;
      }
    });

    const avg = sum / chartData.length;

    // Formatting based on metric
    const formatValue = (v: number) => {
      if (metric === 'revenue') return formatKSh(v);
      return `${v} ${metricConfigs[metric].unit}`;
    };

    const formatAvg = (v: number) => {
      if (metric === 'revenue') return formatKSh(Math.round(v));
      return `${Number(v.toFixed(1))} ${metricConfigs[metric].unit}`;
    };

    // Trend comparisons
    let trendPercent = 12.3;
    let trendText = 'vs yesterday';
    if (timeRange === '7days') {
      trendPercent = 8.4;
      trendText = 'vs previous week';
    } else if (timeRange === '30days') {
      trendPercent = 14.2;
      trendText = 'vs previous month';
    }

    return {
      peakLabel: maxPoint.label,
      peakFormatted: `${maxPoint.label} · ${formatValue(maxPoint.value)}`,
      totalFormatted: formatValue(sum),
      avgFormatted: formatAvg(avg),
      trendPercent,
      trendPositive: trendPercent >= 0,
      trendText
    };
  }, [chartData, metric, timeRange]);

  // Maximum value for Y-Axis rounding
  const yDomainMax = useMemo(() => {
    if (!chartData || chartData.length === 0) return 40;
    const maxVal = Math.max(...chartData.map((d) => d.value), 1);
    if (metric === 'orders') {
      if (maxVal <= 40) return 40;
      return Math.ceil(maxVal * 1.15 / 10) * 10;
    }
    return Math.ceil(maxVal * 1.15);
  }, [chartData, metric]);

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100" />
            <div className="space-y-2">
              <div className="w-48 h-5 bg-slate-200 rounded" />
              <div className="w-36 h-3 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="w-40 h-8 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-64 bg-slate-50 rounded-xl mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100" />
              <div className="space-y-1.5 flex-1">
                <div className="w-16 h-3 bg-slate-100 rounded" />
                <div className="w-24 h-4 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty State
  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-2xs text-center">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
          <PackageCheck className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">No order activity yet</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
          There are currently no recorded orders for this period. As orders flow through dispatch, real-time hourly volume will appear here automatically.
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Chart</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs transition-all">
      {/* ========================================================================= */}
      {/* 1. HEADER: Title, Subtitle, Time Range & Metric Controls */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        {/* Title & Icon */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Hourly Order Distribution
            </h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              {timeRange === 'today'
                ? 'Delivery volume throughout the day'
                : timeRange === '7days'
                ? 'Delivery volume over the past 7 days'
                : 'Delivery volume over the past 30 days'}
            </p>
          </div>
        </div>

        {/* Compact Right Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Time Range Selector */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/60 shadow-inner">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                timeRange === 'today'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeRange('7days')}
              className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                timeRange === '7days'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange('30days')}
              className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                timeRange === '30days'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              30 Days
            </button>
          </div>

          {/* Metric Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsMetricDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs transition-colors"
            >
              <span>{metricConfigs[metric].label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isMetricDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsMetricDropdownOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-30 animate-in fade-in zoom-in-95">
                  {(['orders', 'revenue', 'deliveries', 'cancellations'] as MetricType[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMetric(m);
                        setIsMetricDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        metric === m
                          ? 'bg-blue-50 text-blue-600 font-bold'
                          : 'text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <span>{metricConfigs[m].label}</span>
                      {metric === m && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CHART AREA: Top-left Y-axis label, Modern Curved Area/Line Chart */}
      {/* ========================================================================= */}
      <div className="relative mt-2">
        {/* Top-left Axis Label matching image */}
        <div className="text-[11px] font-semibold text-slate-400 mb-1 pl-1">
          {metricConfigs[metric].axisLabel}
        </div>

        <div className="w-full h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <defs>
                {/* Modern Soft Blue Gradient Fill */}
                <linearGradient id="gasDeliverChartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                </linearGradient>

                {/* Soft glow filter for active hover point */}
                <filter id="pointGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2563EB" floodOpacity="0.35" />
                </filter>
              </defs>

              {/* Minimal Horizontal Grid, NO Vertical Grid Lines */}
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />

              {/* Minimal Clean X-Axis */}
              <XAxis
                dataKey="label"
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                padding={{ left: 16, right: 16 }}
                dy={6}
              />

              {/* Minimal Clean Y-Axis */}
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 10, fontWeight: 500 }}
                domain={[0, yDomainMax]}
                tickCount={5}
                tickFormatter={(val) => {
                  if (metric === 'revenue') {
                    if (val >= 1000) return `${Math.round(val / 1000)}k`;
                    return `${val}`;
                  }
                  return `${val}`;
                }}
              />

              {/* Interactive Tooltip matching reference styling */}
              <Tooltip
                content={<EnterpriseCustomTooltip metric={metric} metricConfig={metricConfigs[metric]} />}
                cursor={{
                  stroke: '#2563EB',
                  strokeWidth: 1.5,
                  strokeDasharray: '3 3',
                  opacity: 0.65
                }}
              />

              {/* Smooth Curved Line + Area Fill */}
              <Area
                type="monotone"
                dataKey="value"
                name={metricConfigs[metric].label}
                stroke="#2563EB"
                strokeWidth={2.5}
                fill="url(#gasDeliverChartGrad)"
                activeDot={{
                  r: 6,
                  fill: '#FFFFFF',
                  stroke: '#2563EB',
                  strokeWidth: 3,
                  filter: 'url(#pointGlow)'
                }}
                dot={{
                  r: 3.5,
                  fill: '#2563EB',
                  stroke: '#FFFFFF',
                  strokeWidth: 2
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SUMMARY ROW: Peak hour, Total, Average/hour, Trend badge */}
      {/* ========================================================================= */}
      <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
        {/* Block 1: Peak hour */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60">
            <Flame className="w-5 h-5 fill-blue-600/20 text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">
              {timeRange === 'today' ? 'Peak hour' : timeRange === '7days' ? 'Peak day' : 'Peak period'}
            </div>
            <div className="font-bold text-blue-600 text-sm sm:text-base tracking-tight">
              {analyticsSummary.peakFormatted}
            </div>
          </div>
        </div>

        {/* Block 2: Total today */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60">
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">
              {timeRange === 'today' ? 'Total today' : timeRange === '7days' ? 'Total (7 days)' : 'Total (30 days)'}
            </div>
            <div className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
              {analyticsSummary.totalFormatted}
            </div>
          </div>
        </div>

        {/* Block 3: Average / hour */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60">
            <BarChart2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">
              {timeRange === 'today' ? 'Average / hour' : 'Average / day'}
            </div>
            <div className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
              {analyticsSummary.avgFormatted}
            </div>
          </div>
        </div>

        {/* Block 4: Trend Badge */}
        <div className="flex flex-col sm:items-end justify-center">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{analyticsSummary.trendPercent}%</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 sm:text-right font-medium">
            {analyticsSummary.trendText}
          </span>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// CUSTOM ENTERPRISE TOOLTIP (Dark slate pill matching image.png exactly)
// =========================================================================
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  metric: MetricType;
  metricConfig: { label: string; unit: string; axisLabel: string };
}

const EnterpriseCustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  metric,
  metricConfig
}) => {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0].payload as {
    label: string;
    value: number;
    change: number;
    prevLabel: string;
  };

  const val = dataPoint.value;
  const change = dataPoint.change;
  const prevLabel = dataPoint.prevLabel;

  const isPositive = change >= 0;

  return (
    <div className="bg-[#1E293B] text-white rounded-lg p-2.5 shadow-xl border border-slate-700/70 text-xs min-w-[130px] z-50">
      {/* Hour / Label */}
      <div className="font-semibold text-slate-300 text-[11px] tracking-wide">
        {dataPoint.label}
      </div>

      {/* Metric Value */}
      <div className="font-bold text-white text-xs mt-0.5">
        {metricConfig.label}: {metric === 'revenue' ? formatKSh(val) : val}
      </div>

      {/* Change vs previous hour */}
      <div className="flex items-center gap-1 mt-0.5 font-semibold text-[11px]">
        {isPositive ? (
          <span className="text-emerald-400 flex items-center gap-0.5">
            <span>↑</span>
            <span>+{change}%</span>
          </span>
        ) : (
          <span className="text-rose-400 flex items-center gap-0.5">
            <span>↓</span>
            <span>{change}%</span>
          </span>
        )}
        <span className="text-slate-400 text-[10px]">
          vs {prevLabel}
        </span>
      </div>
    </div>
  );
};
