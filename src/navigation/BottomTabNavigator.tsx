import { StyleSheet, Text } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';

import { Colors } from '@/constants/colors';

type TabIconProps = {
  emoji: string;
  focused: boolean;
};

// Emoji glyphs can't be tinted, so dim inactive icons to match the grey labels.
function TabIcon({ emoji, focused }: TabIconProps) {
  return <Text style={[styles.icon, !focused && styles.iconInactive]}>{emoji}</Text>;
}

function tabIcon(emoji: string) {
  return function renderTabIcon({ focused }: { focused: boolean }) {
    return <TabIcon emoji={emoji} focused={focused} />;
  };
}

export default function BottomTabNavigator() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.inactive,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('🏠') }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: tabIcon('🛍️') }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart', tabBarIcon: tabIcon('🛒') }} />
      <Tabs.Screen name="card" options={{ title: 'My Card', tabBarIcon: tabIcon('💳') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('👤') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.08)',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  icon: {
    fontSize: 22,
  },
  iconInactive: {
    opacity: 0.45,
  },
});
