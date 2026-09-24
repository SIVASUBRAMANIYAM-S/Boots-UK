import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ErrorState';
import { IconButton } from '@/components/IconButton';
import { Toast, useToast } from '@/components/Toast';
import { DELIVERY_DAYS, getPromoDiscountRate, normalisePromoCode, type DeliveryMethod } from '@/constants/checkout';
import { Colors } from '@/constants/colors';
import { useCartCountContext } from '@/context/CartCountContext';
import { useSession } from '@/context/SessionContext';
import { useFetch } from '@/hooks/useFetch';
import { calculateTotal, getCartItems } from '@/services/cart';
import { placeOrder, type ShippingAddress } from '@/services/orders';
import { fetchProfile } from '@/services/profile';
import { getFirstName } from '@/utils/orderUtils';
import {
  TEST_CARD,
  detectCardBrand,
  isValidCardNumber,
  isValidCvv,
  isValidExpiry,
} from '@/utils/payment';
import { formatUKPostcode, isValidUKPhone, isValidUKPostcode } from '@/utils/validation';

import { DeliveryStep, type AddressErrors } from './DeliveryStep';
import { PaymentStep, type CardDetails, type CardErrors } from './PaymentStep';
import { ReviewStep } from './ReviewStep';
import { CHECKOUT_STEPS, StepIndicator } from './StepIndicator';

const EMPTY_ADDRESS: ShippingAddress = { fullName: '', line1: '', line2: '', city: '', postcode: '', phone: '' };
const EMPTY_CARD: CardDetails = { number: '', expiry: '', cvv: '', name: '' };

function validateAddress(address: ShippingAddress): AddressErrors {
  const errors: AddressErrors = {};
  if (!address.fullName.trim()) errors.fullName = 'Enter your full name';
  if (!address.line1.trim()) errors.line1 = 'Enter the first line of your address';
  if (!address.city.trim()) errors.city = 'Enter your town or city';
  if (!isValidUKPostcode(address.postcode)) errors.postcode = 'Enter a valid UK postcode';
  if (!isValidUKPhone(address.phone)) errors.phone = 'Enter a valid UK phone number';
  return errors;
}

function validateCard(card: CardDetails): CardErrors {
  const errors: CardErrors = {};
  const brand = detectCardBrand(card.number);
  if (!isValidCardNumber(card.number)) errors.number = 'Enter a valid card number';
  if (!isValidExpiry(card.expiry)) errors.expiry = 'Enter a valid, future expiry date';
  if (!isValidCvv(card.cvv, brand)) errors.cvv = 'Enter the security code';
  if (!card.name.trim()) errors.name = 'Enter the name on the card';
  return errors;
}

function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  if (/basket is empty/i.test(message)) return 'Your basket is empty.';
  if (/promo/i.test(message)) return 'That promo code is no longer valid.';
  return "We couldn't place your order. Please try again.";
}

export default function CheckoutScreen() {
  const { session } = useSession();
  if (!session) return null;
  return <CheckoutContent userId={session.user.id} />;
}

