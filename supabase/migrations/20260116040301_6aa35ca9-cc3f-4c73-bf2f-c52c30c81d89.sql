-- Fix search_path for the update_prompt_version_analytics function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;