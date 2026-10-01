// Source: Google Maps Platform Code Assist
import React, { useEffect, useState, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import { Truck, MapPin, Building2, Radio, Navigation, CheckCircle2 } from 'lucide-react';
import { PickupLocation } from '../types';

interface GoogleMapsRouteViewProps {
  apiKey: string;
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
  driverLocation: google.maps.LatLngLiteral;
  driverName?: string;
  customerName?: string;
  customerAddress?: string;
  pickupLocation?: PickupLocation;
  isSharingGps?: boolean;
  mapType?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
}

/**
 * RouteRenderer computes and draws the route between origin and destination
 * using the modern Routes API JS SDK wrapper (Route.computeRoutes).
 */
const RouteRenderer: React.FC<{
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
}> = ({ origin, destination }) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!routesLib || !map) return;

    // Clean up previous polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    try {
      const request: any = {
        origin,
        destination,
        travelMode: routesLib.TravelMode?.DRIVING || 'DRIVING'
      };

      const computePromise = typeof (routesLib.Route as any)?.computeRoutes === 'function'
        ? (routesLib.Route as any).computeRoutes(request)
        : typeof (routesLib.Route as any) === 'function'
        ? new (routesLib.Route as any)().computeRoutes(request)
        : Promise.reject(new Error('computeRoutes not available'));

      computePromise
        .then((response: any) => {
          if (!map) return;
          if (response.routes && response.routes.length > 0) {
            const route = response.routes[0];
            if (route.polyline && route.polyline.encodedPolyline) {
              const encoded = route.polyline.encodedPolyline;
              const path = typeof (routesLib.Route as any)?.decode === 'function'
                ? (routesLib.Route as any).decode(encoded)
                : (window as any).google?.maps?.geometry?.encoding?.decodePath
                ? (window as any).google.maps.geometry.encoding.decodePath(encoded)
                : [origin, destination];

              const newPolyline = new google.maps.Polyline({
                path,
                geodesic: true,
                strokeColor: '#2563EB',
                strokeOpacity: 0.9,
                strokeWeight: 5,
                map
              });
              polylineRef.current = newPolyline;
            }

            if (route.viewport) {
              const bounds = new google.maps.LatLngBounds(
                route.viewport.southwest,
                route.viewport.northeast
              );
              map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
            }
          }
        })
        .catch((err) => {
          // Graceful fallback: render geodesic line between endpoints
          if (!map) return;
          const fallbackPolyline = new google.maps.Polyline({
            path: [origin, destination],
            geodesic: true,
            strokeColor: '#2563EB',
            strokeOpacity: 0.85,
            strokeWeight: 4,
            map
          });
          polylineRef.current = fallbackPolyline;
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(origin);
          bounds.extend(destination);
          map.fitBounds(bounds, 50);
        });
    } catch {
      // Direct polyline fallback
      const fallbackPolyline = new google.maps.Polyline({
        path: [origin, destination],
        geodesic: true,
        strokeColor: '#2563EB',
        strokeOpacity: 0.85,
        strokeWeight: 4,
        map
      });
      polylineRef.current = fallbackPolyline;
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(origin);
      bounds.extend(destination);
      map.fitBounds(bounds, 50);
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [routesLib, map, origin.lat, origin.lng, destination.lat, destination.lng]);

  return null;
};

export const GoogleMapsRouteView: React.FC<GoogleMapsRouteViewProps> = ({
  apiKey,
  origin,
  destination,
  driverLocation,
  driverName = 'Dennis Driver',
  customerName = 'Wanjiru Customer',
  customerAddress = 'Lumumba Drive, Roysambu Court 4, Exit 8',
  pickupLocation,
  isSharingGps = false,
  mapType = 'roadmap'
}) => {
  const isDepotPickedUp = Boolean(pickupLocation?.isPickedUp);

  return (
    <div id="gmp-interactive-map-container" className="relative w-full h-full min-h-[260px] select-none">
      <APIProvider apiKey={apiKey} libraries={['routes', 'marker']}>
        <Map
          id="gmp-route-map"
          defaultCenter={driverLocation}
          defaultZoom={14}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          mapTypeId={mapType}
          disableDefaultUI={false}
          gestureHandling="cooperative"
          className="w-full h-full min-h-[260px]"
        >
          {/* Real Route Calculation and Polyline Rendering */}
          <RouteRenderer origin={origin} destination={destination} />

          {/* 1. Origin Depot Pin */}
          <AdvancedMarker position={origin} title={pickupLocation?.stationBrand || 'Pickup Depot'}>
            <div className="flex flex-col items-center">
              <div
                className={`px-2 py-1 rounded-lg shadow-md text-[11px] font-bold text-white flex items-center gap-1 border border-white ${
                  isDepotPickedUp ? 'bg-emerald-600' : 'bg-amber-600'
                }`}
              >
                <Building2 className="w-3 h-3" />
                <span>{pickupLocation?.stationBrand || 'Roysambu Depot'}</span>
                {isDepotPickedUp && <CheckCircle2 className="w-2.5 h-2.5" />}
              </div>
              <div
                className={`w-3 h-3 rotate-45 -mt-1.5 border-r border-b border-white ${
                  isDepotPickedUp ? 'bg-emerald-600' : 'bg-amber-600'
                }`}
              />
            </div>
          </AdvancedMarker>

          {/* 2. Driver Marker */}
          <AdvancedMarker position={driverLocation} title={`Driver: ${driverName}`}>
            <div className="flex flex-col items-center">
              <div className="px-2.5 py-1 bg-blue-600 text-white rounded-full shadow-lg text-[11px] font-bold flex items-center gap-1.5 border-2 border-white">
                <Truck className="w-3.5 h-3.5 animate-bounce text-cyan-200" />
                <span>{driverName}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
              </div>
              <div className="w-2.5 h-2.5 bg-blue-600 rotate-45 -mt-1 border-r border-b border-white" />
            </div>
          </AdvancedMarker>

          {/* 3. Destination Customer Marker */}
          <AdvancedMarker position={destination} title={`Destination: ${customerAddress}`}>
            <div className="flex flex-col items-center">
              <div
                className={`px-2.5 py-1 rounded-lg shadow-md text-[11px] font-bold text-white flex items-center gap-1.5 border border-white ${
                  isSharingGps ? 'bg-emerald-600' : 'bg-[#E04F11]'
                }`}
              >
                {isSharingGps ? (
                  <Radio className="w-3.5 h-3.5 animate-pulse text-white" />
                ) : (
                  <MapPin className="w-3.5 h-3.5" />
                )}
                <span>{customerName}</span>
              </div>
              <div
                className={`w-2.5 h-2.5 rotate-45 -mt-1 border-r border-b border-white ${
                  isSharingGps ? 'bg-emerald-600' : 'bg-[#E04F11]'
                }`}
              />
            </div>
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
};
