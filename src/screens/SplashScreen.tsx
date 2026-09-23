import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { BootsLogo } from '@/components/BootsLogo';
import { Colors } from '@/constants/colors';

// Shown by the root layout while the session and onboarding state load.
export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <BootsLogo size={64} />
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
});
