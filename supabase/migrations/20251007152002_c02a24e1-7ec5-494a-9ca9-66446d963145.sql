-- Add foreign key constraint with cascade delete from user_responses to auth.users
-- This ensures that when a user is deleted, all their responses are automatically deleted
ALTER TABLE public.user_responses
DROP CONSTRAINT IF EXISTS user_responses_user_id_fkey;

ALTER TABLE public.user_responses
ADD CONSTRAINT user_responses_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Also add cascade delete for profiles
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Add cascade delete for user_roles
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Add cascade delete for user_access
ALTER TABLE public.user_access
DROP CONSTRAINT IF EXISTS user_access_user_id_fkey;

ALTER TABLE public.user_access
ADD CONSTRAINT user_access_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;