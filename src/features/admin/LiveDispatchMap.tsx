import React, { useState, useMemo } from 'react';
import { 
  Navigation, 
  MapPin, 
  Truck, 
  AlertTriangle, 
  Clock, 
  User, 
  Phone, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  CheckCircle2, 
  X,
  Compass,
  ArrowRight,
  Globe,
  Key,
  ExternalLink,
  Building2
} from 'lucide-react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker
} from '@vis.gl/react-google-maps';
import { Order, Driver } from '../../types';

interface LiveDispatchMapProps {
  orders: Order[];
  drivers: Driver[];
  selectedOrderId?: string | null;
  selectedDriverId?: string | null;
  onSelectOrder?: (order: Order) => void;
  onSelectDriver?: (driver: Driver) => void;
  onAssignDriver?: (orderId: string, driverId: string) => void;
}

// Thika Superhighway & Nairobi Corridor Bounds for SVG projection
// Center: ~ -1.2185 (Roysambu Exit 8), 36.8872
const LAT_MIN = -1.285;
const LAT_MAX = -1.020;
const LNG_MIN = 36.820;
const LNG_MAX = 37.070;

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 700;

function latLngToSvg(lat: number, lng: number): { x: number; y: number } {
  // Normalize lng to 0..1 (X axis)
  const normX = (lng - LNG_MIN) / (LNG_MAX - LNG_MIN);
  // Normalize lat to 0..1 (Y axis, note that lat decreases going south so inverted)
  const normY = (LAT_MAX - lat) / (LAT_MAX - LAT_MIN);

  const x = Math.max(30, Math.min(SVG_WIDTH - 30, normX * SVG_WIDTH));
  const y = Math.max(30, Math.min(SVG_HEIGHT - 30, normY * SVG_HEIGHT));

  return { x, y };
}

// Key Thika Superhighway Depots & Logistics Hubs
const CENTRAL_DEPOT = {
  name: 'Roysambu Central Gas Hub (Exit 8)',
  zone: 'Exit 8 Commercial Corridor',
  lat: -1.2185,
  lng: 36.8872
};

const KAHAWA_HUB = {
  name: 'Kahawa Sukari Express Station (Exit 12)',
  zone: 'Exit 12 Depot',
  lat: -1.1820,
  lng: 36.9320
};

