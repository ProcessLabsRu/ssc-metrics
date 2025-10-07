-- Create trigger to automatically populate user_responses when user_access is granted
-- This trigger will create entries in user_responses for all level 4 processes
-- that belong to the granted level 1 process (f1_index)

CREATE TRIGGER trigger_populate_user_responses
  AFTER INSERT ON public.user_access
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_user_responses();