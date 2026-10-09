import type { ShippingAddress } from '@/services/orders';
import { supabase } from '@/services/supabase';
import { formatUKPostcode, isValidUKPhone, isValidUKPostcode } from '@/utils/validation';

export type AddressErrors = Partial<Record<keyof ShippingAddress, string>>;
export type SavedDeliveryAddress = {
  id: string;
  address: ShippingAddress;
  isDefault: boolean;
};

export const EMPTY_DELIVERY_ADDRESS: ShippingAddress = {
  fullName: '', line1: '', line2: '', city: '', postcode: '', phone: '',
};

const LIMITS: Record<keyof ShippingAddress, number> = {
  fullName: 120, line1: 160, line2: 160, city: 100, postcode: 8, phone: 16,
};

export function normaliseDeliveryAddress(address: ShippingAddress): ShippingAddress {
  return {
    fullName: address.fullName.trim(),
    line1: address.line1.trim(),
    line2: address.line2.trim(),
    city: address.city.trim(),
    postcode: formatUKPostcode(address.postcode.trim()),
    phone: address.phone.replace(/[\s\-()]/g, ''),
  };
}

export function validateDeliveryAddress(address: ShippingAddress): AddressErrors {
  const errors: AddressErrors = {};
  if (!address.fullName.trim()) errors.fullName = 'Enter your full name';
  if (!address.line1.trim()) errors.line1 = 'Enter the first line of your address';
  if (!address.city.trim()) errors.city = 'Enter your town or city';
  if (!isValidUKPostcode(address.postcode)) errors.postcode = 'Enter a valid UK postcode';
  if (!isValidUKPhone(address.phone)) errors.phone = 'Enter a valid UK phone number';
  const normalised = normaliseDeliveryAddress(address);
  for (const field of Object.keys(LIMITS) as (keyof ShippingAddress)[]) {
    if (normalised[field].length > LIMITS[field]) {
      errors[field] = `Use ${LIMITS[field]} characters or fewer`;
    }
  }
  return errors;
}

export function deliveryAddressError(error: unknown): string {
  const details = typeof error === 'object' && error !== null
    ? error as { code?: string; message?: string }
    : {};
  if (['42P01', '42703', '42883', 'PGRST202', 'PGRST204', 'PGRST205'].includes(details.code ?? '')
    || /schema cache|does not exist/i.test(details.message ?? '')) {
    return 'Saved addresses are not available yet. The delivery-address database migration needs to be applied. Please contact support.';
  }
  return "We couldn't update or load your saved addresses. Check your connection and try again.";
}

function readSavedAddress(value: unknown): SavedDeliveryAddress {
  if (!value || typeof value !== 'object') throw new Error('Invalid saved address response');
  const row = value as Record<string, unknown>;
  const address = row.shipping_address as ShippingAddress | undefined;
  if (typeof row.id !== 'string' || typeof row.is_default !== 'boolean'
    || !address || Object.keys(LIMITS).some((key) => typeof address[key as keyof ShippingAddress] !== 'string')
    || Object.keys(validateDeliveryAddress(address)).length > 0) {
    throw new Error('Invalid saved address response');
  }
  return { id: row.id, address: { ...address }, isDefault: row.is_default };
}

export async function getDeliveryAddresses(userId: string): Promise<SavedDeliveryAddress[]> {
  const addresses: SavedDeliveryAddress[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.from('delivery_addresses')
      .select('id, shipping_address, is_default')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + 99);
    if (error) throw error;
    if (!data) throw new Error('Missing saved addresses response');
    addresses.push(...data.map(readSavedAddress));
    if (data.length < 100) return addresses;
  }
}

export async function saveDeliveryAddress(address: ShippingAddress, makeDefault: boolean): Promise<SavedDeliveryAddress> {
  if (Object.keys(validateDeliveryAddress(address)).length) throw new Error('Invalid delivery address');
  const { data, error } = await supabase.rpc('save_delivery_address', {
    p_shipping_address: normaliseDeliveryAddress(address),
    p_make_default: makeDefault,
  });
  if (error) throw error;
  return readSavedAddress(data);
}

export async function setDefaultDeliveryAddress(id: string): Promise<SavedDeliveryAddress> {
  const { data, error } = await supabase.rpc('set_default_delivery_address', { p_address_id: id });
  if (error) throw error;
  return readSavedAddress(data);
}
