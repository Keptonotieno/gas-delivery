import { Employee, ActivityItem } from '../src/types.js';

// Live employee staff roster (empty by default - staff are registered and managed dynamically)
export const initialEmployees: Employee[] = [];

export const initialActivityLogs: ActivityItem[] = [
  {
    id: 'act-1',
    title: 'Fleet System Ready',
    description: 'Fleet driver management and courier onboarding ready for registration',
    timestamp: 'Just now',
    timeAgo: 'Just now',
    type: 'driver_online'
  },
  {
    id: 'act-2',
    title: 'Depot Inventory Synced',
    description: 'Central Roysambu, Kilimani, and Westlands LPG stock counts verified and ready for fulfillment',
    timestamp: '15 mins ago',
    timeAgo: '15 mins ago',
    type: 'order_accepted'
  },
  {
    id: 'act-3',
    title: 'Dispatch System Online',
    description: 'Automated order ingestion, zone-based routing, and M-Pesa IPN listener operational',
    timestamp: '30 mins ago',
    timeAgo: '30 mins ago',
    type: 'driver_online'
  }
];

