export function formatPrice(amount: number): string {
  return `£${Number(amount).toFixed(2)}`;
}
