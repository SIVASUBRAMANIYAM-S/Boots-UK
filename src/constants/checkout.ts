// Keep these rules in sync with place_order() in
// supabase/migrations/20260930000000_checkout.sql — the server is the source
// of truth for what the customer is charged.

export const FREE_DELIVERY_THRESHOLD = 25;
export const STANDARD_DELIVERY_FEE = 2.99;
export const EXPRESS_DELIVERY_FEE = 4.99;

export type DeliveryMethod = 'standard' | 'express';

export const DELIVERY_DAYS: Readonly<Record<DeliveryMethod, number>> = {
  standard: 3,
  express: 1,
};

const PROMO_DISCOUNT_RATES: Readonly<Record<string, number>> = {
  BOOTS10: 0.1,
};

export function normalisePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Discount rate (0–1) for a promo code, or null if the code isn't valid. */
export function getPromoDiscountRate(code: string): number | null {
  return PROMO_DISCOUNT_RATES[normalisePromoCode(code)] ?? null;
}
