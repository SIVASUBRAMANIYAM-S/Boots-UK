import { memo, useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItem,
  type ViewToken,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { markOnboardingComplete } from '@/services/onboarding';

type Slide = {
  id: string;
  title: string;
  subtitle: string;
};

const SLIDES: readonly Slide[] = [
  { id: 'health', title: 'Health & Wellness', subtitle: 'Shop top health products' },
  { id: 'beauty', title: 'Beauty & Skincare', subtitle: 'Discover No7, Soap & Glory' },
  { id: 'baby', title: 'Baby & Parenting', subtitle: 'Everything for your little one' },
];

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };

type SlideItemProps = {
  slide: Slide;
  width: number;
};

const SlideItem = memo(function SlideItem({ slide, width }: SlideItemProps) {
  return (
    <View style={[styles.slide, { width }]}>
      <Text style={styles.title} accessibilityRole="header">
        {slide.title}
      </Text>
      <Text style={styles.subtitle}>{slide.subtitle}</Text>
    </View>
  );
});

type PaginationDotsProps = {
  count: number;
  activeIndex: number;
};

function PaginationDots({ count, activeIndex }: PaginationDotsProps) {
  return (
    <View
      style={styles.dots}
      accessible
      accessibilityLabel={`Slide ${activeIndex + 1} of ${count}`}
    >
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[styles.dot, index === activeIndex && styles.dotActive]} />
      ))}
    </View>
  );
}

type OnboardingButtonProps = {
  label: string;
  onPress: () => void;
};

function OnboardingButton({ label, onPress }: OnboardingButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Slide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLastSlide = activeIndex === SLIDES.length - 1;

  // FlatList requires this callback to keep the same identity across renders.
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<Slide>[] }) => {
      const firstVisible = viewableItems[0];
      if (firstVisible?.index != null) {
        setActiveIndex(firstVisible.index);
      }
    },
  ).current;

  const renderItem = useCallback<ListRenderItem<Slide>>(
    ({ item }) => <SlideItem slide={item} width={width} />,
    [width],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<Slide> | null | undefined, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  const handleNext = () => {
    listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
  };

  const handleGetStarted = async () => {
    await markOnboardingComplete();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
      />
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <PaginationDots count={SLIDES.length} activeIndex={activeIndex} />
        <OnboardingButton
          label={isLastSlide ? 'Get Started' : 'Next'}
          onPress={isLastSlide ? handleGetStarted : handleNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: Colors.white,
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.9,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
    opacity: 0.4,
  },
  dotActive: {
    width: 24,
    opacity: 1,
  },
  button: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: Colors.primary,
    fontSize: 17,
    fontWeight: '700',
  },
});
