-- Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create index for organizations
CREATE INDEX idx_organizations_name ON public.organizations(name);

-- Enable RLS for organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- RLS policies for organizations
CREATE POLICY "Authenticated users can view organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage organizations"
  ON public.organizations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(organization_id, name)
);

-- Create indexes for departments
CREATE INDEX idx_departments_org_id ON public.departments(organization_id);
CREATE INDEX idx_departments_name ON public.departments(name);

-- Enable RLS for departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- RLS policies for departments
CREATE POLICY "Authenticated users can view departments"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Update profiles table with new columns
ALTER TABLE public.profiles 
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Create indexes for profiles
CREATE INDEX idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX idx_profiles_department ON public.profiles(department_id);

-- Add constraint: if department is specified, organization must be specified
ALTER TABLE public.profiles 
  ADD CONSTRAINT check_department_requires_organization 
  CHECK (department_id IS NULL OR organization_id IS NOT NULL);

-- Insert sample organizations
INSERT INTO public.organizations (name) VALUES
  ('Центральный офис'),
  ('Филиал №1'),
  ('Филиал №2')
ON CONFLICT (name) DO NOTHING;

-- Insert sample departments for Central Office
INSERT INTO public.departments (organization_id, name)
SELECT o.id, d.name
FROM public.organizations o
CROSS JOIN (VALUES 
  ('Отдел продаж'),
  ('Бухгалтерия'),
  ('ИТ отдел'),
  ('Отдел кадров')
) AS d(name)
WHERE o.name = 'Центральный офис'
ON CONFLICT (organization_id, name) DO NOTHING;