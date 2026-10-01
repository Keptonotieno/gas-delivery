/**
 * Formatting utilities for GasDeliver Kenya
 * Authentic currency, phone, and date formats
 */

export const formatKSh = (amount: number | undefined | null): string => {
  const value = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `KSh ${Math.round(value).toLocaleString('en-KE')}`;
};

export const formatPhoneKE = (phone: string | undefined | null): string => {
  if (!phone) return '+254 712 345 678';
  return phone;
};
