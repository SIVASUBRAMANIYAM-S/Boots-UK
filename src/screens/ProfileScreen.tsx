import { useState } from 'react';
import { Alert } from 'react-native';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useSession } from '@/context/SessionContext';
import { supabase } from '@/services/supabase';

export default function ProfileScreen() {
  const { session } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    // On success the session clears and the root layout switches to Login,
    // which unmounts this screen, so only reset state on failure.
    const { error } = await supabase.auth.signOut();
    if (error) {
      setIsSigningOut(false);
      Alert.alert('Sign out failed', error.message);
    }
  };

  return (
    <PlaceholderScreen emoji="👤" title="Profile" subtitle={session?.user.email}>
      <PrimaryButton label="Sign Out" onPress={handleSignOut} isLoading={isSigningOut} />
    </PlaceholderScreen>
  );
}
