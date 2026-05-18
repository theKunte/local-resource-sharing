-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "category" TEXT;

-- CreateIndex
CREATE INDEX "Resource_category_idx" ON "Resource"("category");

-- CreateIndex
CREATE INDEX "Resource_status_category_idx" ON "Resource"("status", "category");
