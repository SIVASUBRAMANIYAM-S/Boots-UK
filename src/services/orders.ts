import type { DeliveryMethod } from '@/constants/checkout';
import { supabase } from '@/services/supabase';

export type ShippingAddress = {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  phone: string;
};

export type PlacedOrder = {
  order_id: string;
  order_number: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  item_count: number;
  points_earned: number;
  loyalty_points: number;
};

/**
 * Creates the order, its items, awards loyalty points and empties the cart in
 * one database transaction. Prices are taken from the products table, so the
 * client can't change what it's charged.
 */
export async function placeOrder({
  deliveryMethod,
  promoCode,
  address,
}: {
  deliveryMethod: DeliveryMethod;
  promoCode: string | null;
  address: ShippingAddress;
}): Promise<PlacedOrder> {
  const { data, error } = await supabase.rpc('place_order', {
    p_delivery_method: deliveryMethod,
    p_promo_code: promoCode ?? '',
    p_shipping_address: address,
  });

  if (error) throw error;
  if (!data || typeof data !== 'object' || !('order_number' in data)) {
    throw new Error('Unexpected response from place_order');
  }
  return data as PlacedOrder;
}
