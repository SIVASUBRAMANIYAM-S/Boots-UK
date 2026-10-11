import { supabase } from '@/services/supabase';
import type { ProductWithCategory } from '@/types/catalog';

export type WishlistEntry = {
  product_id: string;
  product: ProductWithCategory | null;
};

export async function getWishlist(userId: string): Promise<WishlistEntry[]> {
  const entries: WishlistEntry[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase
      .from('favourites')
      .select('product_id, product:products(*, category:categories(id, name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id')
      .range(offset, offset + 99)
      .overrideTypes<WishlistEntry[], { merge: false }>();
    if (error) throw error;
    entries.push(...data);
    if (data.length < 100) return entries;
  }
}

export async function clearFavourites(userId: string): Promise<void> {
  const { error } = await supabase
    .from('favourites')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}

export async function getFavourites(userId: string): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase
      .from('favourites')
      .select('product_id')
      .eq('user_id', userId)
      .order('id')
      .range(offset, offset + 99)
      .overrideTypes<{ product_id: string }[], { merge: false }>();
    if (error) throw error;
    data.forEach((row) => ids.add(row.product_id));
    if (data.length < 100) return ids;
  }
}

/** Adds or removes the favourite and resolves with the new favourite state. */
export async function toggleFavourite(
  userId: string,
  productId: string,
  isCurrentlyFavourite: boolean,
): Promise<boolean> {
  if (isCurrentlyFavourite) {
    const { error } = await supabase
      .from('favourites')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);
    if (error) throw error;
    return false;
  }

  // ignoreDuplicates makes a double-tap race a no-op instead of a unique-constraint error.
  const { error } = await supabase
    .from('favourites')
    .upsert(
      { user_id: userId, product_id: productId },
      { onConflict: 'user_id,product_id', ignoreDuplicates: true },
    );
  if (error) throw error;
  return true;
}
