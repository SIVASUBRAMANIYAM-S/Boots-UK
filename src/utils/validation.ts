const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 6;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

// Outward code (e.g. SW1A, M1, B33) + inward code (e.g. 1AA, 8TH).
const UK_POSTCODE_PATTERN = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i;

export function isValidUKPostcode(postcode: string): boolean {
  return UK_POSTCODE_PATTERN.test(postcode.trim());
}

/** "sw1a1aa" -> "SW1A 1AA"; returns the input unchanged if it isn't a postcode. */
export function formatUKPostcode(postcode: string): string {
  const match = UK_POSTCODE_PATTERN.exec(postcode.trim());
  return match ? `${match[1]} ${match[2]}`.toUpperCase() : postcode;
}

export function isValidUKPhone(phone: string): boolean {
  return /^(?:\+44|0)\d{9,10}$/.test(phone.replace(/[\s\-()]/g, ''));
}
