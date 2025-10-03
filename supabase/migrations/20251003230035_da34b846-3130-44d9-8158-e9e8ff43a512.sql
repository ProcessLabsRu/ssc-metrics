-- Enable realtime for user_responses table
ALTER TABLE public.user_responses REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_responses;