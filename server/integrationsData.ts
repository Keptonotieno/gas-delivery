import {
  IntegrationItem,
  IntegrationLog,
  IntegrationsOverview,
  IntegrationCategory,
  IntegrationStatus
} from '../src/types.js';

export const initialIntegrationLogs: IntegrationLog[] = [];

export const initialIntegrations: IntegrationItem[] = [
  // 1. M-Pesa Integration (Payments)
  {
    id: 'mpesa',
    name: 'M-Pesa Integration',
    shortDescription: 'Enable payments, refunds and STK Push using M-Pesa API.',
    category: 'payments',
    tags: ['STK Push', 'Payments', 'Refunds'],
    iconKey: 'mpesa',
    status: 'not_configured',
    isEnabled: false,
    environment: 'production',
    authMethod: 'hmac_sha256',
    supportedAuthMethods: ['hmac_sha256', 'bearer_token', 'api_key'],
    config: {
      consumerKey: '',
      consumerSecret: '',
      shortcode: '',
      passkey: '',
      callbackUrl: '',
      stkPushPrompt: ''
    },
    fields: [
      { key: 'consumerKey', label: 'Consumer Key', type: 'password', required: true, isSecret: true, placeholder: 'Enter M-Pesa Daraja Consumer Key' },
      { key: 'consumerSecret', label: 'Consumer Secret', type: 'password', required: true, isSecret: true, placeholder: 'Enter Consumer Secret' },
      { key: 'shortcode', label: 'Business Shortcode (Paybill / Till)', type: 'text', required: true, placeholder: 'e.g. 174379' },
      { key: 'passkey', label: 'Lipa Na M-Pesa Online Passkey', type: 'password', required: true, isSecret: true, placeholder: 'Live Passkey hash' },
      { key: 'callbackUrl', label: 'Payment Callback Webhook URL', type: 'url', required: true, placeholder: 'https://...' },
      { key: 'stkPushPrompt', label: 'STK Push Transaction Description', type: 'text', required: false, placeholder: 'e.g. GasRefill Nairobi' }
    ],
    webhookSupported: true,
    webhookUrl: '',
    webhookStatus: 'unverified'
  },

  // 2. Safaricom Daraja API (Payments)
  {
    id: 'daraja',
    name: 'Safaricom Daraja API',
    shortDescription: 'Integrate with Safaricom Daraja API for M-Pesa services.',
    category: 'payments',
    tags: ['STK Push', 'Payments', 'Query'],
    iconKey: 'daraja',
    status: 'not_configured',
    isEnabled: false,
    environment: 'production',
    authMethod: 'oauth2',
    supportedAuthMethods: ['oauth2', 'bearer_token'],
    config: {
      consumerKey: '',
      consumerSecret: '',
      businessShortCode: '',
      initiatorName: '',
      securityCredential: '',
      queryEndpoint: ''
    },
    fields: [
      { key: 'consumerKey', label: 'Daraja Consumer Key', type: 'password', required: true, isSecret: true, placeholder: 'Daraja OAuth Consumer Key' },
      { key: 'consumerSecret', label: 'Daraja Consumer Secret', type: 'password', required: true, isSecret: true, placeholder: 'Daraja OAuth Consumer Secret' },
      { key: 'businessShortCode', label: 'Business Shortcode', type: 'text', required: true, placeholder: 'e.g. 600982' },
      { key: 'initiatorName', label: 'B2C Initiator Username', type: 'text', required: true, placeholder: 'e.g. gasdeliver_admin' },
      { key: 'securityCredential', label: 'Initiator Password / Security Credential', type: 'password', required: true, isSecret: true, placeholder: 'Cert-encrypted password' },
      { key: 'queryEndpoint', label: 'Transaction Query Endpoint', type: 'url', required: false, placeholder: 'https://api.safaricom.co.ke/...' }
    ],
    webhookSupported: true,
    webhookUrl: '',
    webhookStatus: 'unverified'
  },

  // 3. Pesa API (Payments)
  {
    id: 'pesa_api',
    name: 'Pesa API',
    shortDescription: 'Enable payments and settlements via Pesa API.',
    category: 'payments',
    tags: ['Payments', 'STK Push', 'Withdrawals'],
    iconKey: 'pesa',
    status: 'not_configured',
    isEnabled: false,
    environment: 'production',
    authMethod: 'api_key',
    supportedAuthMethods: ['api_key', 'bearer_token'],
    config: {
      apiKey: '',
      secretKey: '',
      merchantId: '',
      settlementAccount: '',
      settlementSchedule: 'Instant'
    },
    fields: [
      { key: 'apiKey', label: 'Pesa API Key', type: 'password', required: true, isSecret: true, placeholder: 'pesa_live_...' },
      { key: 'secretKey', label: 'Pesa Secret Key', type: 'password', required: true, isSecret: true, placeholder: 'pesa_sec_...' },
      { key: 'merchantId', label: 'Merchant Identifier', type: 'text', required: true, placeholder: 'e.g. PESA-MERCH-8821' },
      { key: 'settlementAccount', label: 'Bank Settlement Account', type: 'text', required: true, placeholder: 'e.g. NCBA Bank A/C 011...' },
      { key: 'settlementSchedule', label: 'Settlement Schedule', type: 'select', required: true, options: [{ label: 'Instant', value: 'Instant' }, { label: 'Daily (23:59)', value: 'Daily' }, { label: 'Weekly', value: 'Weekly' }] }
    ],
    webhookSupported: true,
    webhookUrl: '',
    webhookStatus: 'unverified'
  },

  // 4. TILL Integration (Payments)
  {
    id: 'till_integration',
    name: 'TILL Integration',
    shortDescription: 'Connect with business tills for automatic payment processing.',
    category: 'payments',
    tags: ['Payments', 'Till Numbers', 'Reconciliation'],
    iconKey: 'till',
    status: 'not_configured',
    isEnabled: false,
    environment: 'development',
    authMethod: 'api_key',
    supportedAuthMethods: ['api_key', 'basic_auth'],
    config: {
      tillNumber: '',
      storeNumber: '',
      operatorId: '',
      headOfficeShortcode: '',
      apiKey: ''
    },
    fields: [
      { key: 'tillNumber', label: 'Buy Goods / Till Number', type: 'text', required: true, placeholder: 'e.g. 5234123' },
      { key: 'storeNumber', label: 'Store Number', type: 'text', required: true, placeholder: 'e.g. 001 - Industrial Depot' },
      { key: 'operatorId', label: 'Operator / Cashier ID', type: 'text', required: true, placeholder: 'e.g. CASHIER_98' },
      { key: 'headOfficeShortcode', label: 'Head Office Shortcode', type: 'text', required: false, placeholder: 'Optional HO shortcode' },
      { key: 'apiKey', label: 'Till Terminal API Key', type: 'password', required: true, isSecret: true, placeholder: 'Terminal Auth Key' }
    ],
    webhookSupported: true,
    webhookUrl: '',
    webhookStatus: 'unverified'
  },

  // 5. Pojo la Biashara (Business Paybill)
  {
    id: 'paybill_pojo',
    name: 'Pojo la Biashara (Business Paybill)',
    shortDescription: 'Integrate business paybill for customer payments.',
    category: 'payments',
    tags: ['Paybill', 'Payments', 'Reconciliation'],
    iconKey: 'paybill',
    status: 'not_configured',
    isEnabled: false,
    environment: 'production',
    authMethod: 'hmac_sha256',
    supportedAuthMethods: ['hmac_sha256', 'api_key'],
    config: {
      paybillNumber: '',
      accountNumberFormat: 'GAS-{ORDER_NUMBER}',
      apiToken: '',
      ipnValidationUrl: '',
      autoReconcile: 'true'
    },
    fields: [
      { key: 'paybillNumber', label: 'Official Paybill Number', type: 'text', required: true, placeholder: 'e.g. 4081290' },
      { key: 'accountNumberFormat', label: 'Account Reference Template', type: 'text', required: true, placeholder: 'e.g. GAS-{ORDER_NUMBER}' },
      { key: 'apiToken', label: 'IPN Integration Token', type: 'password', required: true, isSecret: true, placeholder: 'Secret IPN verification token' },
      { key: 'ipnValidationUrl', label: 'Instant Payment Notification (IPN) URL', type: 'url', required: true, placeholder: 'https://...' },
      { key: 'autoReconcile', label: 'Auto-Reconcile Orders Upon Receipt', type: 'select', required: true, options: [{ label: 'Enabled (Auto Mark Paid)', value: 'true' }, { label: 'Manual Review Required', value: 'false' }] }
    ],
    webhookSupported: true,
    webhookUrl: '',
    webhookStatus: 'unverified'
  },

  // 6. SMS & Email (Communication)
  {
    id: 'sms_email',
    name: 'SMS & Email (OTP/Notifications)',
    shortDescription: 'Configure OTP and notification services.',
    category: 'communication',
    tags: ['SMS', 'Email', 'Verification'],
    iconKey: 'sms',
    status: 'not_configured',
    isEnabled: false,
    environment: 'production',
    authMethod: 'api_key',
    supportedAuthMethods: ['api_key', 'basic_auth'],
    config: {
      smsProvider: 'AfricasTalking',
      smsUsername: '',
      smsApiKey: '',
      smsSenderId: '',
      emailProvider: 'SendGrid',
      emailApiKey: '',
      fromEmail: '',
      fromName: 'GasDeliver Kenya Dispatch'
    },
    fields: [
      { key: 'smsProvider', label: 'SMS Gateway Provider', type: 'select', required: true, options: [{ label: 'Africa\'s Talking (Kenya / East Africa)', value: 'AfricasTalking' }, { label: 'Twilio SMS', value: 'Twilio' }, { label: 'Infobip East Africa', value: 'Infobip' }] },
      { key: 'smsUsername', label: 'SMS Gateway Username', type: 'text', required: true, placeholder: 'e.g. gasdeliver_ke' },
      { key: 'smsApiKey', label: 'SMS API Key / Token', type: 'password', required: true, isSecret: true, placeholder: 'Enter gateway API key' },
      { key: 'smsSenderId', label: 'Approved Alphanumeric Sender ID', type: 'text', required: true, placeholder: 'e.g. GASDELIVER (Max 11 chars)' },
      { key: 'emailProvider', label: 'Transactional Email Provider', type: 'select', required: true, options: [{ label: 'SendGrid (Twilio)', value: 'SendGrid' }, { label: 'Resend.com', value: 'Resend' }, { label: 'Amazon SES', value: 'SES' }] },
      { key: 'emailApiKey', label: 'Email API Key', type: 'password', required: true, isSecret: true, placeholder: 'SG.... or re_...' },
      { key: 'fromEmail', label: 'Default Sender Email Address', type: 'text', required: true, placeholder: 'dispatch@gasdeliver.co.ke' }
    ],
    webhookSupported: true,
    webhookUrl: '',
    webhookStatus: 'unverified'
  },

  // 7. Google Maps API (Maps & Location)
  {
    id: 'google_maps',
    name: 'Google Maps API',
    shortDescription: 'Enable location tracking, navigation and route optimization.',
    category: 'maps',
    tags: ['Maps', 'Geocoding', 'Navigation', 'Distance Matrix'],
    iconKey: 'maps',
    status: 'not_configured',
    isEnabled: false,
    environment: 'production',
    authMethod: 'api_key',
    supportedAuthMethods: ['api_key'],
    config: {
      apiKey: '',
      enableGeocoding: 'true',
      enableDirections: 'true',
      enableDistanceMatrix: 'true',
      enablePlaces: 'true',
      countryRestriction: 'KE',
      hubOriginCoordinates: '-1.3032,36.8524'
    },
    fields: [
      { key: 'apiKey', label: 'Google Maps Browser / Server API Key', type: 'password', required: true, isSecret: true, placeholder: 'AIzaSy...' },
      { key: 'enableGeocoding', label: 'Geocoding API', type: 'select', required: true, options: [{ label: 'Enabled (Convert Estates to GPS)', value: 'true' }, { label: 'Disabled', value: 'false' }] },
      { key: 'enableDirections', label: 'Directions & Route Optimization API', type: 'select', required: true, options: [{ label: 'Enabled (Driver Navigation)', value: 'true' }, { label: 'Disabled', value: 'false' }] },
      { key: 'enableDistanceMatrix', label: 'Distance Matrix API (ETA Calculation)', type: 'select', required: true, options: [{ label: 'Enabled (Traffic-aware ETAs)', value: 'true' }, { label: 'Disabled', value: 'false' }] },
      { key: 'countryRestriction', label: 'Geographic Country Filter', type: 'text', required: true, placeholder: 'KE (Kenya)' },
      { key: 'hubOriginCoordinates', label: 'Central Depot Base Coordinates', type: 'text', required: true, placeholder: '-1.3032,36.8524 (Nairobi Industrial Area)' }
    ],
    webhookSupported: false
  },

  // 8. Firebase / Firestore (Logistics / Operations)
  {
    id: 'firebase',
    name: 'Firebase / Firestore',
    shortDescription: 'Real-time database and authentication services.',
    category: 'logistics',
    tags: ['Database', 'Auth', 'Real-time'],
    iconKey: 'firebase',
    status: 'not_configured',
    isEnabled: false,
    environment: 'production',
    authMethod: 'service_account',
    supportedAuthMethods: ['service_account', 'api_key'],
    config: {
      projectId: '',
      clientEmail: '',
      privateKey: '',
      databaseUrl: '',
      firestoreRegion: 'europe-west3'
    },
    fields: [
      { key: 'projectId', label: 'Firebase Project ID', type: 'text', required: true, placeholder: 'gasdeliver-ke' },
      { key: 'clientEmail', label: 'Service Account Client Email', type: 'text', required: true, placeholder: 'firebase-adminsdk@...iam.gserviceaccount.com' },
      { key: 'privateKey', label: 'RSA Private Key (PEM format)', type: 'password', required: true, isSecret: true, placeholder: '-----BEGIN PRIVATE KEY-----...' },
      { key: 'databaseUrl', label: 'Real-time Database URL', type: 'url', required: true, placeholder: 'https://...firebaseio.com' },
      { key: 'firestoreRegion', label: 'Firestore Multi-Region / Regional ID', type: 'text', required: false, placeholder: 'europe-west3' }
    ],
    webhookSupported: false
  },

  // 9. Google Workspace
  {
    id: 'google_workspace',
    name: 'Google Workspace',
    shortDescription: 'Enterprise document backup, Sheets order sync, Gmail alerts, and Calendar shifts.',
    category: 'workspace',
    tags: ['Workspace', 'Sheets', 'Drive', 'Gmail'],
    iconKey: 'workspace',
    status: 'not_configured',
    isEnabled: false,
    environment: 'production',
    authMethod: 'oauth2',
    supportedAuthMethods: ['oauth2', 'service_account'],
    config: {
      connectedAccount: '',
      clientId: '',
      clientSecret: '',
      authorizedScopes: 'https://www.googleapis.com/auth/spreadsheets, https://www.googleapis.com/auth/drive.file, https://www.googleapis.com/auth/gmail.send',
      sheetSyncId: '',
      autoExportDaily: 'false'
    },
    fields: [
      { key: 'connectedAccount', label: 'Authorized Workspace Admin Account', type: 'text', required: true, placeholder: 'ops.controller@gasdeliver.co.ke' },
      { key: 'clientId', label: 'Google Cloud OAuth 2.0 Client ID', type: 'text', required: true, placeholder: '...apps.googleusercontent.com' },
      { key: 'clientSecret', label: 'OAuth 2.0 Client Secret', type: 'password', required: true, isSecret: true, placeholder: 'GOCSPX-...' },
      { key: 'authorizedScopes', label: 'Authorized API Scopes', type: 'text', required: true, placeholder: 'Comma-separated Google OAuth scopes' },
      { key: 'sheetSyncId', label: 'Target Google Sheets Spreadsheet ID (Daily Sales)', type: 'text', required: false, placeholder: 'Google Sheet alphanumeric ID' },
      { key: 'autoExportDaily', label: 'Automated 23:59 EAT Daily Backup to Google Drive', type: 'select', required: true, options: [{ label: 'Enabled (Automated Cloud Archival)', value: 'true' }, { label: 'Manual Export Only', value: 'false' }] }
    ],
    webhookSupported: false
  },

  // 10. Judiciary / MAC Portal Integration
  {
    id: 'judiciary_mac',
    name: 'Judiciary / MAC Portal Integration',
    shortDescription: 'Official judiciary & Municipal Administrative Council compliance, dangerous-goods transit clearances, and conveyance filing.',
    category: 'judiciary',
    tags: ['Judiciary', 'Compliance', 'Permits', 'Filing'],
    iconKey: 'judiciary',
    status: 'not_configured',
    isEnabled: false,
    environment: 'production',
    authMethod: 'bearer_token',
    supportedAuthMethods: ['bearer_token', 'hmac_sha256', 'api_key'],
    config: {
      macPortalEndpoint: '',
      countyConveyanceId: '',
      depotLicenseNumber: '',
      apiKey: '',
      certificateThumbprint: '',
      inspectionFilingSchedule: 'Bi-Weekly'
    },
    fields: [
      { key: 'macPortalEndpoint', label: 'Judiciary / MAC Official API Endpoint', type: 'url', required: true, placeholder: 'https://api.portal.judiciary.go.ke/v2/...' },
      { key: 'countyConveyanceId', label: 'County Dangerous Goods Transit Conveyance ID', type: 'text', required: true, placeholder: 'e.g. NRB-MAC-LPG-9821' },
      { key: 'depotLicenseNumber', label: 'EPRA LPG Wholesale Depot Operator License', type: 'text', required: true, placeholder: 'e.g. EPRA/LPG/NRB/2024/0981' },
      { key: 'apiKey', label: 'Judiciary Portal API Key / Secret Token', type: 'password', required: true, isSecret: true, placeholder: 'Official API token' },
      { key: 'certificateThumbprint', label: 'Hardware Security Module (HSM) Cert Thumbprint', type: 'password', required: true, isSecret: true, placeholder: 'SHA256:...' },
      { key: 'inspectionFilingSchedule', label: 'Automated Compliance Filing Cycle', type: 'select', required: true, options: [{ label: 'Bi-Weekly', value: 'Bi-Weekly' }, { label: 'Monthly', value: 'Monthly' }, { label: 'Quarterly', value: 'Quarterly' }] }
    ],
    webhookSupported: true,
    webhookUrl: '',
    webhookStatus: 'unverified'
  },

  // 11. WhatsApp Business API
  {
    id: 'whatsapp_biz',
    name: 'WhatsApp Business API',
    shortDescription: 'Automated order delivery updates, customer support, and instant dispatcher messaging.',
    category: 'communication',
    tags: ['WhatsApp', 'Messaging', 'Alerts'],
    iconKey: 'whatsapp',
    status: 'not_configured',
    isEnabled: false,
    environment: 'production',
    authMethod: 'bearer_token',
    supportedAuthMethods: ['bearer_token', 'api_key'],
    config: {
      phoneNumberId: '',
      businessAccountId: '',
      permanentAccessToken: '',
      webhookVerifyToken: ''
    },
    fields: [
      { key: 'phoneNumberId', label: 'Meta Phone Number ID', type: 'text', required: true, placeholder: 'e.g. 109283746192830' },
      { key: 'businessAccountId', label: 'WhatsApp Business Account ID (WABA)', type: 'text', required: true, placeholder: 'e.g. WABA-9283741' },
      { key: 'permanentAccessToken', label: 'Permanent System User Access Token', type: 'password', required: true, isSecret: true, placeholder: 'EAAG...' },
      { key: 'webhookVerifyToken', label: 'Webhook Verification Token', type: 'password', required: true, isSecret: true, placeholder: 'Secret verify string' }
    ],
    webhookSupported: true,
    webhookUrl: '',
    webhookStatus: 'unverified'
  },

  // 12. Fleet GPS & Dispatch Telemetry
  {
    id: 'fleet_telemetry',
    name: 'Fleet GPS & Dispatch Telemetry',
    shortDescription: 'Vehicle OBD-II GPS tracking, speed telemetry, and geo-fencing for gas courier fleet.',
    category: 'logistics',
    tags: ['Fleet', 'Telemetry', 'GPS'],
    iconKey: 'truck',
    status: 'not_configured',
    isEnabled: false,
    environment: 'production',
    authMethod: 'api_key',
    supportedAuthMethods: ['api_key', 'basic_auth'],
    config: {
      telemetryProvider: 'Teltonika FMB920 Fleet Gateway',
      apiEndpoint: '',
      serverApiKey: '',
      updateIntervalSeconds: '10',
      maxSpeedAlertKmh: '80'
    },
    fields: [
      { key: 'telemetryProvider', label: 'Hardware GPS Telemetry Provider', type: 'select', required: true, options: [{ label: 'Teltonika FMB920 (OBD-II & CanBus)', value: 'Teltonika' }, { label: 'Tramigo Kenya T23 Fleet', value: 'Tramigo' }, { label: 'Concox GT06N Standard Tracker', value: 'Concox' }] },
      { key: 'apiEndpoint', label: 'Telemetry Ingestion Gateway URL', type: 'url', required: true, placeholder: 'https://telemetry...' },
      { key: 'serverApiKey', label: 'Fleet Gateway Server Secret Key', type: 'password', required: true, isSecret: true, placeholder: 'fleet_gw_...' },
      { key: 'updateIntervalSeconds', label: 'Live Telemetry Refresh Frequency (Seconds)', type: 'number', required: true, placeholder: '10' },
      { key: 'maxSpeedAlertKmh', label: 'Dangerous Goods Urban Speed Limit (km/h)', type: 'number', required: true, placeholder: '80' }
    ],
    webhookSupported: true,
    webhookUrl: '',
    webhookStatus: 'unverified'
  }
];

