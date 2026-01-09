-- Add columns for multiple before and after photos
ALTER TABLE jobs 
  ADD COLUMN IF NOT EXISTS before_photos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS after_photos JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN jobs.before_photos IS 'Array of before photo URLs';
COMMENT ON COLUMN jobs.after_photos IS 'Array of after photo URLs';