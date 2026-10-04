export type UserRole = 'customer' | 'admin' | 'driver';

export type CustomerStatus = 'active' | 'suspended' | 'inactive';

export type DriverVerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface DriverApplication {
  id: string;
  applicantName: string;
  email: string;
  phone: string;
  nationalIdNumber: string;
  nationalIdDocumentUrl?: string;
  driverLicenseNumber: string;
  driverLicenseDocumentUrl?: string;
  vehicleMake: string;
  vehicleModel: string;
  licensePlate: string;
  vehicleType?: 'Motorcycle / Boda' | 'Pickup / Van' | 'Light Truck' | 'Tuk Tuk' | string;
  corridorZone: string;
  experienceYears?: number;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  status: DriverVerificationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  suspensionReason?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  address?: string;
  vehicle?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  licensePlate?: string;
  driverId?: string;
  corridorZone?: string;
  accountActivated?: boolean;
  status?: CustomerStatus | string;
  verificationStatus?: DriverVerificationStatus;
  nationalId?: string;
  nationalIdDocumentUrl?: string;
  drivingLicenseNo?: string;
  drivingLicenseDocumentUrl?: string;
  createdAt?: string;
  lastLogin?: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  corridorZone?: string;
  avatar?: string;
  role: 'customer';
  status: CustomerStatus;
  createdAt: string;
  lastLogin?: string;
  ordersCount: number;
  activeOrdersCount?: number;
  totalSpent: number;
}

export type GasType = 'LPG' | 'CNG';

export type GasBrand = string;

export interface GasBrandItem {
  id: string;
  name: string;
  distributor?: string;
  tagline: string;
  badge?: string;
  color: string;
  borderColor?: string;
  bgLight?: string;
  valveType: string;
  isPopular?: boolean;
  cylinderSizes: string[];
  isAvailable: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedReason?: string;
}

export type CylinderOrderType = 'refill' | 'complete_kit';

export interface ThikaHighwayZone {
  id: string;
  name: string;
  exitNumber: string;
  landmarks: string[];
  estMinutes: string;
  deliveryFee: number;
  popularEstates: string[];
  hubName: string;
}

export interface Product {
  id: string;
  name: string;
  gasType: GasType;
  brand?: GasBrand;
  orderType?: CylinderOrderType;
  size: string; // e.g., "5 kg", "10 kg", "14.2 kg"
  weightKg: number;
  tag?: 'Portable' | 'Subsidized' | 'Commercial' | 'Industrial' | 'Popular' | 'New Kit' | 'Household Choice' | 'Full Setup' | string;
  description: string;
  price: number;
  stock: number;
  isAvailable: boolean;
  deliveryTimeEstimate: string; // e.g., "30-40 min"
  imageUrl?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedReason?: string;
}

export type OrderStatus =
  | 'Pending'
  | 'Preparing'
  | 'Payment Pending'
  | 'Assigned'
  | 'Driver Assigned'
  | 'Accepted'
  | 'Dispatched'
  | 'En Route'
  | 'Out for Delivery'
  | 'Arrived'
  | 'Delivered'
  | 'Cancelled'
  | 'Failed'
  | 'Archived';

export type Priority = 'Urgent' | 'High' | 'Normal';

export interface OrderItem {
  productId: string;
  productName: string;
  gasType: GasType;
  brand?: GasBrand;
  orderType?: CylinderOrderType;
  size: string;
  quantity: number;
  unitPrice: number;
}

export type PaymentMethod = 'M-Pesa' | 'Cash on Delivery';

export interface PickupLocation {
  id?: string;
  name: string; // e.g. "TotalEnergies Roysambu Hub"
  stationBrand?: GasBrand | string; // e.g. "TotalEnergies", "Rubis", "Shell"
  address: string; // e.g. "Opposite TRM Mall, Exit 8, Thika Superhighway"
  thikaHighwayZone?: string; // e.g. "Roysambu / Exit 8"
  coordinates?: {
    lat: number;
    lng: number;
  };
  contactPhone?: string;
  contactPerson?: string;
  bayNumber?: string;
  isPickedUp: boolean;
  pickedUpAt?: string;
  notes?: string;
}

