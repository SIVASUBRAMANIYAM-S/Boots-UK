import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { useSession } from '@/context/SessionContext';
import { getUserLoyaltyData } from '@/services/loyaltyService';

type LoyaltyContextValue = {
  loyaltyPoints: number | null;
  refreshLoyaltyPoints: () => Promise<void>;
  setLoyaltyPoints: (points: number) => void;
};

const LoyaltyContext = createContext<LoyaltyContextValue | null>(null);

/** One live points total shared by the "My Card" tab badge and the Advantage Card screen. */
export function LoyaltyProvider({ children }: PropsWithChildren) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [loyaltyPoints, setLoyaltyPointsState] = useState<number | null>(null);
  const latestRequestId = useRef(0);

  const refreshLoyaltyPoints = useCallback(async () => {
    if (!userId) return;
    const requestId = ++latestRequestId.current;
    try {
      const profile = await getUserLoyaltyData(userId);
      if (requestId === latestRequestId.current)
        setLoyaltyPointsState(profile?.loyalty_points ?? 0);
    } catch {
      // Keep the last known total; the badge dot is informational only.
    }
  }, [userId]);

  // A local update (e.g. after the card screen loads) supersedes any in-flight refresh.
  const setLoyaltyPoints = useCallback((points: number) => {
    latestRequestId.current += 1;
    setLoyaltyPointsState(Math.max(0, points));
  }, []);

  useEffect(() => {
    setLoyaltyPointsState(null);
    void refreshLoyaltyPoints();
    return () => {
      latestRequestId.current += 1;
    };
  }, [refreshLoyaltyPoints]);

  const value = useMemo(
    () => ({ loyaltyPoints, refreshLoyaltyPoints, setLoyaltyPoints }),
    [loyaltyPoints, refreshLoyaltyPoints, setLoyaltyPoints],
  );

  return (
    <LoyaltyContext.Provider value={value}>{children}</LoyaltyContext.Provider>
  );
}

export function useLoyaltyContext(): LoyaltyContextValue {
  const value = useContext(LoyaltyContext);
  if (!value) {
    throw new Error('useLoyaltyContext must be used within a LoyaltyProvider');
  }
  return value;
}
