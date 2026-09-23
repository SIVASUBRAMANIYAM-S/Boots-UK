import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETE_KEY = '@boots/onboarding-complete';

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY)) === 'true';
  } catch {
    // If storage is unavailable, show onboarding again rather than block the user.
    return false;
  }
}

export async function markOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
  } catch {
    // Non-fatal: the user will just see onboarding again next launch.
  }
}
