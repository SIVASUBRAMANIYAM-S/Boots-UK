import { memo, useCallback, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Colors } from '@/constants/colors';

const AUTO_SCROLL_MS = 3000;
const BANNER_HEIGHT = 160;
const HORIZONTAL_PADDING = 16;

type Banner = {
  id: string;
  title: string;
  subtitle: string;
  backgroundColor: string;
};

const BANNERS: readonly Banner[] = [
  { id: 'health', title: 'Up to 30% off', subtitle: 'Health & Wellness', backgroundColor: Colors.primary },
  { id: 'beauty', title: 'New Arrivals', subtitle: 'Beauty & Skincare', backgroundColor: Colors.accent },
  { id: 'baby', title: 'Baby Essentials', subtitle: 'Shop Now', backgroundColor: Colors.midnight },
];

const keyExtractor = (banner: Banner) => banner.id;

export const HeroBanner = memo(function HeroBanner() {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Banner>>(null);
  const activeIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const stopAutoScroll = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    stopAutoScroll();
    timerRef.current = setInterval(() => {
      const nextIndex = (activeIndexRef.current + 1) % BANNERS.length;
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, AUTO_SCROLL_MS);
  }, [stopAutoScroll]);

  // Only rotate while Home is the visible tab.
  useFocusEffect(
    useCallback(() => {
      startAutoScroll();
      return stopAutoScroll;
    }, [startAutoScroll, stopAutoScroll]),
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / width);
      if (index !== activeIndexRef.current && index >= 0 && index < BANNERS.length) {
        activeIndexRef.current = index;
        setActiveIndex(index);
      }
    },
    [width],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<Banner> | null | undefined, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Banner>) => (
      <View style={[styles.page, { width }]}>
        <View
          style={[styles.card, { backgroundColor: item.backgroundColor }]}
          accessible
          accessibilityLabel={`${item.title}. ${item.subtitle}`}
        >
          <View style={[styles.circle, styles.circleLarge]} />
          <View style={[styles.circle, styles.circleSmall]} />
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </View>
      </View>
    ),
    [width],
  );

  return (
    <View>
      <FlatList
        ref={listRef}
        data={BANNERS}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={stopAutoScroll}
        onScrollEndDrag={startAutoScroll}
      />
      <View style={styles.dots}>
        {BANNERS.map((banner, index) => (
          <View key={banner.id} style={[styles.dot, index === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  card: {
    borderRadius: 16,
    height: BANNER_HEIGHT,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 24,
  },
  circle: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    position: 'absolute',
  },
  circleLarge: {
    borderRadius: 90,
    height: 180,
    right: -50,
    top: -40,
    width: 180,
  },
  circleSmall: {
    borderRadius: 50,
    bottom: -40,
    height: 100,
    right: 80,
    width: 100,
  },
  title: {
    color: Colors.white,
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
    opacity: 0.9,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 12,
  },
  dot: {
    backgroundColor: '#c9d6e3',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 20,
  },
});
