import { ADVANTAGE_POINTS_PER_POUND } from '@/constants/catalog';
import { formatPrice } from '@/utils/format';

/** Display-only order reference; the stored number comes from place_order(). */
export function generateOrderNumber(): string {
  return `BOOTS${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;
}

export function calculateLoyaltyPoints(amount: number): number {
  return Math.max(0, Math.floor(amount * ADVANTAGE_POINTS_PER_POUND));
}

/** e.g. "Mon 28 Oct" */
export function formatDeliveryDate(daysFromNow: number, from: Date = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() + daysFromNow);
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatUKPrice(amount: number): string {
  return formatPrice(amount);
}

export function getFirstName(fullName: string | null | undefined): string | null {
  const firstName = fullName?.trim().split(/\s+/)[0];
  return firstName ? firstName : null;
}
