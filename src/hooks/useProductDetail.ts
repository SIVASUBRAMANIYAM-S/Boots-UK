import { useCallback } from 'react';

import { useFetch } from '@/hooks/useFetch';
import { fetchActiveProducts, fetchProduct } from '@/services/catalog';
import type { Product, ProductWithCategory } from '@/types/catalog';

const RELATED_PRODUCT_LIMIT = 4;

type ProductDetailData = {
  product: ProductWithCategory | null;
  relatedProducts: Product[];
};

async function fetchProductDetail(productId: string): Promise<ProductDetailData> {
  const product = await fetchProduct(productId);
  if (!product?.category_id) return { product, relatedProducts: [] };

  // Related products are a nice-to-have; don't fail the page if they can't load.
  const relatedProducts = await fetchActiveProducts({
    categoryId: product.category_id,
    excludeProductId: product.id,
    limit: RELATED_PRODUCT_LIMIT,
  }).catch(() => []);

  return { product, relatedProducts };
}

export function useProductDetail(productId: string) {
  const fetcher = useCallback(() => fetchProductDetail(productId), [productId]);
  return useFetch(fetcher);
}
