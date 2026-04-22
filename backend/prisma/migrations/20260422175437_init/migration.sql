-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('AVAILABLE', 'BORROWED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "BorrowRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'PENDING_RETURN_CONFIRMATION', 'RETURNED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "fcmToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "avatar" TEXT,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "ownerId" TEXT NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "currentLoanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceSharing" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceSharing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BorrowRequest" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" "BorrowRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BorrowRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "returnedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_idx" ON "GroupMember"("groupId");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_role_idx" ON "GroupMember"("groupId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_currentLoanId_key" ON "Resource"("currentLoanId");

-- CreateIndex
CREATE INDEX "Resource_ownerId_idx" ON "Resource"("ownerId");

-- CreateIndex
CREATE INDEX "Resource_status_idx" ON "Resource"("status");

-- CreateIndex
CREATE INDEX "Resource_ownerId_status_idx" ON "Resource"("ownerId", "status");

-- CreateIndex
CREATE INDEX "ResourceSharing_resourceId_idx" ON "ResourceSharing"("resourceId");

-- CreateIndex
CREATE INDEX "ResourceSharing_groupId_idx" ON "ResourceSharing"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceSharing_resourceId_groupId_key" ON "ResourceSharing"("resourceId", "groupId");

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
CREATE INDEX "BorrowRequest_borrowerId_status_idx" ON "BorrowRequest"("borrowerId", "status");

-- CreateIndex
CREATE INDEX "BorrowRequest_ownerId_status_idx" ON "BorrowRequest"("ownerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_requestId_key" ON "Loan"("requestId");

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
CREATE INDEX "Loan_borrowerId_status_idx" ON "Loan"("borrowerId", "status");

-- CreateIndex
CREATE INDEX "Loan_lenderId_status_idx" ON "Loan"("lenderId", "status");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_currentLoanId_fkey" FOREIGN KEY ("currentLoanId") REFERENCES "Loan"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ResourceSharing" ADD CONSTRAINT "ResourceSharing_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceSharing" ADD CONSTRAINT "ResourceSharing_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowRequest" ADD CONSTRAINT "BorrowRequest_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowRequest" ADD CONSTRAINT "BorrowRequest_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowRequest" ADD CONSTRAINT "BorrowRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BorrowRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
