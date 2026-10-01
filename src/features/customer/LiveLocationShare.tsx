import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Radio } from 'lucide-react';
import { api } from '../../services/api';

interface LiveLocationShareProps {
  orderId: string;
  driverName?: string;
  initialIsSharing?: boolean;
  onLocationUpdate?: (location: { lat: number; lng: number; accuracy?: number; isSharing: boolean }) => void;
}

export const LiveLocationShare: React.FC<LiveLocationShareProps> = ({
  orderId,
  driverName = 'Assigned Driver',
  initialIsSharing = false,
  onLocationUpdate
}) => {
  const [isSharing, setIsSharing] = useState<boolean>(initialIsSharing);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [status, setStatus] = useState<'idle' | 'locating' | 'active' | 'denied' | 'error'>(
    initialIsSharing ? 'active' : 'idle'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Stop location watching
  const stopLocationSharing = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsSharing(false);
    setStatus('idle');
    try {
      await api.updateCustomerLiveLocation(orderId, {
        lat: coords?.lat || 0,
        lng: coords?.lng || 0,
        accuracy: coords?.accuracy,
        isSharing: false
      });
      if (onLocationUpdate) {
        onLocationUpdate({
          lat: coords?.lat || 0,
          lng: coords?.lng || 0,
          accuracy: coords?.accuracy,
          isSharing: false
        });
      }
    } catch (e) {
      console.error('Failed to notify backend of stopped location sharing', e);
    }
  };

  // Start live location watching with high accuracy
  const startLocationSharing = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setStatus('locating');
    setErrorMessage(null);

    // Initial position fetch
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCoords({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy) });
        setStatus('active');
        setIsSharing(true);
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastUpdated(timeNow);

        try {
          await api.updateCustomerLiveLocation(orderId, {
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy),
            isSharing: true
          });
          if (onLocationUpdate) {
            onLocationUpdate({
              lat: latitude,
              lng: longitude,
              accuracy: Math.round(accuracy),
              isSharing: true
            });
          }
        } catch (err: any) {
          console.error('Backend location update error:', err);
        }

        // Start continuous watch
        watchIdRef.current = navigator.geolocation.watchPosition(
          async (watchPos) => {
            const wLat = watchPos.coords.latitude;
            const wLng = watchPos.coords.longitude;
            const wAcc = Math.round(watchPos.coords.accuracy);
            setCoords({ lat: wLat, lng: wLng, accuracy: wAcc });
            const wTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setLastUpdated(wTime);

            try {
              await api.updateCustomerLiveLocation(orderId, {
                lat: wLat,
                lng: wLng,
                accuracy: wAcc,
                isSharing: true
              });
              if (onLocationUpdate) {
                onLocationUpdate({ lat: wLat, lng: wLng, accuracy: wAcc, isSharing: true });
              }
            } catch (e) {
              // Non-blocking telemetry
            }
          },
          (watchErr) => {
            console.warn('Geolocation watch error:', watchErr);
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setErrorMessage('Location permission was denied. Please allow location access in your browser to share your live pinpoint.');
        } else {
          setStatus('error');
          setErrorMessage(`Unable to acquire GPS signal: ${err.message}`);
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isSharing
                ? 'bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50'
                : 'bg-orange-50 text-[#E04F11]'
            }`}
          >
            {isSharing ? (
              <Radio className="w-5 h-5 animate-pulse" />
            ) : (
              <MapPin className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                Doorstep Live GPS Sharing
              </h4>
              {isSharing && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Broadcasting
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
              {isSharing
                ? `Assigned driver ${driverName} is navigating to your live coordinates.`
                : 'Help your driver pinpoint your exact gate or door along Thika Superhighway.'}
            </p>
          </div>
        </div>

        {/* Toggle Action Button */}
        <div>
          <button
            id="location-sharing-toggle"
            onClick={isSharing ? stopLocationSharing : startLocationSharing}
            disabled={status === 'locating'}
            className={`location-sharing-toggle px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs disabled:opacity-50 ${
              isSharing
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-[#E04F11] hover:bg-[#c2410c] text-white'
            }`}
          >
            {status === 'locating' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Acquiring GPS...</span>
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5" />
                <span>Share Live Location</span>
              </>
            )}

            {/* Visual State Indicator */}
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                isSharing ? 'bg-white text-emerald-800' : 'bg-white/20 text-white'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSharing ? 'bg-emerald-600 animate-ping' : 'bg-white/70'
                }`}
              />
              <span>{isSharing ? 'Active' : 'Inactive'}</span>
            </span>
          </button>
        </div>
      </div>

      {/* Active telemetry feedback bar */}
      {isSharing && coords && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600 bg-emerald-50/40 -mx-4 -mb-4 p-3 rounded-b-xl border-emerald-100">
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium text-emerald-800">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
            {coords.accuracy && (
              <span className="text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded font-mono text-[10px]">
                ±{coords.accuracy}m accuracy
              </span>
            )}
          </div>
          <span className="text-gray-400 text-[10px]">
            Updated {lastUpdated || 'just now'}
          </span>
        </div>
      )}

      {/* Permission Denied Notice */}
      {status === 'denied' && errorMessage && (
        <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* General Error Notice */}
      {status === 'error' && errorMessage && (
        <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
