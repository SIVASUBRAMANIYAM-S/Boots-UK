import { supabase } from '@/services/supabase';

export type LoyaltyProfile = {
  loyalty_points: number;
  advantage_card_number: string | null;
  created_at: string;
};

export type LoyaltyTier = 'member' | 'silver' | 'gold';

export type TierInfo = {
  tier: LoyaltyTier;
  label: string;
  emoji: string;
  /** Points already banked at the start of the current tier band. */
  tierStartThreshold: number;
  nextTier: { label: string; threshold: number } | null;
  /** 0–1 progress toward nextTier; 1 when already at the top tier. */
  progress: number;
  pointsToNextTier: number | null;
};

export type LoyaltyTransaction = {
  id: string;
  order_number: string | null;
  total_amount: number;
  points_earned: number;
  created_at: string;
  status: string;
};

const POINTS_PER_POUND = 400;
const SILVER_THRESHOLD = 1000;
const GOLD_THRESHOLD = 5000;
const RECENT_TRANSACTIONS_LIMIT = 5;

/** Minimum points balance needed to redeem (400 points = £1 off). */
export const REDEMPTION_THRESHOLD = POINTS_PER_POUND;

export async function getUserLoyaltyData(userId: string): Promise<LoyaltyProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('loyalty_points, advantage_card_number, created_at')
    .eq('id', userId)
    .maybeSingle()
    .overrideTypes<LoyaltyProfile | null, { merge: false }>();

  if (error) throw error;
  return data;
}

export function getPointsValue(points: number): string {
  return (Math.max(0, points) / POINTS_PER_POUND).toFixed(2);
}

export function getTierInfo(points: number): TierInfo {
  const safePoints = Math.max(0, points);

  if (safePoints >= GOLD_THRESHOLD) {
    return {
      tier: 'gold',
      label: 'Gold',
      emoji: '🥇',
      tierStartThreshold: GOLD_THRESHOLD,
      nextTier: null,
      progress: 1,
      pointsToNextTier: null,
    };
  }

  if (safePoints >= SILVER_THRESHOLD) {
    return {
      tier: 'silver',
      label: 'Silver',
      emoji: '🥈',
      tierStartThreshold: SILVER_THRESHOLD,
      nextTier: { label: 'Gold', threshold: GOLD_THRESHOLD },
      progress: (safePoints - SILVER_THRESHOLD) / (GOLD_THRESHOLD - SILVER_THRESHOLD),
      pointsToNextTier: GOLD_THRESHOLD - safePoints,
    };
  }

  return {
    tier: 'member',
    label: 'Member',
    emoji: '🎟️',
    tierStartThreshold: 0,
    nextTier: { label: 'Silver', threshold: SILVER_THRESHOLD },
    progress: safePoints / SILVER_THRESHOLD,
    pointsToNextTier: SILVER_THRESHOLD - safePoints,
  };
}

export async function getRecentTransactions(
  userId: string,
  limit: number = RECENT_TRANSACTIONS_LIMIT,
): Promise<LoyaltyTransaction[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, total_amount, points_earned, created_at, status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
    .overrideTypes<LoyaltyTransaction[], { merge: false }>();

  if (error) throw error;
  return data;
}
