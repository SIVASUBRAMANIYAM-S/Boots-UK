import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type TextLayoutEvent } from 'react-native';

import { Colors } from '@/constants/colors';

const COLLAPSED_LINES = 3;

type ProductDescriptionProps = {
  description: string | null;
};

export function ProductDescription({ description }: ProductDescriptionProps) {
  const [lineCount, setLineCount] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Measure once at full height, then collapse if it runs past the limit.
  const handleTextLayout = (event: TextLayoutEvent) => {
    if (lineCount === null) setLineCount(event.nativeEvent.lines.length);
  };

  const canExpand = lineCount !== null && lineCount > COLLAPSED_LINES;

  return (
    <View style={styles.section}>
      <Text style={styles.title} accessibilityRole="header">
        About this product
      </Text>
      <Text
        style={styles.body}
        numberOfLines={canExpand && !isExpanded ? COLLAPSED_LINES : undefined}
        onTextLayout={handleTextLayout}
      >
        {description?.trim() || 'No description available for this product yet.'}
      </Text>
      {canExpand ? (
        <Pressable onPress={() => setIsExpanded((value) => !value)} hitSlop={8} accessibilityRole="button">
          <Text style={styles.toggle}>{isExpanded ? 'Read less' : 'Read more'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  title: {
    color: Colors.darkText,
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    color: Colors.darkText,
    fontSize: 15,
    lineHeight: 22,
  },
  toggle: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