function CheckoutContent({ userId }: { userId: string }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { toast, showToast, hideToast } = useToast();
  const { setCartCount } = useCartCountContext();
  const { promo } = useLocalSearchParams<{ promo?: string }>();
  // Only carry over a code the basket already accepted.
  const promoCode = promo && getPromoDiscountRate(promo) !== null ? normalisePromoCode(promo) : null;

  const fetcher = useCallback(
    () => Promise.all([getCartItems(userId), fetchProfile(userId)]).then(([items, profile]) => ({ items, profile })),
    [userId],
  );
  const { data, isLoading, retry } = useFetch(fetcher);

  const [step, setStep] = useState(0);
  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('standard');
  const [card, setCard] = useState<CardDetails>(EMPTY_CARD);
  const [cardErrors, setCardErrors] = useState<CardErrors>({});
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const profileName = data?.profile?.full_name ?? '';
  useEffect(() => {
    if (!profileName) return;
    setAddress((current) => (current.fullName ? current : { ...current, fullName: profileName }));
    setCard((current) => (current.name ? current : { ...current, name: profileName }));
  }, [profileName]);

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const totals = useMemo(
    () => calculateTotal(items, { promoCode, deliveryMethod }),
    [items, promoCode, deliveryMethod],
  );

  const goToStep = useCallback((nextStep: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(nextStep);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const handleBack = useCallback(() => {
    if (step > 0) {
      goToStep(step - 1);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/cart');
    }
  }, [goToStep, step]);

  // Android back steps backwards through checkout before leaving it.
  useFocusEffect(
    useCallback(() => {
      if (step === 0 || isPlacingOrder) return undefined;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goToStep(step - 1);
        return true;
      });
      return () => subscription.remove();
    }, [goToStep, isPlacingOrder, step]),
  );

  const handleChangeAddress = useCallback((field: keyof ShippingAddress, value: string) => {
    setAddress((current) => ({ ...current, [field]: value }));
    setAddressErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }, []);

  const handleChangeCard = useCallback((field: keyof CardDetails, value: string) => {
    setCard((current) => ({ ...current, [field]: value }));
    setCardErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }, []);

  const handleUseTestCard = useCallback(() => {
    setCard((current) => ({ ...current, ...TEST_CARD, name: current.name || profileName || 'Test Customer' }));
    setCardErrors({});
  }, [profileName]);

  const handleContinueToPayment = useCallback(() => {
    const errors = validateAddress(address);
    setAddressErrors(errors);
    if (Object.keys(errors).length > 0) {
      showToast('Please check your delivery details', 'error');
      return;
    }
    setAddress((current) => ({ ...current, postcode: formatUKPostcode(current.postcode) }));
    goToStep(1);
  }, [address, goToStep, showToast]);

  const handleReviewOrder = useCallback(() => {
    const errors = validateCard(card);
    setCardErrors(errors);
    if (Object.keys(errors).length > 0) {
      showToast('Please check your card details', 'error');
      return;
    }
    goToStep(2);
  }, [card, goToStep, showToast]);

  const handlePlaceOrder = useCallback(async () => {
    setIsPlacingOrder(true);
    try {
      const order = await placeOrder({ deliveryMethod, promoCode, address });
      setCartCount(0);
      router.replace({
        pathname: '/order-success',
        params: {
          orderNumber: order.order_number,
          total: String(order.total),
          itemCount: String(order.item_count),
          pointsEarned: String(order.points_earned),
          firstName: getFirstName(address.fullName) ?? '',
          deliveryDays: String(DELIVERY_DAYS[deliveryMethod]),
        },
      });
    } catch (error) {
      setIsPlacingOrder(false);
      showToast(getErrorMessage(error), 'error');
    }
  }, [address, deliveryMethod, promoCode, setCartCount, showToast]);

  let content: ReactNode;
  if (!data && isLoading) {
    content = (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  } else if (!data) {
    content = <ErrorState message="We couldn't load your basket. Check your connection and try again." onAction={retry} />;
  } else if (items.length === 0) {
    content = (
      <ErrorState
        emoji="🛒"
        title="Your basket is empty"
        message="Add some products before checking out."
        actionLabel="Back to basket"
        onAction={() => router.navigate('/cart')}
      />
    );
  } else {
    let stepContent: ReactNode;
    let ctaLabel: string;
    let onCta: () => void;
    if (step === 0) {
      stepContent = (
        <DeliveryStep
          address={address}
          errors={addressErrors}
          onChangeAddress={handleChangeAddress}
          deliveryMethod={deliveryMethod}
          onChangeDeliveryMethod={setDeliveryMethod}
          subtotal={totals.subtotal}
        />
      );
      ctaLabel = 'Continue to Payment →';
      onCta = handleContinueToPayment;
    } else if (step === 1) {
      stepContent = (
        <PaymentStep card={card} errors={cardErrors} onChangeCard={handleChangeCard} onUseTestCard={handleUseTestCard} />
      );
      ctaLabel = 'Review Order →';
      onCta = handleReviewOrder;
    } else {
      stepContent = (
        <ReviewStep
          items={items}
          totals={totals}
          address={address}
          deliveryMethod={deliveryMethod}
          promoCode={promoCode}
          cardNumber={card.number}
          currentPoints={data.profile?.loyalty_points ?? 0}
        />
      );
      ctaLabel = 'Place Order';
      onCta = handlePlaceOrder;
    }

    const isFinalStep = step === CHECKOUT_STEPS.length - 1;

    content = (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {stepContent}

          <Pressable
            onPress={onCta}
            disabled={isPlacingOrder}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            accessibilityState={{ busy: isPlacingOrder, disabled: isPlacingOrder }}
            style={({ pressed }) => [
              styles.cta,
              isFinalStep && styles.ctaFinal,
              pressed && styles.pressed,
              isPlacingOrder && styles.ctaBusy,
            ]}
          >
            {isPlacingOrder ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={[styles.ctaLabel, isFinalStep && styles.ctaLabelFinal]}>{ctaLabel}</Text>
            )}
          </Pressable>
          {isFinalStep ? (
            <Text style={styles.terms}>By placing your order you agree to our Terms &amp; Conditions</Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <View style={styles.headerRow}>
          <IconButton icon="←" accessibilityLabel={step > 0 ? 'Previous step' : 'Back to basket'} onPress={handleBack} disabled={isPlacingOrder} />
          <Text style={styles.headerTitle} accessibilityRole="header">
            Checkout
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <StepIndicator currentStep={step} />
      </View>

      {content}

      <Toast toast={toast} onHide={hideToast} bottomOffset={insets.bottom + 20} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.lightGrey,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.white,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    zIndex: 1,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: Colors.darkText,
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    gap: 16,
    padding: 16,
  },
  cta: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 26,
    boxShadow: '0 6px 16px rgba(0, 94, 184, 0.3)',
    height: 52,
    justifyContent: 'center',
    marginTop: 8,
  },
  ctaFinal: {
    borderRadius: 30,
    height: 60,
  },
  ctaBusy: {
    opacity: 0.8,
  },
  pressed: {
    opacity: 0.85,
  },
  ctaLabel: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  ctaLabelFinal: {
    fontSize: 20,
  },
  terms: {
    color: Colors.mutedText,
    fontSize: 12,
    marginTop: -6,
    textAlign: 'center',
  },
});
