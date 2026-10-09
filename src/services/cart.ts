import {
  EXPRESS_DELIVERY_FEE,
  FREE_DELIVERY_THRESHOLD,
  STANDARD_DELIVERY_FEE,
  getPromoDiscountRate,
  type DeliveryMethod,
} from '@/constants/checkout';
import { supabase } from '@/services/supabase';

export type CartItem = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    stock_quantity: number;
    is_active: boolean;
    category: { name: string } | null;
  };
};

export type CartTotals = {
  itemCount: number;
  subtotal: number;
  delivery: number;
  discount: number;
  total: number;
};

export async function getCartQuantities(
  userId: string,
): Promise<Record<string, number>> {
  const quantities: Record<string, number> = {};
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase
      .from('cart')
      .select('product_id, quantity')
      .eq('user_id', userId)
      .order('id')
      .range(offset, offset + 99)
      .overrideTypes<
        { product_id: string; quantity: number | null }[],
        { merge: false }
      >();
    if (error) throw error;
    for (const row of data)
      quantities[row.product_id] =
        (quantities[row.product_id] ?? 0) + (row.quantity ?? 0);
    if (data.length < 100) return quantities;
  }
}

export async function setProductCartQuantity(
  userId: string,
  productId: string,
  quantity: number,
): Promise<void> {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99)
    throw new Error('Invalid basket quantity');
  if (quantity === 0) {
    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);
    if (error) throw error;
    return;
  }
  const { data, error } = await supabase
    .from('cart')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .order('id')
    .overrideTypes<{ id: string }[], { merge: false }>();
  if (error) throw error;
  const result = data.length
    ? await supabase
        .from('cart')
        .update({ quantity })
        .eq('user_id', userId)
        .eq('id', data[0].id)
    : await supabase
        .from('cart')
        .insert({ user_id: userId, product_id: productId, quantity });
  if (result.error) throw result.error;
  if (data.length > 1) {
    const { error: duplicateError } = await supabase
      .from('cart')
      .delete()
      .eq('user_id', userId)
      .in(
        'id',
        data.slice(1).map((row) => row.id),
      );
    if (duplicateError) throw duplicateError;
  }
}

export async function getCartItems(userId: string): Promise<CartItem[]> {
  const { data, error } = await supabase
    .from('cart')
    .select(
      'id, quantity, product:products(id, name, price, image_url, stock_quantity, is_active, category:categories(name))',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .overrideTypes<
      (Omit<CartItem, 'product'> & { product: CartItem['product'] | null })[],
      { merge: false }
    >();

  if (error) throw error;
  // Drop rows whose product was deleted or deactivated; checkout ignores them too.
  return data.filter(
    (row): row is CartItem =>
      row.product !== null && row.product.is_active && row.quantity > 0,
  );
}

export async function getCartCount(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('cart')
    .select('quantity')
    .eq('user_id', userId)
    .overrideTypes<{ quantity: number | null }[], { merge: false }>();

  if (error) throw error;
  return data.reduce((total, row) => total + (row.quantity ?? 0), 0);
}

// The cart table has no unique (user_id, product_id) constraint, so bump an
// existing row's quantity instead of inserting a duplicate line.
export async function addToCart(
  userId: string,
  productId: string,
  quantity = 1,
): Promise<void> {
  const { data: existing, error: selectError } = await supabase
    .from('cart')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .limit(1)
    .maybeSingle()
    .overrideTypes<
      { id: string; quantity: number | null } | null,
      { merge: false }
    >();

  if (selectError) throw selectError;

  const { error } = existing
    ? await supabase
        .from('cart')
        .update({ quantity: (existing.quantity ?? 0) + quantity })
        .eq('id', existing.id)
    : await supabase
        .from('cart')
        .insert({ user_id: userId, product_id: productId, quantity });

  if (error) throw error;
}

export async function updateQuantity(
  cartId: string,
  quantity: number,
): Promise<void> {
  const { error } = await supabase
    .from('cart')
    .update({ quantity })
    .eq('id', cartId);
  if (error) throw error;
}

export async function removeItem(cartId: string): Promise<void> {
  const { error } = await supabase.from('cart').delete().eq('id', cartId);
  if (error) throw error;
}

export async function clearCart(userId: string): Promise<void> {
  const { error } = await supabase.from('cart').delete().eq('user_id', userId);
  if (error) throw error;
}

function roundPence(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function calculateTotal(
  items: readonly CartItem[],
  {
    promoCode = null,
    deliveryMethod = 'standard',
  }: { promoCode?: string | null; deliveryMethod?: DeliveryMethod } = {},
): CartTotals {
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const subtotal = roundPence(
    items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
  );
  const discountRate = promoCode ? (getPromoDiscountRate(promoCode) ?? 0) : 0;
  const discount = roundPence(subtotal * discountRate);

  let delivery = 0;
  if (itemCount > 0) {
    if (deliveryMethod === 'express') delivery = EXPRESS_DELIVERY_FEE;
    else if (subtotal < FREE_DELIVERY_THRESHOLD)
      delivery = STANDARD_DELIVERY_FEE;
  }

  return {
    itemCount,
    subtotal,
    delivery,
    discount,
    total: roundPence(subtotal - discount + delivery),
  };
}
