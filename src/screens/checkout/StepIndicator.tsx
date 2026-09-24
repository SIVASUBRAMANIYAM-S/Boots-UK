import { Fragment, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

export const CHECKOUT_STEPS = [
  { icon: '📦', label: 'Delivery' },
  { icon: '💳', label: 'Payment' },
  { icon: '✅', label: 'Confirm' },
] as const;

export function StepIndicator({ currentStep }: { currentStep: number }) {
  const progress = useRef(new Animated.Value(currentStep)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: currentStep, duration: 350, useNativeDriver: false }).start();
  }, [currentStep, progress]);

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${currentStep + 1} of ${CHECKOUT_STEPS.length}: ${CHECKOUT_STEPS[currentStep].label}`}
    >
      {CHECKOUT_STEPS.map((step, index) => {
        const isComplete = index < currentStep;
        const isActive = index === currentStep;
        return (
          <Fragment key={step.label}>
            {index > 0 ? (
              <View style={styles.connector}>
                <Animated.View
                  style={[
                    styles.connectorFill,
                    {
                      width: progress.interpolate({
                        inputRange: [index - 1, index],
                        outputRange: ['0%', '100%'],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}
                />
              </View>
            ) : null}
            <View style={styles.step}>
              <View
                style={[
                  styles.circle,
                  isComplete && styles.circleComplete,
                  isActive && styles.circleActive,
                ]}
              >
                <Text style={[styles.circleText, (isActive || isComplete) && styles.circleTextOn]}>
                  {isComplete ? '✓' : step.icon}
                </Text>
              </View>
              <Text
                style={[
                  styles.label,
                  isActive && styles.labelActive,
                  isComplete && styles.labelComplete,
                ]}
              >
                {step.label}
              </Text>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

const CIRCLE_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  step: {
    alignItems: 'center',
    gap: 6,
    width: 72,
  },
  circle: {
    alignItems: 'center',
    backgroundColor: Colors.lightGrey,
    borderColor: Colors.border,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    width: CIRCLE_SIZE,
  },
  circleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    boxShadow: '0 0 0 4px rgba(0, 94, 184, 0.18)',
  },
  circleComplete: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  circleText: {
    fontSize: 17,
    opacity: 0.5,
  },
  circleTextOn: {
    color: Colors.white,
    fontWeight: '800',
    opacity: 1,
  },
  label: {
    color: Colors.inactive,
    fontSize: 12,
    fontWeight: '600',
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  labelComplete: {
    color: Colors.success,
  },
  connector: {
    backgroundColor: Colors.border,
    borderRadius: 2,
    flex: 1,
    height: 4,
    marginHorizontal: -14,
    marginTop: CIRCLE_SIZE / 2 - 2,
    overflow: 'hidden',
  },
  connectorFill: {
    backgroundColor: Colors.success,
    height: '100%',
  },
});
