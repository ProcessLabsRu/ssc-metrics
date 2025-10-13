-- Add executor_id column to user_responses table
ALTER TABLE public.user_responses
  ADD COLUMN executor_id INTEGER REFERENCES public.executors(id) ON DELETE SET NULL;

-- Create index for better performance in analytics queries
CREATE INDEX idx_user_responses_executor ON public.user_responses(executor_id);

-- Add comment for documentation
COMMENT ON COLUMN public.user_responses.executor_id IS 'Executor ID copied from process_4 for analytics purposes';

-- Update the trigger function to include executor_id
CREATE OR REPLACE FUNCTION public.populate_user_responses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert all f4_index for accessible f1_index, including executor_id
  INSERT INTO public.user_responses (user_id, f4_index, system_id, notes, executor_id)
  SELECT 
    NEW.user_id,
    p4.f4_index,
    NULL,
    NULL,
    p4.executor_id
  FROM process_4 p4
  JOIN process_3 p3 ON p4.f3_index = p3.f3_index
  JOIN process_2 p2 ON p3.f2_index = p2.f2_index
  WHERE p2.f1_index = NEW.f1_index
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Optionally: Update existing user_responses with executor_id from process_4
UPDATE public.user_responses ur
SET executor_id = p4.executor_id
FROM process_4 p4
WHERE ur.f4_index = p4.f4_index
  AND ur.executor_id IS NULL;