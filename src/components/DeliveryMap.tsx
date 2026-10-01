import React from 'react';
import { RealisticDeliveryMap } from './RealisticDeliveryMap';

interface DeliveryMapProps {
  driverName?: string;
  vehicle?: string;
  etaMinutes?: number;
  customerAddress?: string;
  isLive?: boolean;
  customerLiveLocation?: {
    lat: number;
    lng: number;
    accuracy?: number;
    isSharing?: boolean;
    updatedAt?: string;
  };
}

export const DeliveryMap: React.FC<DeliveryMapProps> = ({
  driverName = 'Assigned Courier',
  customerAddress = 'Lumumba Drive, Roysambu Court 4, Exit 8',
  isLive = true,
  customerLiveLocation
}) => {
  return (
    <RealisticDeliveryMap
      driverName={driverName}
      customerAddress={customerAddress}
      isLive={isLive}
      customerLiveLocation={customerLiveLocation}
      heightClass="h-56 sm:h-64"
    />
  );
};

