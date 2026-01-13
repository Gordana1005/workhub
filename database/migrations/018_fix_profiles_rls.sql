-- Fix for RLS policy on profiles table to allow new user registration
-- This allows the authorized user to insert a row into profiles with their own ID

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can insert own profile" 
ON profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Ensure the select policy is also correct (sometimes needed for returning data after insert)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own profile" 
ON profiles 
FOR SELECT 
USING (auth.uid() = id);