export interface Order {
  id: string; // e.g. "OD-2024-0841"
  customerId: string;
  customerName: string;
  customerPhone: string;
  cylinderBrand?: GasBrand;
  cylinderOrderType?: CylinderOrderType;
  cylinderSize?: string;
  thikaHighwayZone?: string;
  pickupLocation?: PickupLocation;
  deliveryAddress: {
    street: string;
    city: string;
    zipCode: string;
    landmark?: string;
    thikaHighwayZone?: string;
    exitNumber?: string;
    estate?: string;
    houseNumber?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  items: OrderItem[];
  cylinderSummary: string; // e.g., "14.2 kg LPG Qty: 1"
  status: OrderStatus;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicle?: string;
  driverRating?: number;
  driverEtaMinutes?: number;
  driverCurrentLocation?: {
    lat: number;
    lng: number;
    addressText?: string;
  };
  deliverySlot: string; // e.g., "11-2 PM", "8:00 AM - 11:00 AM"
  deliveryDate: string; // e.g., "Today, Sep 8"
  slaRemainingMinutes: number; // e.g., 106, 71, 41
  isOverdue?: boolean;
  subtotal: number;
  deliveryFee: number;
  total: number;
  priority: Priority;
  paymentMethod: PaymentMethod | 'M-Pesa Mobile Money';
  paymentStatus: 'Pending' | 'Paid' | 'Failed';
  mpesaPhone?: string;
  mpesaTransactionId?: string;
  createdAt: string;
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
    isCompleted: boolean;
  }[];
  proofOfDelivery?: {
    signatureUrl?: string;
    photoUrl?: string;
    signatureName?: string;
    confirmedByCustomer?: boolean;
    timestamp: string;
    otp?: string;
    coordinates?: string;
    deliveredQuantity?: number;
    cylinderExchangeCount?: number;
    deliveryNotes?: string;
  };
  isArchived?: boolean;
  archivedAt?: string;
  archivedReason?: string;
  archivedBy?: string;
  previousStatus?: OrderStatus;
  customerLiveLocation?: {
    lat: number;
    lng: number;
    accuracy?: number;
    updatedAt: string;
    isSharing: boolean;
  };
}

export interface DriverNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'assignment' | 'location' | 'alert' | 'system';
  read?: boolean;
}

export type DriverStatus = 'Online' | 'Offline' | 'On Delivery' | 'Available' | 'On Route' | 'En Route' | 'Assigned' | 'Break' | 'Busy' | 'On Leave' | 'Suspended' | 'Terminated' | 'Pending' | 'pending';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  initials: string;
  avatar?: string;
  vehicle: string;
  licensePlate: string; // e.g. "TX-4821-B"
  rating: number; // e.g. 4.9
  status: DriverStatus;
  currentStop?: string;
  etaMinutes?: number;
  deliveredCountToday: number;
  utilizationPercentage: number; // e.g. 72%
  activeOrderId?: string;
  capacity?: number;
  load?: number;
  lastLocationUpdate?: string;
  location?: {
    lat: number;
    lng: number;
    addressText?: string;
  };
  accountActivated?: boolean;
  nationalId?: string;
  drivingLicenseNo?: string;
  assignedHub?: string;
  corridorZone?: string;
  createdAt?: string;
  activatedAt?: string;
}

export type EmployeeRole = 'Driver' | 'Delivery Worker' | 'Dispatcher' | 'Depot Supervisor' | 'Worker' | 'Support' | 'Admin';
export type EmployeeStatus = 'Active' | 'On Leave' | 'Suspended' | 'Terminated' | 'Archived';
export type EmployeeAvailability = 'Available' | 'On Delivery' | 'Busy' | 'Offline' | 'On Leave';
export type DriverAvailability = EmployeeAvailability;

export interface Employee {
  id: string; // e.g. "EMP001"
  name: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  workerType?: 'driver' | 'worker' | 'dispatcher' | 'support' | 'admin' | 'warehouse' | 'dispatch';
  status: EmployeeStatus;
  previousStatus?: EmployeeStatus;
  availability?: EmployeeAvailability;
  vehicle?: string; // e.g. "KDB 123A (Toyota Hiace)"
  vehicleModel?: string; // "Toyota Hiace"
  licensePlate?: string; // "KDB 123A"
  currentAssignment?: {
    orderId?: string;
    description?: string;
    distanceText?: string;
    etaMinutes?: number;
  } | string;
  joinedDate?: string; // e.g. "Jan 12, 2025"
  avatar?: string;
  driverId?: string;
  nationalId?: string;
  driverLicense?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  notes?: string;
  terminatedAt?: string;
  terminationReason?: string;
  terminatedBy?: string;
  suspendedAt?: string;
  suspensionReason?: string;
  isDeleted?: boolean;
  isArchived?: boolean;
  archivedAt?: string;
  archivedReason?: string;
  archivedBy?: string;
  performance?: {
    rating: number;
    completedDeliveries: number;
    onTimeRatePercent: number;
    acceptanceRatePercent: number;
  };
}

