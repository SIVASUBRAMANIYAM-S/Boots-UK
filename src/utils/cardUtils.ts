const POINTS_PER_POUND = 400;

/** "1234567890123456" -> "1234 5678 9012 3456"; masked placeholder while loading. */
export function formatCardNumber(cardNumber: string | null | undefined): string {
  if (!cardNumber) return '•••• •••• •••• ••••';
  const digits = cardNumber.replace(/\D/g, '');
  return digits.match(/.{1,4}/g)?.join(' ') ?? cardNumber;
}

/** e.g. "2026-01-15T00:00:00Z" -> "Jan 2026" */
export function formatMemberSince(createdAt: string | null | undefined): string {
  if (!createdAt) return '—';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/** Points still needed to unlock the next whole £1 of value (400 points = £1). */
export function calculatePointsToNextPound(points: number): number {
  return POINTS_PER_POUND - (Math.max(0, Math.floor(points)) % POINTS_PER_POUND);
}
