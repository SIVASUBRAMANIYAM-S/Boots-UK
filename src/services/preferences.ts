import AsyncStorage from '@react-native-async-storage/async-storage';

export type ProfilePreferences = {
  pushNotifications: boolean;
  emailOffers: boolean;
  birthdayRewards: boolean;
};

export const DEFAULT_PREFERENCES: ProfilePreferences = {
  pushNotifications: true,
  emailOffers: true,
  birthdayRewards: true,
};

const key = (userId: string) => `@boots/profile-preferences/${userId}`;
const pendingWrites = new Map<string, Promise<void>>();

function write(userId: string, operation: () => Promise<void>): Promise<void> {
  const previous = pendingWrites.get(userId);
  const next = previous ? previous.then(operation, operation) : operation();
  pendingWrites.set(userId, next);
  const cleanup = () => {
    if (pendingWrites.get(userId) === next) pendingWrites.delete(userId);
  };
  void next.then(cleanup, cleanup);
  return next;
}

export async function getProfilePreferences(
  userId: string,
): Promise<ProfilePreferences> {
  const stored = await AsyncStorage.getItem(key(userId));
  if (stored === null) return { ...DEFAULT_PREFERENCES };
  const value: unknown = JSON.parse(stored);
  if (
    typeof value !== 'object' ||
    value === null ||
    !('pushNotifications' in value) ||
    typeof value.pushNotifications !== 'boolean' ||
    !('emailOffers' in value) ||
    typeof value.emailOffers !== 'boolean' ||
    !('birthdayRewards' in value) ||
    typeof value.birthdayRewards !== 'boolean'
  ) {
    throw new Error('Invalid saved preferences');
  }
  return {
    pushNotifications: value.pushNotifications,
    emailOffers: value.emailOffers,
    birthdayRewards: value.birthdayRewards,
  };
}

export async function saveProfilePreferences(
  userId: string,
  value: ProfilePreferences,
): Promise<void> {
  await write(userId, () =>
    AsyncStorage.setItem(key(userId), JSON.stringify(value)),
  );
}

export async function clearProfilePreferences(userId: string): Promise<void> {
  await write(userId, () => AsyncStorage.removeItem(key(userId)));
}
