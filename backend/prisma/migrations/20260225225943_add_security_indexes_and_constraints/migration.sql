/*
  Warnings:

  - A unique constraint covering the columns `[groupId,userId]` on the table `GroupMember` will be added.
  - A unique constraint covering the columns `[resourceId,groupId]` on the table `ResourceSharing` will be added.
  
  This migration will automatically clean up any existing duplicate records before creating unique constraints.

*/

-- =====================================================
-- STEP 1: Clean up duplicate GroupMember records
-- Keep only the oldest record for each groupId-userId pair
-- =====================================================
DELETE FROM "GroupMember"
WHERE "id" IN (
  SELECT gm2."id"
  FROM "GroupMember" gm1
  INNER JOIN "GroupMember" gm2 
    ON gm1."groupId" = gm2."groupId" 
    AND gm1."userId" = gm2."userId"
    AND gm1."id" < gm2."id"
);

-- =====================================================
-- STEP 2: Clean up duplicate ResourceSharing records
-- Keep only the oldest record for each resourceId-groupId pair
-- =====================================================
DELETE FROM "ResourceSharing"
WHERE "id" IN (
  SELECT rs2."id"
  FROM "ResourceSharing" rs1
  INNER JOIN "ResourceSharing" rs2 
    ON rs1."resourceId" = rs2."resourceId" 
    AND rs1."groupId" = rs2."groupId"
    AND rs1."id" < rs2."id"
);

-- =====================================================
-- STEP 3: Create non-unique indexes first (safe operation)
-- These improve query performance without risk of failure
-- =====================================================

-- CreateIndex
CREATE INDEX "BorrowRequest_borrowerId_idx" ON "BorrowRequest"("borrowerId");

-- CreateIndex
CREATE INDEX "BorrowRequest_ownerId_idx" ON "BorrowRequest"("ownerId");

-- CreateIndex
CREATE INDEX "BorrowRequest_resourceId_idx" ON "BorrowRequest"("resourceId");

-- CreateIndex
CREATE INDEX "BorrowRequest_status_idx" ON "BorrowRequest"("status");

-- CreateIndex
CREATE INDEX "BorrowRequest_createdAt_idx" ON "BorrowRequest"("createdAt");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_idx" ON "GroupMember"("groupId");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

-- CreateIndex
CREATE INDEX "Loan_borrowerId_idx" ON "Loan"("borrowerId");

-- CreateIndex
CREATE INDEX "Loan_lenderId_idx" ON "Loan"("lenderId");

-- CreateIndex
CREATE INDEX "Loan_resourceId_idx" ON "Loan"("resourceId");

-- CreateIndex
CREATE INDEX "Loan_status_idx" ON "Loan"("status");

-- CreateIndex
CREATE INDEX "Loan_startDate_idx" ON "Loan"("startDate");

-- CreateIndex
CREATE INDEX "Loan_endDate_idx" ON "Loan"("endDate");

-- CreateIndex
CREATE INDEX "Resource_ownerId_idx" ON "Resource"("ownerId");

-- CreateIndex
CREATE INDEX "Resource_status_idx" ON "Resource"("status");

-- CreateIndex
CREATE INDEX "ResourceSharing_resourceId_idx" ON "ResourceSharing"("resourceId");

-- CreateIndex
CREATE INDEX "ResourceSharing_groupId_idx" ON "ResourceSharing"("groupId");

-- =====================================================
-- STEP 4: Create unique constraints (now safe after cleanup)
-- These prevent future duplicates
-- =====================================================

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceSharing_resourceId_groupId_key" ON "ResourceSharing"("resourceId", "groupId");
