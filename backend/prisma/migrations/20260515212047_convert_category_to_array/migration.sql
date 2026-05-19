/*
  Convert category from String to String[] array
  Preserves existing category values by converting them to single-item arrays
*/

-- Add new array column
ALTER TABLE "Resource" ADD COLUMN "category_new" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Convert existing category values to arrays
-- NULL becomes empty array, non-NULL becomes single-item array
UPDATE "Resource" 
SET "category_new" = CASE 
  WHEN "category" IS NULL THEN ARRAY[]::TEXT[]
  ELSE ARRAY["category"]::TEXT[]
END;

-- Drop old column
ALTER TABLE "Resource" DROP COLUMN "category";

-- Rename new column to original name
ALTER TABLE "Resource" RENAME COLUMN "category_new" TO "category";

-- Set default for new rows
ALTER TABLE "Resource" ALTER COLUMN "category" SET DEFAULT ARRAY[]::TEXT[];

-- Recreate indexes
CREATE INDEX "Resource_category_idx" ON "Resource"("category");
CREATE INDEX "Resource_status_category_idx" ON "Resource"("status", "category");
