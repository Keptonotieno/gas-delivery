import React, { useState, useMemo } from 'react';
import {
  Flame,
  Zap,
  MapPin,
  Layers,
  Eye,
  EyeOff,
  Navigation,
  ChevronUp,
  ChevronDown,
  Building2,
  TrendingUp,
  ExternalLink,
  Info,
  Fuel,
  Maximize2,
  X
} from 'lucide-react';
import { Order, ThikaHighwayZone } from '../../types';
import { THIKA_HIGHWAY_ZONES } from '../../utils/thikaHighwayData';

export type DensityMapMode = 'subtle' | 'vibrant' | 'overlay' | 'off';

export interface DemandCluster {
  zone: ThikaHighwayZone;
  x: number; // SVG viewBox coordinates (0 to 1000)
  y: number; // SVG viewBox coordinates (0 to 650)
  pendingCount: number;
  totalValue: number;
  intensity: 'hot' | 'high' | 'moderate' | 'low';
  radius: number;
  sampleOrders: Array<{
    id: string;
    customerEstate: string;
    cylinderSummary: string;
    value: number;
    brand: string;
  }>;
  nearestHub: string;
  recommendedStaging: string;
  estBatchTripTime: string;
}

interface ThikaDemandDensityMapProps {
  orders: Order[];
  densityMode: DensityMapMode;
  onToggleMode: (mode: DensityMapMode) => void;
  selectedZoneId?: string | null;
  onSelectZone?: (zoneId: string | null) => void;
  driverLocationName?: string;
}

