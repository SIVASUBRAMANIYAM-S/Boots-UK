import { Stack } from 'expo-router';

import { OnboardingProvider, useOnboarding } from '@/context/OnboardingContext';
import { SessionProvider, useSession } from '@/context/SessionContext';
import { useMinimumDelay } from '@/hooks/useMinimumDelay';
import SplashScreen from '@/screens/SplashScreen';

const SPLASH_MIN_DURATION_MS = 2000;

export default function RootLayout() {
  return (
    <SessionProvider>
      <OnboardingProvider>
        <RootNavigator />
      </OnboardingProvider>
    </SessionProvider>
  );
}

function RootNavigator() {
  const { session, isLoading: isSessionLoading } = useSession();
  const { hasCompleted: hasCompletedOnboarding, isLoading: isOnboardingLoading } =
    useOnboarding();
  const hasSplashElapsed = useMinimumDelay(SPLASH_MIN_DURATION_MS);

  if (isSessionLoading || isOnboardingLoading || !hasSplashElapsed) {
    return <SplashScreen />;
  }

  const isSignedIn = session !== null;

  // When a route becomes unavailable (sign in, sign out, finishing onboarding),
  // Expo Router redirects to the first available screen below, so order matters:
  // signed out → Onboarding (first launch only) → Login.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(app)" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Protected guard={!hasCompletedOnboarding}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
  );
}
