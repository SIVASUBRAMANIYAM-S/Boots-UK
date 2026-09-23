import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { hasCompletedOnboarding, markOnboardingComplete } from '@/services/onboarding';

type OnboardingContextValue = {
  hasCompleted: boolean;
  isLoading: boolean;
  completeOnboarding: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [hasCompleted, setHasCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    hasCompletedOnboarding().then((completed) => {
      if (isMounted) {
        setHasCompleted(completed);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const completeOnboarding = useCallback(async () => {
    await markOnboardingComplete();
    setHasCompleted(true);
  }, []);

  const value = useMemo(
    () => ({ hasCompleted, isLoading, completeOnboarding }),
    [hasCompleted, isLoading, completeOnboarding],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const value = useContext(OnboardingContext);
  if (!value) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return value;
}
