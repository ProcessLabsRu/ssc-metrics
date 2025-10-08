-- Create ui_settings table
CREATE TABLE IF NOT EXISTS public.ui_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text,
  header_title text NOT NULL DEFAULT 'SSC Metrics',
  header_bg_color text NOT NULL DEFAULT 'hsl(var(--card))',
  header_text_color text NOT NULL DEFAULT 'hsl(var(--foreground))',
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.ui_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view ui settings"
  ON public.ui_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert ui settings"
  ON public.ui_settings
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update ui settings"
  ON public.ui_settings
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Public can view logos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Admins can upload logos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'logos' 
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update logos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'logos' 
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete logos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'logos' 
    AND public.has_role(auth.uid(), 'admin')
  );

-- Insert default settings
INSERT INTO public.ui_settings (id, header_title, header_bg_color, header_text_color)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'SSC Metrics',
  'hsl(var(--card))',
  'hsl(var(--foreground))'
)
ON CONFLICT (id) DO NOTHING;