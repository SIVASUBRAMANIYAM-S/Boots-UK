import { supabase } from '@/services/supabase';

export async function getFavourites(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('favourites')
    .select('product_id')
    .eq('user_id', userId)
    .overrideTypes<{ product_id: string }[], { merge: false }>();

  if (error) throw error;
  return new Set(data.map((row) => row.product_id));
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
