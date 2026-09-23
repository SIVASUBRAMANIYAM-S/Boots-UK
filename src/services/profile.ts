import { supabase } from '@/services/supabase';
import type { UserProfile } from '@/types/catalog';

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('full_name, loyalty_points')
    .eq('id', userId)
    .maybeSingle()
    .overrideTypes<UserProfile | null, { merge: false }>();

  if (error) throw error;
  return data;
}
