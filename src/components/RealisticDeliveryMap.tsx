import React, { useState, useEffect } from 'react';
import {
  Navigation,
  MapPin,
  ZoomIn,
  ZoomOut,
  Compass,
  Radio,
  Building2,
  ExternalLink,
  Layers,
  Key,
  Check,
  Globe,
  X,
  Map as MapIcon
} from 'lucide-react';
import { PickupLocation } from '../types';
import { GoogleMapsRouteView } from './GoogleMapsRouteView';

interface RealisticDeliveryMapProps {
  driverName?: string;
  driverAvatar?: string;
  customerName?: string;
  customerAvatar?: string;
  customerAddress?: string;
  pickupLocation?: PickupLocation;
  isLive?: boolean;
  customerLiveLocation?: {
    lat: number;
    lng: number;
    accuracy?: number;
    isSharing?: boolean;
    updatedAt?: string;
  };
  heightClass?: string;
  showLabels?: boolean;
}

export const RealisticDeliveryMap: React.FC<RealisticDeliveryMapProps> = ({
  driverName = 'Dennis Driver',
  driverAvatar,
  customerName = 'Wanjiru Customer',
  customerAvatar,
  customerAddress = 'Lumumba Drive, Roysambu Court 4, Exit 8',
  pickupLocation,
  isLive = true,
  customerLiveLocation,
  heightClass = 'h-64 sm:h-72',
  showLabels = true
}) => {
  // API Key management & view modes
  const defaultApiKey = (typeof window !== 'undefined'
    ? (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || localStorage.getItem('gmp_api_key') || '')
    : '') as string;
  const [apiKey, setApiKey] = useState<string>(defaultApiKey);
  const [mapMode, setMapMode] = useState<'google' | 'vector'>('google');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>(defaultApiKey);
  const [keySaveSuccess, setKeySaveSuccess] = useState<boolean>(false);

  const handleSaveKey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = keyInput.trim();
    setApiKey(trimmed);
    if (typeof window !== 'undefined') {
      if (trimmed) {
        localStorage.setItem('gmp_api_key', trimmed);
      } else {
        localStorage.removeItem('gmp_api_key');
      }
    }
    setKeySaveSuccess(true);
    setTimeout(() => {
      setKeySaveSuccess(false);
      setShowKeyModal(false);
    }, 800);
  };

  // Smooth animated progression along the route
  const [progress, setProgress] = useState(0.42);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');

  // Real device GPS integration state
  const [isUsingRealGps, setIsUsingRealGps] = useState<boolean>(false);
  const [realGpsCoords, setRealGpsCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    speed?: number | null;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Watch real device position via HTML5 Geolocation API when toggled
  useEffect(() => {
    if (!isUsingRealGps) return;

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser');
      setIsUsingRealGps(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(null);
        setRealGpsCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          speed: pos.coords.speed
        });
      },
      (err) => {
        setGpsError(err.message || 'Unable to retrieve location');
        setIsUsingRealGps(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isUsingRealGps]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 0.005;
        return next > 0.95 ? 0.25 : next;
      });
    }, 1400);
    return () => clearInterval(interval);
  }, [isLive]);

  const isSharingGps = Boolean(customerLiveLocation?.isSharing);

  // SVG dimensions
  const vbWidth = 700;
  const vbHeight = 360;

  // Key coordinate milestones along the Waiyaki Way / Thika Superhighway corridor
  // Pickup Depot (Waypoint A)
  const depotX = 90;
  const depotY = 240;

  // Driver Start / Anchor (Waypoint B)
  const startX = 220;
  const startY = 200;

  // Customer Destination (Waypoint C)
  const endX = 580;
  const endY = 120;

  // Intermediate curve for road path
  // Calculate driver position along bezier path
  const t = progress;
  const cpX = 390;
  const cpY = 170;
  const driverX = Math.round((1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cpX + t * t * endX);
  const driverY = Math.round((1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cpY + t * t * endY);

  const isDepotPickedUp = Boolean(pickupLocation?.isPickedUp);

  // Real coordinates along Thika Highway corridor
  const originCoord: google.maps.LatLngLiteral = pickupLocation?.coordinates
    ? { lat: pickupLocation.coordinates.lat, lng: pickupLocation.coordinates.lng }
    : { lat: -1.2185, lng: 36.8872 }; // Roysambu Central Hub (Exit 8)

  const destinationCoord: google.maps.LatLngLiteral =
    customerLiveLocation?.lat && customerLiveLocation?.lng
      ? { lat: customerLiveLocation.lat, lng: customerLiveLocation.lng }
      : { lat: -1.2155, lng: 36.8945 }; // Lumumba Drive, Roysambu Court 4, Exit 8

  const driverCoord: google.maps.LatLngLiteral =
    isUsingRealGps && realGpsCoords
      ? { lat: realGpsCoords.lat, lng: realGpsCoords.lng }
      : {
          lat: originCoord.lat + (destinationCoord.lat - originCoord.lat) * progress,
          lng: originCoord.lng + (destinationCoord.lng - originCoord.lng) * progress
        };

  const googleMapsUrl = pickupLocation?.coordinates && pickupLocation?.isPickedUp === false
    ? `https://www.google.com/maps/dir/?api=1&destination=${pickupLocation.coordinates.lat},${pickupLocation.coordinates.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${customerAddress}, Nairobi, Kenya`)}`;

  return (
    <div
      className={`relative w-full ${heightClass} min-h-[260px] rounded-2xl overflow-hidden ${
        mapStyle === 'satellite' ? 'bg-[#0B1528]' : 'bg-[#F4F6F9]'
      } border border-gray-200 select-none shadow-2xs`}
    >
      {/* 1. MAP CONTENT: GOOGLE MAPS OR VECTOR CORRIDOR */}
      {mapMode === 'google' ? (
        apiKey ? (
          <GoogleMapsRouteView
            apiKey={apiKey}
            origin={originCoord}
            destination={destinationCoord}
            driverLocation={driverCoord}
            driverName={driverName}
            customerName={customerName}
            customerAddress={customerAddress}
            pickupLocation={pickupLocation}
            isSharingGps={isSharingGps}
            mapType={mapStyle === 'satellite' ? 'satellite' : 'roadmap'}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-900 to-slate-950 text-white relative z-0">
            <div className="max-w-md space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Globe className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="text-base font-bold text-white tracking-tight">
                Live Google Maps Platform (Thika Road)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect your Google Maps Platform API key or free Maps Demo Key to render live satellite tiles, real street navigation, and dynamic route polylines.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                <button
                  id="btn-open-gmp-key-prompt"
                  type="button"
                  onClick={() => setShowKeyModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Enter API / Demo Key</span>
                </button>
                <button
                  id="btn-fallback-to-vector"
                  type="button"
                  onClick={() => setMapMode('vector')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
                >
                  View Vector Corridor Map
                </button>
              </div>
              <div className="pt-2 text-[11px] text-slate-400">
                <span>Need a key? </span>
                <a
                  href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline font-semibold"
                >
                  Get a free Maps Demo Key (no billing setup required)
                </a>
              </div>
            </div>
          </div>
        )
      ) : (
        <svg
          viewBox={`0 0 ${vbWidth} ${vbHeight}`}
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
        <defs>
          {/* Subtle street block texture */}
          <pattern id="city-blocks" width="60" height="60" patternUnits="userSpaceOnUse">
            <rect width="56" height="56" fill={mapStyle === 'satellite' ? '#0F1E36' : '#F8FAFC'} rx="4" />
            <path d="M 0 0 L 60 0 60 60 0 60 Z" fill="none" stroke={mapStyle === 'satellite' ? '#1A2C4B' : '#EDF2F7'} strokeWidth="1" />
          </pattern>

          {/* Linear gradient for route line */}
          <linearGradient id="route-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          {/* Depot to Driver Pickup Leg Gradient */}
          <linearGradient id="pickup-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          {/* Shadow filter for pins */}
          <filter id="pin-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25" floodColor="#0F172A" />
          </filter>
        </defs>

        {/* Base Map Canvas */}
        <rect width="100%" height="100%" fill={mapStyle === 'satellite' ? '#0B172A' : '#EEF2F6'} />
        <rect width="100%" height="100%" fill="url(#city-blocks)" opacity={mapStyle === 'satellite' ? 0.9 : 0.8} />

        {/* Park / Greenery Areas */}
        <path
          d="M 450 180 Q 520 190 580 240 Q 560 310 470 300 Q 420 260 450 180 Z"
          fill={mapStyle === 'satellite' ? '#063B2B' : '#DCFCE7'}
          opacity={mapStyle === 'satellite' ? 0.7 : 0.9}
        />
        <path
          d="M 60 40 Q 140 20 180 80 Q 140 120 70 100 Z"
          fill={mapStyle === 'satellite' ? '#063B2B' : '#DCFCE7'}
          opacity={mapStyle === 'satellite' ? 0.6 : 0.8}
        />
        <path
          d="M 280 20 Q 360 10 390 50 Q 340 90 270 60 Z"
          fill={mapStyle === 'satellite' ? '#063B2B' : '#DCFCE7'}
          opacity={mapStyle === 'satellite' ? 0.5 : 0.7}
        />

        {/* Local Streets Grid */}
        <g
          stroke={mapStyle === 'satellite' ? '#1E293B' : '#E2E8F0'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <path d="M 30 110 L 680 110" />
          <path d="M 40 280 L 670 280" />
          <path d="M 90 30 L 110 340" />
          <path d="M 230 20 L 250 340" />
          <path d="M 400 30 L 420 340" />
          <path d="M 600 20 L 610 340" />
          <path d="M 120 70 L 350 200" strokeWidth="4" />
          <path d="M 450 120 L 650 40" strokeWidth="4" />
        </g>

        {/* Arterial Secondary Roads */}
        <g
          stroke={mapStyle === 'satellite' ? '#334155' : '#CBD5E1'}
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <path d="M -10 180 C 180 200, 320 140, 710 160" />
          <path d="M 180 370 C 220 250, 310 150, 360 -10" />
          <path d="M 480 -10 C 490 140, 520 260, 560 370" />
        </g>
        <g stroke={mapStyle === 'satellite' ? '#475569' : '#FFFFFF'} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M -10 180 C 180 200, 320 140, 710 160" />
          <path d="M 180 370 C 220 250, 310 150, 360 -10" />
          <path d="M 480 -10 C 490 140, 520 260, 560 370" />
        </g>

        {/* Highway Overpass & Interchanges */}
        <g stroke={mapStyle === 'satellite' ? '#1E293B' : '#94A3B8'} strokeWidth="14" strokeLinecap="round" fill="none" opacity="0.6">
          <path d="M 80 320 Q 240 240 380 180 T 640 100" />
          <path d="M 260 210 Q 320 260 380 220" />
        </g>
        <g stroke={mapStyle === 'satellite' ? '#64748B' : '#FFFFFF'} strokeWidth="10" strokeLinecap="round" fill="none">
          <path d="M 80 320 Q 240 240 380 180 T 640 100" />
        </g>

        {/* Street Name Labels */}
        <text
          x="230"
          y="180"
          fill={mapStyle === 'satellite' ? '#94A3B8' : '#64748B'}
          fontSize="10"
          fontWeight="bold"
          fontFamily="system-ui"
          letterSpacing="0.5"
        >
          Thika Superhighway
        </text>
        <text
          x="440"
          y="150"
          fill={mapStyle === 'satellite' ? '#94A3B8' : '#64748B'}
          fontSize="9"
          fontWeight="bold"
          fontFamily="system-ui"
        >
          Exit 8 Service Road
        </text>
        <text
          x="260"
          y="315"
          fill={mapStyle === 'satellite' ? '#64748B' : '#94A3B8'}
          fontSize="8"
          fontWeight="600"
          fontFamily="system-ui"
        >
          Roysambu Roundabout
        </text>

        {/* Pickup Leg Polyline (if depot is present) */}
        {pickupLocation && (
          <path
            d={`M ${depotX} ${depotY} Q 150 220 ${startX} ${startY}`}
            fill="none"
            stroke="url(#pickup-gradient)"
            strokeWidth={isDepotPickedUp ? 3.5 : 4.5}
            strokeDasharray={isDepotPickedUp ? '4 4' : 'none'}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-xs"
          />
        )}

        {/* Active Delivery Route Polyline in Solid Royal Blue */}
        <path
          d={`M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`}
          fill="none"
          stroke="url(#route-gradient)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-xs"
        />

        {/* Route Waypoints along the path */}
        <circle cx={startX + 50} cy={startY - 10} r="3" fill="#2563EB" />
        <circle cx={cpX} cy={cpY} r="3.5" fill="#2563EB" />
        <circle cx={endX - 70} cy={endY + 10} r="3" fill="#2563EB" />

        {/* 1. PICKUP DEPOT PIN (Waypoint A - Left) */}
        {pickupLocation && (
          <g transform={`translate(${depotX}, ${depotY})`} filter="url(#pin-shadow)">
            {/* Outer ring */}
            <circle
              r="17"
              fill="#FFFFFF"
              stroke={isDepotPickedUp ? '#10B981' : '#D97706'}
              strokeWidth="2.5"
            />
            {/* Inner fill */}
            <circle r="13" fill={isDepotPickedUp ? '#059669' : '#D97706'} />
            {/* Depot icon representation */}
            <text
              y="4"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="9"
              fontWeight="bold"
              fontFamily="system-ui"
            >
              HUB
            </text>

            {/* Status dot */}
            <circle
              cx="11"
              cy="-9"
              r="5"
              fill={isDepotPickedUp ? '#10B981' : '#F59E0B'}
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />

            {/* Label Below Pin */}
            {showLabels && (
              <g transform="translate(0, 26)">
                <rect
                  x="-52"
                  y="0"
                  width="104"
                  height="22"
                  rx="6"
                  fill="#FFFFFF"
                  stroke={isDepotPickedUp ? '#A7F3D0' : '#FDE68A'}
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="11"
                  textAnchor="middle"
                  fill="#0F172A"
                  fontSize="8.5"
                  fontWeight="bold"
                  fontFamily="system-ui"
                >
                  {pickupLocation.stationBrand || 'Pickup Depot'}
                </text>
                <text
                  x="0"
                  y="19"
                  textAnchor="middle"
                  fill={isDepotPickedUp ? '#059669' : '#D97706'}
                  fontSize="7"
                  fontWeight="bold"
                  fontFamily="system-ui"
                >
                  {isDepotPickedUp ? '✓ Picked Up' : 'Pending Pickup'}
                </text>
              </g>
            )}
          </g>
        )}

        {/* 2. DRIVER START / CARRIER PIN (Waypoint B - Mid-Left) */}
        <g transform={`translate(${startX}, ${startY})`} filter="url(#pin-shadow)">
          <circle r="18" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />
          <circle r="14" fill="#0F172A" />
          <text
            y="4"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="bold"
            fontFamily="system-ui"
          >
            DK
          </text>
          <circle cx="12" cy="-10" r="5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
          {showLabels && (
            <g transform="translate(0, 28)">
              <rect x="-42" y="0" width="84" height="20" rx="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
              <text x="0" y="14" textAnchor="middle" fill="#0F172A" fontSize="9" fontWeight="bold" fontFamily="system-ui">
                {driverName}
              </text>
            </g>
          )}
        </g>

        {/* 3. LIVE MOVING DRIVER TRUCK MARKER */}
        <g transform={`translate(${driverX}, ${driverY})`} filter="url(#pin-shadow)">
          <circle r="12" fill="#2563EB" fillOpacity="0.25" className="animate-ping" />
          <circle r="8" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
          <circle r="3" fill="#FFFFFF" />
        </g>

        {/* 4. DESTINATION / CUSTOMER DOORSTEP PIN (Waypoint C - Right) */}
        <g transform={`translate(${endX}, ${endY})`} filter="url(#pin-shadow)">
          {isSharingGps ? (
            <>
              <circle r="22" fill="#10B981" fillOpacity="0.25" className="animate-ping" />
              <circle r="18" fill="#FFFFFF" stroke="#10B981" strokeWidth="2.5" />
            </>
          ) : (
            <circle r="18" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />
          )}

          <circle r="14" fill="#E04F11" />
          <text
            y="4"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="bold"
            fontFamily="system-ui"
          >
            WM
          </text>

          <circle
            cx="12"
            cy="-10"
            r="5"
            fill={isSharingGps ? '#10B981' : '#2563EB'}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />

          {showLabels && (
            <g transform="translate(0, 28)">
              <rect x="-48" y="0" width="96" height="20" rx="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
              <text x="0" y="14" textAnchor="middle" fill="#0F172A" fontSize="9" fontWeight="bold" fontFamily="system-ui">
                {customerName}
              </text>
            </g>
          )}
        </g>
      </svg>
      )}

      {/* Floating Header Badges */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
        <div className="bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-gray-200 shadow-xs flex items-center gap-1.5 text-xs font-semibold text-gray-800">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span className="hidden sm:inline">Route Corridor:</span>
          <span className="font-bold text-gray-900 truncate max-w-[200px]">{customerAddress}</span>
        </div>

        {pickupLocation && !pickupLocation.isPickedUp && (
          <div className="bg-amber-600 text-white px-2.5 py-1 rounded-lg shadow-sm text-xs font-bold flex items-center gap-1.5 animate-pulse">
            <Building2 className="w-3 h-3" />
            <span>Pickup: {pickupLocation.stationBrand || 'Depot'}</span>
          </div>
        )}

        {isSharingGps && (
          <div className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg shadow-sm text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Doorstep GPS Active</span>
          </div>
        )}

        {isUsingRealGps && realGpsCoords && (
          <div className="bg-blue-700 text-white px-2.5 py-1 rounded-lg shadow-sm text-[11px] font-bold flex items-center gap-1.5">
            <Radio className="w-3 h-3 animate-pulse text-cyan-300" />
            <span>Live Device GPS: ±{realGpsCoords.accuracy}m</span>
          </div>
        )}
      </div>

      {/* Action Controls (Top Right: Mode Toggle + Key Config + Live GPS + Style) */}
      <div className="absolute top-3 right-3 flex flex-wrap items-center gap-1.5 z-10">
        {/* Map Mode Segmented Switcher */}
        <div className="flex items-center bg-white/95 backdrop-blur-xs rounded-lg border border-gray-200 p-0.5 shadow-xs">
          <button
            id="btn-switch-map-mode-google"
            type="button"
            onClick={() => setMapMode('google')}
            className={`px-2 py-1 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              mapMode === 'google'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-gray-700 hover:text-gray-900'
            }`}
            title="Switch to real Google Maps"
          >
            <Globe className="w-3 h-3" />
            <span>Google Map</span>
          </button>
          <button
            id="btn-switch-map-mode-vector"
            type="button"
            onClick={() => setMapMode('vector')}
            className={`px-2 py-1 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              mapMode === 'vector'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-gray-700 hover:text-gray-900'
            }`}
            title="Switch to Vector schematic corridor view"
          >
            <MapIcon className="w-3 h-3" />
            <span>Vector View</span>
          </button>
        </div>

        {/* Configure API Key button */}
        <button
          id="btn-open-gmp-key-settings"
          type="button"
          onClick={() => setShowKeyModal(true)}
          className="p-1.5 bg-white/95 hover:bg-gray-100 rounded-lg text-gray-700 border border-gray-200 shadow-xs cursor-pointer transition-colors"
          title="Google Maps API Key Settings"
        >
          <Key className="w-3.5 h-3.5" />
        </button>

        {/* Toggle Real Device GPS */}
        <button
          id="btn-toggle-device-gps"
          type="button"
          onClick={() => setIsUsingRealGps((prev) => !prev)}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border shadow-xs ${
            isUsingRealGps
              ? 'bg-blue-600 text-white border-blue-700'
              : 'bg-white/95 text-gray-700 hover:bg-gray-100 border-gray-200'
          }`}
          title="Toggle browser device GPS tracking"
        >
          <Radio className={`w-3.5 h-3.5 ${isUsingRealGps ? 'animate-pulse text-cyan-200' : 'text-gray-500'}`} />
          <span className="hidden sm:inline">{isUsingRealGps ? 'GPS On' : 'Use Device GPS'}</span>
        </button>

        {/* Map Layer Style Switcher */}
        <button
          id="btn-toggle-map-style"
          type="button"
          onClick={() => setMapStyle((s) => (s === 'street' ? 'satellite' : 'street'))}
          className="p-1.5 bg-white/95 hover:bg-gray-100 rounded-lg text-gray-700 border border-gray-200 shadow-xs cursor-pointer"
          title="Toggle street vs satellite view mode"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Zoom Controls & Open In Google Maps (Bottom Right) */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1 rounded-lg border border-gray-200 shadow-xs z-10">
        <a
          id="link-open-native-google-maps"
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded text-blue-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
          title="Open in Google Maps turn-by-turn navigation"
        >
          <ExternalLink className="w-3 h-3" />
          <span className="hidden sm:inline">Google Maps</span>
        </a>

        {mapMode === 'vector' && (
          <>
            <div className="h-4 w-px bg-gray-200" />
            <button
              id="btn-zoom-in-vector"
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
              className="p-1 hover:bg-gray-100 rounded text-gray-600 cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              id="btn-zoom-out-vector"
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
              className="p-1 hover:bg-gray-100 rounded text-gray-600 cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Google Maps API Key Modal */}
      {showKeyModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md p-5 text-left text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Google Maps Platform Key</h3>
              </div>
              <button
                id="btn-close-key-modal"
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveKey} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  API Key or Maps Demo Key
                </label>
                <input
                  id="input-google-maps-api-key"
                  type="text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Paste AIzaSy... or Maps Demo Key"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-100 text-[11px] text-blue-900 space-y-1">
                <p className="font-semibold">Development & Sandbox Testing:</p>
                <p className="text-blue-800">
                  You can use a free Google Maps Demo Key with no billing setup or Cloud project required.
                </p>
                <a
                  href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold pt-0.5"
                >
                  <span>Get a free Maps Demo Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  id="btn-cancel-key-modal"
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-key-modal"
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  {keySaveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save & Apply</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

