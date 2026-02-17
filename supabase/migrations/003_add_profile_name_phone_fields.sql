-- Migration: Add first_name, last_name, phone to profiles table
-- These fields are populated from user_metadata during signup

-- 1. Add columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- 2. Update the signup trigger to populate the new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, first_name, last_name, phone)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data ->> 'full_name',
      TRIM(COALESCE(new.raw_user_meta_data ->> 'first_name', '') || ' ' || COALESCE(new.raw_user_meta_data ->> 'last_name', ''))
    ),
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Backfill existing profiles from auth.users metadata
UPDATE public.profiles p
SET
  first_name = COALESCE(p.first_name, u.raw_user_meta_data ->> 'first_name'),
  last_name  = COALESCE(p.last_name,  u.raw_user_meta_data ->> 'last_name'),
  phone      = COALESCE(p.phone,      u.raw_user_meta_data ->> 'phone')
FROM auth.users u
WHERE p.id = u.id;
