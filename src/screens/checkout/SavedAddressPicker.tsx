import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import type { DeliveryAddressState } from '@/hooks/useDeliveryAddresses';

export function SavedAddressPicker({ state }: { state: DeliveryAddressState }) {
  if (state.isLoading) {
    return (
      <View style={styles.status} accessibilityLiveRegion="polite">
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.secondary}>Loading saved addresses…</Text>
      </View>
    );
  }
  if (state.loadError) {
    return (
      <View style={styles.status}>
        <Text style={styles.error} accessibilityRole="alert">{state.loadError}</Text>
        <Pressable accessibilityRole="button" onPress={() => void state.retry()} style={styles.action}>
          <Text style={styles.actionText}>Retry addresses</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      {state.addresses.length ? (
        <>
          <Text style={styles.secondary}>Choose a saved address for this order.</Text>
          <View accessibilityRole="radiogroup" style={styles.container}>
            {state.addresses.map((row) => {
              const selected = !state.isAdding && row.id === state.selectedId;
              return (
                <View key={row.id} style={[styles.card, selected && styles.selected]}>
                  <Pressable
                    accessibilityRole="radio"
                    aria-checked={selected}
                    accessibilityState={{ checked: selected, disabled: state.isSaving }}
                    accessibilityLabel={`${row.address.fullName}, ${row.address.line1}, ${row.address.city}, ${row.address.postcode}${row.isDefault ? ', Default address' : ''}`}
                    disabled={state.isSaving}
                    onPress={() => state.selectAddress(row)}
                    style={styles.selection}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.dot} /> : null}
                    </View>
                    <View style={styles.details}>
                      <View style={styles.heading}>
                        <Text style={styles.name}>{row.address.fullName}</Text>
                        {row.isDefault ? <Text style={styles.badge}>Default</Text> : null}
                      </View>
                      <Text style={styles.secondary}>{[row.address.line1, row.address.line2, row.address.city, row.address.postcode].filter(Boolean).join(', ')}</Text>
                      <Text style={styles.secondary}>{row.address.phone}</Text>
                    </View>
                  </Pressable>
                  {!row.isDefault ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Set ${row.address.line1} as default address`}
                      disabled={state.isSaving}
                      onPress={() => void state.setDefault(row.id)}
                      style={styles.defaultAction}
                    >
                      <Text style={styles.actionText}>Set as default</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        </>
      ) : <Text style={styles.secondary}>Save your first address for a faster checkout next time.</Text>}
      {!state.isAdding ? (
        <Pressable accessibilityRole="button" disabled={state.isSaving} onPress={state.addAddress} style={styles.action}>
          <Text style={styles.actionText}>＋ Add a new address</Text>
        </Pressable>
      ) : null}
      {state.isSaving && !state.isAdding ? <ActivityIndicator color={Colors.primary} accessibilityLabel="Updating saved address" /> : null}
      {state.saveError && !state.isAdding ? <Text style={styles.error} accessibilityRole="alert">{state.saveError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  status: { backgroundColor: Colors.white, borderRadius: 16, gap: 12, padding: 18 },
  card: { backgroundColor: Colors.white, borderColor: Colors.border, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  selected: { backgroundColor: Colors.lightBlue, borderColor: Colors.primary },
  selection: { alignItems: 'center', flexDirection: 'row', gap: 12, padding: 16 },
  details: { flex: 1, gap: 5 },
  heading: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  name: { color: Colors.darkText, fontSize: 15, fontWeight: '700' },
  badge: { backgroundColor: Colors.primary, borderRadius: 6, color: Colors.white, fontSize: 11, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 },
  secondary: { color: Colors.mutedText, fontSize: 13, lineHeight: 19 },
  radio: { alignItems: 'center', borderColor: Colors.disabled, borderRadius: 11, borderWidth: 2, height: 22, justifyContent: 'center', width: 22 },
  radioSelected: { borderColor: Colors.primary },
  dot: { backgroundColor: Colors.primary, borderRadius: 6, height: 12, width: 12 },
  action: { alignItems: 'center', borderColor: Colors.primary, borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 48, padding: 12 },
  actionText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  defaultAction: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44, paddingHorizontal: 16 },
  error: { color: Colors.error, fontSize: 13, lineHeight: 20 },
});
