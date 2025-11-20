# Database Schema

## Overview

This application uses SQLite with Prisma ORM. The schema supports user authentication, resource management, group sharing, and a complete borrow-to-loan lifecycle.

---

## Models

### User

Represents users authenticated via Firebase.

```prisma
model User {
  id               String          @id @default(uuid())
  email            String          @unique
  name             String?
  resources        Resource[]      @relation("UserResources")
  groupMembers     GroupMember[]
  createdGroups    Group[]         @relation("CreatedGroups")
  borrowRequests   BorrowRequest[] @relation("BorrowerRequests")
  receivedRequests BorrowRequest[] @relation("OwnerRequests")
  loansAsBorrower  Loan[]          @relation("BorrowerLoans")
  loansAsLender    Loan[]          @relation("LenderLoans")
}
```

**Fields:**

- `id` - UUID primary key
- `email` - Unique email address from Firebase
- `name` - Optional display name
- `resources` - Resources owned by this user
- `groupMembers` - Group memberships
- `createdGroups` - Groups created by this user
- `borrowRequests` - Requests made to borrow items
- `receivedRequests` - Requests received for owned items
- `loansAsBorrower` - Active/past loans as borrower
- `loansAsLender` - Active/past loans as lender

---

### Resource

Items that can be shared and borrowed.

```prisma
model Resource {
  id             String            @id @default(uuid())
  title          String
  description    String
  image          String?
  ownerId        String
  status         ResourceStatus    @default(AVAILABLE)
  currentLoanId  String?           @unique
  owner          User              @relation("UserResources", fields: [ownerId], references: [id])
  sharedWith     ResourceSharing[]
  borrowRequests BorrowRequest[]
  loans          Loan[]
  currentLoan    Loan?             @relation("CurrentLoan", fields: [currentLoanId], references: [id])
}
```

**Fields:**

- `id` - UUID primary key
- `title` - Resource name
- `description` - Detailed description
- `image` - Base64 encoded image (optional)
- `ownerId` - Foreign key to User
- `status` - Current availability (see ResourceStatus enum)
- `currentLoanId` - Link to active loan (if borrowed)
- `owner` - User who owns this resource
- `sharedWith` - Groups this resource is shared with
- `borrowRequests` - All borrow requests for this item
- `loans` - All loans (past and present)
- `currentLoan` - The active loan (if status is BORROWED)

**Status Flow:**

```
AVAILABLE → BORROWED → AVAILABLE
     ↓
UNAVAILABLE (manual)
```

---

### Group

Shared groups for resource pooling.

```prisma
model Group {
  id          String            @id @default(uuid())
  name        String
  description String?
  createdById String
  createdBy   User              @relation("CreatedGroups", fields: [createdById], references: [id])
  members     GroupMember[]
  resources   ResourceSharing[]
  avatar      String?
}
```

**Fields:**

- `id` - UUID primary key
- `name` - Group name
- `description` - Optional group description
- `createdById` - User who created the group
- `createdBy` - Creator user relation
- `members` - All group members
- `resources` - Resources shared with this group
- `avatar` - Base64 encoded avatar image (optional)

---

### GroupMember

Members of a group with roles.

```prisma
model GroupMember {
  id      String @id @default(uuid())
  group   Group  @relation(fields: [groupId], references: [id])
  groupId String
  user    User   @relation(fields: [userId], references: [id])
  userId  String
  role    String @default("member")
}
```

**Fields:**

- `id` - UUID primary key
- `groupId` - Foreign key to Group
- `userId` - Foreign key to User
- `role` - Member role: `"owner"`, `"admin"`, or `"member"`

**Roles:**

- `owner` - Group creator, full permissions
- `admin` - Can manage members and resources
- `member` - Can view and borrow shared resources

---

### ResourceSharing

Links resources to groups they're shared with.

```prisma
model ResourceSharing {
  id         String   @id @default(uuid())
  resource   Resource @relation(fields: [resourceId], references: [id])
  resourceId String
  group      Group    @relation(fields: [groupId], references: [id])
  groupId    String
}
```

**Fields:**

- `id` - UUID primary key
- `resourceId` - Foreign key to Resource
- `groupId` - Foreign key to Group

---

### BorrowRequest

Requests to borrow a resource.

```prisma
model BorrowRequest {
  id         String              @id @default(uuid())
  resourceId String
  resource   Resource            @relation(fields: [resourceId], references: [id])
  borrowerId String
  borrower   User                @relation("BorrowerRequests", fields: [borrowerId], references: [id])
  ownerId    String
  owner      User                @relation("OwnerRequests", fields: [ownerId], references: [id])
  status     BorrowRequestStatus @default(PENDING)
  message    String?
  startDate  DateTime
  endDate    DateTime
  createdAt  DateTime            @default(now())
  loan       Loan?
}
```

**Fields:**