export interface ActivityItem {
  id: string;
  type:
    | 'order_accepted'
    | 'payment_confirmed'
    | 'order_preparing'
    | 'order_received'
    | 'driver_online'
    | 'driver_registered'
    | 'employee_updated'
    | 'driver_suspended'
    | 'vehicle_assigned'
    | 'employee_terminated'
    | 'delivery_completed'
    | 'order_dispatched'
    | 'payment_received'
    | 'low_stock'
    | 'employee_archived'
    | 'employee_restored'
    | 'order_archived'
    | 'order_restored';
  title: string;
  description: string;
  timestamp: string; // e.g. "10:42"
  timeAgo: string; // e.g. "2 hours ago"
  badgeColor?: string;
  meta?: Record<string, any>;
}

export interface NeedsAttentionAlert {
  id: string;
  key: 'awaiting_driver' | 'delayed_delivery' | 'payment_confirmation' | 'offline_driver' | 'low_stock' | string;
  title: string;
  count: number;
  description?: string;
  severity: 'high' | 'medium' | 'warning' | 'info';
}

export interface WorkforceMetrics {
  totalEmployees: number;
  activeDrivers: number;
  availableDrivers: number;
  driversOnDelivery: number;
  dispatchersCount?: number;
  averageEtaMinutes?: number;
  activeAssignmentsCount?: number;
  onLeave: number;
  terminated: number;
  suspended: number;
  driverAcceptanceRate: number;
  onTimeDeliveryRate: number;
  customerRating: number;
}

export interface DashboardMetrics {
  ordersToday: number;
  ordersTodayDeltaPercent: number;
  pendingAssignment: number;
  overdueAssignment: number;
  activeDriversCount: number;
  totalDriversCount: number;
  offlineDriversCount: number;
  avgDeliveryTimeMinutes: number;
  avgDeliveryTimeDeltaMinutes: number;
  onTimeRatePercent: number;
  onTimeRateDeltaPercent: number;
  failedDeliveriesCount: number;
  failedDeliveriesRedispatchedCount: number;
  revenueToday: number;
  revenueTodayDeltaPercent: number;
  revenueYesterday: number;
  cylindersDispatchedCount: number;
  cylindersDispatchedDeltaCount: number;
  avgCylinderWeightKg: number;
  statusDistribution: {
    delivered: number;
    outForDelivery: number;
    dispatched: number;
    pending: number;
    cancelled: number;
    failed: number;
  };
  hourlyVolume: {
    hour: string; // "6 AM", "7 AM", etc.
    orders: number;
    dispatched: number;
  }[];
  timeSeries?: {
    today: AnalyticsTimeSeriesPoint[];
    sevenDays: AnalyticsTimeSeriesPoint[];
    thirtyDays: AnalyticsTimeSeriesPoint[];
  };
  analyticsSummary?: {
    peakLabel: string;
    peakValue: number;
    peakOrders: number;
    totalPeriodOrders: number;
    avgPerHour: number;
    trendPercent: number;
  };
  activeOrders?: number;
  pendingOrders?: number;
  urgentOrders?: number;
  activeDrivers?: number;
  totalDrivers?: number;
  totalRevenueToday?: number;
  deliveredToday?: number;
  slaComplianceRate?: number;
  completionRate?: number;
  cancellationRate?: number;
}

export interface AnalyticsTimeSeriesPoint {
  label: string; // "8 AM", "9 AM" or "Mon", "Tue"
  hour?: string;
  orders: number;
  revenue: number;
  deliveries: number;
  cancellations: number;
  changePercent?: number; // e.g. +18 vs previous point
  prevLabel?: string; // e.g. "11 AM"
}

export interface DeliverySlot {
  id: string;
  timeRange: string;
  isAvailable: boolean;
  maxCapacity: number;
  bookedCount: number;
}

export interface ArchiveStats {
  totalArchived: number;
  archivedEmployeesCount: number;
  archivedOrdersCount: number;
  archivedDriversCount: number;
  archivedWorkersCount: number;
  latestArchivedAt?: string;
}

export type ArchiveType = 'employee' | 'order';

export interface ArchiveResponse {
  employees: Employee[];
  orders: Order[];
  stats: ArchiveStats;
}

export interface DailyEarningBreakdown {
  hour: string; // e.g. "8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM"
  amount: number;
  deliveries: number;
  cylinders: number;
}

