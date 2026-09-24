const DEFAULT_CATEGORY_EMOJI = '🛍️';

const CATEGORY_EMOJI: Readonly<Record<string, string>> = {
  'Health & Wellness': '💊',
  'Vitamins & Supplements': '🌿',
  Skincare: '🧴',
  Makeup: '💄',
  'Baby & Child': '🍼',
  Toiletries: '🧼',
  Fragrance: '🌸',
};

export function getCategoryEmoji(categoryName: string | null | undefined): string {
  return (categoryName && CATEGORY_EMOJI[categoryName]) || DEFAULT_CATEGORY_EMOJI;
}

// Reviews aren't modelled in the database yet, so every product shows the same rating.
export const PLACEHOLDER_RATING = 4.5;
export const PLACEHOLDER_REVIEW_COUNT = 123;

export const ADVANTAGE_POINTS_PER_POUND = 4;
export const LOW_STOCK_THRESHOLD = 10;
