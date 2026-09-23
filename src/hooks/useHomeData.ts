import { useCallback } from 'react';

import { useFetch } from '@/hooks/useFetch';
import { fetchActiveProducts, fetchCategories } from '@/services/catalog';
import { fetchProfile } from '@/services/profile';
import type { Category, Product, UserProfile } from '@/types/catalog';

const FEATURED_PRODUCT_LIMIT = 6;

export type HomeData = {
  categories: Category[];
  products: Product[];
  profile: UserProfile | null;
};

async function fetchHomeData(userId: string): Promise<HomeData> {
  const [categories, products, profile] = await Promise.all([
    fetchCategories(),
    fetchActiveProducts({ limit: FEATURED_PRODUCT_LIMIT }),
    // The profile only personalises the greeting and points, so don't fail the screen over it.
    fetchProfile(userId).catch(() => null),
  ]);
  return { categories, products, profile };
}

export function useHomeData(userId: string) {
  const fetcher = useCallback(() => fetchHomeData(userId), [userId]);
  return useFetch(fetcher);
}
