import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ErrorState';
import { OrderDetailSheet } from '@/components/OrderDetailSheet';
import { SkeletonBox, useSkeletonPulse } from '@/components/Skeleton';
import { Toast, useToast } from '@/components/Toast';
import { Colors } from '@/constants/colors';
import { useLoyaltyContext } from '@/context/LoyaltyContext';
import { useSession } from '@/context/SessionContext';
import { useProfileData } from '@/hooks/useProfileData';
import { OrderHistorySection } from '@/screens/profile/OrderHistorySection';
import { PersonalDetails } from '@/screens/profile/PersonalDetails';
import { PreferencesSection } from '@/screens/profile/PreferencesSection';
import { ProfileStatsRow } from '@/screens/profile/ProfileStatsRow';
import { clearProfilePreferences } from '@/services/preferences';
import { supabase } from '@/services/supabase';
import { formatMemberSince } from '@/utils/cardUtils';
import { confirmAsync, showMessage } from '@/utils/dialogs';
import { getInitials } from '@/utils/profileUtils';

const SUPPORT = [
  { icon: '❓', label: 'FAQs' },
  { icon: '💬', label: 'Live Chat', badge: true },
  { icon: '📞', label: 'Call Us: 0345 070 8090' },
  { icon: '📧', label: 'Email Support' },
  { icon: '⭐', label: 'Rate the App' },
];

export default function ProfileScreen() {
  const { session } = useSession();
  return session ? (
    <SignedInProfile
      key={session.user.id}
      userId={session.user.id}
      email={session.user.email ?? ''}
    />
  ) : null;
}

function LoadingProfile() {
  const skeleton = useSkeletonPulse();
  return (
    <View accessibilityLabel="Loading profile" style={styles.skeletons}>
      <SkeletonBox opacity={skeleton} width="100%" height={104} radius={18} />
      <SkeletonBox opacity={skeleton} width="100%" height={180} radius={20} />
      <SkeletonBox opacity={skeleton} width="100%" height={260} radius={20} />
    </View>
  );
}