export const ThikaDemandDensityMap: React.FC<ThikaDemandDensityMapProps> = ({
  orders,
  densityMode,
  onToggleMode,
  selectedZoneId: externalSelectedZoneId,
  onSelectZone: externalOnSelectZone,
  driverLocationName = 'Near Exit 8 Roysambu'
}) => {
  const [internalSelectedZoneId, setInternalSelectedZoneId] = useState<string | null>(null);
  const [isHudExpanded, setIsHudExpanded] = useState<boolean>(true);
  const [hoveredClusterId, setHoveredClusterId] = useState<string | null>(null);

  const selectedZoneId = externalSelectedZoneId !== undefined ? externalSelectedZoneId : internalSelectedZoneId;
  const setSelectedZone = (id: string | null) => {
    setInternalSelectedZoneId(id);
    if (externalOnSelectZone) {
      externalOnSelectZone(id);
    }
  };

  // Highway arterial curve coordinates mapping accurately to Thika Superhighway progression
  // (from South-West Pangani / Ngara to North-East Thika Town)
  const zoneCoordinates: Record<string, { x: number; y: number }> = {
    'zone-ngara': { x: 70, y: 550 },
    'zone-ruaraka': { x: 175, y: 485 },
    'zone-gardencity': { x: 275, y: 420 },
    'zone-roysambu': { x: 380, y: 360 },
    'zone-mirema': { x: 410, y: 395 }, // Just north-west of Roysambu
    'zone-kasarani': { x: 465, y: 315 },
    'zone-githurai': { x: 555, y: 260 },
    'zone-kahawa': { x: 645, y: 215 },
    'zone-ruiru': { x: 740, y: 165 },
    'zone-toll': { x: 820, y: 125 },
    'zone-juja': { x: 890, y: 90 },
    'zone-witeithie': { x: 940, y: 60 },
    'zone-thika': { x: 980, y: 35 }
  };

  // Dynamically calculate demand clusters based purely on live active/pending orders along the corridor
  const clusters: DemandCluster[] = useMemo(() => {
    // Filter pending/active system orders
    const pendingOrders = orders.filter(
      (o) =>
        o.status === 'Pending' ||
        o.status === 'Payment Pending' ||
        o.status === 'Preparing' ||
        o.status === 'Assigned' ||
        o.status === 'Driver Assigned'
    );

    return THIKA_HIGHWAY_ZONES.map((zone) => {
      const coords = zoneCoordinates[zone.id] || { x: 500, y: 300 };

      // Check matching live orders in this zone
      const matchingLiveOrders = pendingOrders.filter((ord) => {
        const orderZoneId = ord.thikaHighwayZone || ord.deliveryAddress?.thikaHighwayZone;
        const street = (ord.deliveryAddress?.street || '').toLowerCase();
        const landmark = (ord.deliveryAddress?.landmark || '').toLowerCase();

        return (
          orderZoneId === zone.id ||
          zone.name.toLowerCase().includes(orderZoneId || '---') ||
          zone.landmarks.some((lm) => street.includes(lm.toLowerCase()) || landmark.includes(lm.toLowerCase())) ||
          zone.popularEstates.some((est) => street.includes(est.toLowerCase()))
        );
      });

      const totalPendingCount = matchingLiveOrders.length;
      const totalEstimatedValue = matchingLiveOrders.reduce(
        (sum, o) => sum + (o.total || (o.items?.[0]?.unitPrice ? (o.items[0].unitPrice * (o.items[0].quantity || 1)) : 0)),
        0
      );

      // Determine intensity and radius directly from actual order volume
      let intensity: 'hot' | 'high' | 'moderate' | 'low' = 'low';
      let radius = 38;

      if (totalPendingCount >= 5) {
        intensity = 'hot';
        radius = 80;
      } else if (totalPendingCount >= 3) {
        intensity = 'high';
        radius = 65;
      } else if (totalPendingCount >= 1) {
        intensity = 'moderate';
        radius = 50;
      } else {
        intensity = 'low';
        radius = 38;
      }

      // Live order micro-dots representation exclusively from real matching orders
      const sampleOrders = matchingLiveOrders.map((o) => ({
        id: o.id,
        customerEstate: o.deliveryAddress?.street || zone.popularEstates[0] || 'Corridor Delivery',
        cylinderSummary: o.cylinderSummary || (o.items?.[0]?.productName) || 'LPG Refill',
        value: o.total || o.items?.[0]?.unitPrice || 0,
        brand: o.cylinderBrand || o.items?.[0]?.brand || 'TotalEnergies'
      })).slice(0, 6);

      return {
        zone,
        x: coords.x,
        y: coords.y,
        pendingCount: totalPendingCount,
        totalValue: totalEstimatedValue,
        intensity,
        radius,
        sampleOrders,
        nearestHub: zone.hubName,
        recommendedStaging: `Stage at ${zone.landmarks[0] || zone.hubName} for rapid <5 min dispatch`,
        estBatchTripTime: zone.estMinutes
      };
    });
  }, [orders]);

  // Active or selected cluster
  const activeCluster = useMemo(() => {
    if (hoveredClusterId) {
      return clusters.find((c) => c.zone.id === hoveredClusterId) || null;
    }
    if (selectedZoneId) {
      return clusters.find((c) => c.zone.id === selectedZoneId) || null;
    }
    // Default to highest demand cluster (e.g. Roysambu)
    return clusters.find((c) => c.intensity === 'hot') || clusters[0];
  }, [clusters, selectedZoneId, hoveredClusterId]);

  // Overall corridor statistics
  const totalCorridorPending = useMemo(() => {
    return clusters.reduce((acc, c) => acc + c.pendingCount, 0);
  }, [clusters]);

  const topHotspots = useMemo(() => {
    return [...clusters].sort((a, b) => b.pendingCount - a.pendingCount).slice(0, 4);
  }, [clusters]);

  if (densityMode === 'off') {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => onToggleMode('subtle')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-800 shadow-md hover:bg-gray-50 transition-all cursor-pointer"
          title="Enable Thika Superhighway Demand Density Map"
        >
          <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Show Demand Map</span>
        </button>
      </div>
    );
  }

  // Opacity styles based on density mode
  const bgOpacityClass =
    densityMode === 'subtle'
      ? 'opacity-25'
      : densityMode === 'vibrant'
      ? 'opacity-65'
      : 'opacity-95';

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. BACKGROUND SVG CANVAS: GEOSPATIAL DENSITY HEATMAP OF THIKA SUPERHIGHWAY */}
      {/* ========================================================================= */}
      <div
        className={`fixed inset-0 pointer-events-none transition-opacity duration-500 z-0 overflow-hidden select-none ${bgOpacityClass}`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1060 660"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Soft Gaussian blur for realistic heatmap dispersion */}
            <filter id="thikaHeatBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="18" />
            </filter>

            <filter id="coreGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            </filter>

            {/* Radial Gradients for Demand Density Halos */}
            <radialGradient id="gradHot" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.85" />
              <stop offset="35%" stopColor="#F97316" stopOpacity="0.65" />
              <stop offset="70%" stopColor="#FBBF24" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="gradHigh" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#FBBF24" stopOpacity="0.5" />
              <stop offset="80%" stopColor="#FDE68A" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="gradModerate" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.75" />
              <stop offset="45%" stopColor="#34D399" stopOpacity="0.45" />
              <stop offset="85%" stopColor="#6EE7B7" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="gradLow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0284C7" stopOpacity="0.65" />
              <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
            </radialGradient>

            {/* Subtle grid pattern for topographic reference */}
            <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#CBD5E1" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* Coordinate Grid Background */}
          <rect width="100%" height="100%" fill="url(#gridPattern)" />

          {/* Major Nairobi Topographic Waterways & Green Belts (Nairobi River & Karura Forest Boundary) */}
          <path
            d="M 120,600 Q 220,530 310,500 T 520,440 T 700,380"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M 0,380 Q 200,360 380,310 T 750,220"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.5"
          />

          {/* Secondary Arterial Interconnecting Roads */}
          {/* Outer Ring Road Link at Allsopps/Garden City */}
          <path
            d="M 275,660 Q 275,540 275,420 T 260,200"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="4.5"
            strokeDasharray="4 2"
            opacity="0.6"
          />
          {/* Kamiti Road / Mirema Link */}
          <path
            d="M 380,360 Q 400,280 430,120"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="3.5"
            strokeDasharray="3 3"
            opacity="0.5"
          />
          {/* Eastern Bypass Flyover at Ruiru */}
          <path
            d="M 740,450 L 740,0"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="4"
            strokeDasharray="4 2"
            opacity="0.6"
          />
          {/* Northern Bypass Link near Kahawa West */}
          <path
            d="M 200,160 Q 400,210 555,260 T 740,165"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="3"
            opacity="0.5"
          />

          {/* ================================================================= */}
          {/* THIKA SUPERHIGHWAY (A2 EXPRESSWAY) ARTERIAL TRUNK RIBBON */}
          {/* ================================================================= */}
          {/* Highway Glow Underlay */}
          <path
            d="M 60,560 C 140,510 240,445 380,360 S 580,245 740,165 S 920,70 1020,20"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="20"
            strokeLinecap="round"
            opacity="0.18"
            filter="url(#coreGlow)"
          />
          {/* Highway Outer Shoulders / Road Bed */}
          <path
            d="M 60,560 C 140,510 240,445 380,360 S 580,245 740,165 S 920,70 1020,20"
            fill="none"
            stroke="#475569"
            strokeWidth="13"
            strokeLinecap="round"
            opacity="0.45"
          />
          {/* Highway Center Pavement */}
          <path
            d="M 60,560 C 140,510 240,445 380,360 S 580,245 740,165 S 920,70 1020,20"
            fill="none"
            stroke="#1E293B"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.75"
          />
          {/* Fluorescent Highway Central Median Line */}
          <path
            d="M 60,560 C 140,510 240,445 380,360 S 580,245 740,165 S 920,70 1020,20"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="1.8"
            strokeDasharray="8 4"
            opacity="0.9"
          />

          {/* ================================================================= */}
          {/* DEMAND DENSITY CLUSTERS (HEATMAP GLOW HALOS) */}
          {/* ================================================================= */}
          {clusters.map((cluster) => {
            const gradId =
              cluster.intensity === 'hot'
                ? 'url(#gradHot)'
                : cluster.intensity === 'high'
                ? 'url(#gradHigh)'
                : cluster.intensity === 'moderate'
                ? 'url(#gradModerate)'
                : 'url(#gradLow)';

            const isSelected = selectedZoneId === cluster.zone.id;

            return (
              <g key={`cluster-${cluster.zone.id}`} className="transition-all duration-300">
                {/* 1. Large Diffused Heat Halo */}
                <circle
                  cx={cluster.x}
                  cy={cluster.y}
                  r={cluster.radius * 1.5}
                  fill={gradId}
                  filter="url(#thikaHeatBlur)"
                />

                {/* 2. Core Density Halo */}
                <circle
                  cx={cluster.x}
                  cy={cluster.y}
                  r={cluster.radius}
                  fill={gradId}
                  filter="url(#coreGlow)"
                />

                {/* 3. Concentric Animated Ping Rings for High Demand Zones */}
                {(cluster.intensity === 'hot' || isSelected) && (
                  <>
                    <circle
                      cx={cluster.x}
                      cy={cluster.y}
                      r={cluster.radius * 0.75}
                      fill="none"
                      stroke={cluster.intensity === 'hot' ? '#EF4444' : '#F59E0B'}
                      strokeWidth="1.5"
                      opacity="0.5"
                      className="animate-ping"
                      style={{ transformOrigin: `${cluster.x}px ${cluster.y}px`, animationDuration: '3s' }}
                    />
                    <circle
                      cx={cluster.x}
                      cy={cluster.y}
                      r={cluster.radius * 0.9}
                      fill="none"
                      stroke="#F97316"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      opacity="0.4"
                    />
                  </>
                )}

                {/* 4. Realistic Pending Order Micro-Dots scattered in the cluster */}
                {cluster.sampleOrders.map((ord, idx) => {
                  // Golden spiral pseudo-offset for organic distribution around the hub
                  const angle = idx * 2.39996 + (cluster.x % 5);
                  const dist = (12 + (idx * 9)) % (cluster.radius * 0.68);
                  const dotX = cluster.x + Math.cos(angle) * dist;
                  const dotY = cluster.y + Math.sin(angle) * dist;

                  return (
                    <circle
                      key={`dot-${cluster.zone.id}-${ord.id}-${idx}`}
                      cx={dotX}
                      cy={dotY}
                      r={idx === 0 ? 3.5 : 2.5}
                      fill={cluster.intensity === 'hot' ? '#FEF08A' : '#FFFFFF'}
                      stroke={cluster.intensity === 'hot' ? '#DC2626' : '#D97706'}
                      strokeWidth="1"
                      opacity="0.95"
                    />
                  );
                })}

                {/* 5. Central Hub Node Circle */}
                <circle
                  cx={cluster.x}
                  cy={cluster.y}
                  r={isSelected ? 10 : 7}
                  fill={cluster.intensity === 'hot' ? '#EF4444' : cluster.intensity === 'high' ? '#F59E0B' : '#0284C7'}
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  className="shadow-sm"
                />

                {/* 6. Zone Exit Marker Pin Label */}
                <g transform={`translate(${cluster.x}, ${cluster.y - cluster.radius * 0.5 - 12})`}>
                  <rect
                    x="-42"
                    y="-12"
                    width="84"
                    height="20"
                    rx="10"
                    fill="#0F172A"
                    fillOpacity="0.85"
                    stroke={isSelected ? '#38BDF8' : '#334155'}
                    strokeWidth={isSelected ? '2' : '1'}
                  />
                  <text
                    x="0"
                    y="2"
                    textAnchor="middle"
                    fill="#F8FAFC"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="system-ui, sans-serif"
                  >
                    {cluster.zone.exitNumber}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Current Driver Staging Marker */}
          <g transform="translate(365, 375)">
            <circle cx="0" cy="0" r="16" fill="#3B82F6" fillOpacity="0.2" className="animate-ping" />
            <circle cx="0" cy="0" r="7" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
            <rect x="12" y="-10" width="76" height="18" rx="4" fill="#1E3A8A" fillOpacity="0.9" />
            <text x="50" y="3" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold">
              Driver Active
            </text>
          </g>

          {/* Major Corridor Exit Labels along bottom and top */}
          <text x="80" y="585" fill="var(--text-secondary, #64748B)" fontSize="11" fontWeight="700">CBD / Pangani (Exit 1-3)</text>
          <text x="270" y="450" fill="var(--text-secondary, #64748B)" fontSize="11" fontWeight="700">Garden City (Exit 7)</text>
          <text x="360" y="335" fill="var(--text-primary, #1E293B)" fontSize="12" fontWeight="800">Roysambu / TRM (Exit 8)</text>
          <text x="640" y="245" fill="var(--text-primary, #1E293B)" fontSize="11" fontWeight="800">Wendani / Sukari (Exit 12)</text>
          <text x="740" y="145" fill="var(--text-secondary, #64748B)" fontSize="11" fontWeight="700">Ruiru Bypass (Exit 14)</text>
          <text x="890" y="70" fill="var(--text-secondary, #64748B)" fontSize="11" fontWeight="700">Juja / JKUAT (Exit 16)</text>
          <text x="960" y="20" fill="var(--text-secondary, #64748B)" fontSize="11" fontWeight="700">Thika Town (Exit 19)</text>
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE DEMAND RADAR HUD (TOP CORRIDOR BAR & INTENSITY CONTROLLER) */}
      {/* ========================================================================= */}
      <div className="relative z-20 w-full mb-2">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/90 shadow-sm p-3 sm:p-4 transition-all duration-300">
          {/* Header Row: Title, Total Corridor Demand, Mode Controls, Minimize */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
                <Flame className="w-5 h-5 fill-amber-500 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                    Thika Superhighway Demand Heatmap
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                    {totalCorridorPending} PENDING CLUSTER ORDERS
                  </span>
                </div>
                <p className="text-xs text-gray-700 font-medium">
                  Live order density mapped along Exit 1 (Pangani) to Exit 19 (Thika) to optimize batch dispatch
                </p>
              </div>
            </div>

            {/* Visual Intensity Control Pills */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100/90 p-1 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => onToggleMode('subtle')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    densityMode === 'subtle'
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                  title="Subtle background opacity (25%)"
                >
                  Subtle
                </button>
                <button
                  type="button"
                  onClick={() => onToggleMode('vibrant')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    densityMode === 'vibrant'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                  title="Enhanced visibility opacity (65%)"
                >
                  High Visibility
                </button>
                <button
                  type="button"
                  onClick={() => onToggleMode('overlay')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    densityMode === 'overlay'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                  title="Command view with vivid contrast"
                >
                  Full Radar
                </button>
                <button
                  type="button"
                  onClick={() => onToggleMode('off')}
                  className="p-1 rounded-lg text-gray-600 hover:text-gray-800 cursor-pointer ml-0.5"
                  title="Hide background heatmap"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsHudExpanded(!isHudExpanded)}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 cursor-pointer transition-colors"
                title={isHudExpanded ? 'Collapse Cluster Panel' : 'Expand Cluster Panel'}
              >
                {isHudExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Expanded Cluster Selector & Staging Insights */}
          {isHudExpanded && (
            <div className="mt-3.5 pt-3 border-t border-gray-100 space-y-3 animate-in fade-in duration-200">
              {/* Cluster Chips Strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                <span className="text-[11px] font-bold text-gray-600 shrink-0 mr-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  Hotspots:
                </span>

                {topHotspots.map((cluster) => {
                  const isSelected = selectedZoneId === cluster.zone.id;
                  const isHot = cluster.intensity === 'hot';

                  return (
                    <button
                      key={`btn-${cluster.zone.id}`}
                      type="button"
                      onClick={() => setSelectedZone(isSelected ? null : cluster.zone.id)}
                      onMouseEnter={() => setHoveredClusterId(cluster.zone.id)}
                      onMouseLeave={() => setHoveredClusterId(null)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-2xs scale-102 ring-2 ring-blue-400/30'
                          : isHot
                          ? 'bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100'
                          : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {isHot ? (
                        <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      )}
                      <span>{cluster.zone.name.split('/')[0].trim()}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : isHot
                            ? 'bg-rose-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {cluster.pendingCount}
                      </span>
                    </button>
                  );
                })}

                {selectedZoneId && (
                  <button
                    type="button"
                    onClick={() => setSelectedZone(null)}
                    className="text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer ml-1 underline"
                  >
                    Clear Focus
                  </button>
                )}
              </div>

              {/* Active Focused Cluster Detail Bar */}
              {activeCluster && (
                <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-amber-50/90 border border-blue-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0">
                      <Fuel className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 text-sm">
                          {activeCluster.zone.name} ({activeCluster.zone.exitNumber})
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                          Est. Value: KES {activeCluster.totalValue.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-600 font-medium text-[11px] mt-0.5">
                        <span className="font-bold text-gray-700">Hub:</span> {activeCluster.nearestHub} •{' '}
                        <span className="font-bold text-gray-700">Key Estates:</span>{' '}
                        {activeCluster.zone.popularEstates.slice(0, 3).join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-gray-500 hidden sm:inline">
                      ⚡ {activeCluster.estBatchTripTime} avg batch turnaround
                    </span>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        `${activeCluster.nearestHub}, Nairobi, Kenya`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-800 font-bold text-xs hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      <span>Stage at Hub</span>
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
