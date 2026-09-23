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
import { getFavourites, toggleFavourite as toggleFavouriteInDb } from '@/services/favourites';

type FavouritesContextValue = {
  favouriteIds: ReadonlySet<string>;
  /** Optimistically flips the heart; resolves false (and rolls back) if the save failed. */
  toggleFavourite: (productId: string) => Promise<boolean>;
};

const FavouritesContext = createContext<FavouritesContextValue | null>(null);

export function FavouritesProvider({ children }: PropsWithChildren) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [favouriteIds, setFavouriteIds] = useState<ReadonlySet<string>>(() => new Set());
  const favouriteIdsRef = useRef(favouriteIds);
  const pendingIds = useRef(new Set<string>());

  const setFavourite = useCallback((productId: string, isFavourite: boolean) => {
    setFavouriteIds((current) => {
      const next = new Set(current);
      if (isFavourite) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      favouriteIdsRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const empty = new Set<string>();
    favouriteIdsRef.current = empty;
    setFavouriteIds(empty);
    if (!userId) return;

    let isActive = true;
    getFavourites(userId)
      .then((ids) => {
        if (!isActive) return;
        favouriteIdsRef.current = ids;
        setFavouriteIds(ids);
      })
      .catch(() => {
        // Hearts start empty; toggling will surface an error if the backend is unreachable.
      });
    return () => {
      isActive = false;
    };
  }, [userId]);

  const toggleFavourite = useCallback(
    async (productId: string): Promise<boolean> => {
      if (!userId || pendingIds.current.has(productId)) return true;

      const wasFavourite = favouriteIdsRef.current.has(productId);
      pendingIds.current.add(productId);
      setFavourite(productId, !wasFavourite);
      try {
        await toggleFavouriteInDb(userId, productId, wasFavourite);
        return true;
      } catch {
        setFavourite(productId, wasFavourite);
        return false;
      } finally {
        pendingIds.current.delete(productId);
      }
    },
    [userId, setFavourite],
  );

  const value = useMemo(() => ({ favouriteIds, toggleFavourite }), [favouriteIds, toggleFavourite]);

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>;
}

export function useFavourites(): FavouritesContextValue {
  const value = useContext(FavouritesContext);
  if (!value) {
    throw new Error('useFavourites must be used within a FavouritesProvider');
  }
  return value;
}
