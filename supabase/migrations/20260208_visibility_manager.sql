-- Add visibility columns to properties table
ALTER TABLE "properties" 
ADD COLUMN IF NOT EXISTS "featured_until" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "boost_level" INTEGER DEFAULT 1;

-- Add comment explaining boost levels
COMMENT ON COLUMN "properties"."boost_level" IS '1=Normal, 2=Gold, 3=Platinum';

-- Create index for performance on sorting
CREATE INDEX IF NOT EXISTS "properties_boost_level_idx" ON "properties" ("boost_level" DESC, "created_at" DESC);
