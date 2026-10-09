import { supabase } from '@/services/supabase';
import type { ShippingAddress } from '@/services/orders';

export type CustomerProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  loyalty_points: number;
};

export type ProfileStats = {
  orders: number;
  favourites: number;
  points: number;
};

export type OrderSummary = {
  id: string;
  order_number: string | null;
  total_amount: number | null;
  status: string | null;
  created_at: string;
  points_earned: number | null;
  item_count: number;
};

export type OrderDetails = OrderSummary & {
  subtotal: number | null;
  delivery_fee: number | null;
  discount_amount: number | null;
  shipping_address: ShippingAddress | null;
  items: {
    id: string;
    quantity: number | null;
    price: number | null;
    product: { name: string; category: { name: string } | null } | null;
  }[];
};

export async function getUserProfile(userId: string): Promise<CustomerProfile> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, phone, created_at, loyalty_points')
    .eq('id', userId)
    .single()
    .overrideTypes<CustomerProfile, { merge: false }>();
  if (error) throw error;
  return data;
}

export async function updateUserProfile(
  userId: string,
  changes: { full_name: string; phone: string | null },
): Promise<CustomerProfile> {
  const { data, error } = await supabase
    .from('users')
    .update(changes)
    .eq('id', userId)
    .select('id, full_name, email, phone, created_at, loyalty_points')
    .single()
    .overrideTypes<CustomerProfile, { merge: false }>();
  if (error) throw error;
  return data;
}

export async function getOrderHistory(
  userId: string,
  limit?: number,
): Promise<OrderSummary[]> {
  let query = supabase
    .from('orders')
    .select(
      'id, order_number, total_amount, status, created_at, points_earned, order_items(count)',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('id');
  if (limit !== undefined) {
    const { data, error } = await query
      .limit(limit)
      .overrideTypes<
        (Omit<OrderSummary, 'item_count'> & {
          order_items: { count: number }[];
        })[],
        { merge: false }
      >();
    if (error) throw error;
    return data.map(({ order_items, ...order }) => ({
      ...order,
      item_count: order_items[0]?.count ?? 0,
    }));
  }
  // PostgREST caps each response; paginate so "View All" really includes every order.
  const orders: OrderSummary[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await query
      .range(offset, offset + 99)
      .overrideTypes<
        (Omit<OrderSummary, 'item_count'> & {
          order_items: { count: number }[];
        })[],
        { merge: false }
      >();
    if (error) throw error;
    orders.push(
      ...data.map(({ order_items, ...order }) => ({
        ...order,
        item_count: order_items[0]?.count ?? 0,
      })),
    );
    if (data.length < 100) return orders;
  }
}

export async function getOrderDetails(orderId: string): Promise<OrderDetails> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, total_amount, status, created_at, points_earned, subtotal, delivery_fee, discount_amount, shipping_address, items:order_items(id, quantity, price, product:products(name, category:categories(name)))',
    )
    .eq('id', orderId)
    .single()
    .overrideTypes<Omit<OrderDetails, 'item_count'>, { merge: false }>();
  if (error) throw error;
  return { ...data, item_count: data.items.length };
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const [orders, favourites, profile] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('favourites')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('users')
      .select('loyalty_points')
      .eq('id', userId)
      .single()
      .overrideTypes<{ loyalty_points: number }, { merge: false }>(),
  ]);
  if (orders.error) throw orders.error;
  if (favourites.error) throw favourites.error;
  if (profile.error) throw profile.error;
  if (orders.count === null || favourites.count === null)
    throw new Error('Profile counts are unavailable');
  return {
    orders: orders.count,
    favourites: favourites.count,
    points: profile.data.loyalty_points,
  };
}
