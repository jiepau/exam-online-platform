ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS anti_cheat_config jsonb NOT NULL DEFAULT '{
  "block_copy_paste": true,
  "block_right_click": true,
  "block_shortcuts": true,
  "block_printscreen": true,
  "detect_tab_switch": true,
  "require_fullscreen": true,
  "max_violations": 5
}'::jsonb;