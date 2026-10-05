import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ErrorState';
import { Colors } from '@/constants/colors';
import { useLoyaltyContext } from '@/context/LoyaltyContext';
import { useSession } from '@/context/SessionContext';
import { useLoyaltyCardData } from '@/hooks/useLoyaltyCardData';

import { CardActionButtons } from './CardActionButtons';
import { CardSkeleton } from './CardSkeleton';
import { CardVisual } from './CardVisual';
import { EarnPointsSection } from './EarnPointsSection';
import { OffersSection } from './OffersSection';
import { PointsSummaryCards } from './PointsSummaryCards';
import { RecentActivitySection } from './RecentActivitySection';
import { RedeemSection } from './RedeemSection';

// Extra space below the last section so content clears the floating tab bar.
const BOTTOM_PADDING = 100;
const STATEMENTS_SCROLL_OFFSET = 16;

export default function AdvantageCardScreen() {
  const { session } = useSession();
  // The (app) route group is only mounted while signed in.
  if (!session) return null;
  return <AdvantageCardContent session={session} />;
}

function AdvantageCardContent({ session }: { session: Session }) {
  const insets = useSafeAreaInsets();
  const userId = session.user.id;
  const { data, isLoading, isRefreshing, retry, refresh } = useLoyaltyCardData(userId);
  const { setLoyaltyPoints } = useLoyaltyContext();

  const scrollViewRef = useRef<ScrollView>(null);
  const statementsOffsetRef = useRef(0);

  const loyaltyPoints = data?.profile?.loyalty_points ?? 0;

  // Keep the "My Card" tab badge dot in step with what this screen shows.
  useEffect(() => {
    if (data?.profile) setLoyaltyPoints(data.profile.loyalty_points);
  }, [data?.profile, setLoyaltyPoints]);

  const handleStatementsLayout = useCallback((event: LayoutChangeEvent) => {
    statementsOffsetRef.current = event.nativeEvent.layout.y;
  }, []);

  const handleScrollToStatements = useCallback(() => {
    scrollViewRef.current?.scrollTo({
      y: Math.max(0, statementsOffsetRef.current - STATEMENTS_SCROLL_OFFSET),
      animated: true,
    });
  }, []);

  let content: ReactNode;
  if (!data && isLoading) {
    content = <CardSkeleton />;
  } else if (!data) {
    content = (
      <ErrorState
        message="We couldn't load your Advantage Card. Check your connection and try again."
        onAction={retry}
      />
    );
  } else {
    content = (
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            title="Pull to refresh"
            titleColor={Colors.mutedText}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <CardVisual
          loyaltyPoints={loyaltyPoints}
          cardNumber={data.profile?.advantage_card_number ?? null}
          memberSince={data.profile?.created_at ?? null}
        />
        <CardActionButtons onScrollToStatements={handleScrollToStatements} />
        <PointsSummaryCards loyaltyPoints={loyaltyPoints} />
        <EarnPointsSection />
        <RedeemSection loyaltyPoints={loyaltyPoints} />
        <RecentActivitySection transactions={data.transactions} onLayout={handleStatementsLayout} />
        <OffersSection />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Advantage Card
        </Text>
        <Text style={styles.headerSubtitle}>Collect. Redeem. Save.</Text>
      </View>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.lightGrey,
    flex: 1,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 26,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: Colors.white,
    fontSize: 14,
    marginTop: 2,
    opacity: 0.85,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: BOTTOM_PADDING,
    paddingTop: 20,
  },
});
