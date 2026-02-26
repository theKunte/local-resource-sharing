/*
  Warnings:

  - A unique constraint covering the columns `[groupId,userId]` on the table `GroupMember` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[resourceId,groupId]` on the table `ResourceSharing` will be added. If there are existing duplicate values, this will fail.

*/
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
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

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

-- CreateIndex
CREATE UNIQUE INDEX "ResourceSharing_resourceId_groupId_key" ON "ResourceSharing"("resourceId", "groupId");
