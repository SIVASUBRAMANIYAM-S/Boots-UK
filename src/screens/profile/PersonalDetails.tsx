import { useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors } from '@/constants/colors';
import {
  updateUserProfile,
  type CustomerProfile,
} from '@/services/profileService';
import { formatMemberSince } from '@/utils/cardUtils';
import { isValidProfilePhone } from '@/utils/profileUtils';

type Props = {
  profile: CustomerProfile;
  email: string;
  onSaved: (profile: CustomerProfile) => void;
  notify: (message: string, variant?: 'success' | 'error') => void;
};

export function PersonalDetails({ profile, email, onSaved, notify }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);

  const toggleEditing = (next: boolean) => {
    if (Platform.OS !== 'web')
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditing(next);
    setValidation(null);
    if (next) {
      setName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
    }
  };
  const save = async () => {
    if (!name.trim()) {
      setValidation('Please enter your full name.');
      return;
    }
    if (!isValidProfilePhone(phone)) {
      setValidation('Please enter a valid phone number.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateUserProfile(profile.id, {
        full_name: name.trim(),
        phone: phone.trim() || null,
      });
      onSaved(updated);
      toggleEditing(false);
      notify('✅ Profile updated!');
    } catch {
      notify("Couldn't save your details. Please try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          Personal Details
        </Text>
        {!editing && (
          <Pressable
            onPress={() => toggleEditing(true)}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={styles.link}>Edit</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.icon}>👤</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            {editing ? (
              <TextInput
                accessibilityLabel="Full Name"
                style={styles.input}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                editable={!saving}
                maxLength={100}
              />
            ) : (
              <Text style={styles.value}>
                {profile.full_name || 'Not provided'}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.icon}>📧</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{email}</Text>
            {editing && (
              <Text style={styles.label}>
                Your sign-in email cannot be edited here.
              </Text>
            )}
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.icon}>📱</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Phone</Text>
            {editing ? (
              <TextInput
                accessibilityLabel="Phone"
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                editable={!saving}
                maxLength={20}
              />
            ) : (
              <Text style={styles.value}>{profile.phone || 'Add phone'}</Text>
            )}
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.icon}>📅</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Date Joined</Text>
            <Text style={styles.value}>
              {formatMemberSince(profile.created_at)}
            </Text>
          </View>
        </View>
        {validation && (
          <Text accessibilityRole="alert" style={styles.error}>
            {validation}
          </Text>
        )}
        {editing && (
          <View style={styles.buttons}>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => toggleEditing(false)}
              style={styles.cancel}
            >
              <Text style={styles.link}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save Changes"
              accessibilityState={{ busy: saving }}
              disabled={saving}
              onPress={save}
              style={styles.save}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveLabel}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 26, paddingHorizontal: 20 },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.darkText },
  link: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    boxShadow: '0 4px 18px rgba(10,22,40,0.06)',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGrey,
  },
  icon: { fontSize: 20, paddingTop: 4 },
  field: { flex: 1, gap: 4 },
  label: { color: Colors.mutedText, fontSize: 12 },
  value: { color: Colors.darkText, fontSize: 15, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    minHeight: 46,
    paddingHorizontal: 12,
    color: Colors.darkText,
    fontSize: 16,
  },
  error: { color: Colors.error, fontSize: 13, marginTop: 12 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 18 },
  cancel: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  save: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: { color: Colors.white, fontSize: 14, fontWeight: '700' },
});
