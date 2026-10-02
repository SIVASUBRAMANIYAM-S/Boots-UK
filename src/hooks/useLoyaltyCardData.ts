import { useCallback } from 'react';

import { useFetch } from '@/hooks/useFetch';
import {
  getRecentTransactions,
  getUserLoyaltyData,
  type LoyaltyProfile,
  type LoyaltyTransaction,
} from '@/services/loyaltyService';

export type LoyaltyCardData = {
  profile: LoyaltyProfile | null;
  transactions: LoyaltyTransaction[];
};

async function fetchLoyaltyCardData(userId: string): Promise<LoyaltyCardData> {
  // Independent reads, fetched together so the screen only shows one spinner.
  const [profile, transactions] = await Promise.all([
    getUserLoyaltyData(userId),
    getRecentTransactions(userId),
  ]);
  return { profile, transactions };
}

export function useLoyaltyCardData(userId: string) {
  const fetcher = useCallback(() => fetchLoyaltyCardData(userId), [userId]);
  return useFetch(fetcher);
}
