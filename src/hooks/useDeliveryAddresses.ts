import { useCallback, useEffect, useRef, useState } from 'react';

import type { ShippingAddress } from '@/services/orders';
import {
  deliveryAddressError,
  EMPTY_DELIVERY_ADDRESS,
  getDeliveryAddresses,
  saveDeliveryAddress,
  setDefaultDeliveryAddress,
  validateDeliveryAddress,
  type AddressErrors,
  type SavedDeliveryAddress,
} from '@/services/deliveryAddresses';

export function useDeliveryAddresses(userId: string, profileName: string) {
  const [addresses, setAddresses] = useState<SavedDeliveryAddress[]>([]);
  const [address, setAddress] = useState<ShippingAddress>(EMPTY_DELIVERY_ADDRESS);
  const [errors, setErrors] = useState<AddressErrors>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [makeDefault, setMakeDefault] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const loadVersion = useRef(0);

  const retry = useCallback(async () => {
    if (busy.current) return;
    const version = ++loadVersion.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const rows = await getDeliveryAddresses(userId);
      if (!mounted.current || version !== loadVersion.current) return;
      setAddresses(rows);
      const preferred = rows.find((row) => row.isDefault) ?? rows[0];
      setSelectedId(preferred?.id ?? null);
      if (preferred) setAddress({ ...preferred.address });
      setIsAdding(!preferred);
    } catch (error) {
      if (mounted.current && version === loadVersion.current) setLoadError(deliveryAddressError(error));
    } finally {
      if (mounted.current && version === loadVersion.current) setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    mounted.current = true;
    void retry();
    return () => { mounted.current = false; loadVersion.current += 1; };
  }, [retry]);

  useEffect(() => {
    if (profileName) setAddress((current) => current.fullName ? current : { ...current, fullName: profileName });
  }, [profileName]);

  const changeAddress = useCallback((field: keyof ShippingAddress, value: string) => {
    if (busy.current) return;
    setAddress((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSaveError(null);
  }, []);

  const selectAddress = useCallback((row: SavedDeliveryAddress) => {
    if (busy.current) return;
    setSelectedId(row.id);
    setAddress({ ...row.address });
    setIsAdding(false);
    setErrors({});
    setSaveError(null);
  }, []);

  const addAddress = useCallback(() => {
    if (busy.current) return;
    setSelectedId(null);
    setAddress({ ...EMPTY_DELIVERY_ADDRESS, fullName: profileName });
    setIsAdding(true);
    setMakeDefault(false);
    setErrors({});
    setSaveError(null);
  }, [profileName]);

  const applySaved = useCallback((row: SavedDeliveryAddress) => {
    setAddresses((current) => {
      const others = current.filter((item) => item.id !== row.id)
        .map((item) => row.isDefault ? { ...item, isDefault: false } : item);
      return [...others, row];
    });
    setSelectedId(row.id);
    setAddress({ ...row.address });
    setIsAdding(false);
    setSaveError(null);
  }, []);

  const ensureSaved = useCallback(async (): Promise<boolean> => {
    if (busy.current || isLoading || loadError) return false;
    const nextErrors = validateDeliveryAddress(address);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return false;
    if (!isAdding && selectedId) return true;
    busy.current = true;
    setIsSaving(true);
    setSaveError(null);
    try {
      const row = await saveDeliveryAddress(address, makeDefault);
      if (!mounted.current) return false;
      applySaved(row);
      return true;
    } catch (error) {
      if (mounted.current) setSaveError(deliveryAddressError(error));
      return false;
    } finally {
      busy.current = false;
      if (mounted.current) setIsSaving(false);
    }
  }, [address, applySaved, isAdding, isLoading, loadError, makeDefault, selectedId]);

  const setDefault = useCallback(async (id: string) => {
    if (busy.current || isLoading || loadError) return;
    busy.current = true;
    setIsSaving(true);
    setSaveError(null);
    try {
      const row = await setDefaultDeliveryAddress(id);
      if (mounted.current) {
        setAddresses((current) => current.map((item) => ({ ...item, isDefault: item.id === row.id })));
      }
    } catch (error) {
      if (mounted.current) setSaveError(deliveryAddressError(error));
    } finally {
      busy.current = false;
      if (mounted.current) setIsSaving(false);
    }
  }, [isLoading, loadError]);

  return {
    addresses, address, errors, selectedId, isAdding, makeDefault, isLoading, isSaving,
    loadError, saveError, retry, changeAddress, selectAddress, addAddress, ensureSaved, setDefault,
    changeMakeDefault: (value: boolean) => { if (!busy.current) setMakeDefault(value); },
  };
}

export type DeliveryAddressState = ReturnType<typeof useDeliveryAddresses>;
