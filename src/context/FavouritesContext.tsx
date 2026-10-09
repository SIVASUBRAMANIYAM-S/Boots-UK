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
import {
  clearFavourites,
  getFavourites,
  toggleFavourite as toggleFavouriteInDb,
} from '@/services/favourites';

type FavouritesContextValue = {
  favouriteIds: ReadonlySet<string>;
  /** Optimistically flips the heart; resolves false (and rolls back) if the save failed. */
  toggleFavourite: (productId: string) => Promise<boolean>;
  refreshFavourites: () => Promise<boolean>;
  clearAllFavourites: () => Promise<boolean>;
  isLoading: boolean;
  hasError: boolean;
  isMutating: boolean;
};

const FavouritesContext = createContext<FavouritesContextValue | null>(null);

export function FavouritesProvider({ children }: PropsWithChildren) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [favouriteIds, setFavouriteIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const favouriteIdsRef = useRef(favouriteIds);
  const pendingIds = useRef(new Set<string>());
  const version = useRef(0);
  const accountEpoch = useRef(0);
  const loadingRef = useRef(true);
  const clearing = useRef(false);
  const account = useRef(userId);
  account.current = userId;
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const refreshFavourites = useCallback(async () => {
    if (!userId || clearing.current || pendingIds.current.size) return false;
    const request = ++version.current;
    loadingRef.current = true;
    setIsLoading(true);
    setHasError(false);
    try {
      const ids = await getFavourites(userId);
      if (request !== version.current || account.current !== userId)
        return false;
      favouriteIdsRef.current = ids;
      setFavouriteIds(ids);
      return true;
    } catch {
      if (request === version.current && account.current === userId)
        setHasError(true);
      return false;
    } finally {
      if (request === version.current && account.current === userId) {
        loadingRef.current = false;
        setIsLoading(false);
      }
    }
  }, [userId]);

  const setFavourite = useCallback(
    (productId: string, isFavourite: boolean) => {
      const next = new Set(favouriteIdsRef.current);
      if (isFavourite) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      favouriteIdsRef.current = next;
      setFavouriteIds(next);
    },
    [],
  );

  useEffect(() => {
    const empty = new Set<string>();
    favouriteIdsRef.current = empty;
    setFavouriteIds(empty);
    pendingIds.current.clear();
    clearing.current = false;
    setIsMutating(false);
    void refreshFavourites();
    return () => {
      version.current += 1;
      accountEpoch.current += 1;
    };
  }, [refreshFavourites]);

  const toggleFavourite = useCallback(
    async (productId: string): Promise<boolean> => {
      if (
        !userId ||
        loadingRef.current ||
        hasError ||
        clearing.current ||
        pendingIds.current.has(productId)
      )
        return false;

      const wasFavourite = favouriteIdsRef.current.has(productId);
      const epoch = accountEpoch.current;
      version.current += 1;
      pendingIds.current.add(productId);
      setIsMutating(true);
      setFavourite(productId, !wasFavourite);
      try {
        await toggleFavouriteInDb(userId, productId, wasFavourite);
        return true;
      } catch {
        if (account.current === userId && epoch === accountEpoch.current)
          setFavourite(productId, wasFavourite);
        return false;
      } finally {
        if (account.current === userId && epoch === accountEpoch.current) {
          pendingIds.current.delete(productId);
          setIsMutating(pendingIds.current.size > 0);
        }
      }
    },
    [userId, setFavourite, hasError],
  );

  const clearAllFavourites = useCallback(async () => {
    if (
      !userId ||
      loadingRef.current ||
      hasError ||
      clearing.current ||
      pendingIds.current.size
    )
      return false;
    clearing.current = true;
    const epoch = accountEpoch.current;
    version.current += 1;
    setIsMutating(true);
    const previous = favouriteIdsRef.current;
    favouriteIdsRef.current = new Set();
    setFavouriteIds(favouriteIdsRef.current);
    try {
      await clearFavourites(userId);
      return true;
    } catch {
      if (account.current === userId && epoch === accountEpoch.current) {
        favouriteIdsRef.current = previous;
        setFavouriteIds(previous);
      }
      return false;
    } finally {
      if (account.current === userId && epoch === accountEpoch.current) {
        clearing.current = false;
        setIsMutating(false);
      }
    }
  }, [userId, hasError]);

  const value = useMemo(
    () => ({
      favouriteIds,
      toggleFavourite,
      refreshFavourites,
      clearAllFavourites,
      isLoading,
      hasError,
      isMutating,
    }),
    [
      favouriteIds,
      toggleFavourite,
      refreshFavourites,
      clearAllFavourites,
      isLoading,
      hasError,
      isMutating,
    ],
  );

  return (
    <FavouritesContext.Provider value={value}>
      {children}
    </FavouritesContext.Provider>
  );
}

export function useFavourites(): FavouritesContextValue {
  const value = useContext(FavouritesContext);
  if (!value) {
    throw new Error('useFavourites must be used within a FavouritesProvider');
  }
  return value;
}
