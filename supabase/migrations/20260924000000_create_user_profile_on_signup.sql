-- Create a public.users profile row whenever Supabase Auth creates a user.
-- Run in Supabase SQL Editor, or via `supabase db push` if using the CLI.
--
-- Why a trigger instead of an insert from the app: when "Confirm email" is
-- enabled, signUp() returns no session, so the client is still anonymous and
-- the "users can insert their own profile" RLS policy rejects the insert.
-- The trigger runs inside the same transaction as the auth.users insert, so
-- every account is guaranteed to have a profile.

-- 16-digit Advantage Card number (first digit never 0), unique across users.
CREATE OR REPLACE FUNCTION public.generate_advantage_card_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  candidate TEXT;
BEGIN
  LOOP
    candidate := (1 + floor(random() * 9))::INT::TEXT
      || lpad(floor(random() * 1e15)::BIGINT::TEXT, 15, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.users WHERE advantage_card_number = candidate
    );
  END LOOP;
  RETURN candidate;
END;
$$;

-- Only the trigger below needs this; don't expose it through the API.
REVOKE EXECUTE ON FUNCTION public.generate_advantage_card_number()
  FROM PUBLIC, anon, authenticated;

-- full_name comes from signUp({ options: { data: { full_name } } }).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, advantage_card_number, loyalty_points)
  VALUES (
    NEW.id,
    NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NEW.email,
    public.generate_advantage_card_number(),
    0
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for any accounts created before this trigger existed.
INSERT INTO public.users (id, full_name, email, advantage_card_number, loyalty_points)
SELECT
  u.id,
  NULLIF(trim(u.raw_user_meta_data ->> 'full_name'), ''),
  u.email,
  public.generate_advantage_card_number(),
  0
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.users p WHERE p.id = u.id);
