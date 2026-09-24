// Client-side helpers for the mock card form. Card details never leave the
// device — no payment is processed.

export type CardBrand = 'VISA' | 'MASTERCARD' | 'AMEX' | null;

export const TEST_CARD = {
  number: '4242 4242 4242 4242',
  expiry: '12/26',
  cvv: '123',
} as const;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function detectCardBrand(cardNumber: string): CardBrand {
  const digits = digitsOnly(cardNumber);
  if (/^4/.test(digits)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'MASTERCARD';
  if (/^3[47]/.test(digits)) return 'AMEX';
  return null;
}

function cardLength(brand: CardBrand): number {
  return brand === 'AMEX' ? 15 : 16;
}

export function cvvLength(brand: CardBrand): number {
  return brand === 'AMEX' ? 4 : 3;
}

/** Groups digits as the card is typed: 4-4-4-4, or 4-6-5 for Amex. */
export function formatCardNumber(value: string): string {
  const brand = detectCardBrand(value);
  const digits = digitsOnly(value).slice(0, cardLength(brand));
  if (brand === 'AMEX') {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10)].filter(Boolean).join(' ');
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function formatExpiry(value: string): string {
  const digits = digitsOnly(value).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    let digit = Number(digits[digits.length - 1 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export function isValidCardNumber(cardNumber: string): boolean {
  const digits = digitsOnly(cardNumber);
  return digits.length === cardLength(detectCardBrand(digits)) && passesLuhn(digits);
}

export function isValidExpiry(expiry: string, now: Date = new Date()): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  // Cards are valid until the end of their expiry month.
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

export function isValidCvv(cvv: string, brand: CardBrand): boolean {
  return new RegExp(`^\\d{${cvvLength(brand)}}$`).test(cvv);
}
