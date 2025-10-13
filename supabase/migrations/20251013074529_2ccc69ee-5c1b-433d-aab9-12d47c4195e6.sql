-- Restore original populate_user_responses function without executor_id
CREATE OR REPLACE FUNCTION public.populate_user_responses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;