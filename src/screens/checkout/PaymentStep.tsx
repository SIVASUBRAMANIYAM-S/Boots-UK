import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/colors';
import {
  cvvLength,
  detectCardBrand,
  digitsOnly,
  formatCardNumber,
  formatExpiry,
  type CardBrand,
} from '@/utils/payment';

import { CheckoutCard, CheckoutField, SectionTitle } from './CheckoutField';

export type CardDetails = {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
};

export type CardErrors = Partial<Record<keyof CardDetails, string>>;

type PaymentStepProps = {
  card: CardDetails;
  errors: CardErrors;
  onChangeCard: (field: keyof CardDetails, value: string) => void;
  onUseTestCard: () => void;
};

const ACCEPTED_BRANDS: readonly Exclude<CardBrand, null>[] = ['VISA', 'MASTERCARD', 'AMEX'];

function CardPreview({ card, brand }: { card: CardDetails; brand: CardBrand }) {
  const lastFour = digitsOnly(card.number).slice(-4).padEnd(4, '•');

  return (
    <View
      style={styles.preview}
      accessible
      accessibilityLabel={`Card preview ending ${digitsOnly(card.number).slice(-4) || 'not entered'}`}
    >
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.previewGlow} />
      <View style={styles.previewTop}>
        <Text style={styles.previewIssuer}>BOOTS</Text>
        <View style={styles.chip} />
      </View>
      <Text style={styles.previewNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        •••• •••• •••• {lastFour}
      </Text>
      <View style={styles.previewBottom}>
        <View>
          <Text style={styles.previewCaption}>VALID THRU</Text>
          <Text style={styles.previewValue}>{card.expiry || 'MM/YY'}</Text>
        </View>
        <View style={styles.previewName}>
          <Text style={styles.previewCaption}>CARDHOLDER</Text>
          <Text style={styles.previewValue} numberOfLines={1}>
            {card.name.trim().toUpperCase() || 'YOUR NAME'}
          </Text>
        </View>
        <Text style={styles.previewBrand}>{brand ?? 'CARD'}</Text>
      </View>
    </View>
  );
}

export function PaymentStep({ card, errors, onChangeCard, onUseTestCard }: PaymentStepProps) {
  const expiryRef = useRef<TextInput>(null);
  const cvvRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const brand = detectCardBrand(card.number);

  return (
    <View style={styles.container}>
      <SectionTitle>Payment Details</SectionTitle>
      <CheckoutCard>
        <CardPreview card={card} brand={brand} />

        <Pressable
          onPress={onUseTestCard}
          accessibilityRole="button"
          style={({ pressed }) => [styles.testCardPill, pressed && styles.pressed]}
        >
          <Text style={styles.testCardLabel}>⚡ Use test card</Text>
        </Pressable>

        <CheckoutField
          label="Card Number"
          value={card.number}
          onChangeText={(value) => onChangeCard('number', formatCardNumber(value))}
          error={errors.number}
          placeholder="1234 5678 9012 3456"
          keyboardType="number-pad"
          autoComplete="cc-number"
          textContentType="creditCardNumber"
          maxLength={19}
          returnKeyType="next"
          onSubmitEditing={() => expiryRef.current?.focus()}
          submitBehavior="submit"
        />
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <CheckoutField
              ref={expiryRef}
              label="Expiry Date"
              value={card.expiry}
              onChangeText={(value) => onChangeCard('expiry', formatExpiry(value))}
              error={errors.expiry}
              placeholder="MM/YY"
              keyboardType="number-pad"
              autoComplete="cc-exp"
              maxLength={5}
              returnKeyType="next"
              onSubmitEditing={() => cvvRef.current?.focus()}
              submitBehavior="submit"
            />
          </View>
          <View style={styles.rowItem}>
            <CheckoutField
              ref={cvvRef}
              label="CVV 🔒"
              value={card.cvv}
              onChangeText={(value) => onChangeCard('cvv', digitsOnly(value).slice(0, cvvLength(brand)))}
              error={errors.cvv}
              placeholder={'•'.repeat(cvvLength(brand))}
              keyboardType="number-pad"
              autoComplete="cc-csc"
              secureTextEntry
              maxLength={cvvLength(brand)}
              returnKeyType="next"
              onSubmitEditing={() => nameRef.current?.focus()}
              submitBehavior="submit"
            />
          </View>
        </View>
        <CheckoutField
          ref={nameRef}
          label="Cardholder Name"
          value={card.name}
          onChangeText={(value) => onChangeCard('name', value)}
          error={errors.name}
          placeholder="As shown on card"
          autoCapitalize="words"
          autoComplete="cc-name"
        />

        <View style={styles.brands}>
          {ACCEPTED_BRANDS.map((accepted) => (
            <View key={accepted} style={[styles.brandPill, brand === accepted && styles.brandPillActive]}>
              <Text style={[styles.brandLabel, brand === accepted && styles.brandLabelActive]}>{accepted}</Text>
            </View>
          ))}
        </View>
      </CheckoutCard>

      <Text style={styles.security}>🔒 Your payment is encrypted and secure</Text>
      <Text style={styles.demoNote}>Demo checkout — no real payment is taken.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  preview: {
    backgroundColor: Colors.midnight,
    borderRadius: 16,
    boxShadow: '0 10px 24px rgba(26, 26, 46, 0.35)',
    height: 180,
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: 20,
  },
  previewGlow: {
    backgroundColor: Colors.primary,
    borderRadius: 120,
    height: 240,
    opacity: 0.35,
    position: 'absolute',
    right: -110,
    top: -120,
    width: 240,
  },
  previewTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewIssuer: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
  },
  chip: {
    backgroundColor: Colors.gold,
    borderRadius: 6,
    height: 26,
    opacity: 0.9,
    width: 36,
  },
  previewNumber: {
    color: Colors.white,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    letterSpacing: 4,
  },
  previewBottom: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 16,
  },
  previewName: {
    flex: 1,
  },
  previewCaption: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  previewValue: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  previewBrand: {
    color: Colors.white,
    fontSize: 18,
    fontStyle: 'italic',
    fontWeight: '900',
  },
  testCardPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.lightBlue,
    borderColor: Colors.primary,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  testCardLabel: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  brands: {
    flexDirection: 'row',
    gap: 8,
  },
  brandPill: {
    borderColor: Colors.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  brandPillActive: {
    backgroundColor: Colors.lightBlue,
    borderColor: Colors.primary,
  },
  brandLabel: {
    color: Colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandLabelActive: {
    color: Colors.primary,
  },
  security: {
    color: Colors.mutedText,
    fontSize: 12,
    textAlign: 'center',
  },
  demoNote: {
    color: Colors.inactive,
    fontSize: 11,
    marginTop: -8,
    textAlign: 'center',
  },
});
