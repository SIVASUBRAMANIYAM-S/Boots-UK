import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads `fetcher` on mount and whenever its identity changes (memoise it with
 * useCallback). Out-of-order responses are ignored, and a failed refresh
 * keeps the previously loaded data.
 */
export function useFetch<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const latestRequestId = useRef(0);

  const run = useCallback(
    async (mode: 'initial' | 'refresh'): Promise<boolean> => {
      const requestId = ++latestRequestId.current;
      const isLatest = () => requestId === latestRequestId.current;

      if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
        setData(null);
      }
      setHasError(false);

      try {
        const result = await fetcher();
        if (isLatest()) setData(result);
        return true;
      } catch {
        if (isLatest()) setHasError(true);
        return false;
      } finally {
        if (isLatest()) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [fetcher],
  );

  useEffect(() => {
    run('initial');
  }, [run]);

  const retry = useCallback(() => run('initial'), [run]);
  const refresh = useCallback(() => run('refresh'), [run]);

  return { data, hasError, isLoading, isRefreshing, retry, refresh };
}
