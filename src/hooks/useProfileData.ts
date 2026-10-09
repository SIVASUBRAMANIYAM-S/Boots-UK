import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  getOrderHistory,
  getProfileStats,
  getUserProfile,
} from '@/services/profileService';
import type {
  CustomerProfile,
  OrderSummary,
  ProfileStats,
} from '@/services/profileService';

type ProfileData = {
  profile: CustomerProfile;
  stats: ProfileStats;
  orders: OrderSummary[];
};

export function useProfileData(userId: string, showAll = false) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const refetch = useCallback(async () => {
    const id = ++requestId.current;
    setRefreshing(true);
    setError(null);
    try {
      const [profile, stats, orders] = await Promise.all([
        getUserProfile(userId),
        getProfileStats(userId),
        getOrderHistory(userId, showAll ? undefined : 3),
      ]);
      if (id === requestId.current) setData({ profile, stats, orders });
      return true;
    } catch {
      if (id === requestId.current)
        setError("We couldn't load your profile. Please try again.");
      return false;
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [userId, showAll]);

  useFocusEffect(
    useCallback(() => {
      void refetch();
      return () => {
        requestId.current += 1;
      };
    }, [refetch]),
  );

  const setProfile = useCallback((profile: CustomerProfile) => {
    requestId.current += 1;
    setRefreshing(false);
    setData(
      (current) =>
        current && {
          ...current,
          profile,
          stats: { ...current.stats, points: profile.loyalty_points },
        },
    );
  }, []);

  return { ...data, loading, refreshing, error, refetch, setProfile };
}
