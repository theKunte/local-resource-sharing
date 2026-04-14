/*
  Warnings:

  - Added the required column `updatedAt` to the `Group` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `GroupMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Resource` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BorrowRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BorrowRequest_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BorrowRequest_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BorrowRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BorrowRequest" ("borrowerId", "createdAt", "endDate", "id", "message", "ownerId", "resourceId", "startDate", "status", "updatedAt") SELECT "borrowerId", "createdAt", "endDate", "id", "message", "ownerId", "resourceId", "startDate", "status", "updatedAt" FROM "BorrowRequest";
DROP TABLE "BorrowRequest";
ALTER TABLE "new_BorrowRequest" RENAME TO "BorrowRequest";
CREATE INDEX "BorrowRequest_borrowerId_idx" ON "BorrowRequest"("borrowerId");
CREATE INDEX "BorrowRequest_ownerId_idx" ON "BorrowRequest"("ownerId");
CREATE INDEX "BorrowRequest_resourceId_idx" ON "BorrowRequest"("resourceId");
CREATE INDEX "BorrowRequest_status_idx" ON "BorrowRequest"("status");
CREATE INDEX "BorrowRequest_createdAt_idx" ON "BorrowRequest"("createdAt");
CREATE INDEX "BorrowRequest_borrowerId_status_idx" ON "BorrowRequest"("borrowerId", "status");
CREATE INDEX "BorrowRequest_ownerId_status_idx" ON "BorrowRequest"("ownerId", "status");
CREATE TABLE "new_Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "avatar" TEXT,
    CONSTRAINT "Group_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Group" ("avatar", "createdById", "description", "id", "name") SELECT "avatar", "createdById", "description", "id", "name" FROM "Group";
DROP TABLE "Group";
ALTER TABLE "new_Group" RENAME TO "Group";
CREATE TABLE "new_GroupMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GroupMember" ("groupId", "id", "role", "userId") SELECT "groupId", "id", "role", "userId" FROM "GroupMember";
DROP TABLE "GroupMember";
ALTER TABLE "new_GroupMember" RENAME TO "GroupMember";
CREATE INDEX "GroupMember_groupId_idx" ON "GroupMember"("groupId");
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");
CREATE INDEX "GroupMember_groupId_role_idx" ON "GroupMember"("groupId", "role");
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");
CREATE TABLE "new_Loan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "returnedDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Loan_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BorrowRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Loan_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Loan_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Loan_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Loan" ("borrowerId", "createdAt", "endDate", "id", "lenderId", "requestId", "resourceId", "returnedDate", "startDate", "status", "updatedAt") SELECT "borrowerId", "createdAt", "endDate", "id", "lenderId", "requestId", "resourceId", "returnedDate", "startDate", "status", "updatedAt" FROM "Loan";
DROP TABLE "Loan";
ALTER TABLE "new_Loan" RENAME TO "Loan";
CREATE UNIQUE INDEX "Loan_requestId_key" ON "Loan"("requestId");
CREATE INDEX "Loan_borrowerId_idx" ON "Loan"("borrowerId");
CREATE INDEX "Loan_lenderId_idx" ON "Loan"("lenderId");
CREATE INDEX "Loan_resourceId_idx" ON "Loan"("resourceId");
CREATE INDEX "Loan_status_idx" ON "Loan"("status");
CREATE INDEX "Loan_startDate_idx" ON "Loan"("startDate");
CREATE INDEX "Loan_endDate_idx" ON "Loan"("endDate");
CREATE INDEX "Loan_borrowerId_status_idx" ON "Loan"("borrowerId", "status");
CREATE INDEX "Loan_lenderId_status_idx" ON "Loan"("lenderId", "status");
CREATE TABLE "new_Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "ownerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "currentLoanId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Resource_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Resource_currentLoanId_fkey" FOREIGN KEY ("currentLoanId") REFERENCES "Loan" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
);
INSERT INTO "new_Resource" ("currentLoanId", "description", "id", "image", "ownerId", "status", "title") SELECT "currentLoanId", "description", "id", "image", "ownerId", "status", "title" FROM "Resource";
DROP TABLE "Resource";
ALTER TABLE "new_Resource" RENAME TO "Resource";
CREATE UNIQUE INDEX "Resource_currentLoanId_key" ON "Resource"("currentLoanId");
CREATE INDEX "Resource_ownerId_idx" ON "Resource"("ownerId");
CREATE INDEX "Resource_status_idx" ON "Resource"("status");
CREATE INDEX "Resource_ownerId_status_idx" ON "Resource"("ownerId", "status");
CREATE TABLE "new_ResourceSharing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResourceSharing_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceSharing_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ResourceSharing" ("groupId", "id", "resourceId") SELECT "groupId", "id", "resourceId" FROM "ResourceSharing";
DROP TABLE "ResourceSharing";
ALTER TABLE "new_ResourceSharing" RENAME TO "ResourceSharing";
CREATE INDEX "ResourceSharing_resourceId_idx" ON "ResourceSharing"("resourceId");
CREATE INDEX "ResourceSharing_groupId_idx" ON "ResourceSharing"("groupId");
CREATE UNIQUE INDEX "ResourceSharing_resourceId_groupId_key" ON "ResourceSharing"("resourceId", "groupId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "fcmToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("email", "id", "name") SELECT "email", "id", "name" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