export interface DayIncomeRecord {
  day: string; // "Mon", "Tue", etc.
  date: string; // "Sep 5"
  isToday?: boolean;
  baseFare: number;
  cylinderCommission: number;
  bonus: number;
  tips: number;
  totalIncome: number;
  deliveriesCount: number;
  cylindersCount: number;
}

export interface DriverIncentiveChallenge {
  id: string;
  title: string;
  description: string;
  type: 'daily_streak' | 'weekly_milestone' | 'rating_bonus' | 'rush_hour';
  target: number;
  current: number;
  rewardKSh: number;
  isCompleted: boolean;
  deadlineText: string;
  unit: string;
}

export interface DriverRecentPayout {
  id: string;
  time: string;
  customerArea: string;
  cylinderType: string;
  quantity: number;
  baseFare: number;
  cylinderBonus: number;
  tip: number;
  totalKSh: number;
  status: 'Settled' | 'Processing';
}

export interface DriverEarningsSummary {
  driverId: string;
  driverName: string;
  currency: string;
  today: {
    totalKSh: number;
    deliveriesCount: number;
    cylindersCount: number;
    baseFare: number;
    cylinderCommission: number;
    bonus: number;
    tips: number;
    hoursOnline: number;
    avgPerDeliveryKSh: number;
    hourlyTimeline: DailyEarningBreakdown[];
  };
  weekly: {
    totalKSh: number;
    deliveriesCount: number;
    cylindersCount: number;
    baseFare: number;
    cylinderCommission: number;
    bonus: number;
    tips: number;
    targetDeliveries: number;
    targetBonusKSh: number;
    targetProgressPercent: number;
    dailyHistory: DayIncomeRecord[];
  };
  wallet: {
    availableForCashoutKSh: number;
    pendingReconciliationKSh: number;
    totalWithdrawnThisWeekKSh: number;
    mpesaPhoneNumber: string;
    lastCashoutAt?: string;
  };
  incentives: DriverIncentiveChallenge[];
  recentPayoutDeliveries: DriverRecentPayout[];
}

// ==========================================
// INTEGRATIONS DATA TYPES
// ==========================================
export type IntegrationCategory =
  | 'payments'
  | 'payment'
  | 'communication'
  | 'maps'
  | 'maps_logistics'
  | 'workspace'
  | 'productivity'
  | 'judiciary'
  | 'government_fleet'
  | 'logistics'
  | 'other';

export type IntegrationStatus =
  | 'connected'
  | 'not_configured'
  | 'error'
  | 'disabled'
  | 'expired'
  | 'needs_attention';

export type IntegrationEnvironment = 'development' | 'production' | 'sandbox';

export type AuthMethod =
  | 'oauth2'
  | 'api_key'
  | 'basic_auth'
  | 'bearer_token'
  | 'hmac_sha256'
  | 'service_account';

export interface IntegrationFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'url' | 'number' | 'textarea';
  placeholder?: string;
  description?: string;
  helpText?: string;
  required?: boolean;
  isSecret?: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: string;
}

export type IntegrationField = IntegrationFieldDefinition;

export interface IntegrationLog {
  id: string;
  integrationId: string;
  integrationName: string;
  action: string;
  administrator: string;
  result: 'success' | 'failed' | 'warning' | 'info';
  message: string;
  timestamp: string;
  timeAgo?: string;
  metadata?: Record<string, any>;
}

export interface IntegrationItem {
  id: string;
  name: string;
  shortDescription: string;
  description?: string;
  category: IntegrationCategory;
  tags: string[];
  iconKey: string;
  icon?: string;
  isOfficial?: boolean;
  docsUrl?: string;
  status: IntegrationStatus;
  isEnabled: boolean;
  environment: IntegrationEnvironment;
  authMethod: AuthMethod;
  supportedAuthMethods?: AuthMethod[];
  config: Record<string, string>;
  fields: IntegrationFieldDefinition[];
  webhookSupported?: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  webhookStatus?: 'active' | 'inactive' | 'error' | 'unverified';
  lastWebhookReceived?: string;
  lastWebhookResponse?: string;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed';
  lastTestMessage?: string;
  lastSyncAt?: string;
  lastUpdatedText?: string;
  responseTimeMs?: number;
  apiHealthPercent?: number;
  tokenExpiration?: string;
  lastError?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IntegrationsOverview {
  total: number;
  configured: number;
  pending: number;
  notConfigured: number;
  disabled: number;
  needsAttention?: number;
  errorCount?: number;
  overallHealth: 'operational' | 'degraded' | 'attention_required';
  healthMessage: string;
}
