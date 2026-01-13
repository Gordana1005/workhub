-- FIX: Missing Profiles and Triggers
-- This script fixes the root cause of "Profile not saving" and "0 rows" errors.

-- 1. Create the function that handles new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_username text;
  candidate text;
  attempt integer := 0;
BEGIN
  -- Derive a base username from metadata or email local-part
  base_username := coalesce(
    NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(trim(split_part(NEW.email, '@', 1)), ''),
    'user_' || substring(NEW.id::text FROM 1 FOR 8)
  );

  -- Sanitize to allowed characters
  base_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9_.-]', '_', 'g'));
  candidate := base_username;

  -- Attempt insert, append short suffix on collision to satisfy UNIQUE(username)
  LOOP
    BEGIN
      INSERT INTO public.profiles (id, email, username, full_name, avatar_url)
      VALUES (
        NEW.id,
        NEW.email,
        candidate,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
      );
      EXIT; -- success
    EXCEPTION WHEN unique_violation THEN
      attempt := attempt + 1;
      candidate := base_username || '_' || lpad(attempt::text, 2, '0');
      IF attempt > 10 THEN
        candidate := 'user_' || substring(NEW.id::text FROM 1 FOR 8);
      END IF;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 2. Create the trigger on auth.users (if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill missing profiles for existing users
-- This fixes the specific issue for 'milestoev@hotmail.com' if they created an account 
-- before the trigger was working.
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT 
  id, 
  email, 
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 4. Ensure RLS policies are correct for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view anyone's profile (needed for Team page)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to insert their OWN profile (needed for signup if trigger fails)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update their OWN profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

