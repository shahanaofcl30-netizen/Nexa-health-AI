-- 1. Add firebase_uid to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE;

-- 2. Drop the foreign key constraint that requires profiles.id to exist in auth.users(id)
-- First, find the constraint name. Usually it's profiles_id_fkey
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. Also update RLS policies if necessary, but since we will be using custom JWTs,
-- the auth.uid() function in Supabase will extract the 'sub' claim from the custom JWT.
-- If we set the 'sub' claim to the UUID we generate, auth.uid() works perfectly!
