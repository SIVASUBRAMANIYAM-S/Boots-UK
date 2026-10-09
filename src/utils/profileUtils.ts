export function getInitials(name: string | null): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!parts.length) return '?';
  return `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase();
}

export function isValidProfilePhone(phone: string): boolean {
  const value = phone.trim();
  if (!value) return true;
  const digits = value.replace(/\D/g, '');
  return (
    /^\+?[\d\s()-]+$/.test(value) && digits.length >= 7 && digits.length <= 15
  );
}

export function formatOrderDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function orderReference(order: {
  id: string;
  order_number: string | null;
}): string {
  return order.order_number ?? `BOOTS${order.id.slice(0, 6).toUpperCase()}`;
}

export function orderStatus(status: string | null): {
  label: string;
  color: string;
} {
  switch (status) {
    case 'confirmed':
      return { label: '✅ Confirmed', color: '#008442' };
    case 'pending':
      return { label: '⏳ Pending', color: '#9a6a00' };
    case 'delivered':
      return { label: '📦 Delivered', color: '#005eb8' };
    case 'processing':
      return { label: '🔄 Processing', color: '#005eb8' };
    case 'shipped':
      return { label: '🚚 Shipped', color: '#005eb8' };
    case 'cancelled':
      return { label: 'Cancelled', color: '#e53935' };
    default:
      return { label: status || 'Unknown', color: '#6b7280' };
  }
}
