-- Insert default LLM model settings for cover letter and interview prep generation
INSERT INTO admin_settings (setting_key, setting_value, description)
VALUES 
  ('ai_model_cover_letter', '{"model": "google/gemini-3-flash-preview", "displayName": "Gemini 3 Flash Preview"}', 'Selected AI model for cover letter generation'),
  ('ai_model_interview_prep', '{"model": "google/gemini-3-flash-preview", "displayName": "Gemini 3 Flash Preview"}', 'Selected AI model for interview prep generation')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();