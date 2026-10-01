/**
 * Utilities for direct telephone calls, WhatsApp, and SMS links in Kenya (+254)
 */

export function cleanKenyanPhoneForWhatsApp(phone?: string): string {
  if (!phone) return '254712345678';
  // Strip all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  if (digits.startsWith('0')) {
    digits = '254' + digits.slice(1);
  } else if (!digits.startsWith('254') && digits.length === 9) {
    digits = '254' + digits;
  }
  
  return digits.length >= 9 ? digits : '254712345678';
}

export function formatPhoneForTel(phone?: string): string {
  const digits = cleanKenyanPhoneForWhatsApp(phone);
  return `+${digits}`;
}

export function formatPhoneDisplay(phone?: string): string {
  if (!phone) return '+254 712 345 678';
  const digits = cleanKenyanPhoneForWhatsApp(phone);
  if (digits.startsWith('254') && digits.length === 12) {
    return `+254 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return phone;
}

export function getTelLink(phone?: string): string {
  return `tel:${formatPhoneForTel(phone)}`;
}

export function getWhatsAppLink(phone?: string, defaultMessage?: string): string {
  const cleanNumber = cleanKenyanPhoneForWhatsApp(phone);
  const base = `https://wa.me/${cleanNumber}`;
  if (defaultMessage && defaultMessage.trim()) {
    return `${base}?text=${encodeURIComponent(defaultMessage.trim())}`;
  }
  return base;
}

export function getSmsLink(phone?: string, defaultMessage?: string): string {
  const tel = formatPhoneForTel(phone);
  if (defaultMessage && defaultMessage.trim()) {
    return `sms:${tel}?body=${encodeURIComponent(defaultMessage.trim())}`;
  }
  return `sms:${tel}`;
}
