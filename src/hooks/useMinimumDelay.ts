import { useEffect, useState } from 'react';

/** Returns false until `durationMs` has passed since the first render. */
export function useMinimumDelay(durationMs: number): boolean {
  const [hasElapsed, setHasElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasElapsed(true), durationMs);
    return () => clearTimeout(timer);
  }, [durationMs]);

  return hasElapsed;
}
