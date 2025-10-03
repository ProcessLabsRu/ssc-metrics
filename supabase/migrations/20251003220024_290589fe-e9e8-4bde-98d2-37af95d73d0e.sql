-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create user_access table (связь пользователя с процессами 1 уровня)
CREATE TABLE public.user_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  f1_index TEXT REFERENCES public.process_1(f1_index) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, f1_index)
);

-- Add user_id to user_responses
ALTER TABLE public.user_responses 
ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_user_responses_user_id ON public.user_responses(user_id);
CREATE INDEX idx_user_access_user_id ON public.user_access(user_id);

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to populate user_responses when access is granted
CREATE OR REPLACE FUNCTION public.populate_user_responses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert all f4_index for accessible f1_index
  INSERT INTO public.user_responses (user_id, f4_index, system_id, notes)
  SELECT 
    NEW.user_id,
    p4.f4_index,
    NULL,
    NULL
  FROM process_4 p4
  JOIN process_3 p3 ON p4.f3_index = p3.f3_index
  JOIN process_2 p2 ON p3.f2_index = p2.f2_index
  WHERE p2.f1_index = NEW.f1_index
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to populate user_responses when access is granted
CREATE TRIGGER on_user_access_created
  AFTER INSERT ON public.user_access
  FOR EACH ROW EXECUTE FUNCTION public.populate_user_responses();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for user_access
CREATE POLICY "Admins can manage all access"
  ON public.user_access FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own access"
  ON public.user_access FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for user_responses
CREATE POLICY "Users can view their own responses"
  ON public.user_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own responses"
  ON public.user_responses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all responses"
  ON public.user_responses FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for process tables (read-only for authenticated users)
ALTER TABLE public.process_1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_4 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view process_1"
  ON public.process_1 FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view process_2"
  ON public.process_2 FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view process_3"
  ON public.process_3 FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view process_4"
  ON public.process_4 FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view systems"
  ON public.systems FOR SELECT
  TO authenticated
  USING (true);