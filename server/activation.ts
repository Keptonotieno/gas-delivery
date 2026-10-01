import crypto from 'crypto';

export interface DriverActivationRecord {
  token: string;
  driverId: string;
  userId: string;
  email: string;
  driverName: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  usedAt?: string;
  ipAddress?: string;
}

// In-memory store for activation tokens
const activationTokens = new Map<string, DriverActivationRecord>();

/**
 * Generates a cryptographically secure, unpredictable 256-bit single-use token.
 * NOT derived from email, phone, timestamp, or name.
 */
export function generateActivationToken(params: {
  driverId: string;
  userId: string;
  email: string;
  driverName: string;
  expiresInHours?: number;
  ipAddress?: string;
}): DriverActivationRecord {
  // Invalidate any existing active tokens for this driver to ensure strict single-active token policy
  for (const [existingToken, record] of activationTokens.entries()) {
    if (record.driverId === params.driverId && !record.used) {
      record.used = true;
      record.usedAt = new Date().toISOString();
    }
  }

  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const hours = params.expiresInHours || 24;
  const expiresAt = now + hours * 60 * 60 * 1000;

  const record: DriverActivationRecord = {
    token,
    driverId: params.driverId,
    userId: params.userId,
    email: params.email.toLowerCase().trim(),
    driverName: params.driverName.trim(),
    createdAt: now,
    expiresAt,
    used: false,
    ipAddress: params.ipAddress
  };

  activationTokens.set(token, record);
  return record;
}

/**
 * Validates whether an activation token exists, is unexpired, and has not been used.
 */
export function verifyActivationToken(token: string): {
  valid: boolean;
  error?: string;
  record?: DriverActivationRecord;
} {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Activation token is missing or malformed.' };
  }

  const record = activationTokens.get(token);
  if (!record) {
    return { valid: false, error: 'Activation link is invalid or does not exist.' };
  }

  if (record.used) {
    return {
      valid: false,
      error: 'This activation link has already been used. Please log in with your credentials.'
    };
  }

  if (Date.now() > record.expiresAt) {
    return {
      valid: false,
      error: 'This activation link has expired. Please contact your GasDeliver administrator to request a new invitation.'
    };
  }

  return { valid: true, record };
}

/**
 * Marks an activation token as permanently consumed/used.
 */
export function consumeActivationToken(token: string): boolean {
  const record = activationTokens.get(token);
  if (!record || record.used) return false;

  record.used = true;
  record.usedAt = new Date().toISOString();
  return true;
}

/**
 * Finds the latest unconsumed activation record for a driver ID.
 */
export function getActiveTokenForDriver(driverId: string): DriverActivationRecord | null {
  const now = Date.now();
  for (const record of activationTokens.values()) {
    if (record.driverId === driverId && !record.used && record.expiresAt > now) {
      return record;
    }
  }
  return null;
}
