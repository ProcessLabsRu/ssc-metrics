-- Add labor_hours column to user_responses table
ALTER TABLE public.user_responses 
ADD COLUMN labor_hours NUMERIC(5,2) DEFAULT 0.00 CHECK (labor_hours >= 0 AND labor_hours <= 250);

-- Add comment to document the column
COMMENT ON COLUMN public.user_responses.labor_hours IS 'Labor hours for the process (0-250 hours, 2 decimal places)';
