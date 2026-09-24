import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';

import {
  EXPRESS_DELIVERY_FEE,
  FREE_DELIVERY_THRESHOLD,
  STANDARD_DELIVERY_FEE,
  type DeliveryMethod,
} from '@/constants/checkout';
import { Colors } from '@/constants/colors';
import type { ShippingAddress } from '@/services/orders';
import { formatUKPrice } from '@/utils/orderUtils';
import { formatUKPostcode } from '@/utils/validation';

import { CheckoutCard, CheckoutField, SectionTitle } from './CheckoutField';

export type AddressErrors = Partial<Record<keyof ShippingAddress, string>>;

type DeliveryStepProps = {
  address: ShippingAddress;
  errors: AddressErrors;
  onChangeAddress: (field: keyof ShippingAddress, value: string) => void;
  deliveryMethod: DeliveryMethod;
  onChangeDeliveryMethod: (method: DeliveryMethod) => void;
  subtotal: number;
};

type DeliveryOptionProps = {
  icon: string;
  title: string;
  subtitle: string;
  price: string;
  isFree: boolean;
  isSelected: boolean;
  onPress: () => void;
};

function DeliveryOption({ icon, title, subtitle, price, isFree, isSelected, onPress }: DeliveryOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={`${title}, ${subtitle}, ${price}`}
      style={({ pressed }) => [styles.option, isSelected && styles.optionSelected, pressed && styles.pressed]}
    >
      <View style={[styles.radio, isSelected && styles.radioSelected]}>
        {isSelected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>
          {icon} {title}
        </Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <Text style={[styles.optionPrice, isFree && styles.optionPriceFree]}>{price}</Text>
    </Pressable>
  );
}

export function DeliveryStep({
  address,
  errors,
  onChangeAddress,
  deliveryMethod,
  onChangeDeliveryMethod,
  subtotal,
}: DeliveryStepProps) {
  const line1Ref = useRef<TextInput>(null);
  const line2Ref = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const postcodeRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const standardIsFree = subtotal >= FREE_DELIVERY_THRESHOLD;

  return (
    <View style={styles.container}>
      <SectionTitle>Delivery Address</SectionTitle>
      <CheckoutCard>
        <CheckoutField
          label="Full Name"
          value={address.fullName}
          onChangeText={(value) => onChangeAddress('fullName', value)}
          error={errors.fullName}
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => line1Ref.current?.focus()}
          submitBehavior="submit"
        />
        <CheckoutField
          ref={line1Ref}
          label="Address Line 1"
          value={address.line1}
          onChangeText={(value) => onChangeAddress('line1', value)}
          error={errors.line1}
          autoComplete="address-line1"
          textContentType="streetAddressLine1"
          returnKeyType="next"
          onSubmitEditing={() => line2Ref.current?.focus()}
          submitBehavior="submit"
        />
        <CheckoutField
          ref={line2Ref}
          label="Address Line 2 (optional)"
          value={address.line2}
          onChangeText={(value) => onChangeAddress('line2', value)}
          autoComplete="address-line2"
          textContentType="streetAddressLine2"
          returnKeyType="next"
          onSubmitEditing={() => cityRef.current?.focus()}
          submitBehavior="submit"
        />
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <CheckoutField
              ref={cityRef}
              label="City"
              value={address.city}
              onChangeText={(value) => onChangeAddress('city', value)}
              error={errors.city}
              textContentType="addressCity"
              returnKeyType="next"
              onSubmitEditing={() => postcodeRef.current?.focus()}
              submitBehavior="submit"
            />
          </View>
          <View style={styles.rowItem}>
            <CheckoutField
              ref={postcodeRef}
              label="Postcode"
              value={address.postcode}
              onChangeText={(value) => onChangeAddress('postcode', value.toUpperCase())}
              onBlur={() => onChangeAddress('postcode', formatUKPostcode(address.postcode))}
              error={errors.postcode}
              placeholder="SW1A 1AA"
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="postal-code"
              textContentType="postalCode"
              maxLength={8}
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              submitBehavior="submit"
            />
          </View>
        </View>
        <CheckoutField
          ref={phoneRef}
          label="Phone Number"
          value={address.phone}
          onChangeText={(value) => onChangeAddress('phone', value)}
          error={errors.phone}
          placeholder="07123 456789"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={16}
        />
      </CheckoutCard>

      <SectionTitle>Delivery Option</SectionTitle>
      <View style={styles.options} accessibilityRole="radiogroup">
        <DeliveryOption
          icon="🚚"
          title="Standard Delivery"
          subtitle={standardIsFree ? '2-3 working days' : `2-3 days · FREE over ${formatUKPrice(FREE_DELIVERY_THRESHOLD)}`}
          price={standardIsFree ? 'FREE' : formatUKPrice(STANDARD_DELIVERY_FEE)}
          isFree={standardIsFree}
          isSelected={deliveryMethod === 'standard'}
          onPress={() => onChangeDeliveryMethod('standard')}
        />
        <DeliveryOption
          icon="⚡"
          title="Express Delivery"
          subtitle="Next working day"
          price={formatUKPrice(EXPRESS_DELIVERY_FEE)}
          isFree={false}
          isSelected={deliveryMethod === 'express'}
          onPress={() => onChangeDeliveryMethod('express')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  options: {
    gap: 10,
  },
  option: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderColor: Colors.white,
    borderRadius: 16,
    borderWidth: 2,
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.06)',
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  optionSelected: {
    backgroundColor: Colors.lightBlue,
    borderColor: Colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
  radio: {
    alignItems: 'center',
    borderColor: Colors.disabled,
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioDot: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: Colors.darkText,
    fontSize: 15,
    fontWeight: '700',
  },
  optionSubtitle: {
    color: Colors.mutedText,
    fontSize: 13,
  },
  optionPrice: {
    color: Colors.darkText,
    fontSize: 16,
    fontWeight: '800',
  },
  optionPriceFree: {
    color: Colors.success,
  },
});