function SignedInProfile({ userId, email }: { userId: string; email: string }) {
  const insets = useSafeAreaInsets();
  const [showAll, setShowAll] = useState(false);
  const {
    profile,
    stats,
    orders,
    loading,
    refreshing,
    error,
    refetch,
    setProfile,
  } = useProfileData(userId, showAll);
  const { setLoyaltyPoints } = useLoyaltyContext();
  const { toast, showToast, hideToast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const signOutBusy = useRef(false);

  useEffect(() => {
    if (profile) setLoyaltyPoints(profile.loyalty_points);
  }, [profile, setLoyaltyPoints]);

  const handleSignOut = async () => {
    if (signOutBusy.current) return;
    signOutBusy.current = true;
    const confirmed = await confirmAsync({
      title: 'Sign out?',
      message: "You'll need to sign in again.",
      confirmLabel: 'Sign Out',
      destructive: true,
    });
    if (!confirmed) {
      signOutBusy.current = false;
      return;
    }
    setIsSigningOut(true);
    try {
      await clearProfilePreferences(userId);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      // The root auth guard takes the user to Login.
    } catch {
      signOutBusy.current = false;
      setIsSigningOut(false);
      showMessage(
        'Sign out failed',
        "Couldn't sign out or clear preferences. Please try again.",
      );
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={isSigningOut ? styles.blocked : undefined}
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing && !loading}
            onRefresh={() => void refetch()}
            tintColor={Colors.white}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          <View style={styles.heroHeading}>
            <Text style={styles.brand}>boots</Text>
            <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.initials}>
              {profile ? getInitials(profile.full_name) : '👤'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => showMessage('Edit Photo', 'Coming soon')}
            style={styles.photo}
          >
            <Text style={styles.photoLabel}>✏️ Edit Photo</Text>
          </Pressable>
          <Text style={styles.name}>
            {profile?.full_name || 'Your Boots account'}
          </Text>
          <Text style={styles.email}>{email}</Text>
          <Text style={styles.member}>
            Member since {formatMemberSince(profile?.created_at)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View Advantage Card"
            onPress={() => router.navigate('/card')}
            style={styles.pointsPill}
          >
            <Text style={styles.pointsLabel}>
              💳{' '}
              {profile ? profile.loyalty_points.toLocaleString('en-GB') : '—'}{' '}
              points
            </Text>
            <Text style={styles.pointsArrow}>→</Text>
          </Pressable>
        </View>
        {loading ? (
          <LoadingProfile />
        ) : profile && stats && orders ? (
          <>
            <ProfileStatsRow stats={stats} />
            {error && (
              <View style={styles.errorBanner}>
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {error}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void refetch()}
                >
                  <Text style={styles.link}>Retry</Text>
                </Pressable>
              </View>
            )}
            <View style={styles.trust}>
              <Text style={styles.trustIcon}>🛡️</Text>
              <Text style={styles.trustText}>
                Your wellbeing. Your rewards. Your Boots.
              </Text>
            </View>
            <OrderHistorySection
              orders={orders}
              showAll={showAll}
              refreshing={refreshing}
              onToggle={() => setShowAll((value) => !value)}
              onDetails={setSelectedOrder}
            />
            <PersonalDetails
              profile={profile}
              email={email}
              onSaved={setProfile}
              notify={showToast}
            />
            <PreferencesSection userId={userId} notify={showToast} />
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.title}>
                Help & Support
              </Text>
              <View style={styles.card}>
                {SUPPORT.map((item) => (
                  <Pressable
                    key={item.label}
                    accessibilityRole="button"
                    onPress={() => showMessage(item.label, 'Coming soon')}
                    style={styles.supportRow}
                  >
                    <Text style={styles.supportIcon}>{item.icon}</Text>
                    <Text style={styles.supportLabel}>{item.label}</Text>
                    {item.badge && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newLabel}>New</Text>
                      </View>
                    )}
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.section}>
              <View style={[styles.card, styles.appInfo]}>
                <Text style={styles.appName}>Boots UK</Text>
                <Text style={styles.appCaption}>Version 1.0.0 (POC)</Text>
                <Text style={styles.copyright}>© 2026 Boots UK Limited</Text>
                <View style={styles.legal}>
                  {['Privacy Policy', 'Terms', 'Cookies'].map(
                    (label, index) => (
                      <View key={label} style={styles.legalItem}>
                        {index > 0 && <Text style={styles.appCaption}>·</Text>}
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => showMessage(label, 'Coming soon')}
                          hitSlop={6}
                        >
                          <Text style={styles.appCaption}>{label}</Text>
                        </Pressable>
                      </View>
                    ),
                  )}
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.loadError}>
            <ErrorState
              message={error || "Couldn't load your profile."}
              onAction={() => void refetch()}
            />
          </View>
        )}
        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: isSigningOut, disabled: isSigningOut }}
            onPress={handleSignOut}
            disabled={isSigningOut}
            style={styles.signOut}
          >
            {isSigningOut ? (
              <ActivityIndicator color="#e53935" />
            ) : (
              <Text style={styles.signOutLabel}>Sign Out</Text>
            )}
          </Pressable>
          <Text style={styles.signOutCaption}>
            You&apos;ll need to sign in again
          </Text>
        </View>
      </ScrollView>
      <Toast
        toast={toast}
        onHide={hideToast}
        bottomOffset={insets.bottom + 80}
      />
      <OrderDetailSheet
        order_id={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGrey },
  blocked: { pointerEvents: 'none' },
  content: { paddingBottom: 100 },
  hero: {
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 42,
    alignItems: 'center',
  },
  heroHeading: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
    fontStyle: 'italic',
    letterSpacing: -1,
  },
  eyebrow: {
    color: '#cce5fa',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: Colors.gold,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: Colors.primary, fontWeight: '800', fontSize: 32 },
  photo: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: -6,
  },
  photoLabel: { color: Colors.primary, fontWeight: '700', fontSize: 11 },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    marginTop: 14,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
    marginTop: 6,
    textAlign: 'center',
  },
  member: { fontSize: 12, color: Colors.white, opacity: 0.6, marginTop: 8 },
  pointsPill: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 16,
  },
  pointsLabel: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
  pointsArrow: { color: Colors.primary, fontSize: 18 },
  skeletons: { padding: 20, gap: 20 },
  trust: {
    paddingHorizontal: 20,
    marginTop: 22,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  trustIcon: { fontSize: 16 },
  trustText: { color: Colors.mutedText, fontSize: 11, flex: 1 },
  errorBanner: {
    margin: 20,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff1f0',
    gap: 8,
  },
  errorText: { color: Colors.error, fontSize: 13 },
  link: { color: Colors.primary, fontWeight: '700' },
  loadError: { minHeight: 280, paddingVertical: 28 },
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
  supportRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGrey,
  },
  supportIcon: { fontSize: 20 },
  supportLabel: {
    flex: 1,
    color: Colors.darkText,
    fontSize: 14,
    fontWeight: '600',
  },
  chevron: { color: Colors.mutedText, fontSize: 24 },
  newBadge: {
    backgroundColor: '#e6f8ef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  newLabel: { color: '#008442', fontSize: 10, fontWeight: '700' },
  appInfo: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  appName: { color: Colors.darkText, fontSize: 16, fontWeight: '800' },
  appCaption: { color: Colors.mutedText, fontSize: 12 },
  copyright: { color: Colors.mutedText, fontSize: 11 },
  legal: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 6,
  },
  legalItem: { flexDirection: 'row', gap: 10 },
  signOut: {
    minHeight: 52,
    borderRadius: 26,
    borderColor: '#e53935',
    borderWidth: 2,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutLabel: { color: '#e53935', fontSize: 16, fontWeight: '800' },
  signOutCaption: {
    textAlign: 'center',
    color: Colors.mutedText,
    fontSize: 12,
    marginTop: 12,
  },
});
