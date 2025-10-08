-- Add help_instructions column to ui_settings table
ALTER TABLE ui_settings 
ADD COLUMN IF NOT EXISTS help_instructions TEXT;

COMMENT ON COLUMN ui_settings.help_instructions IS 'Инструкция для пользователей, отображаемая в модальном окне помощи';