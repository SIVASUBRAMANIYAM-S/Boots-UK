import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Colors } from '@/constants/colors';
import {
  getProfilePreferences,
  saveProfilePreferences,
  type ProfilePreferences,
} from '@/services/preferences';
import { showMessage } from '@/utils/dialogs';

const OPTIONS: {
  key: keyof ProfilePreferences;
  icon: string;
  label: string;
}[] = [
  { key: 'pushNotifications', icon: '🔔', label: 'Push Notifications' },
  { key: 'emailOffers', icon: '📧', label: 'Email Offers' },
  { key: 'birthdayRewards', icon: '🎂', label: 'Birthday Rewards' },
];

export function PreferencesSection({
  userId,
  notify,
}: {
  userId: string;
  notify: (message: string, variant?: 'success' | 'error') => void;
}) {
  const [preferences, setPreferences] = useState<ProfilePreferences | null>(
    null,
  );
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setError(false);
    try {
      const saved = await getProfilePreferences(userId);
      if (mounted.current) setPreferences(saved);
    } catch {
      if (mounted.current) setError(true);
    }
  }, [userId]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const toggle = async (key: keyof ProfilePreferences, value: boolean) => {
    if (!preferences || busy.current) return;
    busy.current = true;
    setSaving(true);
    const next = { ...preferences, [key]: value };
    try {
      await saveProfilePreferences(userId, next);
      if (mounted.current) setPreferences(next);
    } catch {
      notify("Couldn't save preferences. Please try again.", 'error');
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        Preferences
      </Text>
      <View style={styles.card}>
        {error ? (
          <View style={styles.notice}>
            <Text style={styles.caption}>
              Could not load your saved preferences.
            </Text>
            <Pressable accessibilityRole="button" onPress={load}>
              <Text style={styles.retry}>Try again</Text>
            </Pressable>
          </View>
        ) : !preferences ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          OPTIONS.map((option) => (
            <View key={option.key} style={styles.row}>
              <Text style={styles.icon}>{option.icon}</Text>
              <Text style={styles.label}>{option.label}</Text>
              <Switch
                accessibilityLabel={option.label}
                value={preferences[option.key]}
                disabled={saving}
                onValueChange={(value) => void toggle(option.key, value)}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.white}
              />
            </View>
          ))
        )}
        <View style={styles.row}>
          <Text style={styles.icon}>🌙</Text>
          <Text style={styles.label}>Dark Mode</Text>
          <Switch
            accessibilityLabel="Dark Mode"
            value={false}
            onValueChange={() => showMessage('Dark Mode', 'Coming soon')}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>
        <Text style={styles.caption}>
          Saved on this device. Notifications and reward subscriptions are POC
          preferences only.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 20, marginTop: 26 },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.darkText,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    boxShadow: '0 4px 18px rgba(10,22,40,0.06)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  icon: { fontSize: 20 },
  label: { flex: 1, color: Colors.darkText, fontWeight: '600', fontSize: 14 },
  caption: {
    color: Colors.mutedText,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  notice: { gap: 12, paddingVertical: 12 },
  retry: { color: Colors.primary, fontWeight: '700' },
});
