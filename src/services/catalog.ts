import { supabase } from '@/services/supabase';
import type { Category, Product, ProductWithCategory } from '@/types/catalog';

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')
    .overrideTypes<Category[], { merge: false }>();

  if (error) throw error;
  return data;
}

type ActiveProductsQuery = {
  categoryId?: string;
  excludeProductId?: string;
  limit?: number;
};

export async function fetchActiveProducts({
  categoryId,
  excludeProductId,
  limit,
}: ActiveProductsQuery = {}): Promise<Product[]> {
  let query = supabase.from('products').select('*').eq('is_active', true);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (excludeProductId) query = query.neq('id', excludeProductId);

  let ordered = query.order('created_at', { ascending: false });
  if (limit) ordered = ordered.limit(limit);

  const { data, error } = await ordered.overrideTypes<Product[], { merge: false }>();
  if (error) throw error;
  return data;
}

export async function fetchProduct(productId: string): Promise<ProductWithCategory | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(id, name)')
    .eq('id', productId)
    .eq('is_active', true)
    .limit(1)
    .overrideTypes<ProductWithCategory[], { merge: false }>();

  if (error) throw error;
  return data[0] ?? null;
}
