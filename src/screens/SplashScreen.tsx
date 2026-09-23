import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Colors } from '@/constants/colors';
import { hasCompletedOnboarding } from '@/services/onboarding';

const SPLASH_DURATION_MS = 2000;

export default function SplashScreen() {
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const minimumDelay = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, SPLASH_DURATION_MS);
    });

    // Read the onboarding flag while the splash is showing so there's no extra wait afterwards.
    Promise.all([hasCompletedOnboarding(), minimumDelay]).then(([completed]) => {
      if (!cancelled) {
        router.replace(completed ? '/login' : '/onboarding');
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.logo} accessibilityRole="header" accessibilityLabel="Boots">
        boots
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  logo: {
    color: Colors.primary,
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -1,
  },
});