export const LiveDispatchMap: React.FC<LiveDispatchMapProps> = ({
  orders,
  drivers,
  selectedOrderId,
  selectedDriverId,
  onSelectOrder,
  onSelectDriver,
  onAssignDriver
}) => {
  const defaultApiKey = (typeof window !== 'undefined'
    ? (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || localStorage.getItem('gmp_api_key') || '')
    : '') as string;
  const [apiKey, setApiKey] = useState<string>(defaultApiKey);
  const [mapMode, setMapMode] = useState<'google' | 'vector'>(defaultApiKey ? 'google' : 'vector');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>(defaultApiKey);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');

  const [zoomLevel, setZoomLevel] = useState(1);
  const [filterMode, setFilterMode] = useState<'all' | 'delayed' | 'unassigned' | 'routes'>('all');
  const [activePopup, setActivePopup] = useState<{
    type: 'order' | 'driver';
    id: string;
    data: any;
    x?: number;
    y?: number;
  } | null>(null);

  // Filter orders according to map filter
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (filterMode === 'delayed') return o.isOverdue || (typeof o.slaRemainingMinutes === 'number' && o.slaRemainingMinutes < 0);
      if (filterMode === 'unassigned') return o.status === 'Pending' || !o.driverId;
      return true;
    });
  }, [orders, filterMode]);

  // Find active deliveries to render route polylines
  const activeDeliveries = useMemo(() => {
    return orders.filter(o => (o.status === 'Dispatched' || o.status === 'Out for Delivery') && o.driverId);
  }, [orders]);

  // Projection for central hubs
  const centralDepotPos = latLngToSvg(CENTRAL_DEPOT.lat, CENTRAL_DEPOT.lng);
  const kahawaHubPos = latLngToSvg(KAHAWA_HUB.lat, KAHAWA_HUB.lng);

  // Selected entities
  const highlightedOrder = orders.find(o => o.id === selectedOrderId);
  const highlightedDriver = drivers.find(d => d.id === selectedDriverId);

  const handleSaveApiKey = () => {
    const trimmed = keyInput.trim();
    setApiKey(trimmed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gmp_api_key', trimmed);
    }
    setShowKeyModal(false);
    if (trimmed) {
      setMapMode('google');
    }
  };

  return (
    <div className="relative w-full h-full min-h-[580px] bg-[#0F172A] rounded-2xl overflow-hidden border border-slate-800 shadow-xl select-none flex flex-col">
      {/* Top Map HUD Bar */}
      <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80 shadow-md">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-white tracking-wide">THIKA HIGHWAY LOGISTICS GRID</span>
          <span className="text-[11px] text-slate-400 border-l border-slate-700 pl-2">
            {drivers.filter(d => d.status === 'On Route').length} En Route · {drivers.filter(d => d.status === 'Available').length} Available
          </span>
        </div>

        {/* Center Controls: Google Map Switcher & Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap pointer-events-auto">
          {/* Map Mode Selector */}
          <div className="bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-md flex items-center gap-1 text-xs">
            <button
              onClick={() => {
                if (!apiKey) {
                  setShowKeyModal(true);
                } else {
                  setMapMode('google');
                }
              }}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                mapMode === 'google'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Google Maps</span>
            </button>
            <button
              onClick={() => setMapMode('vector')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                mapMode === 'vector'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Vector</span>
            </button>
            <button
              onClick={() => setShowKeyModal(true)}
              className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              title="Configure Google Maps API Key"
            >
              <Key className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-md text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterMode === 'all' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Pins
            </button>
            <button
              onClick={() => setFilterMode('delayed')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                filterMode === 'delayed' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Delayed ({orders.filter(o => o.isOverdue).length})
            </button>
            <button
              onClick={() => setFilterMode('unassigned')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterMode === 'unassigned' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              Unassigned ({orders.filter(o => o.status === 'Pending').length})
            </button>
            <button
              onClick={() => setFilterMode('routes')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterMode === 'routes' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-sky-400'
              }`}
            >
              Active Routes
            </button>
          </div>
        </div>

        {/* Right Zoom & Layer Controls */}
        <div className="flex items-center gap-1 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-md">
          {mapMode === 'google' ? (
            <button
              onClick={() => setMapType(prev => prev === 'roadmap' ? 'satellite' : prev === 'satellite' ? 'hybrid' : 'roadmap')}
              className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center gap-1 text-xs cursor-pointer"
              title="Toggle Google Maps Layer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="capitalize">{mapType}</span>
            </button>
          ) : (
            <>
              <button 
                onClick={() => setZoomLevel(prev => Math.min(1.8, prev + 0.2))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setZoomLevel(prev => Math.max(0.8, prev - 0.2))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button 
                onClick={() => { setZoomLevel(1); setActivePopup(null); }}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="Reset Map"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* GOOGLE MAPS PLATFORM VIEW */}
      {mapMode === 'google' && apiKey ? (
        <div className="relative w-full flex-1 min-h-[500px]">
          <APIProvider apiKey={apiKey}>
            <GoogleMap
              id="live-dispatch-gmp-map"
              mapId="DEMO_MAP_ID"
              defaultCenter={{ lat: -1.2185, lng: 36.8872 }}
              defaultZoom={13}
              mapTypeId={mapType}
              internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
              style={{ width: '100%', height: '100%' }}
              gestureHandling="greedy"
              disableDefaultUI={false}
            >
              {/* Central Hubs */}
              <AdvancedMarker
                position={{ lat: CENTRAL_DEPOT.lat, lng: CENTRAL_DEPOT.lng }}
                title={CENTRAL_DEPOT.name}
              >
                <div className="flex flex-col items-center cursor-pointer group">
                  <div className="px-2.5 py-1 bg-amber-500 text-slate-950 font-black text-[11px] rounded-lg shadow-lg border border-amber-300 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Central Hub Exit 8</span>
                  </div>
                  <div className="w-2.5 h-2.5 bg-amber-500 rotate-45 -mt-1 shadow-md"></div>
                </div>
              </AdvancedMarker>

              <AdvancedMarker
                position={{ lat: KAHAWA_HUB.lat, lng: KAHAWA_HUB.lng }}
                title={KAHAWA_HUB.name}
              >
                <div className="flex flex-col items-center cursor-pointer group">
                  <div className="px-2.5 py-1 bg-sky-600 text-white font-bold text-[10px] rounded-lg shadow-lg border border-sky-400 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span>Kahawa Hub Exit 12</span>
                  </div>
                  <div className="w-2 h-2 bg-sky-600 rotate-45 -mt-1 shadow-md"></div>
                </div>
              </AdvancedMarker>

              {/* Drivers Pins */}
              {drivers.map((d) => {
                const lat = d.location?.lat || -1.2185 + (Math.sin(d.id.charCodeAt(0) || 1) * 0.02);
                const lng = d.location?.lng || 36.8872 + (Math.cos(d.id.charCodeAt(0) || 1) * 0.03);
                const isSelected = selectedDriverId === d.id;

                return (
                  <AdvancedMarker
                    key={`gmp-driver-${d.id}`}
                    position={{ lat, lng }}
                    title={`${d.name} (${d.licensePlate}) - ${d.status}`}
                    onClick={() => {
                      onSelectDriver?.(d);
                      setActivePopup({
                        type: 'driver',
                        id: d.id,
                        data: d
                      });
                    }}
                  >
                    <div className="flex flex-col items-center cursor-pointer group">
                      <div className={`px-2 py-1 rounded-xl shadow-md border font-bold text-xs flex items-center gap-1.5 transition-transform group-hover:scale-110 ${
                        isSelected
                          ? 'bg-orange-600 text-white border-white ring-2 ring-orange-400 scale-110'
                          : d.status === 'Available'
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : d.status === 'On Route'
                          ? 'bg-blue-600 text-white border-blue-400'
                          : 'bg-slate-700 text-slate-200 border-slate-500'
                      }`}>
                        <Truck className="w-3.5 h-3.5" />
                        <span>{d.name.split(' ')[0]}</span>
                      </div>
                      <div className={`w-2 h-2 rotate-45 -mt-1 ${
                        isSelected ? 'bg-orange-600' : d.status === 'Available' ? 'bg-emerald-600' : 'bg-blue-600'
                      }`} />
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* Orders Pins */}
              {filteredOrders.map((o, idx) => {
                const lat = o.deliveryAddress?.coordinates?.lat || -1.2155 + (Math.sin(o.id.charCodeAt(3) || 2) * 0.03);
                const lng = o.deliveryAddress?.coordinates?.lng || 36.8945 + (Math.cos(o.id.charCodeAt(3) || 2) * 0.035);
                const isSelected = selectedOrderId === o.id;

                return (
                  <AdvancedMarker
                    key={`gmp-order-${o.id}-${idx}`}
                    position={{ lat, lng }}
                    title={`Order #${o.id} - ${o.customerName}`}
                    onClick={() => {
                      onSelectOrder?.(o);
                      setActivePopup({
                        type: 'order',
                        id: o.id,
                        data: o
                      });
                    }}
                  >
                    <div className="flex flex-col items-center cursor-pointer group">
                      <div className={`px-2 py-0.5 rounded-lg shadow-md border font-black text-[10px] flex items-center gap-1 transition-transform group-hover:scale-110 ${
                        isSelected
                          ? 'bg-orange-600 text-white border-white ring-2 ring-orange-400 scale-110'
                          : o.isOverdue
                          ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                          : o.status === 'Pending'
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : 'bg-sky-600 text-white border-sky-400'
                      }`}>
                        <MapPin className="w-3 h-3" />
                        <span>#{o.id.slice(-4)}</span>
                      </div>
                      <div className={`w-2 h-2 rotate-45 -mt-1 ${
                        isSelected ? 'bg-orange-600' : o.isOverdue ? 'bg-rose-600' : o.status === 'Pending' ? 'bg-amber-500' : 'bg-sky-600'
                      }`} />
                    </div>
                  </AdvancedMarker>
                );
              })}
            </GoogleMap>
          </APIProvider>
        </div>
      ) : mapMode === 'google' && !apiKey ? (
        /* Google Maps API Key Setup Prompt Screen */
        <div className="relative w-full flex-1 min-h-[480px] flex items-center justify-center p-6 bg-slate-950 text-slate-200">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/30">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Enable Real Google Map</h3>
              <p className="text-xs text-slate-400 mt-1">
                Display the genuine Google Maps Platform satellite and highway grid for Thika Superhighway dispatch operations.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="text-left">
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Google Maps Platform API Key or Demo Key:
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <a
                  href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Get free Maps Demo Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span>No credit card needed</span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  Activate Google Maps
                </button>
                <button
                  type="button"
                  onClick={() => setMapMode('vector')}
                  className="py-2 px-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-xs cursor-pointer transition-colors"
                >
                  Use Vector View
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Main SVG Vector Map Stage */
        <div className="relative w-full flex-1 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full object-cover transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="city-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" strokeWidth="0.8" />
            </pattern>

            {/* Radial glow for selected pinpoint */}
            <radialGradient id="beacon-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#EA580C" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#EA580C" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="alert-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E11D48" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#E11D48" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Dark Nairobi Map Base */}
          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="#0B1120" />
          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#city-grid)" />

          {/* District Geographies / Natural Areas */}
          {/* Karura Forest & Arboretum green areas */}
          <path d="M 520 70 Q 620 90 600 180 Q 510 160 480 110 Z" fill="#064E3B" fillOpacity="0.25" stroke="#047857" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M 410 240 Q 460 250 450 310 Q 390 300 410 240 Z" fill="#064E3B" fillOpacity="0.25" stroke="#047857" strokeWidth="1" strokeDasharray="3 3" />
          {/* Uhuru Park */}
          <path d="M 580 340 Q 620 350 610 390 Q 560 380 580 340 Z" fill="#064E3B" fillOpacity="0.3" />

          {/* Nairobi Primary Road Network */}
          {/* 1. Waiyaki Way (A104) from Westlands into CBD */}
          <path d="M 120 180 Q 350 200 580 320" fill="none" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
          <path d="M 120 180 Q 350 200 580 320" fill="none" stroke="#475569" strokeWidth="4" strokeLinecap="round" />

          {/* 2. Uhuru Highway & Nairobi Expressway to Mombasa Rd */}
          <path d="M 580 320 L 640 450 L 760 590 L 920 660" fill="none" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
          <path d="M 580 320 L 640 450 L 760 590 L 920 660" fill="none" stroke="#475569" strokeWidth="4" strokeLinecap="round" />

          {/* 3. Ngong Road from Dagoretti through Kilimani to Upper Hill */}
          <path d="M 160 490 Q 380 430 590 390" fill="none" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
          <path d="M 160 490 Q 380 430 590 390" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />

          {/* 4. Argwings Kodhek Road */}
          <path d="M 280 370 Q 420 360 560 370" fill="none" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          <path d="M 280 370 Q 420 360 560 370" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />

          {/* 5. Ring Road Kileleshwa & Westlands */}
          <path d="M 330 180 Q 380 290 420 400" fill="none" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          <path d="M 330 180 Q 380 290 420 400" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" />

          {/* 6. Limuru Road / Forest Road into Parklands */}
          <path d="M 500 60 Q 560 140 600 240" fill="none" stroke="#334155" strokeWidth="7" strokeLinecap="round" />
          <path d="M 500 60 Q 560 140 600 240" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />

          {/* District Labels */}
          <text x="340" y="140" fill="#475569" fontSize="13" fontWeight="bold" letterSpacing="2">WESTLANDS</text>
          <text x="630" y="160" fill="#475569" fontSize="13" fontWeight="bold" letterSpacing="2">PARKLANDS</text>
          <text x="370" y="340" fill="#475569" fontSize="13" fontWeight="bold" letterSpacing="2">KILELESHWA</text>
          <text x="360" y="440" fill="#475569" fontSize="13" fontWeight="bold" letterSpacing="2">KILIMANI</text>
          <text x="620" y="320" fill="#64748B" fontSize="14" fontWeight="bold" letterSpacing="3">CBD</text>
          <text x="660" y="420" fill="#475569" fontSize="13" fontWeight="bold" letterSpacing="2">UPPER HILL</text>
          <text x="730" y="520" fill="#475569" fontSize="13" fontWeight="bold" letterSpacing="2">SOUTH B / C</text>
          <text x="770" y="430" fill="#475569" fontSize="13" fontWeight="bold" letterSpacing="2">INDUSTRIAL AREA</text>
          <text x="210" y="300" fill="#475569" fontSize="13" fontWeight="bold" letterSpacing="2">LAVINGTON</text>

          {/* Central Operations Depots */}
          {/* Central Depot */}
          <g transform={`translate(${centralDepotPos.x}, ${centralDepotPos.y})`}>
            <circle r="22" fill="#3B82F6" fillOpacity="0.18" className="animate-pulse" />
            <circle r="14" fill="#1D4ED8" stroke="#60A5FA" strokeWidth="2" />
            <path d="M -5 -5 L 5 -5 L 5 5 L -5 5 Z" fill="#FFFFFF" />
            <text x="18" y="4" fill="#93C5FD" fontSize="11" fontWeight="bold">Central Operations Depot</text>
          </g>

          {/* Kahawa Hub */}
          <g transform={`translate(${kahawaHubPos.x}, ${kahawaHubPos.y})`}>
            <circle r="18" fill="#F59E0B" fillOpacity="0.15" />
            <circle r="11" fill="#D97706" stroke="#FDE68A" strokeWidth="1.5" />
            <circle r="3" fill="#FFFFFF" />
            <text x="16" y="3" fill="#FCD34D" fontSize="10" fontWeight="semibold">Kahawa Hub (Exit 12)</text>
          </g>

          {/* ACTIVE ROUTE LINES */}
          {activeDeliveries.map((order) => {
            const driver = drivers.find(d => d.id === order.driverId);
            if (!driver || !driver.location || !order.deliveryAddress?.coordinates) return null;

            const start = latLngToSvg(driver.location.lat, driver.location.lng);
            const end = latLngToSvg(order.deliveryAddress.coordinates.lat, order.deliveryAddress.coordinates.lng);
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;

            const isSelected = order.id === selectedOrderId || driver.id === selectedDriverId;

            return (
              <g key={`route-${order.id}`}>
                {/* Route curve */}
                <path
                  d={`M ${start.x} ${start.y} Q ${midX + 25} ${midY - 20} ${end.x} ${end.y}`}
                  fill="none"
                  stroke={isSelected ? '#F97316' : '#EA580C'}
                  strokeWidth={isSelected ? 4 : 2.5}
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  className="opacity-90 animate-dash"
                />

                {/* Floating ETA Tag on Route */}
                <g 
                  transform={`translate(${midX + 15}, ${midY - 15})`} 
                  className="cursor-pointer"
                  onClick={() => {
                    onSelectOrder?.(order);
                    setActivePopup({ type: 'order', id: order.id, data: order, x: midX, y: midY });
                  }}
                >
                  <rect x="-35" y="-12" width="70" height="22" rx="6" fill="#0F172A" stroke="#EA580C" strokeWidth="1.2" />
                  <text x="0" y="3" fill="#FB923C" fontSize="10" fontWeight="bold" textAnchor="middle">
                    {typeof order.driverEtaMinutes === 'number' ? `${order.driverEtaMinutes}m ETA` : 'En Route'}
                  </text>
                </g>
              </g>
            );
          })}

          {/* CUSTOMER DELIVERY DESTINATION PINS */}
          {filteredOrders.map((order, idx) => {
            const coords = order.deliveryAddress?.coordinates || { lat: -1.2863, lng: 36.8172 };
            const pos = latLngToSvg(coords.lat, coords.lng);
            const isSelected = order.id === selectedOrderId;
            const isDelayed = order.isOverdue || (typeof order.slaRemainingMinutes === 'number' && order.slaRemainingMinutes < 0);
            const isUnassigned = order.status === 'Pending' || !order.driverId;

            // Pin styling
            let pinColor = '#3B82F6'; // Blue default
            let pulseColor = '#60A5FA';
            if (isDelayed) {
              pinColor = '#E11D48'; // Rose/Red for delayed
              pulseColor = '#FB7185';
            } else if (order.status === 'Dispatched' || order.status === 'Out for Delivery') {
              pinColor = '#F97316'; // Orange for en route
              pulseColor = '#FDBA74';
            } else if (order.status === 'Delivered') {
              pinColor = '#10B981'; // Emerald for delivered
              pulseColor = '#6EE7B7';
            }

            return (
              <g
                key={`cust-${order.id}-${idx}`}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer group"
                onClick={() => {
                  onSelectOrder?.(order);
                  setActivePopup({
                    type: 'order',
                    id: order.id,
                    data: order,
                    x: pos.x,
                    y: pos.y
                  });
                }}
              >
                {/* Radar pulse for delayed or unassigned orders */}
                {(isDelayed || isUnassigned || isSelected) && (
                  <circle r={isSelected ? 24 : 18} fill={pulseColor} fillOpacity="0.25" className="animate-ping" />
                )}

                {/* Outer shadow / ring */}
                <circle r={isSelected ? 14 : 10} fill={pinColor} stroke="#FFFFFF" strokeWidth={isSelected ? 2.5 : 1.5} />

                {/* Center marker */}
                <circle r={isSelected ? 5 : 3.5} fill="#FFFFFF" />

                {/* Order Label Pill */}
                <g transform="translate(0, -16)">
                  <rect
                    x="-32"
                    y="-10"
                    width="64"
                    height="18"
                    rx="5"
                    fill={isSelected ? '#EA580C' : isDelayed ? '#BE123C' : '#1E293B'}
                    stroke={isSelected ? '#FFFFFF' : '#475569'}
                    strokeWidth="1"
                    className="transition-all"
                  />
                  <text
                    x="0"
                    y="3"
                    fill="#FFFFFF"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {order.id.slice(-4)} {isDelayed ? '⚠️' : ''}
                  </text>
                </g>
              </g>
            );
          })}

          {/* DRIVER VEHICLE BEACONS */}
          {drivers.map((driver) => {
            if (!driver.location) return null;
            const pos = latLngToSvg(driver.location.lat, driver.location.lng);
            const isSelected = driver.id === selectedDriverId;
            const isOffline = driver.status === 'Offline';
            const isOnRoute = driver.status === 'On Route';
            const isAvailable = driver.status === 'Available';

            let beaconColor = '#10B981'; // Green for Available
            if (isOnRoute) beaconColor = '#F97316'; // Orange for en route
            if (isOffline) beaconColor = '#EF4444'; // Red for offline

            return (
              <g
                key={`driver-${driver.id}`}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer"
                onClick={() => {
                  onSelectDriver?.(driver);
                  setActivePopup({
                    type: 'driver',
                    id: driver.id,
                    data: driver,
                    x: pos.x,
                    y: pos.y
                  });
                }}
              >
                {/* Active driver pulse */}
                {isOnRoute && (
                  <circle r="18" fill="#F97316" fillOpacity="0.3" className="animate-ping" />
                )}

                {/* Vehicle Hexagon / Round Beacon */}
                <circle
                  r={isSelected ? 16 : 12}
                  fill="#0F172A"
                  stroke={beaconColor}
                  strokeWidth={isSelected ? 3 : 2}
                />
                
                {/* Inner Icon Indicator */}
                <circle r={isSelected ? 6 : 4.5} fill={beaconColor} />

                {/* Driver Tag */}
                <g transform="translate(0, 18)">
                  <rect
                    x="-40"
                    y="-8"
                    width="80"
                    height="18"
                    rx="5"
                    fill="#0F172A"
                    stroke={beaconColor}
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="4.5"
                    fill="#F1F5F9"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {driver.name.split(' ')[0]} ({driver.licensePlate?.split(' ')[0] || 'VAN'})
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Interactive Overlay Popup Card (when pin is clicked) */}
        {activePopup && (
          <div 
            className="absolute z-30 w-72 bg-slate-900/95 backdrop-blur-md rounded-xl p-4 border border-slate-700 text-white shadow-2xl transition-all"
            style={{
              left: Math.min(Math.max(20, activePopup.x * (zoomLevel) - 144), 600),
              top: Math.min(Math.max(20, activePopup.y * (zoomLevel) - 160), 400)
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
              <div className="flex items-center gap-1.5">
                {activePopup.type === 'order' ? (
                  <MapPin className="w-4 h-4 text-orange-400" />
                ) : (
                  <Truck className="w-4 h-4 text-emerald-400" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {activePopup.type === 'order' ? 'Customer Delivery Drop' : 'Rider Telemetry'}
                </span>
              </div>
              <button 
                onClick={() => setActivePopup(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {activePopup.type === 'order' ? (
              // Order Details in popup
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{activePopup.data.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    activePopup.data.isOverdue ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {activePopup.data.status}
                  </span>
                </div>

                <div className="text-slate-300">
                  <p className="font-semibold text-white">{activePopup.data.customerName}</p>
                  <p className="text-slate-400 text-[11px]">{activePopup.data.deliveryAddress?.street}</p>
                </div>

                <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60 flex items-center justify-between text-[11px]">
                  <span>Item: <strong className="text-white">{activePopup.data.cylinderSummary}</strong></span>
                  <span className="text-orange-400 font-bold">KSh {activePopup.data.total?.toLocaleString()}</span>
                </div>

                {activePopup.data.driverName ? (
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>Driver: <strong className="text-white">{activePopup.data.driverName}</strong></span>
                    <span className="text-emerald-400 font-semibold">
                      {typeof activePopup.data.driverEtaMinutes === 'number' ? `${activePopup.data.driverEtaMinutes}m ETA` : 'Assigned'}
                    </span>
                  </div>
                ) : (
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        onSelectOrder?.(activePopup.data);
                        setActivePopup(null);
                      }}
                      className="w-full py-1.5 px-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold flex items-center justify-center gap-1 text-xs transition-colors"
                    >
                      <span>Assign Available Driver</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Driver Details in popup
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{activePopup.data.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    activePopup.data.status === 'Available' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    activePopup.data.status === 'On Route' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                    'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {activePopup.data.status}
                  </span>
                </div>

                <div className="text-slate-300 text-[11px] space-y-0.5">
                  <p>Vehicle: <strong className="text-white">{activePopup.data.vehicle}</strong></p>
                  <p>Current Stop: <strong className="text-white">{activePopup.data.currentStop || activePopup.data.location?.addressText || 'Station'}</strong></p>
                  <p>Delivered Today: <strong className="text-white">{activePopup.data.deliveredCountToday} drops</strong></p>
                </div>

                {selectedOrderId && (
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        onAssignDriver?.(selectedOrderId, activePopup.data.id);
                        setActivePopup(null);
                      }}
                      className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-1 text-xs transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Assign Order #{selectedOrderId.slice(-4)} to this Rider</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Bottom Map Legend */}
      <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Awaiting Assignment</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>Active En Route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Delayed / Overdue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Rider Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            <span>Rider Offline</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          <Compass className="w-3.5 h-3.5" />
          <span>Real GPS Coordinates · Click pin to inspect</span>
        </div>
      </div>

      {/* Google Maps API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-base">Google Maps Platform Key</h3>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Provide your Google Maps Platform API key or a Maps Demo Key to enable genuine live Google satellite and roadmap imagery with real Thika Highway GPS coordinates.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">API Key</label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 font-mono"
              />
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Need a rapid test key?</span>
                <a
                  href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline inline-flex items-center gap-1 font-bold"
                >
                  <span>Maps Demo Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-slate-400">Works with zero billing setup for testing and development environments.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
              >
                Save & Load Real Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