export function sanitizeConfigForFrontend(integration: IntegrationItem): IntegrationItem {
  const sanitizedConfig: Record<string, string> = {};
  const secretFieldKeys = new Set(
    integration.fields.filter(f => f.isSecret).map(f => f.key)
  );

  for (const [k, v] of Object.entries(integration.config)) {
    if (secretFieldKeys.has(k)) {
      if (!v || v.trim().length === 0) {
        sanitizedConfig[k] = '';
      } else {
        if (v.length > 8) {
          sanitizedConfig[k] = `${v.slice(0, 4)}••••••••${v.slice(-4)}`;
        } else {
          sanitizedConfig[k] = '••••••••••••';
        }
      }
    } else {
      sanitizedConfig[k] = v;
    }
  }

  return {
    ...integration,
    config: sanitizedConfig
  };
}

export function calculateIntegrationsOverview(items: IntegrationItem[]): IntegrationsOverview {
  const total = items.length;
  const configured = items.filter(i => i.status === 'connected').length;
  const pending = items.filter(i => i.status === 'needs_attention' || i.status === 'error' || i.status === 'expired').length;
  const notConfigured = items.filter(i => i.status === 'not_configured').length;
  const disabled = items.filter(i => !i.isEnabled || i.status === 'disabled').length;

  let overallHealth: 'operational' | 'degraded' | 'attention_required' = 'operational';
  let healthMessage = 'All systems operational';

  if (pending > 0) {
    overallHealth = 'attention_required';
    healthMessage = `${pending} integration${pending > 1 ? 's' : ''} require attention`;
  } else if (notConfigured > 0) {
    overallHealth = 'degraded';
    healthMessage = `${notConfigured} integration${notConfigured > 1 ? 's' : ''} pending configuration`;
  }

  return {
    total,
    configured,
    pending,
    notConfigured,
    disabled,
    overallHealth,
    healthMessage
  };
}
