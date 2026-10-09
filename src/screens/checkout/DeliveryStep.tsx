import { useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';

import {
  EXPRESS_DELIVERY_FEE,
  FREE_DELIVERY_THRESHOLD,
  STANDARD_DELIVERY_FEE,
  type DeliveryMethod,
} from '@/constants/checkout';
import { Colors } from '@/constants/colors';
import type { DeliveryAddressState } from '@/hooks/useDeliveryAddresses';
import type { ShippingAddress } from '@/services/orders';
import { formatUKPrice } from '@/utils/orderUtils';
import { formatUKPostcode } from '@/utils/validation';

import { CheckoutCard, CheckoutField, SectionTitle } from './CheckoutField';
import { SavedAddressPicker } from './SavedAddressPicker';
import type { AddressErrors } from '@/services/deliveryAddresses';

type DeliveryStepProps = {
  savedAddresses: DeliveryAddressState;
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
      aria-checked={isSelected}
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
  savedAddresses,
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
      <SavedAddressPicker state={savedAddresses} />
      {savedAddresses.isAdding && !savedAddresses.isLoading && !savedAddresses.loadError ? (
      <CheckoutCard>
        <Text style={styles.formTitle}>New delivery address</Text>
        <CheckoutField
          editable={!savedAddresses.isSaving}
          label="Full Name"
          value={address.fullName}
          onChangeText={(value) => onChangeAddress('fullName', value)}
          error={errors.fullName}
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => line1Ref.current?.focus()}
          submitBehavior="submit"
          maxLength={120}
        />
        <CheckoutField
          editable={!savedAddresses.isSaving}
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
          maxLength={160}
        />
        <CheckoutField
          editable={!savedAddresses.isSaving}
          ref={line2Ref}
          label="Address Line 2 (optional)"
          value={address.line2}
          error={errors.line2}
          onChangeText={(value) => onChangeAddress('line2', value)}
          autoComplete="address-line2"
          textContentType="streetAddressLine2"
          returnKeyType="next"
          onSubmitEditing={() => cityRef.current?.focus()}
          submitBehavior="submit"
          maxLength={160}
        />
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <CheckoutField
              editable={!savedAddresses.isSaving}
              ref={cityRef}
              label="City"
              value={address.city}
              onChangeText={(value) => onChangeAddress('city', value)}
              error={errors.city}
              textContentType="addressCity"
              returnKeyType="next"
              onSubmitEditing={() => postcodeRef.current?.focus()}
              submitBehavior="submit"
              maxLength={100}
            />
          </View>
          <View style={styles.rowItem}>
            <CheckoutField
              editable={!savedAddresses.isSaving}
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
          editable={!savedAddresses.isSaving}
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
        {savedAddresses.addresses.length ? (
          <Pressable
            accessibilityRole="checkbox"
            aria-checked={savedAddresses.makeDefault}
            accessibilityState={{ checked: savedAddresses.makeDefault, disabled: savedAddresses.isSaving }}
            disabled={savedAddresses.isSaving}
            onPress={() => savedAddresses.changeMakeDefault(!savedAddresses.makeDefault)}
            style={styles.defaultToggle}
          >
            <View style={[styles.checkbox, savedAddresses.makeDefault && styles.checkboxSelected]}>
              {savedAddresses.makeDefault ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.defaultLabel}>Make this my default address</Text>
          </Pressable>
        ) : <Text style={styles.hint}>Your first saved address becomes your default.</Text>}
        {savedAddresses.saveError ? <Text style={styles.saveError} accessibilityRole="alert">{savedAddresses.saveError}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: savedAddresses.isSaving, disabled: savedAddresses.isSaving }}
          disabled={savedAddresses.isSaving}
          onPress={() => void savedAddresses.ensureSaved()}
          style={styles.saveButton}
        >
          {savedAddresses.isSaving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveLabel}>Save address</Text>}
        </Pressable>
        <Text style={styles.hint}>Continuing also saves this address securely to your account.</Text>
        {savedAddresses.addresses.length ? (
          <Pressable
            accessibilityRole="button"
            disabled={savedAddresses.isSaving}
            onPress={() => {
              const previous = savedAddresses.addresses.find((row) => row.isDefault) ?? savedAddresses.addresses[0];
              savedAddresses.selectAddress(previous);
            }}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelLabel}>Use a saved address instead</Text>
          </Pressable>
        ) : null}
      </CheckoutCard>
      ) : null}

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
  formTitle: { color: Colors.darkText, fontSize: 16, fontWeight: '700' },
  saveError: { color: Colors.error, fontSize: 13, lineHeight: 20 },
  defaultToggle: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 44 },
  checkbox: { alignItems: 'center', borderColor: Colors.border, borderRadius: 6, borderWidth: 1, height: 24, justifyContent: 'center', width: 24 },
  checkboxSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: Colors.white, fontWeight: '700' },
  defaultLabel: { color: Colors.darkText, flex: 1, fontSize: 14 },
  hint: { color: Colors.mutedText, fontSize: 12, lineHeight: 18 },
  saveButton: { alignItems: 'center', backgroundColor: Colors.primary, borderRadius: 12, justifyContent: 'center', minHeight: 48 },
  saveLabel: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  cancelButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  cancelLabel: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
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
