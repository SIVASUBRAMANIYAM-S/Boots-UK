import { supabase } from '@/services/supabase';

export async function fetchCartItemCount(userId: string): Promise<number> {
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
export async function addToCart(userId: string, productId: string, quantity = 1): Promise<void> {
  const { data: existing, error: selectError } = await supabase
    .from('cart')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .limit(1)
    .maybeSingle()
    .overrideTypes<{ id: string; quantity: number | null } | null, { merge: false }>();

  if (selectError) throw selectError;

  const { error } = existing
    ? await supabase
        .from('cart')
        .update({ quantity: (existing.quantity ?? 0) + quantity })
        .eq('id', existing.id)
    : await supabase.from('cart').insert({ user_id: userId, product_id: productId, quantity });

  if (error) throw error;
}
