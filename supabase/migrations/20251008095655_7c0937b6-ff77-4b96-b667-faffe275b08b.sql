-- Add submission tracking fields to user_responses
ALTER TABLE public.user_responses 
ADD COLUMN IF NOT EXISTS is_submitted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone;

-- Add questionnaire completion tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS questionnaire_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS questionnaire_completed_at timestamp with time zone;

-- Update RLS policy to prevent editing submitted responses
DROP POLICY IF EXISTS "Users can update their own responses" ON public.user_responses;

CREATE POLICY "Users can update only non-submitted responses"
ON public.user_responses
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND (is_submitted IS NULL OR is_submitted = false)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_responses_submitted 
ON public.user_responses(user_id, is_submitted);