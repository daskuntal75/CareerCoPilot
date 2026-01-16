-- Add version_id column to prompt_telemetry to link prompts with specific versions
ALTER TABLE public.prompt_telemetry 
ADD COLUMN IF NOT EXISTS prompt_version_id uuid REFERENCES public.ai_prompt_versions(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_prompt_telemetry_version_id ON public.prompt_telemetry(prompt_version_id);

-- Add performance_score column to ai_prompt_versions to track aggregate performance
ALTER TABLE public.ai_prompt_versions 
ADD COLUMN IF NOT EXISTS avg_quality_rating numeric,
ADD COLUMN IF NOT EXISTS total_uses integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS positive_ratings integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS negative_ratings integer DEFAULT 0;

-- Create a function to update version analytics
CREATE OR REPLACE FUNCTION update_prompt_version_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update when a quality rating is set
  IF NEW.response_quality_rating IS NOT NULL AND NEW.prompt_version_id IS NOT NULL THEN
    UPDATE ai_prompt_versions
    SET 
      total_uses = total_uses + 1,
      positive_ratings = positive_ratings + CASE WHEN NEW.response_quality_rating >= 4 THEN 1 ELSE 0 END,
      negative_ratings = negative_ratings + CASE WHEN NEW.response_quality_rating < 4 THEN 1 ELSE 0 END,
      avg_quality_rating = (
        SELECT AVG(response_quality_rating)::numeric 
        FROM prompt_telemetry 
        WHERE prompt_version_id = NEW.prompt_version_id 
        AND response_quality_rating IS NOT NULL
      )
    WHERE id = NEW.prompt_version_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update analytics on rating
DROP TRIGGER IF EXISTS trigger_update_prompt_version_analytics ON public.prompt_telemetry;
CREATE TRIGGER trigger_update_prompt_version_analytics
AFTER INSERT OR UPDATE OF response_quality_rating ON public.prompt_telemetry
FOR EACH ROW
EXECUTE FUNCTION update_prompt_version_analytics();

-- Allow users to update their own prompt telemetry (for adding ratings)
CREATE POLICY "Users can update their own prompt telemetry"
ON public.prompt_telemetry
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);