- `id` - UUID primary key
- `resourceId` - Resource being requested
- `borrowerId` - User making the request
- `ownerId` - Resource owner
- `status` - Request state (see BorrowRequestStatus enum)
- `message` - Optional message to owner
- `startDate` - Requested start date
- `endDate` - Requested end date
- `createdAt` - Timestamp of request creation
- `loan` - Linked loan (if approved)

**Status Flow:**

```
PENDING → APPROVED (creates Loan)
    ↓
    REJECTED
    ↓
    CANCELLED (by borrower)
```

---

### Loan

Active or completed loans.

```prisma
model Loan {
  id             String     @id @default(uuid())
  borrowRequestId String?   @unique
  borrowRequest  BorrowRequest? @relation(fields: [borrowRequestId], references: [id])
  resourceId     String
  resource       Resource   @relation(fields: [resourceId], references: [id])
  borrowerId     String
  borrower       User       @relation("BorrowerLoans", fields: [borrowerId], references: [id])
  lenderId       String
  lender         User       @relation("LenderLoans", fields: [lenderId], references: [id])
  status         LoanStatus @default(ACTIVE)
  startDate      DateTime
  endDate        DateTime
  returnedDate   DateTime?
  createdAt      DateTime   @default(now())
  resourceAsCurrentLoan Resource? @relation("CurrentLoan")
}
```

**Fields:**

- `id` - UUID primary key
- `borrowRequestId` - Optional link to originating request
- `resourceId` - Item being loaned
- `borrowerId` - User borrowing the item
- `lenderId` - User lending the item (owner)
- `status` - Loan state (see LoanStatus enum)
- `startDate` - Loan start date
- `endDate` - Expected return date
- `returnedDate` - Actual return date (if returned)
- `createdAt` - Loan creation timestamp
- `resourceAsCurrentLoan` - Back-reference if this is the current loan

**Status Flow:**

```
ACTIVE → RETURNED (when item returned)
    ↓
    OVERDUE (if past endDate and still ACTIVE)
```

---

## Enums

### ResourceStatus

```prisma
enum ResourceStatus {
  AVAILABLE    // Can be borrowed
  BORROWED     // Currently on loan
  UNAVAILABLE  // Not available for borrowing
}
```

### BorrowRequestStatus

```prisma
enum BorrowRequestStatus {
  PENDING    // Awaiting owner approval
  APPROVED   // Owner accepted, loan created
  REJECTED   // Owner declined
  CANCELLED  // Borrower cancelled
}
```

### LoanStatus

```prisma
enum LoanStatus {
  ACTIVE     // Currently borrowed
  RETURNED   // Item has been returned
  OVERDUE    // Past endDate, not yet returned
}
```

---

## Relationships Diagram

```
User
 ├─ owns → Resource
 ├─ member of → GroupMember → Group
 ├─ creates → Group
 ├─ makes → BorrowRequest (as borrower)
 ├─ receives → BorrowRequest (as owner)
 ├─ borrows via → Loan (as borrower)
 └─ lends via → Loan (as lender)

Resource
 ├─ owned by → User
 ├─ shared with → ResourceSharing → Group
 ├─ has → BorrowRequest[]
 ├─ has → Loan[]
 └─ has currentLoan → Loan (1-to-1 if BORROWED)

Group
 ├─ created by → User
 ├─ has → GroupMember[]
 └─ has access to → ResourceSharing → Resource

BorrowRequest
 ├─ for → Resource
 ├─ by → User (borrower)
 ├─ to → User (owner)
 └─ creates → Loan (if approved)

Loan
 ├─ from → BorrowRequest (optional)
 ├─ for → Resource
 ├─ borrowed by → User
 ├─ lent by → User
 └─ is current loan of → Resource (if ACTIVE)
```

---

## Key Constraints

1. **User email uniqueness**: `@unique` on User.email
2. **Current loan uniqueness**: `@unique` on Resource.currentLoanId
3. **Borrow request to loan**: `@unique` on Loan.borrowRequestId
4. **Cascading**: Resource deletion removes ResourceSharing entries
5. **Self-reference prevention**: Backend validates borrower ≠ owner

---

## Indexes (Recommended)

While SQLite doesn't require explicit index definitions in Prisma for small datasets, consider adding these for production:

```prisma
@@index([ownerId])           // on Resource
@@index([status])            // on Resource
@@index([borrowerId, status]) // on BorrowRequest
@@index([ownerId, status])   // on BorrowRequest
@@index([userId])            // on GroupMember
@@index([groupId])           // on ResourceSharing
@@index([resourceId])        // on Loan
@@index([status])            // on Loan
```

---

## Database Migrations

Generated migrations are in `backend/prisma/migrations/`:

1. **20250617230558_init** - Initial schema
2. **20250627190303_add_group_description** - Added Group.description
3. **20250627190540_add_member_roles** - Added GroupMember.role

To generate a new migration:

```bash
cd backend
npx prisma migrate dev --name your_migration_name
```

To apply migrations:

```bash
npx prisma migrate deploy
```

To view database:

```bash
npx prisma studio
```
